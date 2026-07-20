/**
 * GHT Trek — 加固版后端（Cloudflare Worker / EdgeOne Pages 边缘函数通用）
 *
 * 相对 worker/index.js 的安全增强：
 *   1. 登录失败限流（每 IP：5 次/15 分钟，超限返回 429）—— 防密码爆破
 *   2. Token 带过期时间（默认 7 天）—— 原静态 HMAC token 永不失效，泄露即长期可用
 *
 * 前端无需改动：/api/login 仍返回 { ok, token }，前端照常存 Bearer 头；
 * 只是现在 token 形如 "<exp>.<sig>"，后端校验过期。
 *
 * 部署：把本文件作为 Worker/边缘函数入口，绑定 KV（binding=GHT），
 *       设置环境变量 ADMIN_PWD、SECRET。EdgeOne Pages 语法相同。
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

function clientIP(req) {
  return req.headers.get('CF-Connecting-IP')
    || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || 'unknown';
}

// ── KV 封装 ──
async function kvGet(ns, key) { try { const v = await ns.get(key); return v != null ? v : null; } catch (e) { return null; } }
async function kvPut(ns, key, value) { await ns.put(key, typeof value === 'string' ? value : JSON.stringify(value)); }

async function kvGetJSON(ns, key) { const v = await kvGet(ns, key); return v ? JSON.parse(v) : null; }

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const ns = env.GHT;
    if (!ns) return json({ error: 'KV namespace GHT not bound' }, 500);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    // 公开：读取配置
    if (path === '/api/config' && request.method === 'GET') {
      const raw = await kvGet(ns, 'config');
      return json(raw ? JSON.parse(raw) : {});
    }

    // 公开：读取共享包
    if (path === '/api/share' && request.method === 'GET') {
      const raw = await kvGet(ns, 'share:all');
      return json(raw ? { ok: true, data: JSON.parse(raw) } : { ok: true, data: null });
    }

    // ── 登录（带限流 + 发行过期 token）──
    if (path === '/api/login' && request.method === 'POST') {
      const ip = clientIP(request);
      const rlKey = 'rl:' + ip;
      const rl = await kvGetJSON(ns, rlKey) || { fails: 0, resetAt: 0 };
      if (rl.fails >= RL_MAX_FAILS && Date.now() < rl.resetAt) {
        const retry = Math.ceil((rl.resetAt - Date.now()) / 1000);
        return json({ ok: false, error: 'rate_limited', message: '尝试过于频繁，请 ' + retry + ' 秒后重试' }, 429);
      }
      let pwd = '';
      try { pwd = (await request.json()).password || ''; } catch (e) {}
      if (pwd && pwd === env.ADMIN_PWD) {
        if (!env.SECRET) return json({ ok: false, error: 'secret_missing', message: '服务端未配置 SECRET' }, 500);
        await kvPut(ns, rlKey, { fails: 0, resetAt: 0 }); // 成功后清零
        return json({ ok: true, token: await issueToken(env) });
      }
      // 失败：累加限流计数
      const fails = (rl.fails || 0) + 1;
      const resetAt = fails >= RL_MAX_FAILS ? Date.now() + RL_WINDOW_MS : (rl.resetAt || 0);
      await kvPut(ns, rlKey, { fails, resetAt });
      return json({ ok: false, error: 'bad password' }, 401);
    }

    // 以下接口需登录（token 过期即 401，前端自动清 token 重新登录）
    if (!await isOwner(request, env)) return json({ error: 'unauthorized' }, 401);

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

    return json({ error: 'not found' }, 404);
  }
};
