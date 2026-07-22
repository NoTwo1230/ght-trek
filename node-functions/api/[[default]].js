/**
 * GHT Trek — EdgeOne Pages Node Functions 入口
 *
 * 云端存储：EdgeOne Pages Blob（官方 Node SDK @edgeone/pages-blob）
 *   · 永久免费额度：1GB 存储、单值 25MB
 *   · getStore() 开箱即用，首次调用自动创建命名空间，无需控制台配置
 *   · 默认用强一致读取，保证写入后立即读到最新值（行为对齐原 COS）
 *
 * 部署要求（环境变量，设在「生产环境」）：
 *   ADMIN_PWD   登录密码
 *   SECRET      HMAC 发行 token 的密钥
 *   （原 COS_BUCKET / COS_REGION / COS_SECRET_ID / COS_SECRET_KEY 已废弃，可删除）
 *
 * 路由：node-functions/api/[[default]].js → 匹配所有 /api/* 请求
 *
 * 注意：token 相关仍使用 Web Crypto API（crypto.subtle，全局可用），不 import node:crypto。
 */

import { getStore } from '@edgeone/pages-blob';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Max-Age': '86400',
};

// ── 安全参数 ──
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // token 有效期 7 天
const RL_MAX_FAILS = 5;                        // 单 IP 最大失败次数
const RL_WINDOW_MS = 15 * 60 * 1000;           // 限流窗口 15 分钟

// Blob 命名空间名（首次写入时平台自动创建）
const STORE_NAME = 'ght-trek';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

// ── token ──
async function hmacHex(key, msg) {
  const keyBytes = new TextEncoder().encode(key);
  const msgBytes = new TextEncoder().encode(msg);
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgBytes);
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function issueToken(env) {
  const exp = Date.now() + TOKEN_TTL_MS;
  const sig = await hmacHex(env.SECRET, env.ADMIN_PWD + '|' + exp);
  return exp + '.' + sig;
}
async function verifyToken(token, env) {
  if (!token || !env.SECRET || !env.ADMIN_PWD) return false;
  const dot = token.indexOf('.');
  if (dot < 0) return false;
  const exp = parseInt(token.slice(0, dot), 10);
  const sig = token.slice(dot + 1);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expect = await hmacHex(env.SECRET, env.ADMIN_PWD + '|' + exp);
  return expect === sig;
}
function getBearer(req) {
  const h = req.headers.get('Authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
}
async function isOwner(req, env) {
  return verifyToken(getBearer(req), env);
}

// ── 存储封装（EdgeOne Blob）──
// 强一致：跳过边缘缓存直读主存储，保证写后立即读到最新值（与原 COS 行为一致）。
function store() {
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}
// Blob 始终可用（零配置），无需像 COS 那样检测环境变量。
function hasStore() { return true; }

// 逻辑键 → Blob 对象键（沿用原 ght-data/ 前缀，Blob 原生支持 / 目录层级）
function objKey(kvKey) {
  if (kvKey === 'config') return 'ght-data/config.json';
  if (kvKey === 'share:all') return 'ght-data/share-all.json';
  if (kvKey === '_index') return 'ght-data/_index.json';
  if (kvKey.startsWith('rl:')) return 'ght-data/rl/' + kvKey.slice(3) + '.json';
  if (kvKey.startsWith('gpx:')) return 'ght-data/gpx/' + kvKey.slice(4);
  return 'ght-data/' + kvKey + '.json';
}

async function kvGet(env, kvKey) {
  try {
    // 返回字符串或 null（Key 不存在时 Blob 返回 null）
    return await store().get(objKey(kvKey), { type: 'text' });
  } catch (e) { console.error('[Blob] GET err', kvKey, e && e.message); return null; }
}
async function kvPut(env, kvKey, value) {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  await store().set(objKey(kvKey), body);
  return true;
}
async function kvGetJSON(env, kvKey) {
  const v = await kvGet(env, kvKey);
  return v ? JSON.parse(v) : null;
}

// 列出某前缀下的对象键（用于批量删除 gpx 目录）
async function storeList(prefix) {
  try {
    const { blobs } = await store().list({ prefix });
    return (blobs || []).map(b => b.key);
  } catch (e) { console.error('[Blob] LIST err', prefix, e && e.message); return []; }
}
// 删除单个对象键（Key 不存在不报错）
async function storeDelete(key) {
  try { await store().delete(key); return true; }
  catch (e) { console.error('[Blob] DEL err', key, e && e.message); return false; }
}

/**
 * EdgeOne Handler 入口
 */
export default async function onRequest(context) {
  const request = context.request;
  const env = context.env;

  const clientIp = context.clientIp
    || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || 'unknown';

  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  // 公开：读取配置
  if (path === '/api/config' && request.method === 'GET') {
    const raw = await kvGet(env, 'config');
    return json(raw ? JSON.parse(raw) : {});
  }

  // 公开：读取共享包
  if (path === '/api/share' && request.method === 'GET') {
    const raw = await kvGet(env, 'share:all');
    return json(raw ? { ok: true, data: JSON.parse(raw) } : { ok: true, data: null });
  }

  // 健康检查 / 诊断（无需登录）：对 Blob 做一次读探测
  if (path === '/api/debug') {
    let storeStatus = 'unknown';
    let storeError = null;
    try {
      await store().get(objKey('_index'), { type: 'text' }); // null 亦视为可达
      storeStatus = 'reachable';
    } catch (e) { storeStatus = 'error'; storeError = e && e.message; }
    return json({
      storage: 'edgeone-blob',
      store: STORE_NAME,
      storeStatus,
      storeError,
      hasSecret: !!env.SECRET,
      hasAdminPwd: !!env.ADMIN_PWD,
    });
  }

  // 登录（带限流 + 发行过期 token）
  if (path === '/api/login' && request.method === 'POST') {
    let pwd = '';
    try { pwd = (await request.json()).password || ''; } catch (e) {}

    if (!env.ADMIN_PWD) return json({ ok: false, error: 'not_configured' }, 500);

    // Blob 始终可用：走完整限流逻辑
    const rlKey = 'rl:' + clientIp;
    const rl = await kvGetJSON(env, rlKey) || { fails: 0, resetAt: 0 };
    if (rl.fails >= RL_MAX_FAILS && Date.now() < rl.resetAt) {
      const retry = Math.ceil((rl.resetAt - Date.now()) / 1000);
      return json({ ok: false, error: 'rate_limited', message: '尝试过于频繁，请 ' + retry + ' 秒后重试' }, 429);
    }
    if (pwd === env.ADMIN_PWD) {
      if (!env.SECRET) return json({ ok: false, error: 'secret_missing', message: '服务端未配置 SECRET 环境变量' }, 500);
      await kvPut(env, rlKey, { fails: 0, resetAt: 0 });
      return json({ ok: true, token: await issueToken(env) });
    }
    const fails = (rl.fails || 0) + 1;
    const resetAt = fails >= RL_MAX_FAILS ? Date.now() + RL_WINDOW_MS : (rl.resetAt || 0);
    await kvPut(env, rlKey, { fails, resetAt });
    return json({ ok: false, error: 'bad password' }, 401);
  }

  // 以下接口需登录（token 过期即 401，前端自动清 token 重新登录）
  if (!await isOwner(request, env)) return json({ error: 'unauthorized', hint: 'token 过期或无效，请重新登录 admin.html' }, 401);

  // 写入配置
  if (path === '/api/config' && request.method === 'PUT') {
    let body; try { body = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
    await kvPut(env, 'config', body);
    return json({ ok: true, ...body });
  }

  // 写入共享包
  if (path === '/api/share' && request.method === 'PUT') {
    let body; try { body = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
    if (!body || typeof body !== 'object') return json({ error: 'bad payload' }, 400);
    await kvPut(env, 'share:all', body);
    return json({ ok: true });
  }

  // 列出已备份轨迹
  if (path === '/api/tracks' && request.method === 'GET') {
    const raw = await kvGet(env, '_index');
    return json({ ok: true, tracks: raw ? JSON.parse(raw) : [] });
  }

  // 上传原始 GPX 备份
  if (path === '/api/upload' && request.method === 'POST') {
    let body; try { body = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
    const files = Array.isArray(body.files) ? body.files : [];
    const idxRaw = await kvGet(env, '_index');
    const index = idxRaw ? JSON.parse(idxRaw) : [];
    for (const f of files) {
      if (f && typeof f.name === 'string' && typeof f.content === 'string') {
        const safeName = f.name.replace(/[^\w.\-]/g, '_');
        await kvPut(env, 'gpx:' + safeName, f.content);
        if (!index.includes(safeName)) index.push(safeName);
      }
    }
    await kvPut(env, '_index', index);
    return json({ ok: true, count: files.length, tracks: index });
  }

  // 彻底清空原始 GPX 备份（重置数据 / 清空云端时调用）
  if (path === '/api/tracks' && request.method === 'DELETE') {
    const keys = await storeList('ght-data/gpx/');
    let deleted = 0;
    for (const k of keys) { if (await storeDelete(k)) deleted++; }
    await kvPut(env, '_index', []);   // 清空备份索引
    return json({ ok: true, deleted });
  }

  return json({ error: 'not found', path }, 404);
}
