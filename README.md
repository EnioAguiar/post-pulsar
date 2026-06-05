# PostPulsar

> Plataforma de reaproveitamento de conteúdo com IA — transforme um artigo em uma estratégia completa para redes sociais.

**Acesse:** [post-pulsar.com](https://www.post-pulsar.com)

---

## O que é?

PostPulsar é uma aplicação SaaS que usa inteligência artificial para transformar artigos de blog, URLs e transcrições de vídeos do YouTube em conteúdo pronto para publicar em múltiplas redes sociais — tudo a partir de um único painel.

Em vez de reescrever manualmente o conteúdo para cada plataforma, você cola uma URL e o PostPulsar gera posts adaptados para LinkedIn, Twitter/X, Instagram, Threads, Facebook, Discord e Telegram em segundos.

---

## Funcionalidades Principais

- **Geração de Conteúdo com IA** — cole uma URL ou texto bruto e receba posts otimizados para cada plataforma, com hashtags relevantes
- **Transcrição de YouTube** — extrai o transcript de qualquer vídeo e usa como fonte de conteúdo
- **Geração de Imagens com Citações** — cria imagens com design profissional a partir de trechos do conteúdo, com templates, fontes e cores personalizáveis
- **Publicação Direta** — publique textos, imagens, carrosséis e vídeos diretamente nas redes conectadas
- **Histórico de Posts** — todo post publicado fica salvo; reabra e reaproveite quando quiser
- **Insights** — integração de analytics para Facebook, Instagram, Threads e LinkedIn (plano Pro)
- **Controles Avançados** — defina limites de caracteres e ajuste o prompt de IA para combinar com a voz da sua marca
- **Integrações** — publique diretamente no Discord e Telegram via webhooks e bot tokens

---

## Redes Suportadas

| Plataforma | Texto | Imagens | Vídeo |
|------------|-------|---------|-------|
| LinkedIn | ✅ | ✅ | ✅ (Pro) |
| Twitter / X | ✅ | ✅ | ✅ (Pro) |
| Instagram | ✅ | ✅ | ✅ (Pro) |
| Threads | ✅ | ✅ | — |
| Facebook | ✅ | ✅ | ✅ (Pro) |
| Discord | ✅ | — | — |
| Telegram | ✅ | — | — |

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | [Astro v5](https://astro.build) + [Tailwind CSS](https://tailwindcss.com) |
| Backend | [Supabase](https://supabase.com) (PostgreSQL + Edge Functions / Deno) |
| Autenticação | Supabase Auth + OAuth (LinkedIn, Instagram, Facebook, Twitter, Threads) |
| Pagamentos | [Stripe](https://stripe.com) |
| Deploy | [Vercel](https://vercel.com) |
| Monitoramento | [Sentry](https://sentry.io) |
| Analytics | [PostHog](https://posthog.com) |

---

## Visão Geral da Arquitetura

```
Browser (Astro SSR no Vercel)
        │
        ├── Supabase Auth  (fluxos OAuth por rede social)
        ├── Supabase DB    (PostgreSQL — usuários, posts, pulses, conexões)
        └── Supabase Edge Functions (Deno)
                ├── pulsar-v1              → pipeline de geração de conteúdo com IA
                ├── publish-to-social      → publicação multi-rede
                ├── generate-image-from-text → renderizador de imagens com citações
                ├── get-source-text        → scraper de URL + transcrição de YouTube
                ├── stripe-webhook         → ciclo de vida dos pagamentos
                ├── *-auth-*               → fluxos OAuth por plataforma
                └── refresh-post-analytics → sincronização de insights
```

O sistema de **Pulses** é a unidade de crédito — cada geração de conteúdo ou publicação consome pulses do saldo mensal do usuário.

---

## Estrutura do Projeto

```
/
├── src/
│   ├── pages/
│   │   ├── index.astro          # Landing page
│   │   ├── app/                 # App autenticado (dashboard, billing, insights…)
│   │   └── blog/                # Blog de conteúdo
│   ├── components/
│   │   └── landing/             # Seções da landing page
│   └── lib/                     # Cliente Supabase e helpers
├── supabase/
│   ├── functions/               # Edge Functions (Deno)
│   └── migrations/              # Migrações do PostgreSQL
├── video-converter-service/     # Serviço auxiliar para processamento de vídeo
└── public/                      # Assets estáticos
```

---

## Planos e Preços

| Plano | Preço | Pulses | Destaques |
|-------|-------|--------|-----------|
| Free | $0/mês | 70 | Publicação de texto, template básico de imagem |
| Classic | $9/30 dias | 210 | Todos os templates, personalização de fonte e cor |
| Pro | $29/30 dias | 500 | Publicação de vídeo, Insights, personalização completa |

Pacotes extras de pulses disponíveis a qualquer momento (100 por $5, 250 por $10, 600 por $20).

---

## Rodando Localmente

```sh
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
# → http://localhost:4321

# Build para produção
npm run build

# Preview do build
npm run preview
```

É necessário um arquivo `.env` com as credenciais do Supabase, Stripe, Sentry e PostHog.

---

## Licença

Privado — todos os direitos reservados.
