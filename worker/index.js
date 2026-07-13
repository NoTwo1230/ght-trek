/**
 * GHT Trek — Cloudflare Worker 后端（零绑定版）
 *
 * 存储：仅用 Cloudflare 内置 Cache API（无需 KV / 无需 R2 / 无需任何绑定）
 *   - config       → 站点配置 JSON（语言 / 出发日期 / 名称等）
 *   - gpx:<name>   → 原始 GPX 文本（主人上传备份）
 *   - _index       → 轨迹文件名列表
 *
 * 环境变量（Variables，在 Worker Settings 里设）：
 *   - ADMIN_PWD  上传密码（如 ght2026）
 *   - SECRET     任意随机串，用于 HMAC 签发 token
 *
 * 部署：粘贴到 Worker 编辑器 → 设两个环境变量 → Deploy。完事。
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Max-Age': '86400',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

async function hmacHex(key, msg) {
  const keyBytes = new TextEncoder().encode(key);
  const msgBytes = new TextEncoder().encode(msg);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgBytes);
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// token = HMAC(SECRET, ADMIN_PWD)：改密码即自动失效
async function expectedToken(env) {
  if (!env.SECRET || !env.ADMIN_PWD) return null;
  return hmacHex(env.SECRET, env.ADMIN_PWD);
}

function getBearer(req) {
  const h = req.headers.get('Authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
}

async function isOwner(req, env) {
  const exp = await expectedToken(env);
  return !!exp && getBearer(req) === exp;
}

// ── Cache API 封装（零绑定的 key-value 存储） ──────────────────
// 用 caches.default（每个 Worker 自带，免费、无需绑定）
// 以 URL 形式的 key 存取数据

function cacheUrl(key) {
  // Cache API 要求用 URL 做 key，这里用自定义 scheme
  return new Request('http://ght.local/' + encodeURIComponent(key));
}

async function cacheGet(cache, key) {
  const res = await cache.match(cacheUrl(key));
  if (!res) return null;
  try { return await res.text(); } catch (e) { return null; }
}

async function cachePut(cache, key, value, ttlSeconds = 86400 * 30) {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  const res = new Response(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=' + ttlSeconds,
    },
  });
  await cache.put(cacheUrl(key), res);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const cache = caches.default;

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // 公开：读取配置
    if (path === '/api/config' && request.method === 'GET') {
      const raw = await cacheGet(cache, 'config');
      return json(raw ? JSON.parse(raw) : {});
    }

    // 登录：校验密码，返回 token
    if (path === '/api/login' && request.method === 'POST') {
      let pwd = '';
      try { pwd = (await request.json()).password || ''; } catch (e) {}
      if (pwd && pwd === env.ADMIN_PWD) {
        const token = await expectedToken(env);
        return json({ ok: true, token });
      }
      return json({ ok: false, error: 'bad password' }, 401);
    }

    // 以下接口需登录
    if (!await isOwner(request, env)) return json({ error: 'unauthorized' }, 401);

    // 写入配置
    if (path === '/api/config' && request.method === 'PUT') {
      let body;
      try { body = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
      await cachePut(cache, 'config', JSON.stringify(body));
      return json({ ok: true, ...body });
    }

    // 列出已备份轨迹
    if (path === '/api/tracks' && request.method === 'GET') {
      const raw = await cacheGet(cache, '_index');
      const list = raw ? JSON.parse(raw) : [];
      return json({ ok: true, tracks: list });
    }

    // 上传原始 GPX 备份：body = { files: [{ name, content }] }
    if (path === '/api/upload' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
      const files = Array.isArray(body.files) ? body.files : [];

      // 读现有索引
      const idxRaw = await cacheGet(cache, '_index');
      const index = idxRaw ? JSON.parse(idxRaw) : [];

      for (const f of files) {
        if (f && typeof f.name === 'string' && typeof f.content === 'string') {
          const safeName = f.name.replace(/[^\\w.\\-]/g, '_');
          await cachePut(cache, 'gpx:' + safeName, f.content, 86400 * 90); // GPX 缓存 90 天
          if (!index.includes(safeName)) index.push(safeName);
        }
      }
      // 更新索引
      await cachePut(cache, '_index', JSON.stringify(index));
      return json({ ok: true, count: files.length, tracks: index });
    }

    return json({ error: 'not found' }, 404);
  }
};
