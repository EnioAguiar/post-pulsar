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
  - [x] Usar uma biblioteca (`cheerio`) para extrair o conteúdo principal do artigo. _(Nota: a `metascraper` se mostrou instável no ambiente Deno e foi substituída)_.
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
  - [x] Adicionar a coluna `plan_type` (ex: 'free', 'classic', 'pro') para definir o total de pulsos de cada plano.
  - [x] Implementar lógica de débito de pulsos transacionalmente com o salvamento do post.
  - [x] Implementar lógica de débito de pulsos para cada publicação bem-sucedida.
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

<h2>Sessão de Mídia - Twitter/X (Concluída)</h2>

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

## Sessão de Conexões Sociais - Pinterest (Em Espera)

**Nota:** A solicitação de acesso à API do Pinterest foi recusada. A funcionalidade foi temporariamente removida da interface e a integração está em espera.

- [-] **1. Implementar Fluxo de Conexão com Pinterest:**
  - [-] Criar as Edge Functions `pinterest-auth-start` e `pinterest-auth-callback`.
  - [-] Adicionar o botão de conexão na interface.
  - [-] Implementar a lógica para obter e salvar os "boards" do usuário.

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

## Sessão Seguinte: UI de Média Inteligente e Modal Unificado (Concluída)

- [x] **Implementar lógica de seleção de mídia exclusiva** para redes sem suporte a carrossel (Facebook, LinkedIn, Twitter/X, Pinterest).
- [x] **Implementar modal de progresso de publicação unificado** para todos os tipos de conteúdo (texto, imagem, vídeo).
  - [x] **Criar o `PublishAllManager.ts`** para gerenciar o estado do novo modal de publicação em lote.
- [x] **Desenvolver interface de upload de carrossel** para Instagram e Threads, permitindo a seleção de múltiplos arquivos.
- [x] **Atualizar a Edge Function 'publish-to-social'** para lidar com os diferentes tipos de posts (mídia única vs. carrossel).

## Sessão de Investigação - Carrossel de Vídeo do Instagram (Concluída)

- [!] **Investigar e corrigir instabilidade em carrosséis de vídeo do Instagram:** Concluído com a descoberta de que a API é instável, mas funciona ao usar `media_type: 'REELS'` para todos os vídeos, contradizendo a documentação oficial. O tempo de espera para processamento também precisou ser aumentado para 5 minutos. Ver `docs/atencao.md` para o histórico completo da investigação.

## Próxima Sessão: Gestão de Prompts, Histórico e Storage (Concluída)

Foco em adicionar mais controle ao usuário e otimizar os recursos da aplicação.

- [x] **1. Banco de Dados: Criar a migração para a nova tabela `user_prompts`** (`id`, `user_id`, `name`, `text`).
- [x] **2. Backend: Implementar a lógica para o sistema de prompts na Edge Function `pulsar-v1`**, permitindo que ela receba um prompt customizado.
- [x] **3. Frontend: Desenvolver a UI para o sistema de prompts:**
  - [x] Para todos os usuários, exibir a opção de selecionar um dos 3 prompts pré-definidos.
  - [x] Para usuários Pro, adicionar a interface para criar, salvar, gerenciar e apagar prompts customizados.
- [x] **4. Backend: Implementar a verificação de limite de posts salvos** (ex: 20) antes de permitir que um novo post seja salvo na tabela `generated_posts`.
- [x] **5. Frontend: Adicionar UI para notificar o usuário quando o limite de posts for atingido**, sugerindo o gerenciamento do histórico para liberar espaço.
- [x] **6. Backend: Criar uma nova Edge Function agendada (`storage-cleanup`)** com a lógica para apagar arquivos de mídia órfãos do Supabase Storage.
- [x] **7. Supabase: Configurar o cron job (`pg_cron`)** para executar a função `storage-cleanup` diariamente.

## Sessão de Manutenção e Melhorias (Concluída)

- [x] **1. Correções de Lint no Código (Frontend e Backend):**
  - [x] `src/components/Modal.astro`: Corrigido conflito de classes flex/hidden.
  - [x] `src/lib/ui/DashboardManager.ts`: Removidas variáveis não utilizadas e corrigidos tipos `any`.
  - [x] `src/lib/ui/SocialPostCard.ts`: Corrigida declaração léxica em bloco `case`.
  - [x] **Resultado:** Todos os erros de lint foram resolvidos.

- [x] **2. Lógica de UI para Upload de Mídia (Instagram/Threads):**
  - [x] `src/lib/ui/DashboardManager.ts` e `src/lib/ui/SocialPostCard.ts`: Implementada renderização condicional dos botões de upload de mídia com base no plano do usuário (Pro, Basic, Free).
  - [x] Adicionado contador de caracteres do Threads e atualizado limite de upload de vídeo.

- [x] **3. Correção de Bug Visual (Modais):**
  - [x] `src/lib/modal.ts`: Corrigida a lógica JavaScript para adicionar/remover classes CSS, resolvendo o problema de layout dos modais.

- [x] **4. Integração e Logs da API Gemini (`pulsar-v1`):**
  - [x] `supabase/functions/pulsar-v1/index.ts`:
    - [x] Prompts internos traduzidos para o inglês.
    - [x] Adicionados logs detalhados para depuração.
    - [x] Diagnosticados erros `400 FAILED_PRECONDITION` (faturamento) e `503 UNAVAILABLE` (sobrecarga).
    - [x] Implementado mecanismo de retentativa com _exponential backoff_ para lidar com erros 503.

- [x] **5. Correções de Lint no Banco de Dados (Via Migrações):**
  - [x] `supabase/migrations/20250913190000_fix_function_search_paths.sql`: Corrigido `search_path` e definido `SECURITY DEFINER` para funções críticas.
  - [x] `supabase/migrations/20250913200000_optimize_rls_policies.sql`: Otimizadas políticas RLS para `user_prompts` and `generated_posts`.
  - [x] `supabase/migrations/20250913201000_fix_db_misc.sql`:
    - [x] Corrigido problema de constraint duplicada em `social_connections`.
    - [x] Adicionado workaround para o bug do `pg_cron` ao comentar o comando `ALTER EXTENSION`.

## Sessão de Conteúdo e SEO (Concluída)

- [x] **1. Criar Post de Blog "What is Generative Engine Optimization (GEO)":**
  - [x] Conteúdo otimizado para SEO, incluindo estatísticas e estrutura clara.
  - [x] Criado infográfico SVG (`geo-principles.svg`) ilustrando os princípios chave do GEO.
- [x] **2. Criar Post de Blog "Martech SaaS: How Technology is Revolutionizing Content Marketing":**
  - [x] Conteúdo otimizado para SEO, incluindo estatísticas e estrutura clara.
  - [x] Criado infográfico SVG (`martech-saas-trends.svg`) ilustrando as principais tendências do Martech SaaS.

## Sessão de Email Marketing (Concluída)

- [x] **1. Infraestrutura do Banco de Dados:**
  - [x] Criar a tabela `newsletter_subscribers` para armazenar os e-mails e seu status (`pending`, `subscribed`, `unsubscribed`).
  - [x] Criar a tabela `email_queue` que servirá como fila, contendo o payload do e-mail a ser enviado (ex: `type: 'newsletter_confirmation'`).

- [x] **2. Fluxo de Inscrição (Double Opt-In):**
  - [x] **Frontend:** Adicionar um formulário de inscrição.
  - [x] **Backend (Edge Function `subscribe-newsletter`):**
    - [x] Ao submeter, criar uma entrada na tabela `newsletter_subscribers` com status `pending`.
    - [x] Adicionar uma nova tarefa na tabela `email_queue` para enviar o e-mail de confirmação.

- [x] **3. Trabalhador Assíncrono (Processador da Fila):**
  - [x] **Backend (Edge Function `email-worker`):**
    - [x] Configurar um cron job para executar esta função a cada 5 minutos.
    - [x] A função irá ler as tarefas da `email_queue`, com um mecanismo de bloqueio (`FOR UPDATE SKIP LOCKED`) para evitar processamento duplicado.
    - [x] Para cada tarefa, enviar o e-mail de confirmação via Resend.
    - [x] Após o envio bem-sucedido, atualizar o status da tarefa na `email_queue`.

- [x] **4. Confirmação do Usuário:**
  - [x] **Backend (Edge Function `confirm-newsletter-subscription`):**
    - [x] Esta função será o alvo do link de confirmação enviado no e-mail.
    - [x] Ao ser chamada, ela validará o token e atualizará o status do usuário em `newsletter_subscribers` de `pending` para `subscribed`.

## Sessão de Otimização de Banco de Dados (Recomendações)

Esta seção lista extensões do PostgreSQL que podem ser úteis para o PostPulsar, especialmente para futuras funcionalidades de IA.

- [ ] **1. `vector` (Vector Data Type):**
  - **Benefício:** Crucial para futuras funcionalidades de IA, como busca semântica, recomendações de conteúdo e correspondência de similaridade baseada em embeddings. Alinha-se perfeitamente com o core de IA do PostPulsar.
- [ ] **2. `pg_trgm` (Text Similarity):**
  - **Benefício:** Melhora as capacidades de busca interna (ex: posts gerados, prompts do usuário) e permite funcionalidades como "você quis dizer?".
- [ ] **3. `citext` (Case-Insensitive Text):**
  - **Benefício:** Útil para lidar com e-mails e outros campos de texto onde a distinção entre maiúsculas e minúsculas não é importante, simplificando a validação e o armazenamento.
- [ ] **4. `pgaudit` (Auditing):**
  - **Benefício:** Para segurança e conformidade, permitindo auditar operações no banco de dados e rastrear alterações em dados sensíveis.

## Sessão de Otimização de Vídeo (Concluída)

- [x] **1. Implementar Etapa de Análise:** No `video-converter-service`, foi adicionado um endpoint `/analyze` que usa `ffprobe` para analisar o vídeo de entrada.
- [x] **2. Adicionar Etapa de Limpeza:** Foi criado um endpoint `/clean` que usa `ffmpeg -c copy -movflags +faststart` para reconstruir o container do vídeo sem re-codificar, garantindo a compatibilidade estrutural (ex: `moov atom`).
- [x] **3. Adicionar Lógica Condicional:** A função `request-video-conversion` agora orquestra o fluxo: chama `/analyze`, e se o vídeo for compatível, chama `/clean` para uma limpeza rápida; se não for, chama `/convert` para a conversão completa.
- [x] **4. Objetivo Atingido:** O tempo de espera do usuário foi reduzido, o consumo de recursos na Railway foi otimizado e a robustez do processo de publicação de vídeo foi aumentada.

## Sessão de Correções Finais e "Publicar Tudo" (Concluída)

- [x] **Corrigir upload de imagem para o plano "Basic" (Instagram/Threads):**
  - [x] Unificado o componente de upload de mídia para Instagram/Threads para usar a interface de carrossel para todos os planos.
  - [x] Ajustada a lógica para que o plano "Basic" permita apenas uma imagem por vez, substituindo a anterior ao invés de adicionar.
  - [x] Corrigidos os textos e tipos de arquivo aceitos na UI para refletir as limitações do plano "Basic".
- [x] **Implementar funcionalidade "Publicar Tudo":**
  - [x] Refatorada a lógica de publicação para uma função reutilizável (`executePublication`).
  - [x] Adicionado o botão "Publicar Tudo" no dashboard.
  - [x] Implementado o fluxo de publicação em lote, chamando a função reutilizável para cada rede social.
  - [x] Corrigida e refinada a barra de progresso do modal "Publicar Tudo" para mostrar o progresso geral e o status individual de cada publicação.
- [x] **Corrigir bug de texto ausente em posts com mídia no Threads:**
  - [x] Analisada a documentação oficial da API do Threads.
  - [x] Corrigido o envio do parâmetro 'text' para a chamada de criação do contêiner de mídia, conforme exigido pela API.

## Sessão de Refatoração do Dashboard (Concluída)

- [x] **Refatorar `DashboardManager.ts`:**
  - **Problema:** O arquivo `src/lib/ui/DashboardManager.ts` cresceu para mais de 1100 linhas, tornando-se monolítico e difícil de manter.
  - **Solução:** A lógica foi extraída para módulos dedicados, melhorando a manutenibilidade.
    - `PromptManager.ts`: Gerencia a criação, salvamento e listagem de prompts.
    - `MediaManager.ts`: Gerencia o upload de arquivos e a UI de mídia.
    - `DashboardEventManager.ts`: Gerencia os eventos da UI (contadores de caracteres, toggles, etc.).
    - `PublicationManager.ts`: Orquestra o processo de publicação individual e em lote.
  - **Resultado:** O `DashboardManager.ts` foi simplificado para atuar como um orquestrador, inicializando os outros módulos.

## Sessão de Refatoração e Correções (Concluída)

- [x] **Refatorar a Edge Function `publish-to-social`:**
  - **Problema:** A função era monolítica, contendo a lógica de publicação para todas as redes sociais.
  - **Solução:** A lógica para cada rede foi extraída para seu próprio módulo de serviço (`services/linkedinService.ts`, `services/twitterService.ts`, etc.), tornando a função principal um roteador.
- [x] **Corrigir bug nos botões de cancelar do modal:**
  - **Problema:** Os botões de cancelar em alguns modais não funcionavam.
  - **Solução:** Implementado um listener de eventos centralizado em `src/lib/modal.ts` que usa delegação de eventos para garantir que todos os botões `[data-modal-close]` funcionem corretamente.
- [x] **Corrigir publicação de texto no Threads:**
  - [x] **Problema:** Posts somente de texto falhavam no Threads.
  - [x] **Solução:** Corrigida a chamada de API para usar o fluxo correto de duas etapas (criação de contêiner de texto e depois publicação).
- [x] **Corrigir prompts customizados sem hashtags:**
  - [x] **Problema:** Prompts customizados não incluíam a instrução para adicionar hashtags.
  - [x] **Solução:** Garantido que a instrução de adicionar hashtags seja anexada a todos os tipos de prompt enviados para a IA.

## Sessão de Refatoração e Correção do Histórico (Concluída)

- [x] **Refatorar lógica de salvamento para ocorrer apenas na publicação.**
- [x] **Implementar persistência de conteúdo gerado no dashboard via `localStorage`** para persistir após refresh.
- [x] **Adicionar botão "Reabrir" na página de histórico** para carregar posts antigos no dashboard.
- [x] **Corrigir bug de preview vazio no histórico**, garantindo que o conteúdo completo seja salvo.

## Sessão de Integrações e Robustez (Concluída)

- [x] **1. Implementar Integração com Telegram e Discord:**
  - [x] Adicionada UI na página de conexões para salvar credenciais (Token de Bot/ID de Canal para Telegram, URL de Webhook para Discord).
  - [x] Criada a Edge Function `save-app-connection` para o armazenamento seguro dessas credenciais.
  - [x] Adicionada a lógica de publicação para Telegram e Discord na Edge Function `publish-to-social`, delegando para seus respectivos módulos de serviço.
  - [x] Atualizada a `pulsar-v1` para gerar conteúdo específico para Telegram e Discord.
  - [x] Expandida a UI do dashboard para incluir as novas redes.

- [x] **2. Melhorar Robustez da Publicação de Vídeo no LinkedIn:**
  - [x] Implementado um mecanismo de **polling** no `linkedinService.ts` para aguardar a finalização do processamento de vídeo pela API do LinkedIn, resolvendo falhas de publicação assíncrona.
  - [x] Aprimorado o tratamento de resposta para casos em que a API não retorna um ID de post, mesmo com a publicação bem-sucedida.

- [x] **3. Aprimorar Geração de Conteúdo e Estabilidade:**
  - [x] Refatorada a função `truncateText` em `pulsar-v1` para truncar o corpo do texto de forma inteligente, preservando hashtags intactas no final.
  - [x] Melhorado o prompt da IA para seguir mais rigorosamente os limites de caracteres definidos.

## Sessão de Melhorias de UX e Validações (Concluída)

- [x] **1. Centralização e Correção de Modais:**
  - [x] Corrigido o problema de centralização dos modais em toda a aplicação, garantindo que eles sempre apareçam corretamente.
  - [x] Substituídos todos os `alert()`s por modais customizados para uma experiência de usuário consistente.
- [x] **2. Implementação de Avisos Proativos:**
  - [x] Adicionado aviso para o usuário selecionar uma rede antes de gerar conteúdo.
  - [x] Adicionado aviso sobre a obrigatoriedade de mídia para publicações no Instagram.
- [x] **3. Aprimoramento do Fluxo de Publicação do Facebook:**
  - [x] Implementado um botão "Selecionar Página" no card do Facebook.
  - [x] Criado um modal para que o usuário possa escolher de forma clara em qual de suas páginas conectadas deseja publicar.

## Próxima Sessão: Extração de Conteúdo Manual (Concluída)

Foco em criar uma alternativa robusta para a extração de conteúdo via URL, dando ao usuário a opção de colar o texto manualmente.

- [x] **1. Frontend: Modificar a Interface do Dashboard:**
  - [x] Adicionar um controle (abas ou botões) para o usuário alternar entre os modos "Pulsar de URL" e "Pulsar de Texto".
  - [x] Quando "Pulsar de Texto" estiver ativo, esconder o campo de input da URL e exibir um campo de texto grande (`<textarea>`).

- [x] **2. Backend: Atualizar a Edge Function `pulsar-v1`:**
  - [x] Modificar a função para aceitar um novo parâmetro no corpo da requisição, `rawText`.
  - [x] Implementar uma lógica condicional: se `rawText` estiver presente, a função deve pular completamente a etapa de scraping (extração da URL) e usar o texto fornecido diretamente para a geração de conteúdo pela IA.
  - [x] Se `rawText` não estiver presente, a função deve operar como antes, extraindo o conteúdo da `url`.

## Sessão de Analytics e Robustez (Concluída)

Foco em obter visibilidade sobre o uso do produto e corrigir bugs críticos de publicação.

- [x] **1. Ajustar Modelo de Preços:**
  - [x] Removida a funcionalidade "Suporte Prioritário" do Plano Pro na documentação e na página de cobrança para alinhar com a oferta atual.
- [x] **2. Implementar Analytics de Produto com PostHog:**
  - [x] Integrado o script de rastreamento do PostHog em toda a aplicação através do layout principal.
  - [x] Adicionado o rastreamento do evento customizado `content_generated` para monitorar o uso da funcionalidade principal.
  - [x] Adicionado o rastreamento do evento customizado `post_published` para permitir a criação de funis de conversão.
  - [x] Ativada a captura automática de exceções no frontend para monitoramento básico de erros.
- [x] **3. Corrigir Publicação de Imagem no Instagram:**
  - [x] Diagnosticado o erro "Mídia não está pronta" para posts de imagem única.
  - [x] Implementado um mecanismo de _polling_ na função de publicação do Instagram para aguardar o processamento da imagem pela API da Meta, tornando a publicação mais robusta.

## Sessão Final de Lançamento (Concluída)

Foco em preparar o site para o lançamento oficial, garantindo que a infraestrutura e os processos essenciais estejam no lugar.

- [x] **1. Infraestrutura e Domínio:**
  - [x] Registrado um domínio para o PostPulsar (`postpulsar.com`).
  - [x] Configurado um serviço de e-mail profissional usando o domínio.
  - [x] Contratado e configurado um provedor SMTP no Supabase para garantir a entrega de e-mails transacionais.
- [x] **2. Verificação das Plataformas:**
  - [x] **Meta (Facebook/Instagram/Threads):** Todas as permissões necessárias foram aprovadas.
  - [x] **X (Twitter):** Acesso Básico/Gratuito confirmado como suficiente para as operações.
  - [x] **LinkedIn:** Lançamento realizado com suporte a perfis pessoais.
- [x] **3. Testes e Validação:**
  - [x] Executada a suíte de testes de API (Newman) e carga (k6) para garantir a estabilidade da função principal `pulsar-v1`.
- [x] **4. Monitoramento:**
  - [x] Integrado o Sentry para monitoramento de erros no frontend e backend.

## Pós-Lançamento: Desenvolvimento Contínuo

Com o site no ar, o processo de desenvolvimento foi profissionalizado para garantir a estabilidade do ambiente de produção. Qualquer nova funcionalidade ou correção seguirá o fluxo abaixo.

### 1. Ambientes de Desenvolvimento (Branches)

- **`production` (Produção):** Ambiente principal, acessado pelos usuários. Protegido contra alterações diretas. Corresponde à branch `main` no Git.
- **`develop` (Desenvolvimento):** Uma cópia completa e isolada do ambiente de produção. Usado como base para todo novo desenvolvimento. Corresponde à branch `develop` no Git.
- **`preview` (Pré-visualização):** Ambientes temporários criados automaticamente pela Vercel para cada Pull Request, permitindo testar features de forma isolada.

### 2. Ciclo de Desenvolvimento de Features

1.  **Criar uma Feature Branch:** Toda nova tarefa começa com a criação de uma branch a partir da `develop` (ex: `git checkout -b feature/nome-da-feature develop`).
2.  **Desenvolvimento Local:** O desenvolvedor conecta seu ambiente local à branch `develop` do Supabase, garantindo que não está tocando nos dados de produção.
3.  **Pull Request (PR) para `develop`:** Ao concluir, um PR é aberto. Isso dispara a criação de um ambiente de preview na Vercel para testes.
4.  **Merge em `develop`:** Após a aprovação e testes, o código é mesclado na `develop`.

### 3. Processo de Release (Lançamento)

1.  **Abrir PR para `main`:** Quando um conjunto de funcionalidades está estável na `develop`, um PR é aberto de `develop` para a `main`.
2.  **Deploy em Produção:** Após a aprovação final, o merge na `main` aciona o deploy automático da Vercel para o ambiente de produção.

Este fluxo garante que o ambiente de produção permaneça estável e que novas funcionalidades sejam testadas de forma segura e isolada antes de serem disponibilizadas para os usuários.

## Pós-Lançamento: Otimização da Ativação de Usuários (Concluída)

Com o site no ar e as campanhas de marketing ativas, o foco do desenvolvimento mudou da construção de features para a otimização da jornada do usuário, com o objetivo de aumentar o engajamento e a ativação.

- [x] **1. Diagnóstico: O Gargalo da Ativação:**
  - **Observação:** Foi identificado um volume significativo de novos cadastros. No entanto, a análise inicial via PostHog mostrou que, embora os usuários estivessem usando a funcionalidade principal ("Pulsar"), a taxa de conversão para a etapa de "publicar" era efetivamente 0% para usuários reais.
  - **Problema:** Usuários geram conteúdo, mas não conectam suas contas para publicá-lo.

- [x] **2. Investigação com Analytics:**
  - **Ação:** Após tentativas iniciais de resolver o problema com notas de segurança na página de conexão e um modal de incentivo passivo não surtirem efeito, foi iniciada uma análise aprofundada do comportamento do usuário utilizando as ferramentas do PostHog.
  - **Principal Insight (Gravações de Sessão):** Foi descoberto que uma parcela dos usuários, após gerar o conteúdo e analisá-lo, utilizava o botão "Copiar".
  - **Hipótese:** O conteúdo gerado tem valor para o usuário, mas ele prefere o trabalho manual de copiar/colar a passar pelo processo de conectar sua conta social, seja por desconfiança, falta de clareza ou percepção de esforço.

- [x] **3. Novo Plano de Ação: Intervenção Inteligente:**
  - **Estratégia:** Em vez de adicionar mais informações passivas, a nova estratégia é intervir no momento exato em que o usuário demonstra intenção.
  - **Implementação:** Foi implementado um "Modal Inteligente" que é acionado pelo evento de "copiar" o texto gerado.
  - **Objetivo do Modal:** Abordar o usuário com uma mensagem contextual, como "Vimos que você copiou o texto! Economize tempo conectando sua conta para publicar com um clique", vendendo o benefício da automação e quebrando a barreira de confiança/esforço.

## Sessão de Precificação Regional com Moeda Local (V2) (Concluída)

Foco em evoluir a estratégia de precificação, passando de descontos sobre o dólar para a cobrança na moeda local do usuário (BRL, INR, AED, etc.) e descontos via cupom para outros países, a fim de aumentar a conversão e a clareza para clientes internacionais.

- [x] **1. Estruturação no Stripe:** Reorganizados os 20 produtos individuais em 5 produtos mestres, cada um com 4 preços para as moedas dedicadas (BRL, INR, AED, USD).
- [x] **2. Criação de Cupom de Desconto:** Criado um cupom de 50% no Stripe para ser aplicado a países emergentes que utilizam o preço em dólar.
- [x] **3. Backend (Refatoração de `get-regional-prices`):** Modificada a Edge Function para detectar o país, retornar o `priceId` da moeda local ou o `priceId` de USD com um sinalizador para desconto.
- [x] **4. Backend (Refatoração de `create-payment-intent`):** Atualizada a Edge Function para receber o `priceId` e aplicar dinamicamente o cupom de desconto na sessão de checkout, se necessário.
- [x] **5. Backend (Refatoração de `stripe-webhook`):** Reescrerito o webhook para usar o `priceId` para buscar o `product_id` mestre, identificando corretamente a compra e atualizando a conta do usuário.
- [x] **6. Otimização e Correção de Bugs:**
  - [x] Otimizada a performance da `get-regional-prices` com chamadas paralelas (`Promise.all`) para evitar timeouts.
  - [x] Corrigidos múltiplos bugs de incompatibilidade de versão da biblioteca do Stripe no ambiente Deno.
- [x] **7. Testes E2E:** Realizados testes de ponta a ponta para validar o fluxo de compra em BRL e o fluxo de desconto em dólar para a Argentina, confirmando que os preços, descontos e o fulfillment funcionam corretamente.

- [x] **1. Configuração do Ambiente de Desenvolvimento Supabase:**
  - [x] Criação de um novo projeto Supabase para desenvolvimento (`rsfbqvqxabeplqmgbzen`).
  - [x] Vinculação da CLI local ao projeto de desenvolvimento.
  - [x] Aplicação de todas as migrações de banco de dados ao projeto de desenvolvimento.
  - [x] Configuração de todos os segredos necessários para o projeto de desenvolvimento.
  - [x] Deploy de todas as Edge Functions para o projeto de desenvolvimento.
- [x] **2. Correção de Ambiente de Produção:**
  - [x] Atualização dos segredos `TWITTER_CONSUMER_KEY` e `TWITTER_CONSUMER_SECRET` no projeto de produção (`wvfooigeytvdcfnzzrrg`).
  - [x] Re-deploy das funções `twitter-auth-start`, `twitter-auth-callback` e `publish-to-social` no projeto de produção.
- [x] **3. Automação do Fluxo de Trabalho:**
  - [x] Adição de scripts ao `package.json` para gerenciar o link da CLI, aplicar migrações e fazer deploy de funções para ambientes de desenvolvimento e produção, incluindo verificações de segurança.
- [x] **4. Documentação:**
  - [x] Atualização da documentação de arquitetura (`docs/architecture/Arquitetura e Visão do Produto.md`) com o novo fluxo de trabalho.

## Análise de Dados Recentes e Próximos Passos

Esta seção resume as análises de dados mais recentes e os próximos passos estratégicos para o PostPulsar.

### 1. Análise de Tráfego e Comportamento (Dados de 4 e 7 dias)

#### Páginas e Visitantes (Últimos 4 dias):

- `/`: 441 visitantes (50%)
- `/signup`: 182 visitantes (21%)
- `/app`: 55 visitantes (6%)
- `/login`: 42 visitantes (5%)
- `/welcome`: 38 visitantes (4%)
- `/app/connections`: 20 visitantes (2%)
- `/app/billing`: 7 visitantes (1%)

#### Tráfego por País (Últimos 7 dias):

- Qatar (QA): 49 visitantes (29%)
- Índia (IN): 45 visitantes (27%)
- Estados Unidos (US): 26 visitantes (15%)
- Paquistão (PK): 9 visitantes (5%)
- Nigéria (NG): 9 visitantes (5%)
- Bangladesh (BD): 9 visitantes (5%)
- Emirados Árabes (AE): 7 visitantes (4%)
- Austrália (AU): 5 visitantes (3%)
- Canadá (CA): 5 visitantes (3%)
- Reino Unido (GB): 5 visitantes (3%)

#### Referrers (Últimos 7 dias):

- google.com: 79 visitantes (48%)
- accounts.google.com: 39 visitantes (24%)
- googleads.g.doubleclick.net: 15 visitantes (9%)
- producthunt.com: 8 visitantes (5%)
- com.google.android.googlequicksearchbox: 8 visitantes (5%)
- indiehackers.com: 6 visitantes (4%)

#### Observações e Esclarecimentos:

- O tráfego orgânico do Google é significativamente mais eficaz que os anúncios pagos.
- A página `/app/connections` é considerada simples e sem dificuldades de uso.
- Muitos usuários geram conteúdo e utilizam o botão "copiar", indicando que o conteúdo gerado tem valor, mas a publicação manual é preferida por alguns.
- Um modal incentivando a conexão foi adicionado ao botão "copiar" recentemente.
- O erro `access_denied` em alguns acessos é normal, pois se refere a e-mails de verificação expirados.
- A estratégia de precificação regional foi implementada devido à diversidade geográfica dos visitantes.
- Existem cerca de 60 e-mails de cadastro, sendo alguns temporários e outros Gmail.

### 2. Análise do Funil de Conversão (PostHog)

#### Funil `content_generated` -> `post_published`:

- `content_generated`: 22 pessoas (100%)
- `post_published`: 2 pessoas (9.09%)
- `Dropped off`: 20 pessoas (90.91%)
- Tempo mediano/médio: 32s

#### Insights:

- A taxa de conversão de geração para publicação é baixa (9.09%), confirmando um gargalo significativo.
- O fato de um usuário real ter publicado (e até usado conteúdo de teste) é um forte sinal de validação do produto e da funcionalidade de publicação.
- O maior desafio é converter os usuários que geram conteúdo em publicadores ativos.

### 3. Próximos Passos Estratégicos

1.  **Monitorar o Impacto do Modal "Copiar" (Prioridade Alta):**
    - Deixar o modal no botão "copiar" rodar por pelo menos mais **7 a 10 dias**.
    - Acompanhar o funil `content_generated` -> `post_published` diariamente para observar mudanças na taxa de conversão.

2.  **Investigar o Gargalo de Publicação com Gravações de Sessão (Prioridade Alta - Em paralelo):**
    - Utilizar as **gravações de sessão do PostHog** para analisar o comportamento dos 20 usuários que geraram conteúdo, mas não publicaram.
    - Focar em entender os pontos de atrito: eles chegam à página de conexões? Tentam conectar e falham? Copiam o conteúdo e saem? Há sinais de confusão ou frustração?

3.  **Otimização da Precificação Regional (Prioridade Média - Planejamento):**
    - Começar a planejar a implementação da exibição dos preços na **moeda local** do usuário para aumentar a clareza e a conversão em mercados como Índia e Qatar.

4.  **Engajamento de Usuários com E-mails Reais (Prioridade Média):**
    - Considerar uma campanha de e-mail direcionada aos usuários com e-mails Gmail que geraram conteúdo, mas não publicaram, reforçando os benefícios da publicação direta.

5.  **Otimização Contínua de SEO (Prioridade Média):**
    - Dado o sucesso do tráfego orgânico, continuar investindo em estratégias de SEO para atrair mais usuários qualificados.

## Próxima Sessão: Precificação Regional com Moeda Local (V2) (Concluída)

Foco em evoluir a estratégia de precificação, passando de descontos sobre o dólar para a cobrança na moeda local do usuário (BRL, INR, AED, etc.), a fim de aumentar a conversão e a clareza para clientes internacionais.

- [x] **1. Configuração no Stripe:** Criar novos objetos de "Preço" no painel do Stripe para cada produto em cada moeda suportada (BRL, INR, AED, etc.), obtendo um `priceId` para cada um.
- [x] **2. Backend (Refatoração de `get-regional-prices`):** Modificar a Edge Function para, em vez de aplicar um desconto, detectar o país do usuário e retornar o `priceId` do Stripe correspondente à sua moeda local. Se não houver, retornar o `priceId` padrão em USD.
- [x] **3. Backend (Refatoração de `create-payment-intent`):** Simplificar a Edge Function para que ela receba o `priceId` diretamente do frontend e o utilize para criar a sessão de pagamento no Stripe.
- [x] **4. Frontend (UI de Preços):** Atualizar as páginas `/app/billing` e `index.astro` para chamar a nova lógica da `get-regional-prices`, exibir o preço formatado na moeda local (ex: "R$ 150,00"), e enviar o `priceId` correto ao backend no momento da compra.
- [x] **5. Testes E2E:** Realizar testes de ponta a ponta para validar o fluxo para diferentes regiões (Brasil, Índia, EUA), garantindo que a moeda e o valor corretos sejam exibidos e cobrados.

## Próxima Sessão: Programa de Afiliados (Concluída)

Foco em criar um programa de afiliados para transformar usuários e parceiros em um canal de aquisição pago por performance, recompensando-os com uma comissão em dinheiro por cada venda gerada.

- [x] **1. Pesquisa e Seleção da Plataforma:**
  - [x] Avaliada e escolhida a plataforma **PromoteKit** pela sua simplicidade e integração direta com Stripe.
- [x] **2. Integração Técnica e de Interface:**
  - [x] Adicionado o script de rastreamento do PromoteKit em todas as páginas através do layout principal.
  - [x] Modificada a página de cobrança (`billing.astro`) para capturar o ID de referência e enviá-lo para o backend.
  - [x] Atualizada a Edge Function `create-payment-intent` para anexar o ID de referência como metadados na sessão de checkout do Stripe.
  - [x] Criada a página `/app/affiliates` para servir como o portal onde os usuários podem se inscrever e gerenciar sua conta de afiliado.
  - [x] Adicionado um link "Affiliates" no cabeçalho da aplicação para usuários logados, direcionando-os para o portal de afiliados.

## Sessão: Implementação do Free Trial e Estratégias Anti-Abuso (Em Andamento)

Foco em refinar o modelo de ativação de usuários e mitigar abusos do sistema.

- [x] **1. Implementar Free Trial de 7 Dias (Concluído):**
  - [x] **Backend:** Modificar a função `handle_new_user` no banco de dados para conceder o plano Pro por 7 dias, com 500 pulsos, sem necessidade de cartão de crédito.
  - [x] **Backend:** Garantir que o cron job existente (`daily-plan-expiration`) lide com a expiração do trial e a reversão para o plano gratuito.
  - [x] **Frontend (Página de Preços):** Atualizar a página de preços na home para destacar a oferta de trial de 7 dias no plano "Free".
  - [x] **Frontend (Página de Cobrança):** Atualizar a UI da página `/app/billing` para refletir visualmente o estado de trial ativo, mostrando os dias restantes.

- [x] **2. Prevenir Abuso de Múltiplos Trials (Concluído):**
  - [x] **DB Schema:** Criar a tabela `trial_history` para armazenar um registro de todos os e-mails que já utilizaram um período de teste.
  - [x] **Backend:** Modificar a função `handle_new_user` para verificar a tabela `trial_history` antes de conceder um novo trial. Se o e-mail já existir, o usuário é colocado diretamente no plano "Free".

- **[x] 3. Bloquear E-mails Temporários:**
      - **Status:** Concluído.
      - **Notas:** Implementado através de uma Edge Function (`signup-validation`) que busca a lista de bloqueio diretamente do repositório oficial no GitHub. Isso garante que a lista esteja sempre atualizada, ao contrário de pacotes NPM ou APIs de terceiros. A função usa cache para otimizar a performance.

- [x] **4. Implementar Atraso na Exclusão de Conta (Concluído):**
  - [x] **DB Schema:** Adicionar as colunas `is_deleted` e `deleted_at` à tabela `profiles`.
  - [x] **Backend (Soft Delete):** Modificar a Edge Function `delete-user` para marcar o perfil do usuário para exclusão (soft delete) em vez de deletar permanentemente.
  - [x] **Backend (Cancel Delete):** Criar a nova Edge Function `cancel-delete-user` para reverter o estado de exclusão do perfil.
  - [x] **Backend (Hard Delete):** Criar a nova Edge Function agendada (`hard-delete-users`) para deletar permanentemente os usuários após o período de 10 dias.
  - [x] **Frontend:** Atualizar a página de configurações (`settings.astro`) para exibir o estado de exclusão pendente e permitir que o usuário cancele o processo.

- [ ] **5. (Opcional/Futuro) Prevenção de Múltiplas Contas via Fingerprinting:**
  - [ ] Pesquisar e avaliar a viabilidade de integrar uma biblioteca de fingerprinting (ex: FingerprintJS) para detectar e prevenir a criação de múltiplas contas pelo mesmo dispositivo.

## Sessão de Infraestrutura: Ambiente de Desenvolvimento (Concluída)

Foco em preparar a infraestrutura para o desenvolvimento seguro de novas funcionalidades, como a transcrição de áudio, sem impactar o ambiente de produção.

- [x] **1. Configurar Ambiente de Desenvolvimento no Railway:**
  - [x] Criado um novo ambiente (`v2`) no Railway para o `video-converter-service`.
  - [x] Configurado o serviço para fazer deploy a partir da branch `v2` do GitHub.
  - [x] Ajustado o "Root Directory" para `/video-converter-service/` para garantir o build correto com Dockerfile.
- [x] **2. Configurar Variáveis de Ambiente:**
  - [x] Adicionadas as variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` apontando para o projeto Supabase de desenvolvimento.
  - [x] Adicionada e validada a `SERVICE_API_KEY` para proteger o serviço.
- [x] **3. Conectar Supabase ao Novo Ambiente:**
  - [x] Adicionado o segredo `CONVERTER_SERVICE_URL` no projeto Supabase de desenvolvimento, apontando para a URL do novo serviço no Railway.
- [x] **4. Teste de Validação:**
  - [x] Realizado teste de ponta a ponta com `curl` para confirmar que o serviço no ambiente `v2` está no ar, acessível e com a autenticação funcionando.

## Próxima Sessão: Implementação da Transcrição de Áudio (Concluída)

Com o ambiente de desenvolvimento (`v2`) no Railway devidamente configurado e validado, a etapa de implementação da funcionalidade de transcrição de audio foi concluída com sucesso.

- [x] **1. Implementar funcionalidade de transcrição de audio no `video-converter-service`:**
  - [x] Adicionada a ferramenta de linha de comando `yt-dlp` para baixar o áudio de vídeos do YouTube. Desafios de detecção de bot foram superados com a instalação do `deno` e o uso de `user-agent` e `--no-check-certificate`.
  - [x] Selecionada a biblioteca `@xenova/transformers` para a transcrição. O problema de `AudioContext` em ambiente Node.js foi resolvido lendo o arquivo de áudio com `fs`, usando `wavefile` para decodificar e formatar, e `ffmpeg` para converter o áudio baixado (MP3) para o formato WAV esperado (16kHz, mono, PCM).
  - [x] Criado o endpoint `/transcribe` no serviço para receber uma URL, orquestrar o download, conversão e transcrição, e retornar o texto.
- [x] **2. Integrar com a Edge Function `pulsar-v1`:**
  - [x] A `pulsar-v1` foi modificada para identificar URLs de vídeo.
  - [x] Ela agora chama o novo endpoint `/transcribe` do `video-converter-service`.
  - [x] O texto transcrito retornado é usado como input para a geração de conteúdo pela IA.
- [x] **3. Definir o custo de pulsos para esta funcionalidade.** (O custo foi definido e implementado no fluxo de débito de pulsos).

## Sessão: Geração de Imagem de Citação (Concluída)

Foco em implementar a primeira versão da funcionalidade de geração de mídia, usando um sistema de templates para criar imagens de citação de forma rápida e barata.

- [x] **1. Backend (Serviço de Imagem):**
  - [x] Adicionada a dependência `node-html-to-image` ao `video-converter-service`.
  - [x] Criado um template de imagem (`default.hbs`) em HTML/CSS.
  - [x] Implementado um novo endpoint `/generate-image` no `video-converter-service` para renderizar o template com um texto e fazer o upload para o Supabase Storage.
  - [x] Corrigidos múltiplos bugs no ambiente Docker do serviço:
    - [x] Adicionadas as dependências de sistema do Linux para o Puppeteer (`libnss3`, etc.) no `Dockerfile`.
    - [x] Adicionada a flag `--no-sandbox` na chamada do Puppeteer para permitir a execução como usuário `root` no container.

- [x] **2. Backend (Orquestração e Lógica):**
  - [x] Criada a nova Supabase Edge Function `generate-image-from-text`.
  - [x] Implementada a lógica para usar a IA (`gemini-2.5-flash`) para extrair uma citação do texto-fonte.
  - [x] Criada e aplicada a migração SQL para a nova função RPC `charge_for_image_generation` para debitar 1 pulso.
  - [x] Corrigidos múltiplos bugs na implementação da função:
    - [x] Corrigido o caminho de importação das bibliotecas Deno (`std/http/server.ts`, `jsr:@supabase/supabase-js`).
    - [x] Corrigido o nome do parâmetro (`p_user_id`) na chamada da função RPC.
    - [x] Corrigida a URL do serviço de conversão para incluir o esquema `https://`.
    - [x] Corrigida a propriedade lida da resposta da função `get-source-text` (de `data.text` para `data.cleanedText`).

- [x] **3. Frontend (UI e Integração):**
  - [x] Adicionado o botão "Generate Image" na interface do dashboard.
  - [x] Implementada a lógica no `DashboardManager` para chamar a função `generate-image-from-text` e exibir a imagem resultante.
  - [x] Adicionada a cor `secondary` ao `tailwind.config.cjs` para estilizar o novo botão.
  - [x] Corrigido o texto do botão para "Generate Image".
  - [x] Corrigida a mensagem de custo de pulsos no card da imagem para ser dinâmica.