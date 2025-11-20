# Arquitetura e Visão do Produto: PostPulsar

Esta nota é a fonte de verdade para as decisões de arquitetura e a visão estratégica do projeto PostPulsar.

## 1. Visão Geral

O PostPulsar é um micro-SaaS que utiliza IA para resolver o "inferno" do reaproveitamento de conteúdo. Ele transforma um único post de blog em múltiplos formatos de conteúdo para redes sociais (threads do Twitter, posts do LinkedIn, imagens de citação, etc.), economizando horas de trabalho manual para criadores de conteúdo.

- **Público-Alvo:** Criadores de conteúdo focados em texto (blogueiros, redatores), fundadores de startups que usam marketing de conteúdo e escritores de newsletters.

## 2. Arquitetura da Aplicação

- **Frontend:** Astro (com TypeScript)
- **Backend e Banco de Dados:** Supabase
- **Hospedagem:** Vercel
- **Processamento de Pagamentos:** Stripe

### Detalhes da Stack:

- **Supabase:** Será usado para:
  - **Autenticação:** Gerenciar usuários (login com email/senha, Google, etc.).
  - **Database (Postgres):** Armazenar dados dos usuários, estado da assinatura (plano gratuito, pro), e chaves de API para redes sociais conectadas.
  - **Storage:** Salvar mídias geradas, como as imagens de citação.
  - **Edge Functions:** Executar a lógica server-side principal, como buscar o conteúdo da URL do artigo e fazer as chamadas para as APIs de IA.

- **Vercel:** Ideal para hospedar o projeto Astro, com deploys automáticos a cada push na branch `main` do GitHub.

- **Stripe:** Será integrado para gerenciar as assinaturas dos planos pagos.

## 3. Modelo de Negócio e Preços (Otimizado com Free Trial)

Para otimizar a ativação de novos usuários, o modelo de negócio foi refinado. Em vez de um plano gratuito com recursos limitados desde o início, o novo fluxo de entrada é um **período de teste gratuito (Trial)** que oferece uma experiência completa do produto.

- **Ponto de Entrada (Plano "Free"):**
  - O usuário se inscreve no plano "Free", que agora inclui automaticamente um **trial de 7 dias do Plano Pro**.
  - **Acesso no Trial:** Funcionalidades completas do Plano Pro, incluindo 500 pulsos e publicação de vídeo.
  - **Requisito:** Não é necessário cartão de crédito.
  - **Objetivo:** Permitir que o usuário experimente todo o poder da ferramenta sem atritos, aumentando a probabilidade de ativação e conversão.

- **Plano Pós-Trial (Continuação do Plano Free):**
  - Após os 7 dias de trial, a conta do usuário permanece no plano "Free", mas com seus recursos padrão.
  - **70 Pulsos** por mês.
  - Publicação de texto (com exceção para imagem no Instagram).

- **Plano Classic (Upgrade):**
  - **Preço:** $9 (Pagamento único para 30 dias de acesso)
  - **210 Pulsos** (Bônus recebido no momento da compra).
  - Publicação de texto e imagem.

- **Plano Pro (Upgrade):**
  - **Preço:** $29 (Pagamento único para 30 dias de acesso)
  - **500 Pulsos** (Bônus recebido no momento da compra).
  - Publicação de texto, imagem e vídeo.

- **Pacotes de Pulsos (para qualquer plano):**
  - Compre **100 Pulsos** a qualquer momento por **$5**.
  - Compre **250 Pulsos** a qualquer momento por **$10**.
  - Compre **600 Pulsos** a qualquer momento por **$20**.

## 4. Modelo de Desenvolvimento Seguro (SSDLC)

Para garantir a segurança e a robustez do PostPulsar, todo o desenvolvimento seguirá os princípios do **Secure Software Development Lifecycle (SSDLC)**. A principal referência para mitigar vulnerabilidades será o **OWASP Top 10**.

**Diretrizes Práticas Invioláveis:**

1.  **Toda Lógica Crítica é Server-Side:** Ações que envolvem permissões, planos e pagamentos **devem** ser validadas e executadas no servidor.
    - **Exemplo (Anti-Manipulação de Preço):** O frontend exibe o preço de $29, mas quando o usuário clica em comprar, o servidor é que busca o preço de $29 no banco de dados para iniciar a transação com o Stripe. O preço enviado pelo cliente é ignorado.

2.  **Validação de Input em Todas as Entradas:** Nunca confiar em dados vindos do usuário (formulários, parâmetros de URL).
    - **Ação:** Usar as funções padrão do cliente Supabase (ex: `supabase.from('posts').insert(...)`) que utilizam "parameterized queries", prevenindo SQL Injection. Para outros inputs, usar bibliotecas de validação como a Zod.

3.  **Controle de Acesso com Row-Level Security (RLS):** O Supabase oferece RLS, que será nossa principal ferramenta de controle de acesso.
    - **Ação:** Habilitar RLS em todas as tabelas com dados de usuários. Criar políticas que garantam que "um usuário só pode ver e editar seus próprios dados". Recentemente, foram aplicadas melhorias de segurança diretamente no banco de dados, incluindo a correção do `search_path` em funções críticas para prevenir a execução de código malicioso e a otimização das políticas de Row-Level Security (RLS) para garantir que os usuários só possam acessar e modificar seus próprios dados, seguindo o princípio do menor privilégio.

4.  **Gerenciamento de Dependências:** Manter os pacotes atualizados é uma defesa crucial.
    - **Ação:** Executar `npm audit` regularmente e ativar o Dependabot no repositório do GitHub para sermos alertados sobre vulnerabilidades conhecidas em nossas dependências.

5.  **Bloqueio de E-mails Descartáveis:** Para mitigar o abuso do sistema de trial, foi implementada uma verificação no momento do cadastro para proibir o uso de e-mails temporários.
    - **Ação:** Foi criada uma Edge Function (`signup-validation`) que busca a lista de domínios de e-mail descartáveis diretamente da fonte de verdade (o repositório oficial no GitHub). A função armazena a lista em cache para otimizar a performance e valida o domínio do e-mail do usuário contra esta lista antes de permitir o cadastro. Isso garante que a lista de bloqueio esteja sempre atualizada e previne o uso de pacotes NPM ou APIs de terceiros.

## 5. Fluxo de Autenticação (Client-Side)

A autenticação é gerenciada por um único módulo (`src/lib/auth.ts`) que é importado e executado globalmente pelo layout principal (`src/layouts/Layout.astro`). Essa abordagem centralizada garante que a lógica de autenticação seja consistente em todas as páginas.

- **Lógica Central:** O script `src/lib/auth.ts` contém a função `manageAuth()`, que é responsável por:
  - **Gerenciamento de UI:** Exibir ou ocultar elementos de navegação (como botões de Login/Logout) com base no estado da sessão do usuário.
  - **Proteção de Rotas:** Redirecionar usuários não autenticados de páginas protegidas (como `/app`) para a página de login.
  - **Redirecionamento Pós-Login:** Redirecionar usuários já autenticados de páginas de login/cadastro para o dashboard (`/app`).
- **Execução Global:** O `Layout.astro` importa e executa `manageAuth()` em um bloco `<script type="module">`, garantindo que essa lógica seja aplicada a todas as páginas do site.
- **Eventos de Logout:** O script também adiciona um ouvinte de eventos ao botão de logout para chamar `supabase.auth.signOut()` e redirecionar o usuário para a página inicial.
- **Gerenciamento de Modais:** A lógica de exibição de modais, que é parte integral da experiência do usuário, foi centralizada no módulo `src/lib/modal.ts`. Isso corrige bugs de layout (conflitos de classes CSS `flex`/`hidden`) e garante um comportamento consistente. Adicionalmente, foi implementado um listener de eventos centralizado que usa delegação para garantir que todos os botões de fechar (`[data-modal-close]`) funcionem de forma confiável em todos os modais.

---

## 6. Comandos Essenciais

| Comando          | Ação                                      |
| :--------------- | :---------------------------------------- |
| `npm run dev`    | Inicia o servidor de desenvolvimento.     |
| `npm run build`  | Compila o site para produção.             |
| `npm run format` | Formata todo o código com Prettier.       |
| `npm run lint`   | Analisa a qualidade do código com ESLint. |

## 7. Gerenciamento de Conta do Usuário

A página de Configurações da Conta (`src/pages/app/settings.astro`) centraliza todas as funcionalidades de gerenciamento de perfil e segurança do usuário.

- **Funcionalidades Implementadas:**
  - **Alteração de Senha:** Formulário para o usuário definir uma nova senha.
  - **Alteração de E-mail:** Interface com modal para solicitar um novo e-mail. O fluxo de confirmação segura do Supabase (verificação em ambos os e-mails, antigo e novo) é explicado na UI para evitar confusão.
  - **Vinculação de Contas Sociais:** Permite que o usuário vincule sua conta do Google ao seu perfil existente para facilitar o login. A UI reflete o estado atual (vinculado ou não).
  - **Exclusão de Conta (com Atraso):** Para prevenir a recriação imediata de contas para abuso do trial, o processo de exclusão terá um **período de "resfriamento" (cooling-off) de 10 dias**.
    - **Fluxo:** Ao solicitar a exclusão, a conta é marcada para deleção e desativada. Uma função agendada (cron job) executará a exclusão permanente após 10 dias. O usuário será informado sobre este período.

### Solução Robusta para Senhas em Contas Sociais

Durante o desenvolvimento, foi identificado um comportamento inconsistente no Supabase: ao adicionar uma senha a uma conta criada via login social (OAuth), a lista de "identidades" do usuário não era atualizada para incluir o provedor "email". Isso tornava impossível para a interface saber de forma confiável se o usuário já possuía ou não uma senha, resultando em uma UI que não atualizava corretamente.

A solução definitiva foi criar uma "fonte da verdade" controlada pela nossa própria aplicação:

1.  **Flag no Banco de Dados:** Foi adicionada uma coluna booleana `has_password` na tabela `profiles`.
2.  **Edge Function (`set-password-flag`):** Foi criada uma função de servidor que é chamada pelo frontend logo após um usuário social criar sua primeira senha. A única responsabilidade desta função é marcar a flag `has_password` como `true` para aquele usuário.
3.  **Lógica na Interface:** A página de configurações agora verifica duas condições para decidir se mostra o formulário de "Criar Senha" ou "Alterar Senha": primeiro, a existência da identidade `email` (para contas padrão); se essa falhar, ela consulta a flag `has_password` na tabela `profiles`. Isso garante que a UI sempre reflita o estado real da conta do usuário.

## 8. Arquitetura da Funcionalidade Principal ("Pulsar")

A funcionalidade "Pulsar" é o coração do produto. Sua arquitetura foi refatorada para um fluxo de duas etapas, garantindo eficiência e segurança.

### Etapa 1: Extração de Conteúdo (`get-source-text` - Server-Side)

1.  **Ação do Usuário:** O usuário cola a URL de um artigo ou mídia no dashboard e clica no botão "Pulsar". Alternativamente, pode colar o texto completo do artigo diretamente.
2.  **Chamada de API:** O frontend faz uma chamada segura e autenticada para a Edge Function `get-source-text`, enviando a URL (ou o texto bruto, se aplicável).
3.  **Validação e Débito de Pulso:** A função `get-source-text` valida a URL, as permissões do usuário e **debita o pulso de extração** de conteúdo.
    *   **1 Pulso:** Para raspar o conteúdo de um artigo de blog.
    *   **2 Pulsos:** Para transcrever o áudio de um vídeo.
4.  **Extração (Scraping/Transcrição):**
    - Se uma URL de artigo for fornecida, a função a acessa e extrai o conteúdo principal.
    - Se uma URL de mídia for fornecida, ela chama o `video-converter-service` para transcrever o áudio do vídeo.
    - Se o texto bruto (`rawText`) for fornecido (via frontend, ignorando esta função), esta etapa é ignorada.
5.  **Resposta:** A função retorna o texto limpo e processado para o frontend.

### Etapa 2: Geração de Conteúdo (`pulsar-v1` - Server-Side)

1.  **Chamada de API:** O frontend, com o texto limpo em mãos, faz chamadas sequenciais para a Edge Function `pulsar-v1` para cada rede social selecionada.
2.  **Validação e Débito de Pulso:** A função `pulsar-v1` valida as permissões do usuário e **debita 1 pulso de geração** para cada rede social.
3.  **Geração com IA (Sequencial):** O texto limpo, junto com as configurações do usuário e o prompt específico da rede, é enviado a um modelo de linguagem de IA (LLM). A geração é feita de forma sequencial para cada rede social selecionada.
4.  **Resposta:** A função retorna o conteúdo gerado (um objeto JSON) para o frontend.

### Etapa 3: A Exibição (Frontend)

1.  **Renderização Dinâmica:** O dashboard recebe o objeto JSON e renderiza dinamicamente um "card" separado para cada rede social.
2.  **Persistência Temporária:** O conteúdo gerado é **salvo no `localStorage` do navegador**. Isso garante que, se o usuário atualizar a página, o conteúdo não seja perdido antes da publicação.
3.  **Edição de Conteúdo:** O conteúdo é renderizado dentro de campos `<textarea>`, permitindo que o usuário edite e refine o material antes de publicar.

**Nota de Implementação (Refatoração do Dashboard):** Para gerenciar a complexidade do dashboard, o arquivo monolítico `DashboardManager.ts` foi refatorado em múltiplos módulos com responsabilidades específicas. O `DashboardManager.ts` agora atua como um orquestrador, inicializando os seguintes módulos:

- **`PromptManager.ts`:** Gerencia a UI e a lógica para criar, salvar e selecionar prompts de IA.
- **`MediaManager.ts`:** Controla toda a lógica de upload de arquivos, previews de mídia e validações.
- **`DashboardEventManager.ts`:** Lida com eventos da UI, como contadores de caracteres, toggles de configurações e o botão "Salvar como Padrão".
- **`PublicationManager.ts`:** Orquestra o processo de publicação, tanto para posts individuais quanto para a funcionalidade "Publicar Tudo".
- **`PublishAllManager.ts`:** Gerencia o modal de feedback da publicação em lote, mostrando o status de cada rede social.

### Etapa 4: A Conexão e Salvamento (Postando nas Redes Sociais)

A conexão com as plataformas é implementada através de dois padrões distintos para máxima flexibilidade:

1.  **OAuth 2.0 (para Redes Sociais):** Plataformas como LinkedIn, Twitter, Instagram, etc., utilizam um fluxo OAuth 2.0 seguro, onde o usuário autoriza a aplicação a agir em seu nome. As credenciais (tokens) são armazenadas na tabela `social_connections`.
2.  **Conexão Direta de Apps (Múltiplos Destinos):** A integração com plataformas como Telegram e Discord foi aprimorada para suportar múltiplas conexões por usuário. Em vez de um único formulário, a página de configurações agora permite ao usuário adicionar, nomear e gerenciar uma lista de conexões (múltiplos bots/canais do Telegram ou múltiplos webhooks do Discord).
    - **Refatoração da `save-app-connection`:** A função de backend foi refatorada para seguir o modelo da integração com páginas do Facebook. Ela agora recebe uma lista completa de conexões do frontend, apaga as configurações antigas para aquele provedor e salva a nova lista. Para garantir a unicidade, o ID do Canal (Telegram) ou o Apelido da Conexão (Discord) é usado como um identificador único (`provider_user_id`) no banco de dados.

A ação de publicar agora também é responsável por salvar o post no histórico.

#### Ação de Postar (`publish-to-social`)

- **Ação:** No dashboard, o usuário clica em "Postar na Rede Social" ou "Publicar Tudo".
- **Lógica Detalhada:**
  1.  **Salvar no Histórico:** A primeira coisa que a função `publish-to-social` faz é chamar uma função RPC (`save_post_to_history`) que salva o conteúdo completo (com as edições do usuário e URLs de mídia) na tabela `generated_posts`. Isso cria um registro permanente do que foi publicado.
  2.  **Busca de Credenciais:** A função busca as credenciais do usuário para a plataforma específica na tabela `social_connections`.
  3.  **Publicação na Rede Social:** Com as credenciais e o conteúdo em mãos, ela executa a chamada de API para a plataforma correspondente, publicando o post.
  4.  **Débito de Pulso (Apenas com Sucesso):** Apenas se a publicação na etapa anterior for bem-sucedida, a função chama a RPC `charge_for_publication` para debitar o pulso do usuário. Se a publicação falhar, o pulso não é consumido.

**Nota sobre a Arquitetura da Função:** Para melhorar a manutenibilidade, a função monolítica `publish-to-social` foi refatorada. Ela agora atua como um roteador principal que delega a lógica de publicação específica de cada plataforma para módulos de serviço dedicados (ex: `services/linkedinService.ts`, `services/twitterService.ts`, `services/metaService.ts`, `services/telegramService.ts`, `services/discordService.ts`).

## 9. Arquitetura da Geração de Imagem de Citação

Para agregar valor sem incorrer em altos custos de API de geração de imagem, foi implementada uma funcionalidade de criação de imagens de citação baseada em templates.

- **Fluxo Geral:** O objetivo é extrair uma citação impactante de um texto e aplicá-la a um modelo de imagem pré-definido.
- **Custo de Pulsos:** A operação tem um custo variável:
  - **1 Pulso:** Se o usuário parte de um texto bruto (modo "From Text"). O pulso é consumido pela extração da citação via IA.
  - **2 Pulsos:** Se o usuário parte de uma URL (modo "From URL"). O primeiro pulso é consumido pela função `get-source-text` para extrair o conteúdo da página, e o segundo é consumido pela extração da citação via IA.

### Etapa 1: Orquestração (Edge Function `generate-image-from-text`)

1.  **Ação do Usuário:** No dashboard, o usuário clica no botão "Generate Image".
2.  **Chamada de API:** O frontend (especificamente o `DashboardManager`) determina se o modo de entrada é URL ou texto.
    - Se for URL, ele primeiro chama a função `get-source-text` para obter o conteúdo do artigo.
    - Com o texto em mãos (seja da URL ou do input direto), ele chama a nova Edge Function `generate-image-from-text`.
3.  **Extração da Citação com IA:** A função `generate-image-from-text` envia o texto para um modelo de linguagem (`gemini-2.5-flash`) com um prompt para extrair uma citação curta e impactante.
4.  **Débito de Pulso:** A função chama a RPC `charge_for_image_generation` para debitar 1 pulso do usuário.

### Etapa 2: Renderização da Imagem (Serviço `video-converter-service`)

1.  **Chamada de Serviço:** A `generate-image-from-text` faz uma chamada `POST` para o endpoint `/generate-image` no `video-converter-service`, enviando a citação extraída pela IA.
2.  **Renderização:** O `video-converter-service` usa a biblioteca `node-html-to-image` para:
    - Carregar um template HTML/CSS pré-definido de seu diretório local (`/templates`).
    - Injetar a citação recebida no template.
    - Renderizar este HTML para um arquivo de imagem PNG em um diretório temporário.
3.  **Upload e Resposta:** O serviço faz o upload da imagem gerada para o bucket `post-images` do Supabase Storage e retorna a URL pública para a Edge Function.

### Etapa 3: Exibição no Frontend

1.  **Resposta Final:** A Edge Function `generate-image-from-text` repassa a URL pública da imagem para o frontend.
2.  **Renderização:** O `DashboardManager` recebe a URL e renderiza um novo card no dashboard contendo a imagem, botões para download e para copiar a URL.

## 10. Sistema de Créditos ("Pulsos")

Os "Pulsos" são a espinha dorsal do modelo de negócio. O sistema foi projetado para ser claro para o usuário e robusto no backend.

- **Tipos de Pulso:**
  - **Pulso de Extração:** Consumido pela função `get-source-text` para ler o conteúdo fonte. Custa 1 pulso para artigos e 2 para mídias.
  - **Pulso de Geração:** Consumido pela função `pulsar-v1` para gerar conteúdo de IA. Custa 1 pulso por rede social selecionada.

### Ciclo de Vida dos Pulsos e Planos

O sistema opera com um modelo de pagamento único e dois processos automatizados para gerenciar o estado do usuário.

1.  **Compra de Plano (Pagamento Único):**
    - A compra de um plano (ex: Classic, Pro) é uma transação única que concede ao usuário um pacote de pulsos (210 para Classic, 500 para Pro) e define uma data de expiração (`plan_expires_at`) para 30 dias no futuro. Não há cobrança recorrente.

2.  **Expiração de Planos (Cron Job Diário):**
    - Uma função agendada (`daily-plan-expiration`) roda **diariamente**.
    - Sua única responsabilidade é encontrar usuários cujo `plan_expires_at` já passou e rebaixar seu `plan_type` de volta para `free`.
    - No momento do rebaixamento, o saldo de pulsos do usuário também é definido para o padrão do plano gratuito (70).

3.  **Reset de Pulsos para Usuários Gratuitos (Cron Job Mensal):**
    - Uma segunda função agendada (`monthly-pulse-reset`) roda no **primeiro dia de cada mês**.
    - Sua única responsabilidade é encontrar **todos** os usuários que atualmente possuem `plan_type = 'free'` e definir seu saldo de pulsos para 70. Isso garante a "mesada" de pulsos para usuários gratuitos.

## 11. Notas de Desenvolvimento e Solução de Problemas

Esta seção documenta aprendizados e soluções para problemas comuns encontrados durante o desenvolvimento.

### Sincronizando Migrações Locais e de Produção (Erro PGRST205)

- **Causa:** Este erro acontece quando uma nova tabela é criada via migração no ambiente de desenvolvimento local, mas a API do Supabase (PostgREST) ainda não foi notificada da mudança.
- **Fluxo de Trabalho Correto:** 1. `supabase migration new <nome>` -> 2. Adicionar SQL -> 3. `supabase migration up` (local) -> 4. Testar localmente -> 5. `supabase db push` (produção).

### Resolvendo Erros de Autenticação em Edge Functions

- **Erro `401 Missing authorization header` em Callbacks Anônimos:**
  - **Solução:** Adicionar `verify_jwt = false` no arquivo `supabase/config.toml` para a função de callback específica.

- **Erro `401 Unauthorized` / `AuthSessionMissingError` em Funções Autenticadas:**
  - **Solução (Workaround):** Decodificar o JWT manualmente dentro da função para extrair o `user_id` (`sub`) e usar a `SUPABASE_SERVICE_ROLE_KEY` para operações de banco de dados.

### Erros de Configuração da Plataforma Meta

- **Erro `Invalid App ID` ou `Função de desenvolvedor insuficiente`:**
  - **Solução:** Garantir que os endpoints e escopos corretos estão sendo usados para o tipo de app e que o usuário de teste está registrado no painel da Meta.

### 4. Solução para Docker Desktop: Encontramos também problemas de permissão com o Docker Desktop. A solução foi trocar o contexto do Docker para o `default` do sistema (`docker context use default`) e rodar os comandos do Supabase com `sudo`, ou, de forma permanente, adicionar o usuário ao grupo `docker` com `sudo usermod -aG docker $USER` e reiniciar a sessão.

## 12. Configurações Avançadas e Persistência de Preferências

Para dar ao usuário controle granular sobre o conteúdo gerado e melhorar a experiência de uso, foi implementada uma seção de "Configurações Avançadas" com persistência de dados.

- **Interface:** Um menu "sanfona" (accordion) chamado "Configurações Avançadas" foi adicionado ao dashboard.
- **Persistência de Preferências (Banco de Dados):** Colunas `default_[network]_chars` na tabela `profiles`.
- **Persistência de Preferências (Backend):** Uma função RPC, `update_char_preferences`, é chamada pelo frontend para salvar as preferências.

## 13. Melhorias de Experiência do Usuário (UX)

Para refinar a interação do usuário com a aplicação, diversas melhorias de qualidade de vida foram implementadas.

### Tratamento de Sessões Expiradas

- **Solução:** A função `publish-to-social` tenta renovar o `access_token` antes de cada publicação. Se falhar, retorna um erro específico (`SESSION_EXPIRED`) que o frontend usa para exibir um modal informativo.

### Gestão do Histórico e Persistência de Conteúdo

- **Persistência Temporária:** Para evitar a perda de trabalho ao atualizar a página, o último conteúdo gerado é salvo no `localStorage` do navegador e recarregado automaticamente.
- **Página de Histórico:** Uma página `/app/history` dedicada foi criada para listar todos os posts salvos (que foram publicados pelo menos uma vez).
- **Reabrir do Histórico:** O usuário pode clicar em "Reopen" em um post antigo. Isso carrega o conteúdo de volta ao dashboard principal. Para acelerar a experiência, as mídias associadas (imagens e vídeos) são pré-carregadas de forma otimizada, exibindo um preview instantâneo diretamente a partir de suas URLs, deixando o post pronto para edição ou nova publicação de forma muito mais rápida.

### Publicação no Threads

- A lógica de publicação no Threads foi adicionada à função `publish-to-social`, usando o fluxo de duas etapas da API (criar container, depois publicar).

### Cabeçalho Responsivo com Menu Hambúrguer

- **Solução:** Para melhorar a experiência de navegação em dispositivos móveis, o cabeçalho do site foi tornado totalmente responsivo. Em telas menores, os links de navegação são recolhidos dentro de um menu "hambúrguer". Ao ser clicado, o menu se expande em uma sobreposição (overlay), garantindo que os links sejam legíveis e fáceis de usar. A lógica de exibição de links baseada na autenticação do usuário foi preservada e funciona de forma consistente em ambas as visualizações (desktop e mobile).

## 14. Modelo de Negócio (Atualizado com Vídeo)

Com a introdução da funcionalidade de vídeo, o modelo de negócio foi refinado para criar uma diferenciação clara entre os planos.

- **Plano Gratuito:**
  - **30 Pulsos** por mês.
  - Publicação de **texto**. Uma exceção é feita para o Instagram, que permite o upload de imagem para viabilizar a postagem.
- **Plano Básico (ainda a ser nomeado):**
  - Publicação de **texto e imagem**.
- **Plano Pro:**
  - Publicação de **texto, imagem e vídeo**.

A verificação do plano (`plan_type`) é feita no backend para autorizar ou negar ações, e o frontend ajusta a UI dinamicamente.

## 15. Arquitetura de Vídeo com Microserviço Externo

A principal barreira técnica para suportar uploads de vídeo era a necessidade de processamento (transcodificação). A solução foi um microserviço em Node.js com `ffmpeg`, hospedado na Railway.

- **Fluxo de Dados:** Frontend -> `request-video-conversion` (Edge Function) -> Upload para bucket privado -> Chamada para microserviço na Railway (que analisa e converte/limpa o vídeo) -> Upload do resultado para bucket público -> `publish-to-social` usa a URL do vídeo processado.

**Nota sobre a Robustez da Publicação (LinkedIn):** Para lidar com o processamento assíncrono de vídeos em plataformas como o LinkedIn, a arquitetura foi aprimorada. O serviço de publicação (`linkedinService.ts`) agora implementa um **mecanismo de polling**, que aguarda ativamente o vídeo ser processado pela API do LinkedIn antes de finalizar a publicação. Além disso, o sistema foi tornado mais resiliente para lidar com casos em que a API do LinkedIn, embora bem-sucedida, não retorna um ID de postagem, evitando erros desnecessários na interface do usuário.

## 16. Arquitetura de Média Flexível (Upload Direto vs. Conversão)

Com a adição de mais plataformas, a arquitetura de upload de mídia foi refatorada para um modelo de **dois caminhos**, otimizando a velocidade e o uso de recursos.

- **Caminho de Conversão (Legado):** Para redes sociais com requisitos de formato e estrutura muito rígidos (como Instagram e LinkedIn), o fluxo original é mantido. As mídias são enviadas para o microserviço externo (`video-converter-service`) para análise, limpeza (`moov atom`) ou conversão completa. Isso garante a máxima compatibilidade.

- **Caminho de Upload Direto (Novo):** Para plataformas mais flexíveis como **Discord** e **Telegram**, que aceitam uma gama maior de formatos e não têm requisitos estruturais complexos, um novo fluxo foi implementado. As mídias são enviadas pelo cliente **diretamente para um bucket público** no Supabase Storage (em pastas dedicadas como `post-images/discord-media/`).

Essa abordagem de dois caminhos, orquestrada pelo `MediaManager.ts` no frontend, permite que o upload para Discord e Telegram seja significativamente mais rápido, pois elimina a etapa intermediária do serviço de conversão, ao mesmo tempo que mantém a robustez do processamento para as redes que o exigem. Os caminhos dos arquivos são estruturados para serem compatíveis com as políticas de Row-Level Security (RLS), garantindo que cada usuário só possa acessar suas próprias mídias.

## 17. UX Avançada

### Modal de Progresso e Média Inteligente

- **Modal de Progresso Unificado:** Um modal reutilizável (`src/lib/modal.ts`) fornece feedback em tempo real sobre o
- **Modal de Publicação em Lote:** A funcionalidade "Publicar Tudo" possui seu próprio modal de progresso, gerenciado pelo `PublishAllManager.ts`, que exibe o status individual de cada publicação (Aguardando, Publicando, Sucesso ou Falha), dando ao usuário feedback claro sobre o andamento do processo.
- **Lógica de Média Inteligente:** A interface de upload se adapta às regras de cada rede social, desabilitando opções não suportadas (ex: vídeo no Twitter se uma imagem já foi selecionada) e permitindo o upload de múltiplos arquivos para redes com suporte a carrossel (Instagram, Threads).

### Validações e Seletores

- **Avisos Proativos:** Para melhorar a experiência do usuário e evitar erros, os alertas (`alert()`) foram substituídos por modais customizados que informam sobre ações necessárias, como a obrigatoriedade de selecionar uma rede para gerar conteúdo, a necessidade de uma imagem para postar no Instagram ou a seleção de uma página específica para o Facebook.
- **Seleção de Página do Facebook:** O fluxo de publicação para o Facebook foi aprimorado. Em vez de um dropdown, um botão "Selecionar Página" foi adicionado ao card. Ao ser clicado, ele abre um modal que lista todas as páginas conectadas, permitindo que o usuário escolha de forma clara e direta em qual página deseja publicar.
- **Seleção de Múltiplos Destinos (Telegram/Discord):** Para dar suporte à publicação em múltiplos canais ou grupos, a interface do dashboard foi aprimorada. Se mais de uma conexão for detectada para Telegram ou Discord, o botão "Postar" é substituído por "Selecionar Destino(s)". Este botão abre um modal que permite ao usuário selecionar um ou mais destinos com checkboxes. A publicação é então enviada para todos os alvos selecionados.

## 18. Gestão Avançada de Prompts e Recursos

### Sistema de Prompts Inteligente

Para aumentar a qualidade e a relevância do conteúdo gerado, o sistema de prompts foi refatorado para uma arquitetura modular e inteligente.

- **Arquitetura Modular:** A lógica de criação de prompts foi movida da monolítica `pulsar-v1` para um serviço dedicado (`promptService.ts`), que por sua vez carrega perfis de prompt de um novo diretório: `supabase/functions/pulsar-v1/services/prompts/`. Cada arquivo nesse diretório (ex: `linkedin.ts`, `twitter.ts`) define o tom e as regras de hashtags ideais para uma rede social específica.

- **Lógica de Prioridade:** O sistema agora opera com uma regra de prioridade clara:
  1.  **Prompt Customizado:** Se o usuário seleciona um prompt pré-definido (ex: "Short & Punchy", "ELI5") ou um prompt customizado criado por ele, essa instrução tem prioridade total para definir o tom e o estilo do post.
  2.  **Prompt Padrão ("Default AI"):** Se o usuário utiliza a opção padrão, o sistema carrega o perfil da rede social de destino e usa as regras de tom e quantidade de hashtags definidas nele. Isso garante que o "Default AI" gere o conteúdo mais otimizado possível para cada plataforma.

- **Trava de Segurança de Tokens:** Para aumentar a confiabilidade e o controle sobre o comprimento do texto, uma trava de segurança técnica foi implementada. O parâmetro `maxOutputTokens` agora é calculado e enviado em **todas** as chamadas para a API da IA, independentemente do prompt selecionado. Isso previne que a IA gere textos muito maiores que o esperado e ajuda a manter os custos sob controle.

### Gestão de Recursos

- **Sistema de Prompts (Usuário):** Usuários Pro podem criar, salvar e gerenciar até 5 prompts de IA personalizados, que são salvos na tabela `user_prompts`.
- **Otimização de Storage:** Uma função agendada (`storage-cleanup`) roda diariamente para identificar e remover mídias órfãs do Supabase Storage, otimizando o uso de recursos.

## 19. Próximos Passos

- **Implementar reutilização de mídias ao reabrir um post do histórico.**
- **Conexão com Pinterest (Em Espera):** A integração está em pausa. A solicitação de acesso à API foi recusada e a funcionalidade está oculta na interface do usuário.
- **Construir Página de Planos e Pagamentos:** Integrar o Stripe para que os usuários possam fazer upgrade de plano e comprar pacotes de pulsos.

## 20. Arquitetura de Pagamentos (Stripe)

Para garantir uma integração de pagamentos segura e robusta, o PostPulsar **não armazena, em hipótese alguma, dados sensíveis de cartão de crédito**. Toda a lógica de pagamento é gerenciada pelo **Stripe**.

### Modelo de Compra (Pagamento Único)

Por decisão de negócio, o PostPulsar **não utiliza assinaturas recorrentes automáticas**. Toda compra, seja de um pacote de pulsos ou de um plano (Classic/Pro), é tratada como um **pagamento único**.

- **Compra de Plano:** Garante acesso aos benefícios do plano por 30 dias.
- **Compra de Pulsos:** Adiciona um saldo de pulsos que não expira.

### Estratégia de Precificação Regional

Para maximizar a conversão em mercados globais, a precificação é adaptada à localização do usuário, baseada em dados de tráfego. A estratégia utiliza uma abordagem híbrida:

1.  **Moedas Locais Dedicadas:** Para os principais mercados (Brasil, Índia, Emirados Árabes), foram criados preços específicos nas moedas locais (BRL, INR, AED). Isso elimina a fricção da conversão para o cliente.
2.  **Descontos Regionais via Cupom:** Para outros mercados emergentes (ex: Argentina, México), em vez de criar múltiplas moedas, um **cupom de desconto** de 50% é aplicado dinamicamente sobre o preço base em USD. Isso garante um preço justo sem a complexidade de gerenciar dezenas de moedas.
3.  **Preço Padrão em USD:** Para o resto do mundo (ex: EUA, Europa), o preço padrão em USD é aplicado.

### Estrutura no Stripe

A arquitetura no Stripe foi desenhada para suportar essa flexibilidade:

- **5 Produtos Mestres:** Existem apenas 5 produtos no catálogo (`Plano Pro`, `Plano Classic`, e os 3 pacotes de pulsos).
- **Múltiplos Preços por Produto:** Cada um desses 5 produtos contém múltiplos objetos de "Preço", um para cada moeda dedicada (BRL, INR, AED, USD). Isso centraliza a gestão.
- **1 Cupom de Desconto:** Um único cupom de 50% (`Desconto Regional`) é usado para todos os países da camada de desconto.

### Fluxo da Transação

1.  **Exibição do Preço (Frontend):**
    - Ao carregar a página de cobrança, o frontend chama a Edge Function `get-regional-prices`.
    - Esta função detecta o país do usuário. Com base no país, ela retorna o `priceId` correto (para moedas dedicadas) ou o `priceId` de USD com um sinalizador de desconto.
    - O frontend exibe o preço final correto para o usuário.

2.  **Criação da Intenção de Pagamento (Edge Function `create-payment-intent`):**
    - O frontend envia o `priceId` para esta função.
    - A função detecta novamente o país do usuário. Se for um país da camada de desconto, ela atacha o ID do cupom de 50% à sessão de checkout que está sendo criada.
    - A função retorna a URL do Stripe Checkout para o frontend.

3.  **Execução da Cobrança:**
    - O frontend redireciona o usuário para a página de pagamento segura do Stripe, que já exibe o preço na moeda correta e com o desconto aplicado, se for o caso.

4.  **Confirmação e Fulfillment (Edge Function `stripe-webhook`):**
    - Após o pagamento, o Stripe envia um evento `checkout.session.completed`.
    - O webhook lê o `price_id` dos metadados do evento.
    - Ele usa o `price_id` para buscar o `product_id` mestre via API do Stripe.
    - Com o `product_id`, ele identifica inequivocamente o que foi comprado (ex: 'Plano Pro') e atualiza a conta do usuário (adiciona o plano ou os pulsos).

## 21. Programa de Afiliados (PromoteKit)

Para acelerar a aquisição de clientes, foi implementado um programa de afiliados utilizando a plataforma **PromoteKit**. Esta escolha foi baseada na sua integração simplificada e foco em SaaS.

### Fluxo de Rastreamento e Atribuição

1.  **Rastreamento de Visitantes:** Quando um visitante chega ao PostPulsar através de um link de afiliado, o script do PromoteKit (carregado globalmente) detecta o parâmetro de referência na URL e armazena o ID do afiliado em um cookie no navegador do visitante.
2.  **Captura do ID de Referência:** No momento da compra, na página de cobrança (`billing.astro`), o código busca ativamente o ID de referência armazenado pelo script do PromoteKit (disponível em `window.promotekit_referral`).
3.  **Envio para o Backend:** Se um ID de referência for encontrado, ele é incluído no corpo da requisição para a Edge Function `create-payment-intent`.
4.  **Vinculação no Stripe:** A função `create-payment-intent` recebe o ID de referência e o anexa como **metadados (`metadata`)** à sessão de checkout do Stripe.
5.  **Atribuição da Comissão:** O PromoteKit monitora os eventos de pagamento no Stripe. Ao detectar uma compra com os metadados de afiliado, ele automaticamente atribui a comissão ao afiliado correspondente.

Este fluxo garante que a atribuição seja robusta e totalmente gerenciada pela plataforma de afiliados, sem a necessidade de armazenar dados de referência no banco de dados do PostPulsar.

## 22. Estratégias Anti-Abuso para o Free Trial

Para proteger a sustentabilidade do modelo de teste gratuito e prevenir que um mesmo usuário crie múltiplas contas para obter acesso Pro ilimitado, serão implementadas as seguintes barreiras em camadas:

1.  **Bloqueio de E-mails Descartáveis:** Conforme detalhado na seção SSDLC, a criação de contas com e-mails temporários será bloqueada via API para impedir o cadastro em massa.

2.  **Atraso na Exclusão de Conta:** Conforme detalhado na seção de Gerenciamento de Conta, o período de 10 dias para a exclusão impede que um usuário delete sua conta e crie uma nova imediatamente com o mesmo e-mail para reiniciar o trial.

3.  **Prevenção de Contas Múltiplas (Fingerprinting):** Como uma medida mais avançada, será avaliado o uso de bibliotecas de _fingerprinting_ de dispositivo/navegador (como FingerprintJS).
    - **Fluxo:** Um identificador único do dispositivo do usuário seria gerado no momento do cadastro. Esse identificador seria armazenado e verificado para detectar se o mesmo dispositivo está tentando criar múltiplas contas, permitindo o bloqueio de tentativas de abuso do trial.

## 23. Fluxo de Desenvolvimento Pós-Lançamento

Com o lançamento oficial do PostPulsar, o processo de desenvolvimento foi aprimorado para garantir a máxima estabilidade do ambiente de produção, ao mesmo tempo que permite a evolução contínua do produto. O novo fluxo se baseia em ambientes isolados, utilizando **projetos Supabase separados** para cada ambiente (produção e desenvolvimento), Vercel (Preview Deployments) e uma estratégia de branches no Git.

### Ambientes

1.  **Produção (`production`):**
    - **Propósito:** O ambiente vivo, acessado pelos usuários finais.
    - **Projeto Supabase:** `wvfooigeytvdcfnzzrrg` (ID do projeto de produção).
    - **Git Branch:** `main`.
    - **Regra:** Esta branch é protegida. Nenhum código é enviado diretamente para ela. As atualizações ocorrem apenas através de merges da branch `develop`.

2.  **Desenvolvimento (`development`):**
    - **Propósito:** Cópia completa e isolada do ambiente de produção para desenvolvimento e testes.
    - **Projeto Supabase:** `rsfbqvqxabeplqmgbzen` (ID do projeto de desenvolvimento).
    - **Git Branch:** `develop` (ou uma branch de feature como `v2`).
    - **Regra:** Todo novo desenvolvimento (features, bugfixes) começa a partir de uma branch de feature (ex: `v2`) criada a partir de `develop`. O ambiente local dos desenvolvedores deve ser configurado para usar as credenciais deste projeto Supabase de desenvolvimento.

3.  **Pré-visualização (`preview`):**
    - **Propósito:** Ambientes de vida curta para testar uma funcionalidade específica de forma isolada.
    - **Projeto Supabase:** Pode ser um projeto Supabase temporário criado sob demanda para um Pull Request, ou o projeto de `development` pode ser usado para testes de PRs.
    - **Git Branch:** `feature/new-layout`.
    - **Regra:** A Vercel cria uma URL de preview para cada Pull Request aberto contra a `develop`, permitindo que a equipe e stakeholders testem a nova funcionalidade em um ambiente real e isolado antes da integração.

### Gerenciamento de Ambientes Supabase (CLI)

A CLI do Supabase é usada para gerenciar as migrações e funções. Para alternar entre ambientes:

- **Vincular ao Desenvolvimento:** `npx supabase link --project-ref rsfbqvqxabeplqmgbzen`
- **Vincular à Produção:** `npx supabase link --project-ref wvfooigeytvdcfnzzrrg`

### Gerenciamento de Segredos e Variáveis de Ambiente

Cada projeto Supabase (produção e desenvolvimento) possui seu próprio conjunto de segredos e variáveis de ambiente.

- **Segredos (Supabase Secrets):**
  - Devem ser configurados individualmente para cada projeto via `npx supabase secrets set <KEY>=<VALUE>` ou `npx supabase secrets set --env-file .env`.
  - Para o ambiente de desenvolvimento, use chaves de teste para serviços como Stripe.
  - **Importante:** Após atualizar os segredos, as Edge Functions precisam ser **re-enviadas (`functions deploy`)** para carregar os novos valores.
- **Variáveis de Ambiente da Aplicação (Frontend):**
  - O arquivo `.env.local` da aplicação Astro deve ser configurado para apontar para o projeto Supabase de desenvolvimento (ex: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`).
  - A variável `SITE_URL` para o ambiente de desenvolvimento deve ser `http://localhost:4321` para garantir que links de e-mail (confirmação, reset de senha) apontem para o ambiente local.
  - Chaves públicas de teste (ex: `PUBLIC_STRIPE_KEY`) devem ser usadas no `.env.local` para desenvolvimento.
  - **Na Vercel:** Para gerenciar múltiplos ambientes, não crie variáveis com nomes duplicados. Crie uma **única** variável (ex: `PUBLIC_SUPABASE_URL`) e, na sua tela de edição, adicione múltiplos valores, cada um associado ao seu ambiente correto (`Production`, `Preview`).

### Ciclo de Vida de uma Nova Funcionalidade

1.  **Início:** Um desenvolvedor cria uma nova branch a partir da `develop` no Git (ex: `feature/v2-trial-system`).
2.  **Desenvolvimento Local:**
    - A CLI local é configurada para usar o projeto Supabase de desenvolvimento (ex: `npx supabase link --project-ref rsfbqvqxabeplqmgbzen`).
    - O arquivo `.env.local` da aplicação é configurado com as chaves do projeto de desenvolvimento.
    - As migrações de banco de dados são aplicadas com `npx supabase db push`.
    - As funções são enviadas com `npx supabase functions deploy <function_name>`.
3.  **Pull Request e Testes:** Ao final do desenvolvimento, um Pull Request (PR) é aberto no GitHub da `feature/v2-trial-system` para a `develop`. A Vercel cria uma URL de preview.
4.  **Merge para `develop`:** Após a revisão de código e testes bem-sucedidos, o PR é mesclado na `develop`.
5.  **Release em Produção:** Quando um conjunto de funcionalidades na `develop` está maduro e pronto para o lançamento, um novo PR é aberto da `develop` para a `main`. O merge deste PR aciona o deploy final para o ambiente de produção. As migrações e funções são aplicadas ao projeto Supabase de produção.

## 24. Funcionalidade Implementada: Transcrição de Áudio de Vídeos (Concluída)

Para expandir a capacidade do PostPulsar de reaproveitar conteúdo de vídeo, a funcionalidade de transcrição de áudio foi implementada com sucesso. Isso permite que os usuários gerem posts a partir do conteúdo falado em vídeos do YouTube.

### Fluxo de Integração Implementado

1.  **Detecção de URL de Vídeo:** Quando uma URL de vídeo (ex: YouTube) é fornecida, o sistema identifica que o conteúdo principal é áudio/vídeo.
2.  **Extração de Áudio (`yt-dlp`):** O `video-converter-service` utiliza a ferramenta de linha de comando `yt-dlp` para baixar a faixa de áudio do vídeo. Desafios de detecção de bot do YouTube foram superados com a instalação do `deno` (como runtime JavaScript para `yt-dlp`) e o uso de `user-agent` e `--no-check-certificate` no comando.
3.  **Conversão de Áudio (`ffmpeg` e `wavefile`):** O áudio baixado (geralmente MP3) é então convertido para o formato WAV (16kHz, mono, PCM) usando `ffmpeg`. A biblioteca `wavefile` é utilizada para ler e processar este arquivo WAV, preparando os dados de áudio para o modelo de transcrição.
4.  **Transcrição (`@xenova/transformers`):** O áudio processado é enviado para o modelo de Speech-to-Text (STT) `Xenova/whisper-tiny` (da biblioteca `@xenova/transformers`) para ser convertido em texto. A solução para o problema de `AudioContext` em ambiente Node.js foi a leitura e processamento direto dos dados de áudio, em vez de passar o caminho do arquivo.
5.  **Geração de Conteúdo:** O texto transcrito é então usado como a fonte para a geração de posts pela IA, seguindo o fluxo existente do "Pulsar".
6.  **Orquestração:** A Edge Function `get-source-text` é responsável por:
    - Identificar URLs de vídeo.
    - Chamar o endpoint `/transcribe` do `video-converter-service`.
    - Receber o texto transcrito e passá-lo para o modelo de IA.
    - Implementar tratamento de erros e feedback ao usuário.
7.  **Modelo de Pulsos:** O custo de pulso para a transcrição foi definido e integrado ao sistema de débito de pulsos.

## 25. Fluxo de Desenvolvimento do Railway e Estratégia de Transcrição de Áudio

Para garantir um fluxo de trabalho robusto e alinhado com a estratégia de branches (`v2` -> `develop` -> `main`), é crucial configurar um ambiente de desenvolvimento no Railway que espelhe o ambiente de produção.

### 25.1. Configuração do Ambiente de Desenvolvimento no Railway

Atualmente, o serviço `video-converter-service` está configurado para deploy automático apenas a partir da branch `main` para o ambiente de produção. Para desenvolver e testar novas funcionalidades (como a transcrição de áudio) sem impactar a produção, siga estes passos:

1.  **Crie um Novo Ambiente no Railway:**
    - Acesse o painel do seu projeto no Railway.
    - Crie um novo ambiente (geralmente há um botão `+ New Environment` ou similar).
    - Nomeie-o como `develop` ou `staging` para corresponder à sua branch de desenvolvimento.
    - O Railway irá clonar automaticamente todos os serviços do seu ambiente de produção para este novo ambiente.

2.  **Conecte o Ambiente `develop` à Branch `develop` do GitHub:**
    - Dentro do seu recém-criado ambiente `develop` no Railway, navegue até as configurações do serviço `video-converter-service` (a cópia que foi criada).
    - Na seção de "Source" ou "Deploy", altere a branch conectada de `main` para `develop`.
    - Salve as alterações.
    - **Resultado:** A partir de agora, qualquer `push` ou `merge` na branch `develop` do seu repositório GitHub acionará um deploy automático do `video-converter-service` **apenas no ambiente `develop` do Railway**. O ambiente de produção continuará sendo atualizado exclusivamente pela branch `main`.

3.  **Atualize as Variáveis de Ambiente do Supabase de Desenvolvimento:**
    - O serviço `video-converter-service` no ambiente `develop` do Railway terá sua própria URL pública (ex: `post-pulsar-develop.up.railway.app`).
    - Vá para o seu projeto Supabase de **desenvolvimento** (`rsfbqvqxabeplqmgbzen`).
    - Acesse "Project Settings" -> "Database" -> "Secrets".
    - Atualize o segredo `CONVERTER_SERVICE_URL` para apontar para a nova URL pública do seu serviço Railway de desenvolvimento.
    - **Atenção:** Após atualizar o segredo, é fundamental **re-enviar (`functions deploy`)** as Edge Functions que utilizam essa variável (como `request-video-conversion` e `publish-to-social`) para que elas carreguem o novo valor.

### 25.2. Estratégia para a Funcionalidade de Transcrição de Áudio

A funcionalidade de transcrição de áudio será implementada modificando o serviço `video-converter-service` existente, em vez de criar um novo microserviço separado.

- **Motivação:**
  - **Simplicidade e Manutenibilidade:** Gerenciar um único serviço é mais eficiente. Criar um novo serviço adicionaria complexidade desnecessária de deploy, monitoramento e gerenciamento de variáveis.
  - **Coerência Conceitual:** A transcrição de áudio é uma tarefa de processamento de mídia, alinhando-se perfeitamente com o propósito atual do `video-converter-service`.
- **Implementação:**
  - Um novo endpoint (ex: `/transcribe`) será adicionado ao servidor Node.js existente no `video-converter-service`.
  - Este endpoint será responsável por receber o áudio (ou URL do áudio), processá-lo com a lógica de transcrição (Whisper, `whisper.cpp`, etc.) e retornar o texto transcrito.

### 25.3. Fluxo de Trabalho Completo com Railway Develop

Com esta configuração, o fluxo de trabalho para novas funcionalidades será:

1.  **Desenvolvimento Local:** Um desenvolvedor cria uma feature branch (ex: `feature/audio-transcription`) a partir da `develop`.
2.  **Pull Request para `develop`:** Ao concluir o desenvolvimento, um PR é aberto para a branch `develop`.
3.  **Merge na `develop`:** O merge aciona:
    - Um deploy de preview do frontend na Vercel (se configurado para PRs contra `develop`).
    - Um deploy automático do `video-converter-service` para o **ambiente `develop` do Railway**.
4.  **Testes em Staging:** A equipe pode testar a funcionalidade completa em um ambiente de desenvolvimento isolado (frontend de preview/develop -> Supabase de desenvolvimento -> Railway de desenvolvimento).
5.  **Pull Request para `main`:** Após a validação no ambiente `develop`, um PR é aberto da `develop` para a `main`.
6.  **Merge na `main`:** O merge aciona o deploy final para o ambiente de produção na Vercel e no Railway.

## 26. Funcionalidade Implementada: Extração Unificada de Conteúdo (Concluída)

Para otimizar a eficiência e a clareza na cobrança de pulsos, a arquitetura de extração de conteúdo foi refatorada para um modelo unificado de duas etapas.

### Fluxo de Integração Implementado

1.  **Nova Edge Function `get-source-text`:**
    - Responsável por receber uma URL (de artigo ou mídia) ou texto bruto.
    - Identifica o tipo de conteúdo.
    - Realiza a raspagem (para artigos) ou chama o `video-converter-service` para transcrição (para mídias).
    - **Debita o pulso de extração:** 1 pulso para artigos, 2 pulsos para mídias.
    - Retorna o texto limpo e processado.
2.  **Refatoração da Edge Function `pulsar-v1`:**
    - Agora, `pulsar-v1` recebe apenas o texto bruto (`rawText`) e a rede social alvo.
    - Sua única responsabilidade é gerar o conteúdo de IA para aquela rede.
    - **Debita o pulso de geração:** 1 pulso por rede social.
3.  **Orquestração no Frontend (`PulsarFormManager.ts`):**
    - O frontend agora orquestra o fluxo:
      - Se a entrada for uma URL, ele chama `get-source-text` primeiro.
      - Com o texto limpo em mãos, ele faz chamadas sequenciais para `pulsar-v1` para cada rede social selecionada.
    - Isso garante que a extração de conteúdo (a parte mais custosa em tempo e recursos) seja feita apenas uma vez por ação do usuário, independentemente do número de redes sociais selecionadas.
4.  **Atualização da Documentação e UI:**
    - O FAQ, os Termos de Serviço e o dashboard foram atualizados para refletir a nova lógica de cobrança de pulsos (Extração + Geração).

## 27. Próximos Passos Estratégicos

- **Implementar reutilização de mídias ao reabrir um post do histórico.**
- **Conexão com Pinterest (Em Espera):** A integração está em pausa. A solicitação de acesso à API foi recusada e a funcionalidade está oculta na interface do usuário.
- **Construir Página de Planos e Pagamentos:** Integrar o Stripe para que os usuários possam fazer upgrade de plano e comprar pacotes de pulsos.
- **Otimização da Precificação Regional (Prioridade Média - Planejamento):**
  - Começar a planejar a implementação da exibição dos preços na **moeda local** do usuário para aumentar a clareza e a conversão em mercados como Índia e Qatar.
- **Engajamento de Usuários com E-mails Reais (Prioridade Média):**
  - Considerar uma campanha de e-mail direcionada aos usuários com e-mails Gmail que geraram conteúdo, mas não publicaram, reforçando os benefícios da publicação direta.
- **Otimização Contínua de SEO (Prioridade Média):**
  - Dado o sucesso do tráfego orgânico, continuar investindo em estratégias de SEO para atrair mais usuários qualificados.