# GHT 追踪平台 · 免费部署清单（Netlify 前台 + Supabase 后台）

**不需要买域名，也不需要国际银行卡。** 两个平台都免费、都给你子域名：
- 前台：`https://<你的名>.netlify.app`（静态托管，全球 CDN）
- 后台：`https://<你的项目>.supabase.co`（Auth + Storage + 数据库，免运维、不休眠、不丢文件）

架构：前台是纯静态页面，挂在 Netlify；所有「密码登录 / 配置持久化 / GPX 备份」都走 Supabase 的 JavaScript SDK（已通过 CDN 引入，无需构建）。前端只持有登录后的会话 JWT，密码只在 Supabase 里。

---

## 前置条件
1. 一个 GitHub 账号（Netlify 从 GitHub 拉代码）
2. 把 `ght-trek/` 整个目录推到 GitHub 仓库
3. 一个邮箱（用于注册 Supabase 账号，**不需要信用卡**）

---

## 一、后台（Supabase，免卡）

1. 打开 https://supabase.com → **Start your project** → 用 GitHub / 邮箱注册（**不绑卡**）
2. 新建一个 Project：填名字 `ght-trek`、设一个数据库密码（记一下）、区域选 **Singapore** 或 **Northeast Asia**
3. 等约 1–2 分钟建好，进入项目控制台
4. **SQL Editor** → 新建查询 → 把本仓库 `SUPABASE_SETUP.sql` 的内容整段粘贴 → **Run**
   → 会建好 `site_config` 表 + `gpx` 存储桶 + 读写权限策略
5. **Authentication → Users → Add user**：
   - 邮箱：`owner@ght.app`（须与 `index-notwo.html` 里 `<meta name="supabase-email">` 一致）
   - 密码：自己设一个强密码（例如 `Ght2026!Himalaya`）
   - 勾选 **Auto Confirm User**
6. **Settings → API**：复制两样东西备用：
   - **Project URL**（形如 `https://xxxx.supabase.co`）
   - **anon public key**（一长串 `eyJ...`）

> 为什么免卡还安全：前端嵌入的 `anon key` 是公开密钥，真正写数据靠登录后的 JWT；RLS 策略已规定「配置/文件公开读、登录才能写」。

---

## 二、前台（Netlify，免卡）

1. 打开 https://netlify.com → 用 GitHub 注册登录
2. **Add new site → Import from Git** → 选 `ght-trek` 仓库
3. Build 设置：**Build command 留空**，**Publish directory 填 `.`**
   （`netlify.toml` 已配好根目录发布 + `/` 重定向到 `index-notwo.html`）
4. 点 **Deploy** → 记下前台地址，形如 `https://ght-trek.netlify.app`

---

## 三、把 Supabase 接上前台（关键一步）

编辑 `index-notwo.html` 头部（第 6–8 行附近），填好刚才复制的两样东西：
```html
<meta name="supabase-url" content="https://xxxx.supabase.co">
<meta name="supabase-anon" content="eyJxxxxxxxxxxxxx">
<meta name="supabase-email" content="owner@ght.app">
```
保存 → `git push` → Netlify 自动重新部署。

（主人邮箱若改成别的，三个地方要一致：Supabase 用户邮箱、这里 `supabase-email`、登录时输入的账号。）

---

## 四、联调验证

1. 打开前台 `https://<名>.netlify.app`
2. 右上角 **🔧 数据管理** → 输入你在 Supabase 设的主人密码 → 应解锁出上传区
3. 上传一个 GPX → Supabase 后台 **Storage → gpx** 桶里应能看到文件
4. 刷新页面（或换无痕窗口）→ 配置（语言/出发日期）仍生效 = 持久化 OK
5. 按 **F12** 看 Console → 不应有红色报错

---

## 五、安全与维护提醒

- `anon key` 可公开嵌入，但**切勿**把 Supabase 的 **service_role key** 写进前端（那是绕过 RLS 的万能钥匙）
- 主人密码就是 Supabase 那个用户的密码；忘记就在 Supabase → Authentication → 重置
- 前台是纯静态，改完代码 `git push` 即自动重新部署
- 想绑定自己域名可后续再加（需自行购买），免费子域名已足够用

---

## 备选方案（当初因「没国际卡」才选 Supabase）
- 若有国际卡且想要「自己跑服务器」：可换回 Node 后台挂 Render（需绑卡，免费层会休眠、磁盘重启会清数据）
- 若连 Supabase 都不想用：可退化为纯静态（无后台，密码闸退回隐藏按钮，GPX 需 git 提交进仓库）
