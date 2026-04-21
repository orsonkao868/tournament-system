/* ============================================================
   js/supabase.js — Supabase 連線設定與初始化
   ============================================================

   使用方式：
   1. 到 https://supabase.com 建立免費專案
   2. 在專案 Settings > API 複製 Project URL 與 anon key
   3. 貼到下方 SUPABASE_URL 與 SUPABASE_KEY

   資料表結構（在 Supabase SQL Editor 執行）：

   -- 賽事
   create table tournaments (
     id          uuid primary key default gen_random_uuid(),
     name        text not null,
     location    text,
     format      text not null,  -- 'single' | 'double' | 'swiss' | 'group'
     size        int  not null,  -- 16 | 32 | 48 | 96
     status      text not null default 'upcoming', -- 'upcoming' | 'open' | 'live' | 'done'
     note        text,
     created_at  timestamptz default now(),
     starts_at   date
   );

   -- 參賽者
   create table participants (
     id              uuid primary key default gen_random_uuid(),
     tournament_id   uuid references tournaments(id) on delete cascade,
     name            text not null,
     beyblade        text,
     bey_type        text,  -- 'Attack' | 'Defense' | 'Stamina' | 'Balance'
     seed            int,
     created_at      timestamptz default now()
   );

   -- 對戰紀錄
   create table matches (
     id              uuid primary key default gen_random_uuid(),
     tournament_id   uuid references tournaments(id) on delete cascade,
     round           int  not null,
     position        int  not null,
     player1_id      uuid references participants(id),
     player2_id      uuid references participants(id),
     winner_id       uuid references participants(id),
     score1          int default 0,
     score2          int default 0,
     status          text default 'pending', -- 'pending' | 'live' | 'done'
     created_at      timestamptz default now()
   );

   -- Row Level Security（公開讀取，需登入才能寫入）
   alter table tournaments  enable row level security;
   alter table participants enable row level security;
   alter table matches      enable row level security;

   create policy "公開讀取" on tournaments  for select using (true);
   create policy "公開讀取" on participants for select using (true);
   create policy "公開讀取" on matches      for select using (true);

   ============================================================ */

const SUPABASE_URL = 'https://jycnwieurqdbbcxznucp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_lWTYUgWva6xwMMIvHSGYfQ_PJtsQbkT';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

/* 匯出供其他模組使用 */
window.db = db;