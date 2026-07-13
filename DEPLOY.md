# GHT 追踪平台 · 免费部署清单（Netlify 前台 + Render 后台）

**不需要买域名。** 两个平台都会给你免费子域名：
- 前台：`https://<你的名>.netlify.app`
- 后台：`https://<你的名>.onrender.com`

架构：前台静态托管在 Netlify（全球 CDN），后端 Node 跑在 Render，两者通过 `index-notwo.html` 里的 `<meta name="ght-backend">` 关联，后端已加 CORS 支持跨域。

---

## 前置条件
1. 一个 GitHub 账号（Netlify / Render 都从 GitHub 拉代码）
2. 把 `ght-trek/` 整个目录推到 GitHub 仓库
3. **确保 `secrets.json` 没有被提交**（已在 `.gitignore` 忽略）。
   若仓库里已提交了它，执行：`git rm --cached secrets.json` 再 push。

---

## 一、后台（Render）

1. 打开 https://render.com → 用 GitHub 注册登录
2. **New → Blueprint** → 连接 GitHub → 选 `ght-trek` 仓库（根目录有 `render.yaml`）
3. 确认 service 类型 `web`、plan 选 **Free**
4. 在 **Environment** 里设置环境变量：
   - `GHT_ADMIN_PWD` = 你的主人密码（**务必改掉默认 ght2026**）
   - `GHT_SECRET` = 一长串随机字符串（用于签发登录 token）
   - `GHT_CORS_ORIGIN` = `https://<你的名>.netlify.app`（或填 `*` 放行所有来源）
5. 点 **Deploy** → 等构建完成，记下后台地址，形如
   `https://ght-trek-backend.onrender.com`

> ⚠️ **免费层两个已知限制**
> - 15 分钟无访问会**休眠**，下次打开冷启动约 20–30 秒（访客首次进地图可能要等一下）
> - **文件系统重启会重置**：上传的 GPX 在重新部署 / 实例重启后可能丢失。
>   缓解办法（任选）：
>   ① 上传后本地留一份 GPX 备份（浏览器 localStorage 里也有一份解析后的数据）；
>   ② 在 Render 加一个 **Disk**（付费，约 $0.1–0.25/GB·月）挂到 `/data`；
>   ③ 进阶：把文件存储换成 Cloudflare R2 / Supabase Storage。

---

## 二、前台（Netlify）

1. 打开 https://netlify.com → 用 GitHub 注册登录
2. **Add new site → Import from Git** → 选 `ght-trek` 仓库
3. Build 设置：**Build command 留空**，**Publish directory 填 `.`**
   （`netlify.toml` 已配好根目录发布 + `/` 重定向到 `index-notwo.html`）
4. 点 **Deploy** → 记下前台地址，形如 `https://ght-trek.netlify.app`
5. **把前台指向后台**：编辑 `index-notwo.html` 第 6 行附近：
   ```html
   <meta name="ght-backend" content="">
   ```
   改成你的 Render 后台地址：
   ```html
   <meta name="ght-backend" content="https://ght-trek-backend.onrender.com">
   ```
   保存后 `git push`，Netlify 会自动重新部署。

---

## 三、联调验证

1. 打开前台 `https://<名>.netlify.app`
2. 右上角 **🔧 数据管理** → 输入密码 → 应提示「登录成功」
3. 上传一个 GPX → 在 Render 后台的 Shell 里执行 `ls data/tracks` 应能看到文件
4. 打开浏览器控制台（F12）→ 不应有红色 **CORS** 报错
   （若有，检查 Render 的 `GHT_CORS_ORIGIN` 是否填成了你的 Netlify 地址）

---

## 四、安全提醒

- `secrets.json` 已被 `.gitignore` 忽略，**不要**提交到公开仓库
- 后台密码只通过 Render 环境变量 `GHT_ADMIN_PWD` 设置，绝不写回代码
- Netlify 侧已把 `secrets.json` / `config.json` 重定向到 404，避免源码泄露
- 访客只能读地图、不能上传；上传入口受密码保护（token 存在 sessionStorage，关页即失效）

---

## 备选：想省掉跨域 / 两个平台？
- **全放 Render**（单源、免 CORS）：把前台也作为一个 Static Site 挂到 Render，或用 Render 的 Web Service 直接托管（server.js 已含 `express.static` 可同时服务前端）。代价：前台没有 Netlify 的全球 CDN 加速。
- **想要不休眠 + 持久存储**：见DEPLOY 之外方案——Cloudflare Pages + Workers + R2，或 Supabase，可彻底替代 Node 后台。
