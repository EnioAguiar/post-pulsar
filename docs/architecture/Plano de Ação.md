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

## Sessão Seguinte: UI de Mídia Inteligente e Modal Unificado (Concluída)

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
  - **Problema:** Posts somente de texto falhavam no Threads.
  - **Solução:** Corrigida a chamada de API para usar o fluxo correto de duas etapas (criação de contêiner de texto e depois publicação).
- [x] **Corrigir prompts customizados sem hashtags:**
  - **Problema:** Prompts customizados não incluíam a instrução para adicionar hashtags.
  - **Solução:** Garantido que a instrução de adicionar hashtags seja anexada a todos os tipos de prompt enviados para a IA.

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

## Próximas Sessões

- **Implementar Conexão com Pinterest:** Adicionar a funcionalidade completa de conexão e publicação para o Pinterest (atualmente em espera pela aprovação do app).
- **Construir Página de Planos e Pagamentos:** Integrar o Stripe para que os usuários possam fazer upgrade de plano e comprar pacotes de pulsos.

## Sessão de Refatoração Geral (Concluída)

- [x] **1. Refatorar a UI do Dashboard (`index.astro`):**
  - [x] Identificado código HTML duplicado nas seções "Target Networks" e "Advanced Settings".
  - [x] Criado o componente reutilizável `NetworkSelectorCheckbox.astro`.
  - [x] Criado o componente reutilizável `AdvancedSettingInput.astro`.
  - [x] Refatorada a página `index.astro` para usar os novos componentes em loops, eliminando a duplicação de código e simplificando a manutenção.

- [x] **2. Refatorar a Lógica do Dashboard (`DashboardManager.ts`):**
  - [x] Identificado que o método `handlePulsarSubmit` era muito grande e acumulava responsabilidades.
  - [x] Criada a nova classe `PulsarFormManager.ts` para encapsular toda a lógica de submissão do formulário.
  - [x] Refatorado o `DashboardManager.ts` para delegar a gestão do formulário ao `PulsarFormManager`, tornando-se um orquestrador mais limpo.

- [x] **3. Refatorar a Edge Function `pulsar-v1`:**
  - [x] Identificado que a função era monolítica, contendo a lógica de criação de prompts para todas as redes sociais.
  - [x] Criado o módulo de serviço `promptService.ts` dentro da estrutura da função.
  - [x] Movida toda a lógica de geração de prompts para o novo serviço.
  - [x] Refatorada a função `pulsar-v1/index.ts` para importar e utilizar o `promptService`, simplificando seu código e melhorando a modularidade.

- [x] **4. Refatorar a Documentação:**
  - [x] Identificado que o arquivo `Arquitetura e Visão do Produto.md` era monolítico.
  - [x] Criado o diretório `docs/features/`.
  - [x] Movidas as seções de arquitetura de "Pulsar" e "Contas de Usuário" para arquivos dedicados dentro do novo diretório.
  - [x] Simplificado o documento principal de arquitetura para ser uma visão geral com links para os detalhes.
  - [x] Atualizada a documentação para refletir as refatorações de código realizadas.

## Próxima Sessão: Implementação de Pagamentos com Stripe (Concluída)

Foco em construir a funcionalidade de compra de pacotes de pulsos e upgrade de planos, utilizando uma arquitetura segura e idempotente com o Stripe.

- [x] **1. Criar a migração no Supabase para a nova tabela `purchases`**, conforme definido na documentação de arquitetura.
- [x] **2. Desenvolver a UI da página de pagamentos/planos** e a lógica no cliente para gerar a `idempotency_key` (UUID) e armazená-la no `localStorage` antes de iniciar a compra.
- [x] **3. Criar a Supabase Edge Function `create-payment-intent`** que recebe o `product_id` e a `idempotency_key`, verifica a idempotência na tabela `purchases`, determina o preço no servidor e cria o `PaymentIntent` no Stripe.
- [x] **4. Integrar o frontend com a nova Edge Function** para obter o `client_secret` e usar o Stripe.js (`stripe.confirmCardPayment`) para finalizar a transação.
- [x] **5. Criar a Supabase Edge Function `stripe-webhook`** para receber eventos do Stripe, com verificação de assinatura obrigatória.
- [x] **6. Implementar a lógica de fulfillment no webhook** para o evento `payment_intent.succeeded`, que irá atualizar o status na tabela `purchases` e adicionar os pulsos/benefícios à conta do usuário na tabela `profiles`.
- [x] **7. Configurar o endpoint do webhook no painel do Stripe** e adicionar o segredo de assinatura (`STRIPE_WEBHOOK_SECRET`) aos segredos do Supabase.

## Sessão de Correção de Pagamentos e Banco de Dados (Concluída)

Foco em resolver uma série de problemas complexos que impediam a criação de assinaturas.

- [x] **1. Diagnosticar e Contornar Limitações da API Stripe:**
  - [x] Identificado que a versão da API do Stripe (`2025-08-27.basil`) não retornava o `client_secret` para assinaturas, bloqueando o fluxo de pagamento integrado.
  - [x] **Solução:** Refatorada a arquitetura de pagamento de assinaturas para usar o **Stripe Checkout**. A função de backend agora gera uma URL de sessão de checkout, e o frontend redireciona o usuário para a página de pagamento hospedada pelo Stripe.

- [x] **2. Corrigir Bug Crítico do Tipo ENUM no Banco de Dados:**
  - [x] Identificado que o tipo `ENUM` para `plan_type` foi criado incorretamente, causando falhas na atualização do plano pelo webhook.
  - [x] **Solução:** Criada e executada uma migração de banco de dados em várias etapas para recriar o tipo `ENUM` corretamente, garantindo a integridade dos dados.

- [x] **3. Refatorar Webhook para Suportar Assinaturas:**
  - [x] Adicionada lógica ao `stripe-webhook` para processar o evento `checkout.session.completed`.
  - [x] Implementada a lógica para buscar os detalhes da assinatura, identificar o plano, atualizar o `plan_type` do usuário e adicionar os pulsos correspondentes.

## Sessão de Melhorias de UX e Geração de Conteúdo (Concluída)

Foco em refinar a experiência do usuário no dashboard e melhorar a qualidade da geração de conteúdo.

- [x] **1. Refatorar Geração de Conteúdo para Fluxo Sequencial:** Modificada a `pulsar-v1` para gerar conteúdo para cada rede social de forma sequencial, melhorando a qualidade e o contexto dos posts.
- [x] **2. Adicionar Opção para Desativar Truncamento de Texto:** Implementada uma nova preferência de usuário (checkbox) para permitir a desativação do truncamento forçado de texto, dando mais controle sobre o conteúdo.
- [x] **3. Corrigir Bugs de Sincronização de Estado na UI:** Resolvido o problema onde as preferências do usuário (checkboxes) não eram carregadas e aplicadas corretamente na interface ao iniciar a página.
- [x] **4. Adicionar Contador de Caracteres para Telegram:** Implementado um contador de caracteres específico para o Telegram.
- [x] **5. Persistir Novas Preferências no Banco de Dados:** Criada uma migração para adicionar as novas colunas de preferências na tabela `profiles`.

## Sessão de Refatoração e Melhoria de Prompts (Concluída)

Foco em modularizar e aprimorar a lógica de geração de prompts para maior qualidade e controle.

- [x] **1. Refatorar `promptService` para Arquitetura Modular:** Criada a pasta `services/prompts` e arquivos individuais para cada perfil de rede social.
- [x] **2. Implementar Lógica de Prioridade para Prompts:** Prompts customizados agora têm prioridade sobre os tons padrão das redes, que são usados apenas com o "Default AI".
- [x] **3. Aplicar `maxOutputTokens` Universalmente:** A trava de segurança de tokens agora é aplicada a todos os prompts, não apenas ao padrão.
- [x] **4. Adicionar Novo Prompt Padrão:** O prompt "ELI5: Simple Analogy" foi adicionado à lista de opções pré-existentes.

## Sessão de Mídia - Discord e Telegram (Concluída)

Foco em habilitar o upload de imagens e vídeos para Discord e Telegram, criando uma arquitetura de upload mais flexível e robusta.

- [x] **1. Refatorar Lógica de Upload para Dois Caminhos:**
  - [x] **Caminho de Conversão (Redes Atuais):** Mantido o fluxo existente que passa pelo `video-converter-service` para redes que exigem formatos específicos.
  - [x] **Caminho de Upload Direto (Discord/Telegram):** Criada uma nova lógica no `MediaManager` e `PublicationManager` que faz o upload de mídias para Discord e Telegram **diretamente** para um bucket público, sem passar pelo serviço de conversão.
- [x] **2. Organizar o Supabase Storage:**
  - [x] Ajustados os caminhos de upload no Storage para usar pastas específicas (`discord-media`, `telegram-media`) e serem compatíveis com as políticas de RLS.
- [x] **3. Atualizar UI do Dashboard:**
  - [x] Habilitados os botões de upload de imagem e vídeo para os cards do Discord e Telegram.
  - [x] Unificada a UI de upload para LinkedIn, Facebook e Twitter para um único botão "Choose Image or Video".
  - [x] Corrigido o limite de upload do Discord para 8MB na UI.
- [x] **4. Integrar com o Backend (`publish-to-social`):**
  - [x] Modificada a função para aceitar as novas URLs de mídias do caminho de upload direto.
  - [x] Implementada a lógica de publicação de mídia nos respectivos serviços (`discordService.ts`, `telegramService.ts`).
- [x] **5. Correções de UX:**
  - [x] Restaurada a funcionalidade do modal de progresso, que não exibia a barra e os ícones de status corretamente.

## Próximas Sessões

- **Implementar Conexão com Pinterest:** Adicionar a funcionalidade completa de conexão e publicação para o Pinterest (atualmente em espera pela aprovação do app).
- **Construir Página de Planos e Pagamentos:** Integrar o Stripe para que os usuários possam fazer upgrade de plano e comprar pacotes de pulsos.

## Sessão de Correção de Mídia e Publicação em Lote (Concluída)

Foco em resolver uma falha crítica na funcionalidade "Publicar Tudo" que ocorria ao republicar posts com mídia.

- [x] **Corrigir bug de "Publicar Tudo" no Twitter com imagens de preview:**
  - [x] Diagnosticado erro `400 InvalidKey` no Supabase Storage, causado por nomes de arquivo com timestamp duplo ao tentar republicar uma mídia.
  - [x] Corrigido o erro subsequente `StorageApiError: The resource already exists`, que ocorria após a correção do timestamp.
  - [x] **Solução Definitiva:** Refatorada a lógica de mídia (`MediaManager` e `PublicationManager`) para diferenciar arquivos novos (objeto `File`) de mídias já existentes (string `publicUrl`). A lógica de publicação agora verifica se a mídia já existe no storage e, em caso afirmativo, pula a etapa de upload, reutilizando a URL existente.

## Próxima Sessão: Seleção de Destino no Dashboard

Com a capacidade de salvar múltiplas conexões para Telegram e Discord implementada, o próximo passo é permitir que o usuário as utilize.

- [x] **1. Implementar Seletor de Destino no Dashboard:**
  - [x] Modificar a lógica de renderização dos cards de postagem para Telegram e Discord.
  - [x] Se múltiplas conexões existirem para um provedor, substituir o botão "Postar" por um botão "Selecionar Destino(s)".
  - [x] Criar um modal que lista todas as conexões disponíveis (com seus apelidos) e permite ao usuário selecionar uma ou mais via checkboxes.
- [x] **2. Atualizar Lógica de Publicação (Frontend):**
  - [x] Refatorar o `PublicationManager.ts` para, após a confirmação no modal, iterar sobre os destinos selecionados.
  - [x] Para cada destino, chamar a função de backend `publish-to-social`, passando o `connectionTargetId` correto para garantir que a postagem seja enviada para o lugar certo.

## Sessão de Correção de Bugs - Lógica de Planos (Concluída)

Foco em corrigir a regressão que impedia a UI de mídia de refletir o plano do usuário (`free`, `basic`, `pro`).

- [x] **Corrigir Lógica de Renderização da UI de Mídia:**
  - [x] Refatorado o `SocialPostCard.ts` para gerar dinamicamente a UI de upload correta (rótulos, tipos de arquivo, etc.) para **todas** as redes sociais com base no plano do usuário.
  - [x] Corrigido um bug onde o plano `free` no Instagram gerava a estrutura HTML de uma galeria em vez de um preview de imagem única, causando uma falha silenciosa na exibição do preview.
- [x] **Reforçar Validação de Planos:**
  - [x] Atualizado o `MediaManager.ts` para garantir que as regras de upload (ex: proibir vídeos no plano `basic`) sejam aplicadas na camada de lógica, independentemente da UI.

## Sessão de Correção de Publicação e Múltiplos Destinos (Concluída)

- [x] **Corrigir fluxo de publicação em lote:** Refatorada a lógica de `handlePublishAll` e `PublishAllManager` para criar e gerenciar corretamente o status de publicações individuais para redes com múltiplos destinos.
- [x] **Corrigir busca de credenciais do Telegram:** Alterado o `telegramService.ts` para buscar o ID do canal no campo `provider_user_id` em vez do `refresh_token`.
- [x] **Corrigir busca de conexões:** Adicionado filtro de `user_id` na query que carrega as conexões de Telegram e Discord.
- [x] **Melhorar UX da seleção de destinos:** Adicionada a funcionalidade de limpar a seleção de múltiplos destinos para Telegram e Discord.

## Sessão de UX Mobile: Menu Hambúrguer (Concluída)

Foco em melhorar a usabilidade do site em dispositivos móveis.

- [x] **Implementar Menu Hambúrguer:**
  - [x] Adicionado um botão de menu hambúrguer ao cabeçalho (`Header.astro`) para telas pequenas.
  - [x] Implementada a lógica de exibir/ocultar o menu de navegação como uma sobreposição (overlay).
  - [x] Refatorada a lógica de autenticação (`auth.ts`) para usar classes CSS em vez de estilos embutidos, garantindo a compatibilidade com o novo menu.
  - [x] Corrigido um bug de sobreposição de CSS que impedia os links de serem ocultados corretamente.

## Próximos Passos para Lançamento

- **1. Infraestrutura e Domínio:**
  - [x] Registrar um domínio para o PostPulsar (ex: `postpulsar.com`).
  - [x] Configurar um serviço de e-mail profissional usando o domínio (ex: Google Workspace, Zoho Mail).
  - [x] Contratar um provedor SMTP (ex: Resend, SendGrid) e configurar as credenciais no painel do Supabase para garantir a entrega dos e-mails transacionais.

- **2. Verificação das Plataformas:**
  - [ ] **Meta (Facebook/Instagram/Threads):**
    - [x] Criar uma entidade de negócio (ex: MEI) para obter a documentação necessária.
    - [ ] Iniciar o processo de **Business Verification** no Meta Business Suite, enviando os documentos.
    - [ ] Após a verificação, submeter o aplicativo para **App Review**, justificando cada permissão e enviando um vídeo de demonstração (screencast) do fluxo completo.
  - [ ] **X (Twitter):**
    - [ ] Revisar e detalhar a descrição do aplicativo no Portal do Desenvolvedor.
    - [ ] Solicitar acesso ao nível **Elevated**, justificando a necessidade para a publicação de conteúdo.
  - [ ] **LinkedIn:**
    - [ ] Criar uma LinkedIn Page para o PostPulsar.
    - [ ] No painel do desenvolvedor, associar o app à página criada.
    - [ ] Gerar a URL de verificação e, como administrador da página, aprovar a associação.

- **3. Implementação de Assinaturas (Pós-Lançamento):**
  - [ ] Construir a página de preços e planos.
  - [ ] Desenvolver a Edge Function `create-subscription` para criar assinaturas no Stripe.
  - [ ] Atualizar o webhook do Stripe para lidar com renovações mensais (`invoice.payment_succeeded`) e atualizar os pulsos dos usuários.

## Sessão de Testes e Validação (Concluída)

Foco em criar uma suíte de testes automatizados para garantir a estabilidade da API antes do lançamento, seguindo as recomendações do arquivo `docs/api_research/validador`.

- [x] **1. Análise e Expansão do Teste de Carga (k6):**
  - [x] Refatorado o script `tests/load-test.js` para usar variáveis de ambiente para credenciais, aumentando a segurança.
  - [x] Adicionado um novo cenário de teste para cobrir a geração de conteúdo via texto manual (`rawText`), além da geração via URL.
  - [x] Melhoradas as asserções e adicionados `thresholds` para validar a performance e a taxa de sucesso.

- [x] **2. Estruturação dos Testes de Contrato de API (Newman):**
  - [x] Criado o diretório `api-tests/` com uma estrutura organizada (coleção, ambiente, README).
  - [x] Criada a coleção `PostPulsar.postman_collection.json` com os testes para a função `pulsar-v1`.
  - [x] Adicionados testes para os dois cenários de sucesso (URL e texto manual).

- [x] **3. Implementação de Teste de Falha e Correção de Bug:**
  - [x] Adicionado um teste de falha controlada que envia uma rede social inválida para a API.
  - [x] **Bug Encontrado:** O teste revelou que a API não estava validando o input `targetNetwork` corretamente.
  - [x] **Bug Corrigido:** A função `pulsar-v1` foi corrigida para adicionar a validação e retornar um erro, como esperado.
  - [x] A suíte de testes completa (2 de sucesso, 1 de falha) foi executada com sucesso, validando a correção e a robustez da API.

## Próxima Sessão: Monitoramento de Erros em Produção

O foco agora é garantir visibilidade sobre a saúde da aplicação após o lançamento.

- [ ] **1. Integração com Sentry:**
  - [ ] Criar uma conta no Sentry.io.
  - [ ] Integrar o SDK do Sentry no frontend Astro para capturar erros de cliente (JavaScript).
  - [ ] Investigar e, se possível, integrar o Sentry nas Supabase Edge Functions para capturar erros de backend.

## Sessão de Preparação para Revisão da Meta (Concluída)

Foco em ajustar a UI e o fluxo de dados para atender aos requisitos explícitos da revisão de aplicativo da Meta, que exigia a exibição de dados do perfil do usuário.

- [x] **1. Atualizar Banco de Dados:**
  - [x] Criada uma nova migração para adicionar a coluna `account_image_url` na tabela `social_connections`.
  - [x] Aplicada a migração ao banco de dados remoto com `npx supabase db push`.

- [x] **2. Corrigir Funções de Backend:**
  - [x] Modificada a função `instagram-auth-callback` para buscar e salvar a `profile_picture_url`.
  - [x] Modificada a função `facebook-auth-callback` para buscar e salvar a URL da foto de perfil da página.
  - [x] Corrigida a função `threads-auth-callback` para não solicitar a `profile_picture_url` (que não é fornecida pela API), evitando um erro.
  - [x] Corrigida a função `linkedin-auth-callback` para salvar o nome de usuário, evitando a exibição de "NULL".
  - [x] Forçado o deploy de todas as funções modificadas para garantir que as alterações estivessem ativas.

- [x] **3. Ajustar a UI do Frontend:**
  - [x] A página `connections.astro` foi refatorada para buscar e exibir o nome de usuário e a foto de perfil.
  - [x] A UI agora mostra um "cartão de perfil" para contas conectadas, mantendo o ícone da rede para fácil identificação e lidando com casos onde a foto de perfil não está disponível.
