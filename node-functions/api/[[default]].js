/**
 * GHT Trek — EdgeOne Pages Node Functions 入口
 *
 * 云端存储：腾讯云 COS（XML API，服务端 HMAC-SHA1 签名，无需 CORS）
 * 所有读写由本函数在服务端完成，浏览器只与本接口通信。
 *
 * 部署要求（环境变量，全部设在「生产环境」）：
 *   ADMIN_PWD      登录密码
 *   SECRET         HMAC 发行 token 的密钥
 *   COS_BUCKET     桶名（含 APPID，如 ght-trek-1250000000）
 *   COS_REGION     地域简称（如 ap-guangzhou）
 *   COS_SECRET_ID  腾讯云 API SecretId
 *   COS_SECRET_KEY 腾讯云 API SecretKey
 *
 * 路由：node-functions/api/[[default]].js → 匹配所有 /api/* 请求
 *
 * 注意：全部使用 Web Crypto API（crypto.subtle，全局可用），
 * 不 import node:crypto —— EdgeOne Node Functions 运行时对顶层 node: 模块
 * 导入可能加载失败并回退旧版本。
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Max-Age': '86400',
};

// ── 安全参数 ──
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // token 有效期 7 天
const RL_MAX_FAILS = 5;                        // 单 IP 最大失败次数
const RL_WINDOW_MS = 15 * 60 * 1000;           // 限流窗口 15 分钟

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

// ── COS 封装（腾讯云对象存储 XML API，HMAC-SHA1 签名）──
function cosCfg(env) {
  return {
    bucket: env.COS_BUCKET,
    region: env.COS_REGION || 'ap-guangzhou',
    secretId: env.COS_SECRET_ID,
    secretKey: env.COS_SECRET_KEY,
  };
}
function cosHost(cfg) { return `${cfg.bucket}.cos.${cfg.region}.myqcloud.com`; }
function cosUrl(cfg, key) { return `https://${cosHost(cfg)}/${key}`; }
function hasCos(env) { return !!(env.COS_BUCKET && env.COS_SECRET_ID && env.COS_SECRET_KEY); }

// HMAC-SHA1 → hex（Web Crypto，key 可为 string）
async function hmacSha1(key, msg) {
  const keyBytes = new TextEncoder().encode(key);
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}
// SHA-1 → hex（Web Crypto）
async function sha1Hex(msg) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(msg));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// 构造 COS Authorization 头（仅签名 host，最简单可靠）
async function cosAuth(cfg, method, key) {
  const now = Math.floor(Date.now() / 1000);
  const signTime = `${now};${now + 3600}`;
  const host = cosHost(cfg);
  const qHeaderList = 'host';
  const httpHeaders = `host=${host}\n`;
  const httpString = [method.toLowerCase(), '/' + key, '', httpHeaders, ''].join('\n');
  const signKey = await hmacSha1(cfg.secretKey, signTime);
  const stringToSign = ['sha1', signTime, await sha1Hex(httpString), ''].join('\n');
  const signature = await hmacSha1(signKey, stringToSign);
  return `q-sign-algorithm=sha1&q-ak=${cfg.secretId}&q-sign-time=${signTime}` +
         `&q-key-time=${signTime}&q-header-list=${qHeaderList}&q-url-param-list=&q-signature=${signature}`;
}

// KV 键 → COS 对象键（统一放在 ght-data/ 前缀下）
function objKey(kvKey) {
  if (kvKey === 'config') return 'ght-data/config.json';
  if (kvKey === 'share:all') return 'ght-data/share-all.json';
  if (kvKey === '_index') return 'ght-data/_index.json';
  if (kvKey.startsWith('rl:')) return 'ght-data/rl/' + kvKey.slice(3) + '.json';
  if (kvKey.startsWith('gpx:')) return 'ght-data/gpx/' + kvKey.slice(4);
  return 'ght-data/' + kvKey + '.json';
}

async function kvGet(env, kvKey) {
  if (!hasCos(env)) return null;
  const cfg = cosCfg(env);
  const key = objKey(kvKey);
  try {
    const res = await fetch(cosUrl(cfg, key), {
      method: 'GET',
      headers: { 'Authorization': await cosAuth(cfg, 'GET', key) },
    });
    if (res.status === 404) return null;
    if (!res.ok) { console.error('[COS] GET', key, res.status); return null; }
    return await res.text();
  } catch (e) { console.error('[COS] GET err', e); return null; }
}
async function kvPut(env, kvKey, value) {
  const cfg = cosCfg(env);
  const key = objKey(kvKey);
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  const res = await fetch(cosUrl(cfg, key), {
    method: 'PUT',
    headers: { 'Authorization': await cosAuth(cfg, 'PUT', key) },
    body,
  });
  if (!res.ok) { console.error('[COS] PUT', key, res.status); throw new Error('COS put failed ' + res.status); }
  return true;
}
async function kvGetJSON(env, kvKey) {
  const v = await kvGet(env, kvKey);
  return v ? JSON.parse(v) : null;
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

  // 健康检查 / 诊断（无需登录）
  if (path === '/api/debug') {
    const cfg = cosCfg(env);
    let cosStatus = 'not_configured';
    if (hasCos(env)) {
      try {
        const res = await fetch(cosUrl(cfg, objKey('_index')), {
          method: 'GET',
          headers: { 'Authorization': await cosAuth(cfg, 'GET', objKey('_index')) },
        });
        cosStatus = (res.status === 200 || res.status === 404) ? 'reachable' : ('http_' + res.status);
      } catch (e) { cosStatus = 'error:' + e.message; }
    }
    return json({ hasCos: hasCos(env), bucket: env.COS_BUCKET || null, region: env.COS_REGION || null, cosStatus });
  }

  // 登录（带限流 + 发行过期 token；无 COS 时跳过限流）
  if (path === '/api/login' && request.method === 'POST') {
    let pwd = '';
    try { pwd = (await request.json()).password || ''; } catch (e) {}

    if (!env.ADMIN_PWD) return json({ ok: false, error: 'not_configured' }, 500);

    if (!hasCos(env)) {
      // 无 COS：仍可登录，但数据读写不可用
      if (pwd === env.ADMIN_PWD) {
        if (!env.SECRET) return json({ ok: false, error: 'secret_missing' }, 500);
        return json({ ok: true, token: await issueToken(env), warn: 'COS 未配置，登录可用但数据读写不可用' });
      }
      return json({ ok: false, error: 'bad password' }, 401);
    }

    // 有 COS：完整限流逻辑
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

  // 所有写接口需要 COS
  if (!hasCos(env)) return json({ error: 'COS 未配置。请在 EdgeOne 环境变量设置 COS_BUCKET / COS_REGION / COS_SECRET_ID / COS_SECRET_KEY' }, 503);

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

  return json({ error: 'not found', path }, 404);
}
