# Plano de Ação - PostPulsar

## Sessão Anterior (Concluída)

- [x] **1. Criar a Página de Login (`src/pages/login.astro`):**
- [x] **2. Implementar a Lógica de Autenticação (Client-Side):**
- [x] **3. Criar a Página da Aplicação (`src/pages/app/index.astro`):**
- [x] **4. Implementar a Página de Configurações da Conta (`src/pages/app/settings.astro`):**
  - [x] Criar a estrutura da página e o acesso a partir do dashboard.
  - [x] Implementar funcionalidade de alterar senha.
  - [x] Implementar funcionalidade de alterar e-mail com modal e instruções claras.
  - [x] Implementar funcionalidade de vincular conta do Google.
  - [x] Implementar funcionalidade de deletar conta de forma segura com uma Supabase Edge Function.

## Próxima Sessão

O próximo grande objetivo é começar a construir a funcionalidade principal do PostPulsar: a capacidade de processar um post de blog e gerar conteúdo a partir dele.

- **1. Criar a Interface Principal do App:**
  - [ ] Na página `/app`, substituir os placeholders por uma interface real.
  - [ ] Adicionar um campo de input para o usuário colar a URL de um post de blog.
  - [ ] Adicionar um botão "Pulsar" para iniciar o processo.

- **2. Desenvolver a Lógica de Extração de Conteúdo:**
  - [ ] Criar uma nova Supabase Edge Function (`scrape-post`).
  - [ ] A função receberá uma URL, fará o scraping do conteúdo principal do artigo (usando uma biblioteca como o `metascraper` ou `cheerio`).
  - [ ] A função retornará o texto extraído do artigo para o cliente.

- **3. Exibir o Conteúdo Extraído:**
  - [ ] O cliente receberá o texto da Edge Function e o exibirá em uma área de texto ou um editor simples na página.
