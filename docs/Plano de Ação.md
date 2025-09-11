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

## Próxima Sessão: Implementação do "Pulsar" (MVP) - (Concluída)

O foco agora é construir a funcionalidade principal do produto, seguindo a arquitetura definida.

- [x] **1. Criar a Edge Function de Scraping (`pulsar-v1` - Etapa 1):**
  - [x] Criar a estrutura da nova Supabase Edge Function.
  - [x] Implementar a lógica para receber uma URL do cliente.
  - [x] Usar uma biblioteca (`cheerio`) para extrair o conteúdo principal do artigo. *(Nota: a `metascraper` se mostrou instável no ambiente Deno e foi substituída)*.
  - [x] Retornar o texto extraído para o cliente para fins de teste.

- [x] **2. Integrar a Edge Function com o Frontend:**
  - [x] No dashboard (`/app/index.astro`), modificar o script para chamar a nova Edge Function ao submeter o formulário.
  - [x] Exibir o texto retornado pela função na área de output (`<div id="content-output">`).

- [x] **3. Integrar a Geração de Conteúdo com IA (`pulsar-v1` - Etapa 2):**
  - [x] Adicionar a lógica na Edge Function para enviar o texto extraído para uma API de LLM (ex: Gemini).
  - [x] Criar um prompt que instrua a IA a gerar um formato de conteúdo (ex: um post de LinkedIn para começar).
  - [x] Fazer a função retornar o conteúdo gerado pela IA em vez do texto bruto.

- [x] **4. Armazenar e Exibir Resultados:**
  - [x] Criar uma tabela no Supabase para armazenar os resultados gerados.
  - [x] Modificar a Edge Function para salvar o resultado da IA no banco de dados.
  - [x] Modificar o frontend para exibir o resultado final de forma mais elaborada.

## Sistema de Créditos ("Pulsos") - (Concluído)

Com a funcionalidade principal implementada, construímos o sistema de créditos que serve de base para o modelo de negócio.

- [x] **1. Modificar Banco de Dados:**
  - [x] Adicionar a coluna `monthly_pulses_remaining` na tabela de perfis de usuário.
  - [x] Adicionar a coluna `plan_type` (ex: 'free', 'basic', 'pro') para definir o total de pulsos de cada plano.
  - [x] Implementar lógica de débito de pulsos transacionalmente com o salvamento do post.
  - [x] Implementar lógica de débito de pulsos para cada publicação.
- [x] **2. Implementar Lógica na Edge Function (`pulsar-v1`):**
  - [x] Antes de executar, ler o valor de `monthly_pulses_remaining` do usuário (sem debitar).
  - [x] Se os pulsos forem 0, retornar um erro de "limite atingido".
  - [x] Chamar função RPC para debitar pulso de geração e salvar post.
- [x] **3. (Opcional) Criar Cron Job para Reset Mensal:**
  - [x] Escrever o script SQL para resetar os pulsos dos usuários no primeiro dia de cada mês.
  - [x] Agendar a execução da função via Supabase Cron Jobs.
- [x] **4. Integrar Frontend:**
  - [x] Exibir saldo de pulsos na UI.
  - [x] Atualizar chamadas para `pulsar-v1` e `publish-to-social`.
  - [x] Atualizar saldo de pulsos na UI após cada operação.

## Sessão de Segurança: Correção de `search_path` - (Concluída)

- [x] Identificar e corrigir funções com `search_path` mutável.

## Sessão de Conexões Sociais (Concluída)

- [x] **1. Implementar Fluxo de Conexão com LinkedIn:**
  - [x] Criar a tabela `social_connections` para armazenar tokens.
  - [x] Implementar o fluxo OAuth 2.0 de 3 etapas com Edge Functions (`linkedin-auth-start`, `linkedin-auth-callback`).
  - [x] Usar o padrão OpenID Connect com os escopos corretos (`openid`, `profile`, `email`, `w_member_social`).
  - [x] Garantir que o `state` da requisição OAuth seja usado para passar o `user_id` de forma segura.
  - [x] Configurar a função de callback para permitir invocações anônimas (`verify_jwt = false`).
  - [x] Implementar a lógica de UI na página de conexões para refletir o estado (conectado/desconectado) e permitir desvincular a conta.
  - [x] Adicionar um modal customizado para a confirmação de desvinculação.

## Sessão de Publicação (Concluída)

- [x] **1. Implementar Lógica de Postagem Real no LinkedIn:**
  - [x] Substituir os mocks na função `publish-to-social` com as chamadas de API reais para o LinkedIn.
  - [x] Implementar a busca pelo `access_token` e `provider_user_id` do usuário.
  - [x] Corrigir múltiplos bugs no fluxo, incluindo escopos de Oauth, versionamento da API e o formato do `postId` e do `content`.
- [x] **2. Implementar Lógica de Postagem Real no Twitter/X:**
  - [x] Adicionar a lógica de publicação para o Twitter na Edge Function `publish-to-social`.
  - [x] Garantir que a função selecione o texto correto do objeto JSONB do banco de dados.
  - [x] Corrigir bugs de formato de dados que impediam a publicação em ambas as plataformas.

## Sessão de Conexões Sociais - Twitter/X (Concluída)

- [x] **1. Implementar Fluxo de Conexão com Twitter/X:**
  - [x] Adicionar botão de conexão na interface e refatorar o script para suportar múltiplas redes.
  - [x] Criar a tabela `oauth_state` para gerenciar o fluxo PKCE de forma segura.
  - [x] Implementar as Edge Functions `twitter-auth-start` e `twitter-auth-callback`.
  - [x] Depurar e corrigir o fluxo de autenticação, incluindo a configuração de variáveis de ambiente no painel do Supabase e o tratamento de erros de formato no callback.

## Sessão de Controle e Usabilidade (Concluída)

- [x] **1. Implementar Edição de Conteúdo:**
  - [x] Substituir a exibição de texto estático por campos `<textarea>` editáveis.
  - [x] Refatorar a função `publish-to-social` para enviar o texto editado diretamente, dando ao usuário controle total sobre o conteúdo final.
- [x] **2. Implementar Configurações Avançadas de Geração:**
  - [x] Adicionar menu "sanfona" (accordion) na interface para configurações granulares.
  - [x] Criar campos de input separados para contagem de caracteres de cada rede social.
  - [x] Atualizar a função `pulsar-v1` para usar os novos parâmetros de tamanho nos prompts da IA.
- [x] **3. Implementar Persistência de Preferências do Usuário:**
  - [x] Adicionar colunas na tabela `profiles` para salvar as contagens de caracteres padrão.
  - [x] Criar função RPC (`update_char_preferences`) para salvar as configurações.
  - [x] Implementar a lógica no frontend para carregar e salvar as preferências do usuário.

## Sessão de Conexões Sociais - Instagram (Concluída)

- [x] **1. Implementar Fluxo de Conexão com Instagram:**
  - [x] Pesquisar e identificar o novo fluxo de autenticação "Instagram Business Login".
  - [x] Criar as Edge Functions `instagram-auth-start` e `instagram-auth-callback`.
  - [x] Depurar e corrigir múltiplos erros de configuração e de código.
  - [x] Adicionar o botão de conexão na interface da página de conexões.

## Sessão de Upload de Mídia e UX (Concluída)

- [x] **1. Implementar Upload de Imagem para Instagram:**
    - [x] Modificar a Edge Function `publish-to-social` para aceitar uma `imageUrl` dinâmica.
    - [x] Adicionar input de arquivo na interface do dashboard.
    - [x] Implementar lógica de upload para o Supabase Storage.
    - [x] Passar a URL da imagem pública para a função de backend.
- [x] **2. Refatorar e Melhorar a Experiência de Upload:**
    - [x] Alterar o fluxo para que o upload só ocorra no momento da publicação.
    - [x] Adicionar preview instantâneo da imagem selecionada.
    - [x] Implementar um botão "Remover" para limpar a imagem selecionada.
- [x] **3. Melhorar Feedback de Processamento:**
    - [x] Substituir a mensagem estática "[PULSING]" por um indicador dinâmico com múltiplas etapas.
- [x] **4. Corrigir Vulnerabilidade de Segurança e Ambiente Local:**
    - [x] Usar `npm audit fix --force` para corrigir vulnerabilidades.
    - [x] Configurar o ambiente de desenvolvimento local para funcionar com OAuth.

## Sessão de Melhorias de UX (Concluída)

- [x] **1. Corrigir e Melhorar a Experiência do Twitter/X:**
    - [x] Diagnosticar o erro `403 Forbidden` como proteção anti-spam.
    - [x] Adicionar um contador de caracteres dinâmico.
- [x] **2. Adicionar Melhorias Gerais de Usabilidade:**
    - [x] Adicionar notas de ajuda nas "Configurações Avançadas".
    - [x] Adicionar uma opção de "Conta Premium" para ocultar o contador de caracteres.

## Sessão de Conexões Sociais - Threads (Concluída)

- [x] **1. Implementar Fluxo de Conexão com Threads:**
  - [x] Criar um novo aplicativo no painel da Meta dedicado para a API do Threads.
  - [x] Implementar as Edge Functions `threads-auth-start` e `threads-auth-callback`.
  - [x] Depurar e corrigir múltiplos erros de configuração e de código.
  - [x] Adicionar o botão de conexão na interface da página de conexões.

## Sessão de Finalização e UX (Concluída)

- [x] **1. Implementar Publicação no Threads:**
  - [x] Adicionar a lógica de publicação para o Threads na Edge Function `publish-to-social`.
- [x] **2. Melhorar a Experiência do Usuário (UX):**
  - [x] Implementar a persistência do último post gerado.
  - [x] Adicionar um sistema de notificação para tokens de sessão expirados.
  - [x] Corrigir o bug nos botões "Choose File".

## Sessão de Mídia - LinkedIn (Concluída)

- [x] **1. Habilitar Upload de Mídia na Interface:**
    - [x] Adicionar o botão "Choose File" e a lógica de preview de imagem para os cards do LinkedIn e Twitter/X.
- [x] **2. Implementar Publicação com Imagem no LinkedIn:**
    - [x] Pesquisar e implementar o fluxo da nova `Images API` do LinkedIn.
    - [x] Depurar e corrigir o fluxo completo de publicação com imagem.
- [x] **3. Implementar Publicação com Vídeo no LinkedIn:**
    - [x] Implementar o fluxo de upload de vídeo em múltiplos pedaços (`multipart upload`).
    - [x] Depurar e corrigir múltiplos erros de versão da API, cabeçalhos e lógica de finalização.

## Sessão de Refatoração - Twitter/X (OAuth 1.0a) (Concluída)

- [x] **1. Refatorar o fluxo de autenticação do Twitter/X para usar OAuth 1.0a:**
  - [x] Substituir o fluxo OAuth 2.0 PKCE pelo fluxo de 3 etapas do OAuth 1.0a.
  - [x] Adicionar as colunas `oauth_token` e `oauth_token_secret` à tabela `social_connections`.

## Sessão de Mídia - Twitter/X (Concluída)

- [x] **1. Implementar upload de imagem para o Twitter/X:** Usar as novas credenciais OAuth 1.0a na função `publish-to-social`.
- [x] **2. Implementar upload de vídeo para o Twitter/X:** Adicionar o fluxo de upload em partes (INIT, APPEND, FINALIZE, STATUS) para vídeos.

## Sessão de Conexões Sociais - Facebook (Autenticação) (Concluída)

- [x] **1. Implementar Fluxo de Conexão com Páginas do Facebook:**
  - [x] Criar as Edge Functions `facebook-auth-start` e `facebook-auth-callback`.
  - [x] Adicionar o botão de conexão na interface.

## Sessão de Publicação - Facebook (Concluída)

- [x] **1. Implementar Publicação no Facebook:**
  - [x] Adicionar a lógica de publicação para o Facebook na Edge Function `publish-to-social`.
  - [x] Adicionar o card de publicação do Facebook na interface.
  - [x] **Refatorar o fluxo para salvar todas as páginas do usuário e permitir a seleção no dashboard.**

## Sessão de Conexões Sociais - Pinterest (Concluída)

- [x] **1. Implementar Fluxo de Conexão com Pinterest:**
  - [x] Criar as Edge Functions `pinterest-auth-start` e `pinterest-auth-callback`.
  - [x] Adicionar o botão de conexão na interface.
  - [x] Implementar a lógica para obter e salvar os "boards" do usuário.

## Sessão de Arquitetura de Vídeo (Concluída)

O foco foi implementar a funcionalidade de vídeo de ponta a ponta, contornando as limitações do Supabase. A instalação do `ffmpeg` em um contêiner na **Railway** foi a solução definitiva e bem-sucedida.

- [x] **1. Projetar Arquitetura de Microserviço Externo:**
    - [x] Definir a necessidade de um serviço externo com `ffmpeg` para processar vídeos.
    - [x] Escolher a plataforma Railway para o deploy.
- [x] **2. Implementar o Microserviço de Conversão:**
    - [x] Criar o serviço em Node.js (`video-converter-service`) com um `Dockerfile`.
    - [x] Implementar a lógica do servidor para receber requisições seguras.
    - [x] Fazer o deploy do serviço na Railway.
    - [x] Configurar o diretório raiz (`video-converter-service/`) e o método de build (`Dockerfile`) na Railway.
    - [x] Adicionar as variáveis de ambiente (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SERVICE_API_KEY`) na Railway.
    - [x] Gerar um domínio público para o serviço e adicioná-lo como segredo (`CONVERTER_SERVICE_URL`) no Supabase.
    - [x] Atualizar o `Dockerfile` para usar `node:20-slim`, removendo o aviso de versão obsoleta.
- [x] **3. Criar a Integração com o Supabase:**
    - [x] Criar a nova Edge Function (`request-video-conversion`) para orquestrar a chamada ao microserviço.

## Sessão de Correções de Frontend (Concluída)

A implementação do código do frontend para a funcionalidade de vídeo foi pausada para focar na documentação. Os seguintes bugs foram identificados e precisam ser corrigidos:

- [x] **Corrigir Lógica de Planos na UI:** A interface não está ocultando/mostrando as funcionalidades de imagem e vídeo de acordo com o plano do usuário (`free`/`pro`).
- [x] **Corrigir Preview de Mídia:** O preview da imagem ou vídeo selecionado não está aparecendo no dashboard.
- [x] **Corrigir Fluxo de Upload:** O modal de progresso não aparece e o upload da mídia para o Storage não é iniciado, causando uma falha silenciosa.

## Sessão de Correção de Conexões e UI (Concluída)

- [x] **Corrigir Bugs de Upload de Mídia:**
  - [x] Corrigido erro de `TypeError` que impedia o preview de imagem/vídeo de ser exibido.
  - [x] Ajustado o limite de upload de vídeo para 20MB na UI e na lógica de validação.
- [x] **Corrigir Conexões Sociais (LinkedIn/Twitter):**
  - [x] Diagnosticado erro `ON CONFLICT` causado por uma restrição `UNIQUE` ausente no banco de dados de produção.
  - [x] Criada uma nova migração para adicionar uma restrição `UNIQUE` mais flexível em `(user_id, provider, provider_user_id)`.
  - [x] Atualizadas as funções de callback para usar a nova regra de conflito, consertando a autenticação e mantendo o suporte a múltiplas páginas do Facebook.

## Sessão de Refatoração de Mídia e UX (Concluída)

- [x] **Refatorar e centralizar a lógica de controle de modais:** Corrigido bug crítico que impedia o funcionamento da UI ao mover toda a lógica de script para um módulo dedicado (`src/lib/modal.ts`).
- [x] **Adicionar botões de upload de vídeo para LinkedIn e Twitter/X na interface.**

## Próxima Sessão: Refatoração da UI do Dashboard

- [x] **Documentar a necessidade da refatoração em `docs/atencao.md`** para evitar arquivos monolíticos no futuro.
- [x] **Criar um novo módulo de UI (`src/lib/ui/SocialPostCard.ts`)** para encapsular a lógica de renderização dos cards de redes sociais.
- [x] **Refatorar a função `displayGeneratedContent` em `index.astro`** para importar e usar o novo módulo, simplificando drasticamente o arquivo principal.

## Sessão Seguinte: UI de Mídia Inteligente e Modal Unificado

- [x] **Implementar lógica de seleção de mídia exclusiva** para redes sem suporte a carrossel (Facebook, LinkedIn, Twitter/X, Pinterest).
- [x] **Implementar modal de progresso de publicação unificado** para todos os tipos de conteúdo (texto, imagem, vídeo).
- [ ] **Desenvolver interface de upload de carrossel** para Instagram e Threads, permitindo a seleção de múltiplos arquivos.
- [ ] **Atualizar a Edge Function 'publish-to-social'** para lidar com os diferentes tipos de posts (mídia única vs. carrossel).

## Futuro

-   **Implementar Conexão com Pinterest:** Adicionar a funcionalidade completa de conexão e publicação para o Pinterest (atualmente em espera pela aprovação do app).
-   **Construir Página de Planos e Pagamentos:** Integrar o Stripe para que os usuários possam fazer upgrade de plano e comprar pacotes de pulsos.