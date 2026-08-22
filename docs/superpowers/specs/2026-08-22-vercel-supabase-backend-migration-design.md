# Migração do back-end: Express/Render → Vercel Serverless + Supabase

**Data:** 2026-08-22
**Status:** Aprovado, aguardando plano de implementação

## Contexto e motivação

O back-end hoje é um servidor Express (`server/`), pensado para deploy na
Render. O plano gratuito da Render hiberna o serviço após ~15 min sem uso, e
a primeira requisição depois disso demora 30-50s pra "acordar" — inviável
para a experiência de quem preenche o formulário.

Decisão: migrar para funções serverless na Vercel (mesmo domínio do
front-end, sem hibernação) e usar Supabase (Postgres gerenciado) como banco,
resolvendo dois problemas de uma vez:

1. Elimina a hibernação, mantendo tudo gratuito.
2. Dá um lugar confiável para persistir o *rate limit* entre invocações
   serverless (que não compartilham memória como um processo Express único) —
   e, como ganho adicional, um histórico consultável dos agendamentos
   enviados (tabela `leads`).

## Arquitetura

Front-end estático (Vite/React) e funções serverless em `/api` no mesmo
deploy Vercel, mesma origem — **CORS deixa de ser um problema** (não há mais
`ALLOWED_ORIGIN`, nem rewrite para um domínio de back-end separado).

```
Browser → POST /api/agendamento (mesma origem)
              │
              ├─→ valida payload (lib/validation.js)
              ├─→ verifica limite (Supabase: rate_limit_hits)
              ├─→ grava o lead (Supabase: leads)
              └─→ envia e-mail (Nodemailer/Gmail, inalterado)
```

### Por que Vercel Functions (Node.js) + supabase-js, e não outras opções

- **Vercel Edge Functions** foi descartado: o runtime Edge não roda
  Nodemailer (depende de APIs Node ausentes no Edge). Usar Edge exigiria
  trocar o envio de e-mail inteiro por uma API HTTP (Resend, SendGrid) —
  escopo maior do que o pedido, só para ganhar um cold start ainda menor que
  o de Node (que já é aceitável: ~100-200ms).
- **Conexão direta ao Postgres (`pg` + pooler do Supabase)** foi descartado:
  exigiria configurar o modo *transaction* do pooler com cuidado para não
  esgotar conexões com múltiplas invocações simultâneas — complexidade sem
  benefício real, já que as consultas daqui são triviais (contar linhas,
  inserir um registro). `supabase-js` fala com o banco via REST/HTTP, sem
  conexão persistente para gerenciar — mais simples e mais robusto em
  ambiente serverless.

## Estrutura de arquivos

```
api/
  agendamento.js   → POST, substitui a rota do Express
  health.js        → GET, substitui /api/health
lib/
  validation.js    → já migrado de server/validation.js (sem alteração de regras)
  supabase.js      → cria e exporta o cliente Supabase (singleton por instância quente)
  rate-limit.js    → checkAndRecord(email, ip) — lógica descrita abaixo
  mailer.js        → transporter Nodemailer + buildEmail, extraído de server/index.js
```

Removidos do repositório: `server/` (inteiro), `render.yaml`, `vercel.json`
por completo — sem rewrite para configurar, a Vercel detecta o build do Vite
(via `package.json`) e as funções em `/api/*.js` automaticamente, sem
nenhuma configuração explícita necessária.

## Schema no Supabase

```sql
create table leads (
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

create table rate_limit_hits (
  id         bigint generated always as identity primary key,
  email      text not null,
  ip         text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_hits_email_idx on rate_limit_hits (email, created_at);
create index rate_limit_hits_ip_idx on rate_limit_hits (ip, created_at);
```

RLS ligado nas duas tabelas, sem nenhuma política liberando `anon` ou
`authenticated` — apenas a *service role key* (usada só no servidor, nunca
exposta ao cliente) tem acesso, já que ela ignora RLS por padrão.

`email_sent` registra se a notificação foi entregue. Isso significa que,
mesmo se o Gmail falhar, o lead não se perde — fica salvo no banco e pode ser
consultado manualmente.

## Regra do limite de envio

Uma única tabela (`rate_limit_hits`) guarda e-mail e IP juntos em cada
tentativa, em vez de contadores separados por *scope*. A checagem, na ordem:

1. **Limite por IP:** conta tentativas desse IP nos últimos 15 minutos. 5 ou
   mais → bloqueia (`429`, "muitas tentativas, aguarde").
2. **Limite por e-mail, só contando tentativas de um IP diferente:** conta
   tentativas desse e-mail vindas de IP **diferente** do atual, na última
   hora. Uma ou mais → bloqueia (`429`, "já recebemos sua solicitação").

**Efeito prático:** um cliente que erra a data e corrige na hora, do mesmo
aparelho, sempre consegue reenviar (mesmo IP, sem limite de e-mail
aplicado) — até o teto de 5/15min do próprio IP, que é folgado o bastante
para uma correção. Alguém de outro lugar tentando floodar o mesmo e-mail de
destino é bloqueado pelo limite de e-mail, porque vem de IP diferente. O
teto de IP continua valendo como parede final em qualquer caso.

Cada checagem apaga de passagem linhas com mais de 1 dia (sem distinção de
e-mail/IP) — a tabela nunca cresce sem limite, sem precisar de um cron job
separado.

**Corrida entre requisições simultâneas** (ex.: duplo clique no mesmíssimo
milissegundo) pode, em teoria, deixar passar uma tentativa a mais antes que a
primeira grave sua linha. Decisão consciente de não resolver com
transação/lock — caso raro, de baixo impacto, não justificável num
formulário de captação de leads (YAGNI).

## Fluxo de `POST /api/agendamento`

1. Valida o payload (`lib/validation.js`) → inválido: `400 { ok:false, errors }`.
2. Extrai o IP de `x-forwarded-for` (primeiro valor da lista; a Vercel
   garante esse cabeçalho de forma confiável).
3. Checa os limites (IP, depois e-mail-de-outro-IP) → estourou: `429` com
   mensagem específica para cada caso.
4. Grava a tentativa em `rate_limit_hits` **antes** de tentar enviar — um
   retry automático após falha não ganha o limite de graça.
5. Insere o lead (`email_sent: false`).
6. Tenta enviar o e-mail via Nodemailer.
7. Se o envio deu certo, atualiza `email_sent: true`.

**Resiliência a falha parcial** — e-mail e banco falham de forma
independente, não em cascata:

| Lead salvo | E-mail enviado | Resposta |
|---|---|---|
| sim | sim | `200 { ok:true }` |
| sim | não | `200 { ok:true }` (dado não se perdeu; erro do e-mail só no log do servidor) |
| não | sim | `200 { ok:true }` (e-mail já é a notificação) |
| não | não | `502 { ok:false, error }` — pede para tentar de novo |

`GET /api/health` continua leve: confere se as variáveis de ambiente do
Gmail e do Supabase estão configuradas, sem bater no banco a cada chamada.

## Ambiente e variáveis

Só na Vercel agora:
- `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `NOTIFY_EMAIL` — inalterados
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — novos, só no servidor
- `ALLOWED_ORIGIN` **removido** — mesma origem, sem CORS

## Desenvolvimento local

Sem um Express local, a forma correta de simular as funções serverless da
Vercel é `vercel dev` (CLI oficial), que roda front-end e `/api` juntos,
igual à produção. Substitui o script `npm run dev` atual (baseado em
`concurrently` + Express). Requer `vercel link` uma vez para conectar a
pasta ao projeto Vercel antes do primeiro uso. `.claude/launch.json` precisa
ser atualizado para refletir isso.

`DEPLOY.md` fica mais curto: criar o projeto Supabase e rodar o SQL das
tabelas → importar o repo na Vercel → colar as variáveis → deploy. Sem
esperar uma URL de back-end antes, sem passo de liberar CORS depois.

## Plano de teste

Sem suíte automatizada no projeto (nenhum Jest/Vitest configurado) — segue o
padrão já usado nas mudanças anteriores desta sessão: verificação manual via
`curl` e via navegador antes de cada commit.

O Supabase é hospedado — não há como testar localmente sem instalar a CLI
própria dele (Postgres local), o que não se justifica para este formulário.
Um único projeto Supabase serve tanto para teste quanto produção; dados de
teste ficam óbvios (`"Teste Teste"`) e fáceis de apagar depois.

Sequência de verificação com `vercel dev` rodando local:

1. `GET /api/health` responde com `mailConfigured` e `dbConfigured`
2. Reenvio do mesmo IP, mesmo e-mail, dentro de 1h → permitido
3. Reenvio de IP diferente, mesmo e-mail, dentro de 1h → bloqueado
4. 5 tentativas do mesmo IP em <15min → a 6ª bloqueia
5. Lead gravado no Supabase com os campos certos e `email_sent` correto
6. Falha de e-mail simulada (credencial errada) → lead ainda salvo, resposta
   ainda `ok:true`
7. Fluxo completo pelo navegador: 8 perguntas → revisão → enviar → sucesso
8. `npx tsc --noEmit` e `npm run build` limpos

## Fora de escopo (YAGNI)

- Painel/dashboard para consultar os leads salvos (a tabela existe; consulta
  é feita direto no Supabase por enquanto)
- Testes automatizados (não existem no projeto hoje; não introduzidos aqui)
- Lock/transação para a corrida de requisições simultâneas no rate limit
- Cron job dedicado para limpeza da tabela de rate limit (feita de passagem
  em cada checagem)
