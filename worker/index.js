/**
 * GHT Trek — Cloudflare Worker 后端（免卡版）
 * 存储：仅用 KV（无需 R2 / 无需银行卡）
 *   - config       → 站点配置 JSON（语言 / 出发日期 / 名称等）
 *   - gpx:<name>   → 原始 GPX 文本（主人上传备份）
 *
 * 绑定（在 Cloudflare 后台设置）：
 *   - KV 命名空间，绑定名：GHT
 *   - 环境变量（Variables）：ADMIN_PWD（上传密码）、SECRET（任意随机串，用于签发 token）
 *
 * 部署：把本文件内容粘贴到 Cloudflare 控制台 “Workers → Create Worker” 编辑器，或 wrangler deploy
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

// token = HMAC(SECRET, ADMIN_PWD)：改密码即自动失效，无需额外失效逻辑
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // 公开：读取配置（访客无需登录即可获取出发日期等）
    if (path === '/api/config' && request.method === 'GET') {
      const raw = await env.GHT.get('config');
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

    // 以下接口需登录（Bearer token）
    if (!await isOwner(request, env)) return json({ error: 'unauthorized' }, 401);

    // 写入配置
    if (path === '/api/config' && request.method === 'PUT') {
      let body;
      try { body = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
      await env.GHT.put('config', JSON.stringify(body));
      return json({ ok: true });
    }

    // 列出已备份轨迹（同时用于前端续期校验）
    if (path === '/api/tracks' && request.method === 'GET') {
      const list = await env.GHT.list({ prefix: 'gpx:' });
      return json({ ok: true, tracks: list.keys.map(k => k.name.slice(4)) });
    }

    // 上传原始 GPX 备份：body = { files: [{ name, content }] }
    if (path === '/api/upload' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
      const files = Array.isArray(body.files) ? body.files : [];
      for (const f of files) {
        if (f && typeof f.name === 'string' && typeof f.content === 'string') {
          await env.GHT.put('gpx:' + f.name, f.content);
        }
      }
      return json({ ok: true, count: files.length });
    }

    return json({ error: 'not found' }, 404);
  }
};
