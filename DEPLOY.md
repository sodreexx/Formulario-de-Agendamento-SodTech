# Deploy — Formulário de Agendamento (Sod Tech)

Guia passo a passo pra colocar o site no ar: **front-end na Vercel** + **back-end
na Render**, usando os subdomínios gratuitos de cada um.

A ordem importa: back-end primeiro (pra saber a URL final), depois front-end
(apontando pra essa URL), depois voltar no back-end pra liberar o CORS.

---

## 0. Pré-requisito: subir o código pro GitHub

1. Crie um repositório novo (vazio, sem README) em https://github.com/new —
   por exemplo `sod-tech-agendamento`.
2. No terminal, dentro da pasta do projeto:

```bash
git remote add origin https://github.com/SEU-USUARIO/sod-tech-agendamento.git
git branch -M main
git push -u origin main
```

---

## 1. Back-end na Render

1. Acesse https://dashboard.render.com → **New** → **Blueprint**.
2. Conecte sua conta do GitHub e selecione o repositório.
3. A Render vai detectar o arquivo `render.yaml` na raiz do projeto e propor o
   serviço `sod-tech-agendamento-api` automaticamente (raiz em `server/`).
4. Antes de confirmar, ela vai pedir pra preencher as variáveis de ambiente
   (elas ficam marcadas como "sync: false" de propósito, pra nunca ir pro
   git):
   - `GMAIL_USER` → `sodreedev@gmail.com`
   - `GMAIL_APP_PASSWORD` → a senha de app de 16 letras (a mesma que já está
     no seu `server/.env` local)
   - `NOTIFY_EMAIL` → `sodreedev@gmail.com`
   - `ALLOWED_ORIGIN` → deixe `http://localhost:8443` por enquanto, vamos
     trocar no passo 3
5. Clique em **Apply** / **Create**. Espere o deploy terminar (alguns
   minutos).
6. Copie a URL que a Render gerou, algo como
   `https://sod-tech-agendamento-api.onrender.com`.

> **Plano gratuito da Render "dorme"** depois de ~15 min sem uso, e a
> primeira requisição depois disso demora ~30-50s pra "acordar" o serviço.
> Isso é normal no plano free — não é bug. Se isso incomodar, dá pra migrar
> pro plano pago (~7 USD/mês) depois.

---

## 2. Front-end na Vercel

1. Abra `[vercel.json](vercel.json)` neste projeto e troque
   `SUBSTITUA-PELA-URL-DO-RENDER.onrender.com` pela URL que você copiou no
   passo 1.6. Depois:

```bash
git add vercel.json
git commit -m "Aponta o proxy /api para o back-end da Render"
git push
```

2. Acesse https://vercel.com/new, conecte o GitHub e importe o mesmo
   repositório.
3. A Vercel detecta automaticamente que é um projeto Vite (build command
   `npm run build`, output `dist`) — não precisa mexer em nada.
4. Clique em **Deploy**. Ao final, você recebe uma URL tipo
   `https://sod-tech-agendamento.vercel.app`.

---

## 3. Voltar na Render e liberar o CORS

1. No dashboard da Render, abra o serviço → **Environment**.
2. Edite `ALLOWED_ORIGIN` para a URL exata que a Vercel te deu no passo 2.4
   (sem barra `/` no final), por exemplo:
   `https://sod-tech-agendamento.vercel.app`
3. Salve — a Render reinicia o serviço sozinha.

---

## 4. Testar no ar

1. Abra a URL da Vercel no navegador.
2. Preencha o formulário completo e clique em **Enviar**.
3. Confirme que o e-mail chegou em `sodreedev@gmail.com`.

Se der erro de CORS no console do navegador, confira se a `ALLOWED_ORIGIN`
na Render é **exatamente** igual à URL da Vercel (https, sem barra final).

---

## Depois: domínio próprio (opcional, quando quiser)

Quando tiver um domínio (ex: `agendamento.sodtech.com.br`):

1. Na Vercel: Project → Settings → Domains → adicionar o domínio e seguir as
   instruções de DNS.
2. Atualizar `ALLOWED_ORIGIN` na Render pro novo domínio.
3. Se quiser, apontar um subdomínio pro back-end também (ex:
   `api.sodtech.com.br`) nas configurações de Custom Domain da Render, e
   atualizar `vercel.json` de acordo.
