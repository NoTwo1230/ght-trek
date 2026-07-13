// GHT 高线徒步追踪 — 极简配置后台
// 功能：真密码登录（密码不进前端）、GPX 落服务器、配置存服务端
// 运行：node server.js   （依赖 express + multer，通过 NODE_PATH 提供）
// 部署：GHT_ADMIN_PWD 环境变量设置主人密码；GHT_SECRET 用于签发登录 token；PORT 指定端口

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5506;
const SECRET = process.env.GHT_SECRET || 'ght-dev-secret-change-me';
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data', 'tracks');
fs.mkdirSync(DATA_DIR, { recursive: true });

// ── 加载主人密码（优先级：环境变量 > secrets.json > 默认）──
function loadAdminPassword() {
  if (process.env.GHT_ADMIN_PWD) return process.env.GHT_ADMIN_PWD;
  try {
    const s = JSON.parse(fs.readFileSync(path.join(ROOT, 'secrets.json'), 'utf8'));
    if (s && s.adminPassword) return s.adminPassword;
  } catch (e) { /* ignore */ }
  console.warn('[ght] 未设置 GHT_ADMIN_PWD，使用默认密码 ght2026（生产环境请尽快修改）');
  return 'ght2026';
}
const ADMIN_PWD = loadAdminPassword();

// ── 配置读写 ──
const CONFIG_PATH = path.join(ROOT, 'config.json');
function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch (e) { return {}; }
}
function writeConfig(obj) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(obj, null, 2));
}

// ── 登录 token（HMAC 签名，24h 有效）──
function makeToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 24 * 3600 * 1000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}
function verifyToken(req) {
  const h = req.headers['authorization'] || '';
  const m = h.match(/^Bearer\s+(.+)$/);
  if (!m) return false;
  const parts = m[1].split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  if (sig !== expected) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (data.exp && data.exp < Date.now()) return false;
    return true;
  } catch (e) { return false; }
}
function requireAuth(req, res, next) {
  if (verifyToken(req)) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

app.use(express.json());

// ── CORS（允许前台跨域调用；默认放行所有来源，生产用 GHT_CORS_ORIGIN 锁定前台域名）──
const CORS_ORIGIN = process.env.GHT_CORS_ORIGIN || '*';
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// ── 登录 ──
app.post('/api/login', (req, res) => {
  const pwd = (req.body && req.body.password) || '';
  if (pwd === ADMIN_PWD) return res.json({ token: makeToken() });
  return res.status(401).json({ error: 'wrong password' });
});

// ── 配置（读公开，写需鉴权）──
app.get('/api/config', (req, res) => res.json(readConfig()));
app.put('/api/config', requireAuth, (req, res) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'bad body' });
  const merged = Object.assign({}, readConfig(), req.body);
  writeConfig(merged);
  res.json(merged);
});

// ── 上传 GPX（需鉴权，落盘 data/tracks）──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DATA_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^A-Za-z0-9._-]/g, '_');
    cb(null, safe);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024, files: 50 } });
app.post('/api/upload', requireAuth, upload.array('files', 50), (req, res) => {
  const files = (req.files || []).map(f => f.filename);
  res.json({ files });
});

// ── 列出已上传轨迹（需鉴权）──
app.get('/api/tracks', requireAuth, (req, res) => {
  fs.readdir(DATA_DIR, (e, list) => {
    if (e) return res.json({ files: [] });
    res.json({ files: list.filter(f => /\.(gpx|kml|geojson)$/i.test(f)) });
  });
});

// ── 公开只读：已上传轨迹（地图/加载用）──
app.use('/tracks', express.static(DATA_DIR, { acceptRanges: true }));

// ── 静态站点（屏蔽敏感文件）──
const BLOCKED = new Set(['secrets.json', 'config.json', 'server.js', 'package.json', 'package-lock.json', '.DS_Store']);
app.use((req, res, next) => {
  const f = req.path.split('?')[0].replace(/^\/+/, '');
  if (BLOCKED.has(f)) return res.status(404).end();
  if (f.startsWith('node_modules') || f.startsWith('data') || f.startsWith('.')) return res.status(404).end();
  next();
});
app.use(express.static(ROOT, { extensions: ['html'] }));

// 路由级错误捕获（multer 等中间件抛错时返回 500 + 信息，而非断开连接）
app.use((err, req, res, next) => {
  console.error('[ght] route error:', err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: (err && err.message) || 'internal error' });
});

app.listen(PORT, () => {
  console.log(`GHT 配置后台已启动: http://localhost:${PORT}`);
  console.log(`  登录接口: POST /api/login`);
  console.log(`  轨迹上传: POST /api/upload  (需 token)`);
  console.log(`  配置接口: GET/PUT /api/config`);
});
