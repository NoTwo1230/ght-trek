-- ============================================================
--  GHT 追踪平台 · Supabase 初始化脚本
--  在 Supabase 后台 → SQL Editor → 粘贴本文件 → Run 即可
--  只需执行一次。
-- ============================================================

-- 1) 配置表（单行 id=1：语言 / 出发日期 / 队名 / 起点 / 总距离）
create table if not exists public.site_config (
  id int8 primary key default 1,
  "language" text default 'zh',
  "itineraryStartDate" text default '2026-11-01',
  "expeditionName" text default '',
  "startPlaceName" text default 'Phungling',
  "totalDistance" numeric default 1580
);

insert into public.site_config (id, "language", "itineraryStartDate", "expeditionName", "startPlaceName", "totalDistance")
values (1, 'zh', '2026-11-01', '', 'Phungling', 1580)
on conflict (id) do nothing;

-- 2) 开启行级安全（RLS），默认谁都不能动，下面再放行
alter table public.site_config enable row level security;

-- 配置：任何人可读（访客也要拿到语言 / 出发日期）
drop policy if exists "config public read" on public.site_config;
create policy "config public read"
  on public.site_config for select
  using (true);

-- 配置：仅登录用户可写（改语言 / 出发日期）
drop policy if exists "config owner write" on public.site_config;
create policy "config owner write"
  on public.site_config for update
  using (auth.uid() is not null);

drop policy if exists "config owner insert" on public.site_config;
create policy "config owner insert"
  on public.site_config for insert
  with check (auth.uid() is not null);

-- 3) 存储桶 gpx（公开读，登录写）：存主人上传的原始 GPX 备份
insert into storage.buckets (id, name, public)
values ('gpx', 'gpx', true)
on conflict (id) do nothing;

-- 桶内对象：任何人可读（地图轨迹可被访客加载）
drop policy if exists "gpx public read" on storage.objects;
create policy "gpx public read"
  on storage.objects for select
  using (bucket_id = 'gpx');

-- 桶内对象：仅登录用户可上传 / 删除
drop policy if exists "gpx owner write" on storage.objects;
create policy "gpx owner write"
  on storage.objects for insert
  with check (bucket_id = 'gpx' and auth.uid() is not null);

drop policy if exists "gpx owner delete" on storage.objects;
create policy "gpx owner delete"
  on storage.objects for delete
  using (bucket_id = 'gpx' and auth.uid() is not null);

-- ============================================================
--  完成后，请再到 Authentication → Users → Add user 创建一个主人账号：
--    邮箱：owner@ght.app   （须与 index-notwo.html 里 <meta name="supabase-email"> 一致）
--    密码：你自己设一个强密码（例如 Ght2026!Himalaya）
--    勾选 "Auto Confirm User"（自动确认，无需收验证邮件）
--  然后把这个账号的邮箱 / 密码，作为「🔧 数据管理」里要输入的密码。
-- ============================================================
