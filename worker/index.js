/**
 * GHT Trek — Cloudflare Worker 后端
 *
 * 存储：使用绑定的 Cloudflare KV 命名空间（binding 名 GHT）
 *   - config       → 站点配置 JSON（语言 / 出发日期 / 名称等）
 *   - gpx:<name>   → 原始 GPX 文本（主人上传备份，持久保存）
 *   - _index       → 轨迹文件名列表
 *
 * 环境变量（Variables，在 Worker Settings 里设）：
 *   - ADMIN_PWD  上传密码（如 ght2026）
 *   - SECRET     任意随机串，用于 HMAC 签发 token
 *
 * KV 绑定：在 wrangler.toml 的 kv_namespaces 配置 binding="GHT"（填真实命名空间 ID），
 *          或在 Cloudflare 控制台 Worker → Settings → Variables → KV namespace bindings 绑定。
 *          未绑定 GHT 时本 Worker 会返回 500（见 fetch 内检查）。
 *
 * 部署：粘贴到 Worker 编辑器（已绑定 GHT KV）→ 设两个环境变量 → Deploy。完事。
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

// ── KV 封装（使用绑定的 GHT 命名空间） ──────────────────
async function kvGet(ns, key) {
  try { const v = await ns.get(key); return v != null ? v : null; } catch (e) { return null; }
}

async function kvPut(ns, key, value) {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  await ns.put(key, body);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const ns = env.GHT;
    if (!ns) return json({ error: 'KV namespace GHT not bound' }, 500);

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // 公开：读取配置
    if (path === '/api/config' && request.method === 'GET') {
      const raw = await kvGet(ns, 'config');
      return json(raw ? JSON.parse(raw) : {});
    }

    // 登录：校验密码，返回 token
    if (path === '/api/login' && request.method === 'POST') {
      let pwd = '';
      try { pwd = (await request.json()).password || ''; } catch (e) {}
      if (pwd && pwd === env.ADMIN_PWD) {
        const token = await expectedToken(env);
        // 密码正确但 SECRET 未配置 → 明确报错，避免返回 token:null 被前端误判为"密码错误"
        if (!token) {
          return json({ ok: false, error: 'secret_missing', message: '服务端未配置 SECRET，无法签发登录 token，请在 Worker 环境变量中设置 SECRET 后重试' }, 500);
        }
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
      await kvPut(ns, 'config', body);
      return json({ ok: true, ...body });
    }

    // 列出已备份轨迹
    if (path === '/api/tracks' && request.method === 'GET') {
      const raw = await kvGet(ns, '_index');
      const list = raw ? JSON.parse(raw) : [];
      return json({ ok: true, tracks: list });
    }

    // 上传原始 GPX 备份：body = { files: [{ name, content }] }
    if (path === '/api/upload' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
      const files = Array.isArray(body.files) ? body.files : [];

      // 读现有索引
      const idxRaw = await kvGet(ns, '_index');
      const index = idxRaw ? JSON.parse(idxRaw) : [];

      for (const f of files) {
        if (f && typeof f.name === 'string' && typeof f.content === 'string') {
          const safeName = f.name.replace(/[^\w.\-]/g, '_');
          await kvPut(ns, 'gpx:' + safeName, f.content);
          if (!index.includes(safeName)) index.push(safeName);
        }
      }
      // 更新索引
      await kvPut(ns, '_index', index);
      return json({ ok: true, count: files.length, tracks: index });
    }

    return json({ error: 'not found' }, 404);
  }
};
