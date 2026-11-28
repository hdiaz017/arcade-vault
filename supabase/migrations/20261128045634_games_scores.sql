-- SPEC 06: registro de juegos propios y puntuaciones.

create table public.games (
  id         text primary key, -- mismo slug que en lib/games.ts
  title      text not null,
  created_at timestamptz not null default now()
);

create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games (id),
  player_name text not null
    check (player_name = btrim(player_name) and char_length(player_name) between 1 and 10),
  score       integer not null check (score > 0 and score <= 10000000),
  created_at  timestamptz not null default now()
);

create index scores_ranking_idx
  on public.scores (game_id, score desc, created_at asc);

-- Permisos: se quitan los que Supabase concede por defecto y se dan solo los necesarios.
revoke all on table public.games from anon, authenticated;
revoke all on table public.scores from anon, authenticated;

grant select on table public.games to anon, authenticated;
grant select on table public.scores to anon, authenticated;
-- Sin `id` ni `created_at`: los pone la base y la fecha decide los empates.
grant insert (game_id, player_name, score) on table public.scores to anon, authenticated;

alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "Cualquiera puede leer los juegos"
  on public.games for select
  to anon, authenticated
  using (true);

create policy "Cualquiera puede leer las puntuaciones"
  on public.scores for select
  to anon, authenticated
  using (true);

-- Sin autenticación: los valores válidos los limitan las restricciones de la tabla.
create policy "Cualquiera puede guardar una puntuación"
  on public.scores for insert
  to anon, authenticated
  with check (true);

insert into public.games (id, title) values ('asteroids', 'ASTEROIDS');
