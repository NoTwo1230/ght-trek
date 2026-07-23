/**
 * GHT Trek — 把本地备份恢复进 Cloudflare KV
 *
 * 把 ght-trek-cloud-backup-*.json 中的共享包写入 KV 命名空间 GHT_KV 的键 `share:all`，
 * 这样新站点 /api/share 立即有数据（轨迹、行程、日志全部恢复）。
 *
 * 用法（需要 Node 18+，自带 fetch）：
 *   export CF_ACCOUNT_ID=你的账户ID
 *   export CF_KV_NS=你的KV命名空间ID
 *   export CF_API_TOKEN=具有「账户→Workers KV 存储：编辑」权限的 API Token
 *   node migrate-to-kv.mjs [备份文件路径，默认 ght-trek-cloud-backup-2026-07-22.json]
 *
 * 说明：
 *   · 备份文件形如 { ok:true, data:{ preset, actual, itinerary, journal, ... } }
 *   · 写入 KV 的键 share:all 存的就是 data（与 /api/share 的 PUT 行为一致：前端读取后填充）
 *   · 仅恢复业务数据；GPX 原始备份( gpx:* )可选，不影响前端展示
 */

const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const NS_ID = process.env.CF_KV_NS;
const TOKEN = process.env.CF_API_TOKEN;

if (!ACCOUNT_ID || !NS_ID || !TOKEN) {
  console.error('缺少环境变量：请设置 CF_ACCOUNT_ID、CF_KV_NS、CF_API_TOKEN');
  process.exit(1);
}

const backupPath = process.argv[2] || 'ght-trek-cloud-backup-2026-07-22.json';
import fs from 'node:fs';
const raw = fs.readFileSync(backupPath, 'utf-8');
const backup = JSON.parse(raw);
const payload = backup && backup.ok ? backup.data : backup;
if (!payload || typeof payload !== 'object') {
  console.error('备份文件结构异常：缺少 data 对象');
  process.exit(1);
}
const value = JSON.stringify(payload);
console.log(`备份读取成功：约 ${(value.length / 1024 / 1024).toFixed(2)} MB，准备写入 share:all`);

const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${NS_ID}/values/${encodeURIComponent('share:all')}`;
const res = await fetch(url, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: value,
});
const text = await res.text();
if (!res.ok) {
  console.error(`写入失败（${res.status}）: ${text}`);
  process.exit(1);
}
console.log('✅ share:all 已写入 KV。部署完成后访问站点即可看到全部数据。');
