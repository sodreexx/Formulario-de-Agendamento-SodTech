-- Schema do formulário de agendamento (Sod Tech).
-- Rode isto uma vez no SQL Editor do Supabase (dashboard → SQL Editor → New
-- query → colar → Run). Veja docs/superpowers/specs/2026-08-22-vercel-supabase-backend-migration-design.md
-- para o design completo.

-- gen_random_uuid() já é nativo no Postgres do Supabase (não precisa da
-- extensão pgcrypto, que era necessária só em versões antigas do Postgres).

create table if not exists leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  dial        text not null,
  phone       text not null,
  name        text not null,
  company     text not null,
  email       text not null,
  size        text not null,
  goal        text not null,
  date        text not null,
  time        text not null,
  notes       text not null default '',
  email_sent  boolean not null default false
);

-- Ordem natural de consulta no dashboard: mais recentes primeiro.
create index if not exists leads_created_at_idx on leads (created_at desc);

create table if not exists rate_limit_hits (
  id         bigint generated always as identity primary key,
  email      text not null,
  ip         text not null,
  created_at timestamptz not null default now()
);

-- Cada checagem de limite filtra por email OU ip e depois por created_at
-- (janela de tempo) — coluna de igualdade primeiro, coluna de intervalo
-- depois, na ordem que o Postgres usa melhor.
create index if not exists rate_limit_hits_email_idx on rate_limit_hits (email, created_at);
create index if not exists rate_limit_hits_ip_idx on rate_limit_hits (ip, created_at);

-- RLS ligado nas duas tabelas, sem NENHUMA política para anon/authenticated.
-- Com RLS ativo e zero políticas, o acesso via chave anônima ou autenticada
-- fica totalmente bloqueado por padrão — não precisa de uma política
-- explícita de "negar tudo". Só a service_role (usada exclusivamente pelas
-- funções serverless, nunca exposta ao navegador) ignora RLS e acessa
-- normalmente, porque o Supabase já concede BYPASSRLS a essa role.
alter table leads enable row level security;
alter table rate_limit_hits enable row level security;
