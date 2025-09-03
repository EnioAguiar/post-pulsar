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
  - [x] Depurar e corrigir múltiplos erros de configuração e de código, incluindo:
    - Erro de `401 Unauthorized` devido a falha na validação do JWT na Edge Function, resolvido com decodificação manual do token.
    - Erro de `Invalid App ID` devido ao uso do endpoint de autenticação incorreto (Facebook vs. Instagram).
    - Erro de `Invalid platform app` devido à combinação incorreta de endpoint e escopos de permissão.
    - Erro de `Função de desenvolvedor insuficiente`, resolvido adicionando a conta de teste à função "Testador do Instagram" no painel da Meta.
    - Erros de banco de dados (`null value in column "code_verifier"` e `column "provider_user_name" does not exist`), resolvidos com a criação de migrações para ajustar o schema das tabelas `oauth_state` e `social_connections`.
  - [x] Adicionar o botão de conexão na interface da página de conexões.

## Sessão de Upload de Mídia e UX (Concluída)

- [x] **1. Implementar Upload de Imagem para Instagram:**
    - [x] Modificar a Edge Function `publish-to-social` para aceitar uma `imageUrl` dinâmica.
    - [x] Adicionar input de arquivo na interface do dashboard.
    - [x] Implementar lógica de upload para o Supabase Storage.
    - [x] Passar a URL da imagem pública para a função de backend.
- [x] **2. Refatorar e Melhorar a Experiência de Upload:**
    - [x] Alterar o fluxo para que o upload só ocorra no momento da publicação, economizando armazenamento.
    - [x] Adicionar preview instantâneo da imagem selecionada sem upload prévio.
    - [x] Implementar um botão "Remover" para limpar a imagem selecionada.
    - [x] Estilizar o botão de upload para se adequar ao tema do site.
    - [x] Adicionar texto informativo sobre o limite de tamanho e formatos de arquivo.
- [x] **3. Melhorar Feedback de Processamento:**
    - [x] Substituir a mensagem estática "[PULSING]" por um indicador dinâmico com múltiplas etapas para dar uma melhor sensação de progresso.
- [x] **4. Corrigir Vulnerabilidade de Segurança e Ambiente Local:**
    - [x] Identificar e corrigir vulnerabilidade de dependência (`path-to-regexp`) usando `npm audit fix --force`.
    - [x] Configurar o ambiente de desenvolvimento local para funcionar com OAuth, adicionando as URLs de localhost no painel do Supabase.

## Sessão de Vídeo (Revertida Temporariamente)

**Nota:** A funcionalidade de upload de vídeo para o Instagram foi revertida. A complexidade do processamento de vídeo (ex: necessidade de `ffmpeg`) no ambiente serverless do Supabase se mostrou inviável no momento. A funcionalidade será reavaliada no futuro.

- [-] **1. Implementar Upload de Vídeo para Instagram:**
    - [-] Permitir upload de arquivos de vídeo (MP4, MOV) na interface.
    - [-] Adicionar preview de vídeo no dashboard.
    - [-] Modificar a função `publish-to-social` para enviar `video_url` e `media_type` para a API do Instagram.
- [-] **2. Depurar e Corrigir Fluxo de Publicação de Vídeo:**
    - [-] Corrigir `media_type` de `VIDEO` para `REELS` conforme a nova exigência da API.
    - [-] Implementar lógica de "polling" para aguardar o status `FINISHED` do container de vídeo antes de publicar, resolvendo erros de "mídia não pronta".
    - [-] Investigar e documentar os requisitos técnicos exatos para arquivos de vídeo (codec, framerate, faixa de áudio obrigatória).

## Sessão de Melhorias de UX (Concluída)

- [x] **1. Corrigir e Melhorar a Experiência do Twitter/X:**
    - [x] Diagnosticar o erro `403 Forbidden` como sendo uma proteção anti-spam da API contra posts duplicados.
    - [x] Adicionar um contador de caracteres dinâmico para a caixa de texto do Twitter.
    - [x] Adicionar um aviso na interface sobre as limitações da API gratuita do Twitter.
- [x] **2. Adicionar Melhorias Gerais de Usabilidade:**
    - [x] Adicionar notas de ajuda nas "Configurações Avançadas" explicando que a contagem de caracteres é uma meta aproximada para a IA.
    - [x] Adicionar uma opção de "Conta Premium" para ocultar o contador de caracteres do Twitter.

## Sessão de Conexões Sociais - Threads (Concluída)

- [x] **1. Implementar Fluxo de Conexão com Threads:**
  - [x] Pesquisar e identificar o fluxo de autenticação correto, decidindo pelo uso de Edge Functions customizadas devido à necessidade de múltiplas credenciais da Meta.
  - [x] Criar um novo aplicativo no painel da Meta dedicado para a API do Threads.
  - [x] Implementar as Edge Functions `threads-auth-start` e `threads-auth-callback`.
  - [x] Depurar e corrigir múltiplos erros de configuração e de código, incluindo:
    - Erro de `PLATFORM__INVALID_APP_ID` devido ao uso do endpoint de autenticação incorreto (`facebook.com` vs `threads.net`).
    - Erro de `scope` inválido devido ao uso de separador incorreto (espaço vs vírgula).
    - Erro de `401 Missing authorization header` no callback, resolvido com `verify_jwt = false` no `config.toml`.
    - Dificuldades para salvar a configuração no painel da Meta, resolvido com o preenchimento de todos os campos e a descoberta do macete de UI para o campo de URL de redirecionamento.
  - [x] Adicionar o botão de conexão na interface da página de conexões e refatorar a lógica do cliente.

## Sessão de Finalização e UX (Concluída)

- [x] **1. Implementar Publicação no Threads:**
  - [x] Adicionar a lógica de publicação para o Threads na Edge Function `publish-to-social`.
  - [x] Garantir que a função lida com a publicação de texto e imagem.
- [x] **2. Melhorar a Experiência do Usuário (UX):**
  - [x] Implementar a persistência do último post gerado, que agora é carregado ao abrir o dashboard.
  - [x] Adicionar um sistema de notificação para tokens de sessão expirados, guiando o usuário para a página de conexões.
  - [x] Corrigir o bug nos botões "Choose File" que não funcionavam após uma refatoração.

## Próximos Passos

1.  **Construir Página de Planos e Pagamentos:** Integrar o Stripe para que os usuários possam fazer upgrade de plano e comprar pacotes de pulsos.
2.  **Implementar Conversão de Vídeo (Opcional):** Investigar a possibilidade de adicionar uma etapa de conversão de vídeo no backend para flexibilizar os formatos de upload do usuário.
