/**
 * GHT Trek — EdgeOne Pages 边缘函数入口
 *
 * 使用 EdgeOne Node Functions Handler 格式（export default onRequest）。
 *
 * 部署要求：
 *   1. EdgeOne 控制台 → 存储 → KV 存储 → 绑定命名空间（变量名 = GHT）
 *   2. 环境变量：ADMIN_PWD（登录密码）、SECRET（HMAC 密钥）
 *
 * 路由：node-functions/api/[[default]].js → 匹配所有 /api/* 请求
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Max-Age': '86400',
};

// ── 安全参数（可按需调整）──
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // token 有效期 7 天
const RL_MAX_FAILS = 5;                        // 单 IP 最大失败次数
const RL_WINDOW_MS = 15 * 60 * 1000;           // 限流窗口 15 分钟

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

async function hmacHex(key, msg) {
  const keyBytes = new TextEncoder().encode(key);
  const msgBytes = new TextEncoder().encode(msg);
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgBytes);
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// 发行带过期的 token： "<exp>.<sig>"
async function issueToken(env) {
  const exp = Date.now() + TOKEN_TTL_MS;
  const sig = await hmacHex(env.SECRET, env.ADMIN_PWD + '|' + exp);
  return exp + '.' + sig;
}

// 校验 token：格式正确 + 未过期 + 签名匹配
async function verifyToken(token, env) {
  if (!token || !env.SECRET || !env.ADMIN_PWD) return false;
  const dot = token.indexOf('.');
  if (dot < 0) return false;
  const exp = parseInt(token.slice(0, dot), 10);
  const sig = token.slice(dot + 1);
  if (!Number.isFinite(exp) || Date.now() > exp) return false; // 过期
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

// ── KV 封装 ──
async function kvGet(ns, key) { try { const v = await ns.get(key); return v != null ? v : null; } catch (e) { return null; } }
async function kvPut(ns, key, value) { await ns.put(key, typeof value === 'string' ? value : JSON.stringify(value)); }
async function kvGetJSON(ns, key) { const v = await kvGet(ns, key); return v ? JSON.parse(v) : null; }

/**
 * EdgeOne Handler 入口
 * context: { request, env, clientIp, params, uuid, ... }
 */
export default async function onRequest(context) {
  const request = context.request;
  const env = context.env;

  // 兼容：context.clientIp 优先，fallback 到 header 解析
  const clientIp = context.clientIp
    || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || 'unknown';

  const url = new URL(request.url);
  const path = url.pathname;
  const ns = env.GHT;  // 可能为 undefined（未绑定时），各接口按需处理

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  // 公开：读取配置（无 KV 时返回空）
  if (path === '/api/config' && request.method === 'GET') {
    if (!ns) return json({});
    const raw = await kvGet(ns, 'config');
    return json(raw ? JSON.parse(raw) : {});
  }

  // 公开：读取共享包（无 KV 时返回空）
  if (path === '/api/share' && request.method === 'GET') {
    if (!ns) return json({ ok: true, data: null });
    const raw = await kvGet(ns, 'share:all');
    return json(raw ? { ok: true, data: JSON.parse(raw) } : { ok: true, data: null });
  }

  // ── 登录（带限流 + 发行过期 token；无 KV 时跳过限流）──
  if (path === '/api/login' && request.method === 'POST') {
    let pwd = '';
    try { pwd = (await request.json()).password || ''; } catch (e) {}

    // 无 KV 时直接验密码（无限流保护）
    if (!ns) {
      if (!env.ADMIN_PWD) return json({ ok: false, error: 'not_configured' }, 500);
      if (pwd === env.ADMIN_PWD) {
        if (!env.SECRET) return json({ ok: false, error: 'secret_missing' }, 500);
        return json({ ok: true, token: await issueToken(env), warn: 'KV 未绑定，登录可用但数据读写不可用' });
      }
      return json({ ok: false, error: 'bad password' }, 401);
    }

    // 有 KV 时走完整限流逻辑
    const rlKey = 'rl:' + clientIp;
    const rl = await kvGetJSON(ns, rlKey) || { fails: 0, resetAt: 0 };
    if (rl.fails >= RL_MAX_FAILS && Date.now() < rl.resetAt) {
      const retry = Math.ceil((rl.resetAt - Date.now()) / 1000);
      return json({ ok: false, error: 'rate_limited', message: '尝试过于频繁，请 ' + retry + ' 秒后重试' }, 429);
    }
    if (pwd === env.ADMIN_PWD) {
      if (!env.SECRET) return json({ ok: false, error: 'secret_missing', message: '服务端未配置 SECRET 环境变量' }, 500);
      await kvPut(ns, rlKey, { fails: 0, resetAt: 0 });
      return json({ ok: true, token: await issueToken(env) });
    }
    const fails = (rl.fails || 0) + 1;
    const resetAt = fails >= RL_MAX_FAILS ? Date.now() + RL_WINDOW_MS : (rl.resetAt || 0);
    await kvPut(ns, rlKey, { fails, resetAt });
    return json({ ok: false, error: 'bad password' }, 401);
  }

  // [DEBUG] 全面诊断：env 全量扫描 + KV 对象探测
  if (path === '/api/debug') {
    const keys = Object.keys(env || {});
    // 扫描所有可能是 KV 对象的值（有 get/put 方法）
    const kvCandidates = {};
    for (const k of keys) {
      const v = env[k];
      if (v && typeof v === 'object' && typeof v.get === 'function') {
        kvCandidates[k] = { type: 'object', hasGet: true, hasPut: typeof v.put === 'function' };
      }
    }
    return json({
      envKeys: keys,
      hasGHT: !!env.GHT,
      ghtType: env.GHT ? typeof env.GHT : null,
      ghtTrekInEnv: !!env['ght_trek'],
      ghtTrekType: env['ght_trek'] ? typeof env['ght_trek'] : null,
      totalKeys: keys.length,
      kvCandidates: kvCandidates,
      // 检查全局作用域有没有 KV 相关对象（有些平台直接注入 globalThis）
      sampleEnvValues: keys.slice(0, 5).map(k => ({ k, type: typeof env[k] }))
    });
  }

  // 以下接口需登录（token 过期即 401，前端自动清 token 重新登录）
  if (!await isOwner(request, env)) return json({ error: 'unauthorized', hint: 'token 过期或无效，请重新登录 admin.html' }, 401);

  // 所有写接口需要 KV
  if (!ns) return json({ error: 'KV namespace GHT not bound. 请在 EdgeOne 控制台绑定 KV 命名空间（变量名=GHT）' }, 503);

  // 写入配置
  if (path === '/api/config' && request.method === 'PUT') {
    let body; try { body = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
    await kvPut(ns, 'config', body);
    return json({ ok: true, ...body });
  }

  // 写入共享包
  if (path === '/api/share' && request.method === 'PUT') {
    let body; try { body = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
    if (!body || typeof body !== 'object') return json({ error: 'bad payload' }, 400);
    await kvPut(ns, 'share:all', body);
    return json({ ok: true });
  }

  // 列出已备份轨迹
  if (path === '/api/tracks' && request.method === 'GET') {
    const raw = await kvGet(ns, '_index');
    return json({ ok: true, tracks: raw ? JSON.parse(raw) : [] });
  }

  // 上传原始 GPX 备份
  if (path === '/api/upload' && request.method === 'POST') {
    let body; try { body = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
    const files = Array.isArray(body.files) ? body.files : [];
    const idxRaw = await kvGet(ns, '_index');
    const index = idxRaw ? JSON.parse(idxRaw) : [];
    for (const f of files) {
      if (f && typeof f.name === 'string' && typeof f.content === 'string') {
        const safeName = f.name.replace(/[^\w.\-]/g, '_');
        await kvPut(ns, 'gpx:' + safeName, f.content);
        if (!index.includes(safeName)) index.push(safeName);
      }
    }
    await kvPut(ns, '_index', index);
    return json({ ok: true, count: files.length, tracks: index });
  }

  return json({ error: 'not found', path }, 404);
}
