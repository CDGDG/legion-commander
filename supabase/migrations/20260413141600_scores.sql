create table if not exists public.scores (
  id bigserial primary key,
  name text not null,
  score int not null,
  room int not null default 0,
  ascension int not null default 0,
  kills int not null default 0,
  weapon text not null default '',
  created_at timestamptz default now()
);
create index if not exists scores_score_idx on public.scores(score desc);
alter table public.scores enable row level security;
drop policy if exists "anyone reads" on public.scores;
drop policy if exists "anyone inserts" on public.scores;
create policy "anyone reads" on public.scores for select using (true);
create policy "anyone inserts" on public.scores for insert with check (true);
