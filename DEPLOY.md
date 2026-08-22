# Deploy — Formulário de Agendamento (Sod Tech)

Guia passo a passo pra colocar o site no ar: **tudo na Vercel** (front-end +
back-end no mesmo deploy, funções serverless em `/api`) + **Supabase**
(banco, só pro limite de envio e o histórico de agendamentos).

Não existe mais um back-end separado — front e back ficam na mesma origem,
então não há CORS pra configurar nem uma segunda URL pra esperar.

---

## 0. Pré-requisito: subir o código pro GitHub

1. Crie um repositório novo (vazio, sem README) em https://github.com/new.
2. No terminal, dentro da pasta do projeto:

```bash
git remote add origin https://github.com/SEU-USUARIO/sod-tech-agendamento.git
git branch -M main
git push -u origin main
```

---

## 1. Banco no Supabase

1. Acesse https://supabase.com/dashboard → **New project** (plano gratuito).
2. Espere o projeto provisionar (1-2 minutos).
3. Abra **SQL Editor** → **New query**, cole o conteúdo de
   [`supabase/schema.sql`](supabase/schema.sql) e clique **Run**. Isso cria
   as tabelas `leads` e `rate_limit_hits`, já com RLS ligado.
4. Em **Project Settings → API**, copie:
   - **Project URL** → vai virar `SUPABASE_URL`
   - **service_role key** (não a `anon`/`public`!) → vai virar
     `SUPABASE_SERVICE_ROLE_KEY`

> A `service_role key` dá acesso total ao banco, ignorando as regras de
> segurança (RLS). Ela só deve existir nas variáveis de ambiente da Vercel
> (nunca no código, nunca no front-end) — é exatamente esse o motivo pelo
> qual as funções em `/api` continuam sendo peça necessária: o navegador
> nunca fala com o Supabase diretamente.

---

## 2. Front-end + back-end na Vercel

1. Acesse https://vercel.com/new, conecte o GitHub e importe o repositório.
2. A Vercel detecta automaticamente que é um projeto Vite (build command
   `npm run build`, output `dist`) e que `/api/*.js` são funções serverless —
   não precisa mexer em nada de configuração.
3. Antes de clicar em **Deploy**, adicione as variáveis de ambiente
   (**Environment Variables**):
   - `GMAIL_USER` → `sodreedev@gmail.com`
   - `GMAIL_APP_PASSWORD` → a senha de app de 16 letras (a mesma que já está
     no seu `.env` local)
   - `NOTIFY_EMAIL` → `sodreedev@gmail.com`
   - `SUPABASE_URL` → o Project URL copiado no passo 1.4
   - `SUPABASE_SERVICE_ROLE_KEY` → a service role key copiada no passo 1.4
4. Clique em **Deploy**. Ao final, você recebe uma URL tipo
   `https://sod-tech-agendamento.vercel.app`.

---

## 3. Testar no ar

1. Abra a URL da Vercel no navegador.
2. Preencha o formulário completo e clique em **Enviar**.
3. Confirme que o e-mail chegou em `sodreedev@gmail.com`.
4. No Supabase, abra **Table Editor → leads** e confirme que a linha
   apareceu com `email_sent = true`.

Sem hibernação, sem espera de 30-50s: a primeira requisição já responde
normalmente.

---

## Desenvolvimento local

`npm run dev` já sobe front-end e as funções de `/api` juntos (o Vite emula
localmente o mesmo formato que a Vercel roda em produção — veja
`vercelApiEmulator` em [`vite.config.ts`](vite.config.ts)). Crie um `.env` na
raiz (veja `.env.example`) com as mesmas variáveis do passo 2.3.

---

## Depois: domínio próprio (opcional, quando quiser)

Quando tiver um domínio (ex: `agendamento.sodtech.com.br`): Vercel → Project
→ Settings → Domains → adicionar o domínio e seguir as instruções de DNS.
Nenhuma outra configuração muda — o back-end é parte do mesmo deploy.
