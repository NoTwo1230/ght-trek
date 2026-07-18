# GHT 徒步追踪 — 免费部署清单（Cloudflare 版，全程免卡）

> 路线：**Cloudflare Pages 前台 + Cloudflare Worker 后端（KV 存储）**
> 优点：注册**免银行卡**、**免组织权限**、免费层**不休眠**、**全球 CDN**。
> 代价：需把后端写成一个 Worker（已写好 `worker/index.js`，前端零改动）。

---

## 架构一览

```
浏览器 (Cloudflare Pages 托管 index.html)
   │  fetch 带 Bearer token
   ▼
Cloudflare Worker  (https://ght.gjt6nrf4jz.workers.dev)
   │  读/写
   ▼
Cloudflare KV 命名空间 GHT
   ├─ config        → 站点配置 JSON（语言/出发日期/名称…）
   └─ gpx:<文件名>  → 原始 GPX 文本（主人上传备份）
```

- 密码只存在 Worker 环境变量 `ADMIN_PWD`，前端只持有登录后下发的 HMAC token。
- 前台与后台跨域，Worker 已带 `Access-Control-Allow-Origin: *`，无需额外 CORS 配置。

---

## 三步上线

### ① 推代码到 GitHub（你来做，需登录你的账号）
仓库已 `git init` 并提交。用 GitHub Desktop 选 `ght-trek` 文件夹 → Publish，或终端：
```bash
git remote add origin https://github.com/<你>/ght-trek.git
git push -u origin main
```

### ② 建前台 Cloudflare Pages
1. 登录 <https://dash.cloudflare.com>（用邮箱注册，**无需绑卡**）。
2. 左侧 **Workers & Pages → Create → Pages → Connect to Git** → 选 `ght-trek` 仓库。
3. 设置：
   - Framework preset：**None**
   - Build command：**留空**（不填，仓库里已是单个 `index.html`，无需复制）
   - Build output directory：`/`（根目录）
4. 点 **Save and Deploy**。完成后会得到一个 `https://ght-trek.<你的子域>.pages.dev` 地址。

> 说明：项目里现在只有一个 `index.html`（前台主页面），直接被 Pages 托管，无需构建步骤。

### ③ 建后台 Cloudflare Worker
1. 左侧 **Workers & Pages → Create → Worker** → 取名 `ght` → 点 **Deploy**（先随便部署一次占位）。
2. 进入该 Worker → **Edit code**，把本仓库 `worker/index.js` 的**全部内容**粘贴进去 → **Deploy**。
3. 进入该 Worker → **Settings → Variables**：
   - **KV namespace bindings**：点 Add binding，Variable name 填 `GHT`，绑一个你新建的 KV 命名空间（没有就先去 **Workers & Pages → KV** 建一个，名字随意）。
   - **Environment Variables**：添加两条（明文即可）：
     - `ADMIN_PWD` = 你的上传密码（例如 `ght2026`）
     - `SECRET` = 任意一串随机字符（例如 `a9f3-…` 长一点），用于签发登录 token
4. 记下 Worker 地址：`https://ght.gjt6nrf4jz.workers.dev`

### ④ 回填后端地址 + 重新部署
1. 打开 `index.html`，找到这一行：
   ```html
   <meta name="ght-api" content="">
   ```
   把 `content` 填成你的 Worker 地址，例如：
   ```html
   <meta name="ght-api" content="https://ght.gjt6nrf4jz.workers.dev">
   ```
2. 保存 → 推送到 GitHub → Cloudflare Pages 会自动重新部署。

---

## 验证
打开前台地址，点右上角 **🔧 数据管理** → 输入 `ADMIN_PWD` → 能登录、能上传 GPX、浏览器控制台无 CORS 报错，即成功。

---

## 免费额度（够用）
- Pages：无限静态请求、自动 HTTPS、全球 CDN。
- Worker：每天 10 万次请求、10ms CPU/请求（足够个人徒步追踪）。
- KV：每天 10 万次读、1000 次写（GPX 备份、配置写入完全够）。

## 安全要点
- **绝不**把 Worker 的 `SECRET` 写进前端 HTML。
- `ADMIN_PWD` 只在 Worker 环境变量里，前端永远看不到明文。
- KV 中 `gpx:*` 仅主人登录后可写；`config` 公开可读（仅出发日期等无害信息）。

---

## 常见问题排查

### 登录 / 删除日志报「密码错误」，但密码确实正确
- **现象**：在「🔧 数据管理」或「📝 日志」页输入正确密码，却提示密码错误、或点「确认删除」后弹窗卡住无反应。
- **根因**：Worker 环境变量 `SECRET` 未设置（或值为空）。登录 token 由 `HMAC(SECRET, ADMIN_PWD)` 签发，`SECRET` 缺失时 token 为 `null`，旧逻辑会返回 `200 {ok:true, token:null}`，前端因此误判成「密码错误」。
- **已合入的修复**：服务端在「密码正确但 SECRET 缺失」时明确返回 `500 {ok:false, error:"secret_missing", message:"服务端未配置 SECRET…"}`；前端改为以 `data.ok` 为准并透传真实原因，不再误报密码错、也不再卡死。
- **你必须做的**：进入 `ght` Worker → **Settings → Variables**，确认 `SECRET` 这一行**有值**（任意随机长串，如 `ght-2026-07-18-random-secret-key`），保存后 **Deploy**。填好前，删除 / 上传等功能不会真正恢复。
- **易踩的坑**：把 `ADMIN_PWD` / `SECRET` 从 Plaintext 改成 **Secret 类型（加密存储）≠ 填入值**。两者都要「有值」才能签发 token。

### 同一网址在两台电脑上显示的轨迹不一样
- **现象**：在 A 电脑上传过预设轨迹，打开站点能看到；在 B 电脑打开同一网址，却看不到任何轨迹。
- **原因**：站点渲染用的轨迹 / 预设路线 / 行程 / 日志 / 进度**全部存在浏览器的 localStorage（本地）**，是按设备隔离的——和网址无关，和「哪台电脑 / 哪个浏览器」有关。服务端 KV 只是你**上传 GPX 时的原始文件备份**（且只在主人态登录后写入），前端并不会在打开页面时自动从 KV 把轨迹拉回来。
- **含义**：在 B 电脑想看到轨迹，要么重新上传一次 GPX，要么手动从 KV 备份取回再导入；清过浏览器数据则会丢失本地副本（KV 备份仍在，前提是你曾在 A 电脑登录后上传过）。
- **参考价值数据**（`window.GHT_SECTIONS` 13 段区域信息）是打包在前端的静态数据，每台电脑都一样，那不是「你的轨迹」。
