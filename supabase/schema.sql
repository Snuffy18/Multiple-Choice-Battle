-- ExamBattle Supabase Schema
-- Run this in the Supabase SQL editor to set up the database.

-- ─── Question Banks ───────────────────────────────────────────────────────────
create table if not exists question_banks (
  id          uuid primary key default gen_random_uuid(),
  topic       text not null,
  created_by  text not null,  -- admin username / user id
  created_at  timestamptz not null default now()
);

-- ─── Questions ────────────────────────────────────────────────────────────────
create table if not exists questions (
  id              uuid primary key default gen_random_uuid(),
  bank_id         uuid not null references question_banks(id) on delete cascade,
  text            text not null,
  option_a        text not null,
  option_b        text not null,
  option_c        text not null,
  option_d        text not null,
  correct_answer  char(1) not null check (correct_answer in ('A','B','C','D')),
  xp_reward       integer not null default 100,
  created_at      timestamptz not null default now()
);

-- ─── Rooms ────────────────────────────────────────────────────────────────────
-- All mutable game state lives here. Realtime subscriptions watch this row.
create table if not exists rooms (
  id                     text primary key,  -- 6-char room code e.g. "WOLF42"
  topic                  text not null,
  status                 text not null default 'waiting'
                           check (status in ('waiting','battle','finished')),
  admin_id               text not null,     -- username of creator
  starting_hearts        integer not null default 3,
  timer_seconds          integer not null default 20,
  question_bank_id       uuid references question_banks(id),
  -- JSONB snapshot of questions used in this battle (ordered array)
  questions_snapshot     jsonb,
  -- JSONB array of two player objects
  players                jsonb not null default '[]'::jsonb,
  current_turn           text,              -- playerId whose turn it is
  current_question_index integer not null default 0,
  turn_started_at        timestamptz,       -- server-stamped when turn begins
  winner_id              text,              -- set when status = 'finished'
  -- Reveal phase: set after every answer so both players see the correct answer
  reveal_until           timestamptz,
  last_question_index    integer,
  last_chosen_answer     text,
  -- Simultaneous mode
  mode                   text not null default 'turn',   -- 'turn' | 'simultaneous'
  answers_this_round     jsonb default '{}'::jsonb,      -- { [playerId]: { chosen, elapsed } }
  last_answers           jsonb default '{}'::jsonb,      -- { [playerId]: chosen } for reveal
  created_at             timestamptz not null default now()
);

-- ─── Game Events ──────────────────────────────────────────────────────────────
-- Append-only log — never updated, only inserted.
create table if not exists game_events (
  id              uuid primary key default gen_random_uuid(),
  room_id         text not null references rooms(id) on delete cascade,
  player_id       text not null,
  question_id     text not null,
  chosen_answer   char(1),                  -- null if timer expired
  correct         boolean not null,
  xp_delta        integer not null default 0,
  hearts_delta    integer not null default 0,
  created_at      timestamptz not null default now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists questions_bank_id_idx on questions(bank_id);
create index if not exists game_events_room_id_idx on game_events(room_id);

-- ─── Realtime ─────────────────────────────────────────────────────────────────
-- Enable realtime on the rooms table so clients receive live updates.
-- REPLICA IDENTITY FULL is required so payload.new includes all columns
-- (by default only the primary key is broadcast, breaking questions_snapshot etc.)
alter publication supabase_realtime add table rooms;
alter table rooms replica identity full;

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- For v1 (anonymous play) we allow all operations.
-- Tighten these for production.
alter table question_banks  enable row level security;
alter table questions        enable row level security;
alter table rooms            enable row level security;
alter table game_events      enable row level security;

create policy "Public read question_banks"  on question_banks  for select using (true);
create policy "Public insert question_banks" on question_banks for insert with check (true);
create policy "Public update question_banks" on question_banks for update using (true);
create policy "Public delete question_banks" on question_banks for delete using (true);

create policy "Public read questions"  on questions  for select using (true);
create policy "Public insert questions" on questions for insert with check (true);
create policy "Public update questions" on questions for update using (true);
create policy "Public delete questions" on questions for delete using (true);

create policy "Public read rooms"  on rooms  for select using (true);
create policy "Public insert rooms" on rooms for insert with check (true);
create policy "Public update rooms" on rooms for update using (true);

create policy "Public read game_events"  on game_events  for select using (true);
create policy "Public insert game_events" on game_events for insert with check (true);
