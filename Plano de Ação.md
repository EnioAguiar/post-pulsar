# Plano de Ação - PostPulsar

## Sessão de Fundação (Concluída)

- [x] **1. Criar a Página de Login (`src/pages/login.astro`):**
- [x] **2. Implementar a Lógica de Autenticação (Client-Side):**
- [x] **3. Criar a Página da Aplicação (`src/pages/app/index.astro`):**
- [x] **4. Implementar a Página de Configurações da Conta (`src/pages/app/settings.astro`):**
  - [x] Criar a estrutura da página e o acesso a partir do dashboard.
  - [x] Implementar funcionalidade de alterar senha.
  - [x] Implementar funcionalidade de alterar e-mail com modal e instruções claras.
  - [x] Implementar funcionalidade de vincular conta do Google.
  - [x] Implementar funcionalidade de deletar conta de forma segura com uma Supabase Edge Function.

## Sessão de Reestilização (Concluída)

- [x] **1. Definir e aplicar nova identidade visual:**
  - [x] Adotar nova paleta de cores (tema escuro "tech-noir") e tipografia (fonte monoespaçada).
  - [x] Atualizar CSS global e configuração do Tailwind.
- [x] **2. Redesenhar todas as páginas e componentes:**
  - [x] `Header.astro`
  - [x] `index.astro` (página inicial)
  - [x] `login.astro`
  - [x] `signup.astro`
  - [x] `app/index.astro` (dashboard)
  - [x] `app/settings.astro` (configurações)
- [x] **3. Adicionar link de navegação para Configurações no cabeçalho.**

## Próxima Sessão: Implementação do "Pulsar" (MVP)

O foco agora é construir a funcionalidade principal do produto, seguindo a arquitetura definida.

- **1. Criar a Edge Function de Scraping (`pulsar-v1` - Etapa 1):**
  - [ ] Criar a estrutura da nova Supabase Edge Function.
  - [ ] Implementar a lógica para receber uma URL do cliente.
  - [ ] Usar uma biblioteca (ex: `metascraper`) para extrair o conteúdo principal do artigo.
  - [ ] Retornar o texto extraído para o cliente para fins de teste.

- **2. Integrar a Edge Function com o Frontend:**
  - [ ] No dashboard (`/app/index.astro`), modificar o script para chamar a nova Edge Function ao submeter o formulário.
  - [ ] Exibir o texto retornado pela função na área de output (`<div id="content-output">`).

- **3. Integrar a Geração de Conteúdo com IA (`pulsar-v1` - Etapa 2):**
  - [ ] Adicionar a lógica na Edge Function para enviar o texto extraído para uma API de LLM (ex: Gemini).
  - [ ] Criar um prompt que instrua a IA a gerar um formato de conteúdo (ex: um post de LinkedIn para começar).
  - [ ] Fazer a função retornar o conteúdo gerado pela IA em vez do texto bruto.

- **4. Armazenar e Exibir Resultados:**
  - [ ] Criar uma tabela no Supabase para armazenar os resultados gerados.
  - [ ] Modificar a Edge Function para salvar o resultado da IA no banco de dados.
  - [ ] Modificar o frontend para exibir o resultado final de forma mais elaborada.
