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
   ├─ gpx:<文件名>  → 原始 GPX 文本（主人上传备份）
   └─ share:all     → 共享包（路线/实际轨迹/位置/日志/日程，所有人可读、仅主人可写）
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

> 说明：项目前台文件为 `index.html` + `styles.css` + `app.js` + `journal.html`（已拆分，无需构建），Pages 直接托管根目录静态文件，构建命令留空即可。

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

## 数据共享设计（全量共享）

> 场景：A 电脑（主人）上传 / 修改内容后，任何访客（含未登录、不同设备）打开页面都能看到同一份。权限是「**其他人只观看，只有主人可增改**」。

### 共享哪些数据
| 数据 | 来源 | 共享后 |
|------|------|--------|
| 计划路线（预设轨迹 / 分段 / 休息日 / 总距离） | 主人上传 GPX 后 `setAsPreset` | 所有人打开即见 |
| 已记录轨迹（actual） | 主人记录每日徒步 | 所有人打开即见 |
| 实时位置（currentPosition） | 主人设定 / 上传 | 所有人打开即见「最近一次推送的位置」 |
| 日志（journal） | `journal.html` 增删 | 所有人打开即见 |
| 日程安排（itinerary） | 主人编辑 | 所有人打开即见 |

### 机制
- **存储**：KV 单键 `share:all`，整包原子写入（单人 owner 场景最简单，不易出现半同步状态）。
- **读取接口 `GET /api/share`（公开，无需密码）**：返回 `share:all` 整包；无数据返回 `{ok:true, data:null}`。所有人（含未登录访客）打开页面即拉取并渲染，localStorage 退化为离线兜底。
- **写入接口 `PUT /api/share`（仅主人）**：复用登录 token 鉴权（`isOwner`）；把当前 5 类数据打包整体写入 KV。主人每做一次变更（设路线 / 加实际轨迹 / 存位置 / 存日程 / 日志增删）自动推送一次。
- **防互覆盖**：首页（`app.js`）与日志页（`journal.html`）是两个独立页面，各自只改自己那一片（前者路线/轨迹/位置/日程，后者日志），写入前先继承首次拉取的整包 `sharedCache`，再整体回写——谁都不会擦掉对方数据。
- **冲突策略**：最后写入者胜（last-write-wins）。单人 / 单主人场景足够，无需加锁。
- **实时位置粒度**：默认「基线推送」——位置在上传 / 手动设定时随共享包推一次，访客看到最近一次位置（零额外开销）。如需「接近实时直播」，可额外加每 ~30s 轮询 `GET /api/share`（未实现，按需再加）。

### 部署要点
- 本功能随 `worker/index.js` 的 `GET/PUT /api/share` 一同上线，**必须与前端 `app.js` / `journal.html` 同步发布**（任一方缺了都不会生效）。
- 前置条件：`SECRET` 必须有值并 Deploy（否则主人 `PUT` 会被 401，共享写不进去）。详见下方「常见问题排查」第一条。

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
