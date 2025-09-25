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

## 3. Modelo de Negócio e Preços

O modelo será Freemium, com os seguintes planos:

- **Plano Gratuito:**
  - **70 Pulsos** por mês.
  - 1 Rede Social Conectada.

- **Plano Classic:**
  - **Preço:** $9/mês
  - **210 Pulsos** por mês.
  - 3 Redes Sociais Conectadas.

- **Plano Pro:**
  - **Preço:** $29/mês
  - **500 Pulsos** por mês.
  - Redes Sociais Ilimitadas.
  - Suporte Prioritário.

- **Pacotes de Pulsos (para qualquer plano):**
  - Compre **100 Pulsos** a qualquer momento por **$5**.
  - Compre **250 Pulsos** a qualquer momento por **$10**.
  - Compre **600 Pulsos** a qualquer momento por **$20**.

## 4. Modelo de Desenvolvimento Seguro (SSDLC)

Para garantir a segurança e a robustez do PostPulsar, todo o desenvolvimento seguirá os princípios do **Secure Software Development Lifecycle (SSDLC)**. A principal referência para mitigar vulnerabilidades será o **OWASP Top 10**.

**Diretrizes Práticas Invioláveis:**

1.  **Toda Lógica Crítica é Server-Side:** Ações que envolvem permissões, planos e pagamentos **devem** ser validadas e executadas no servidor.
    - **Exemplo (Anti-Manipulação de Preço):** O frontend exibe o preço de $15, mas quando o usuário clica em comprar, o servidor é que busca o preço de $15 no banco de dados para iniciar a transação com o Stripe. O preço enviado pelo cliente é ignorado.

2.  **Validação de Input em Todas as Entradas:** Nunca confiar em dados vindos do usuário (formulários, parâmetros de URL).
    - **Ação:** Usar as funções padrão do cliente Supabase (ex: `supabase.from('posts').insert(...)`) que utilizam "parameterized queries", prevenindo SQL Injection. Para outros inputs, usar bibliotecas de validação como a Zod.

3.  **Controle de Acesso com Row-Level Security (RLS):** O Supabase oferece RLS, que será nossa principal ferramenta de controle de acesso.
    - **Ação:** Habilitar RLS em todas as tabelas com dados de usuários. Criar políticas que garantam que "um usuário só pode ver e editar seus próprios dados". Recentemente, foram aplicadas melhorias de segurança diretamente no banco de dados, incluindo a correção do `search_path` em funções críticas para prevenir a execução de código malicioso e a otimização das políticas de Row-Level Security (RLS) para garantir que os usuários só possam acessar e modificar seus próprios dados, seguindo o princípio do menor privilégio.

4.  **Gerenciamento de Dependências:** Manter os pacotes atualizados é uma defesa crucial.
    - **Ação:** Executar `npm audit` regularmente e ativar o Dependabot no repositório do GitHub para sermos alertados sobre vulnerabilidades conhecidas em nossas dependências.

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
  - **Exclusão de Conta:** Implementado com uma camada extra de segurança, seguindo os princípios do SSDLC. A ação é iniciada no cliente, mas executada por uma **Supabase Edge Function (`delete-user`)** que utiliza as credenciais de administrador do Supabase para remover o usuário de forma segura no backend. O usuário precisa confirmar a ação antes de ser executada.

### Solução Robusta para Senhas em Contas Sociais

Durante o desenvolvimento, foi identificado um comportamento inconsistente no Supabase: ao adicionar uma senha a uma conta criada via login social (OAuth), a lista de "identidades" do usuário não era atualizada para incluir o provedor "email". Isso tornava impossível para a interface saber de forma confiável se o usuário já possuía ou não uma senha, resultando em uma UI que não atualizava corretamente.

A solução definitiva foi criar uma "fonte da verdade" controlada pela nossa própria aplicação:

1.  **Flag no Banco de Dados:** Foi adicionada uma coluna booleana `has_password` na tabela `profiles`.
2.  **Edge Function (`set-password-flag`):** Foi criada uma função de servidor que é chamada pelo frontend logo após um usuário social criar sua primeira senha. A única responsabilidade desta função é marcar a flag `has_password` como `true` para aquele usuário.
3.  **Lógica na Interface:** A página de configurações agora verifica duas condições para decidir se mostra o formulário de "Criar Senha" ou "Alterar Senha": primeiro, a existência da identidade `email` (para contas padrão); se essa falhar, ela consulta a flag `has_password` na tabela `profiles`. Isso garante que a UI sempre reflita o estado real da conta do usuário.

## 8. Arquitetura da Funcionalidade Principal ("Pulsar")

A funcionalidade "Pulsar" é o coração do produto. Sua arquitetura é dividida em quatro etapas principais para garantir eficiência e segurança.

### Etapa 1: O Início (Frontend)

1.  **Ação do Usuário:** O usuário cola a URL de um artigo no dashboard e clica no botão "Pulsar". Como alternativa para contornar falhas de extração, o usuário pode alternar para um modo de "entrada manual" e colar o texto completo do artigo diretamente em uma área de texto.
2.  **Chamada de API:** O frontend faz uma chamada segura e autenticada para uma Supabase Edge Function (ex: `pulsar-v1`), enviando a URL (ou o texto bruto) e os parâmetros de linguagem e tamanho definidos pelo usuário.

### Etapa 2: O Coração da Operação (Edge Function `pulsar-v1`)

Esta etapa é executada inteiramente no servidor.

1.  **Validação e Débito de Pulso:** A função valida a URL, as permissões do usuário e **debita o pulso de geração** de conteúdo. Ela **não salva mais o post** no histórico nesta etapa.
2.  **Scraping (Extração):** Se uma URL for fornecida, a função a acessa e extrai o conteúdo principal do artigo. A biblioteca `cheerio` foi a escolhida para esta tarefa. Se o texto bruto (`rawText`) for fornecido, esta etapa é completamente ignorada.
3.  **Geração com IA (Sequencial):** O texto limpo, junto com as configurações do usuário, é enviado a um modelo de linguagem de IA (LLM). Para melhorar a qualidade e o contexto, a geração é feita de **forma sequencial** para cada rede social selecionada, em vez de em um único bloco.
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
2.  **Conexão Direta de Apps (para Ferramentas e Bots):** Plataformas como Telegram e Discord são integradas como "Apps". Em vez de um fluxo de usuário, a conexão é feita diretamente na página de configurações, onde o usuário fornece credenciais como Tokens de Bot ou URLs de Webhook.
    - **Nova Edge Function (`save-app-connection`):** Para lidar com este novo padrão de forma segura, foi criada a função `save-app-connection`. Ela recebe as credenciais do frontend, valida o usuário e salva as informações de forma segura na mesma tabela `social_connections`, usando colunas flexíveis para armazenar os diferentes tipos de chaves.

A ação de publicar agora também é responsável por salvar o post no histórico.

#### Ação de Postar (`publish-to-social`)

- **Ação:** No dashboard, o usuário clica em "Postar na Rede Social" ou "Publicar Tudo".
- **Lógica Detalhada:**
  1.  **Salvar no Histórico:** A primeira coisa que a função `publish-to-social` faz é chamar uma função RPC (`save_post_to_history`) que salva o conteúdo completo (com as edições do usuário e URLs de mídia) na tabela `generated_posts`. Isso cria um registro permanente do que foi publicado.
  2.  **Busca de Credenciais:** A função busca as credenciais do usuário para a plataforma específica na tabela `social_connections`.
  3.  **Publicação na Rede Social:** Com as credenciais e o conteúdo em mãos, ela executa a chamada de API para a plataforma correspondente, publicando o post.
  4.  **Débito de Pulso (Apenas com Sucesso):** Apenas se a publicação na etapa anterior for bem-sucedida, a função chama a RPC `charge_for_publication` para debitar o pulso do usuário. Se a publicação falhar, o pulso não é consumido.

**Nota sobre a Arquitetura da Função:** Para melhorar a manutenibilidade, a função monolítica `publish-to-social` foi refatorada. Ela agora atua como um roteador principal que delega a lógica de publicação específica de cada plataforma para módulos de serviço dedicados (ex: `services/linkedinService.ts`, `services/twitterService.ts`, `services/metaService.ts`, `services/telegramService.ts`, `services/discordService.ts`).

## 9. Sistema de Créditos ("Pulsos")

Os "Pulsos" são os créditos de uso que formam a base do nosso modelo de negócio Freemium. O sistema foi refinado para ter dois tipos de cobrança:

- **Pulso de Geração:** Consumido ao clicar em "Pulsar". Custa 1 pulso por rede social selecionada.
- **Pulso de Publicação:** Consumido para cada publicação individual em uma rede social, **apenas após a publicação ser confirmada com sucesso pela plataforma.**

### Implementação Técnica

**1. Banco de Dados (Supabase):**

- Uma nova coluna, `monthly_pulses_remaining` (numérica), foi adicionada à tabela de perfis de usuário.
- **Valores Iniciais:**
  - Plano Gratuito: `30`
  - Plano Básico: `50`
  - Plano Pro: `-1` (para representar ilimitado).
- **Reset Mensal:** Uma **função agendada (cron job)** no Supabase é configurada para rodar no primeiro dia de cada mês, redefinindo os pulsos dos usuários.

**2. Lógica nas Edge Functions:**

- **`pulsar-v1`:** Chama a função RPC `charge_pulse_for_generation` para debitar os pulsos no momento da geração.
- **`publish-to-social`:** Chama a função RPC `charge_for_publication` para debitar o pulso no momento da publicação.

## 10. Notas de Desenvolvimento e Solução de Problemas

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

## 11. Configurações Avançadas e Persistência de Preferências

Para dar ao usuário controle granular sobre o conteúdo gerado e melhorar a experiência de uso, foi implementada uma seção de "Configurações Avançadas" com persistência de dados.

- **Interface:** Um menu "sanfona" (accordion) chamado "Configurações Avançadas" foi adicionado ao dashboard.
- **Persistência de Preferências (Banco de Dados):** Colunas `default_[network]_chars` na tabela `profiles`.
- **Persistência de Preferências (Backend):** Uma função RPC, `update_char_preferences`, é chamada pelo frontend para salvar as preferências.

## 12. Melhorias de Experiência do Usuário (UX)

Para refinar a interação do usuário com a aplicação, diversas melhorias de qualidade de vida foram implementadas.

### Tratamento de Sessões Expiradas

- **Solução:** A função `publish-to-social` tenta renovar o `access_token` antes de cada publicação. Se falhar, retorna um erro específico (`SESSION_EXPIRED`) que o frontend usa para exibir um modal informativo.

### Gestão do Histórico e Persistência de Conteúdo

- **Persistência Temporária:** Para evitar a perda de trabalho ao atualizar a página, o último conteúdo gerado é salvo no `localStorage` do navegador e recarregado automaticamente.
- **Página de Histórico:** Uma página `/app/history` dedicada foi criada para listar todos os posts salvos (que foram publicados pelo menos uma vez).
- **Reabrir do Histórico:** O usuário pode clicar em "Reopen" em um post antigo. Isso carrega o conteúdo de volta ao dashboard principal. Para acelerar a experiência, as mídias associadas (imagens e vídeos) são pré-carregadas de forma otimizada, exibindo um preview instantâneo diretamente a partir de suas URLs, deixando o post pronto para edição ou nova publicação de forma muito mais rápida.

### Publicação no Threads

- A lógica de publicação no Threads foi adicionada à função `publish-to-social`, usando o fluxo de duas etapas da API (criar container, depois publicar).

## 13. Modelo de Negócio (Atualizado com Vídeo)

Com a introdução da funcionalidade de vídeo, o modelo de negócio foi refinado para criar uma diferenciação clara entre os planos.

- **Plano Gratuito:**
  - **30 Pulsos** por mês.
  - Publicação de **texto**. Uma exceção é feita para o Instagram, que permite o upload de imagem para viabilizar a postagem.
- **Plano Básico (ainda a ser nomeado):**
  - Publicação de **texto e imagem**.
- **Plano Pro:**
  - Publicação de **texto, imagem e vídeo**.

A verificação do plano (`plan_type`) é feita no backend para autorizar ou negar ações, e o frontend ajusta a UI dinamicamente.

## 14. Arquitetura de Vídeo com Microserviço Externo

A principal barreira técnica para suportar uploads de vídeo era a necessidade de processamento (transcodificação). A solução foi um microserviço em Node.js com `ffmpeg`, hospedado na Railway.

- **Fluxo de Dados:** Frontend -> `request-video-conversion` (Edge Function) -> Upload para bucket privado -> Chamada para microserviço na Railway (que analisa e converte/limpa o vídeo) -> Upload do resultado para bucket público -> `publish-to-social` usa a URL do vídeo processado.

**Nota sobre a Robustez da Publicação (LinkedIn):** Para lidar com o processamento assíncrono de vídeos em plataformas como o LinkedIn, a arquitetura foi aprimorada. O serviço de publicação (`linkedinService.ts`) agora implementa um **mecanismo de polling**, que aguarda ativamente o vídeo ser processado pela API do LinkedIn antes de finalizar a publicação. Além disso, o sistema foi tornado mais resiliente para lidar com casos em que a API do LinkedIn, embora bem-sucedida, não retorna um ID de postagem, evitando erros desnecessários na interface do usuário.

## 15. Arquitetura de Mídia Flexível (Upload Direto vs. Conversão)

Com a adição de mais plataformas, a arquitetura de upload de mídia foi refatorada para um modelo de **dois caminhos**, otimizando a velocidade e o uso de recursos.

- **Caminho de Conversão (Legado):** Para redes sociais com requisitos de formato e estrutura muito rígidos (como Instagram e LinkedIn), o fluxo original é mantido. As mídias são enviadas para o microserviço externo (`video-converter-service`) para análise, limpeza (`moov atom`) ou conversão completa. Isso garante a máxima compatibilidade.

- **Caminho de Upload Direto (Novo):** Para plataformas mais flexíveis como **Discord** e **Telegram**, que aceitam uma gama maior de formatos e não têm requisitos estruturais complexos, um novo fluxo foi implementado. As mídias são enviadas pelo cliente **diretamente para um bucket público** no Supabase Storage (em pastas dedicadas como `post-images/discord-media/`).

Essa abordagem de dois caminhos, orquestrada pelo `MediaManager.ts` no frontend, permite que o upload para Discord e Telegram seja significativamente mais rápido, pois elimina a etapa intermediária do serviço de conversão, ao mesmo tempo que mantém a robustez do processamento para as redes que o exigem. Os caminhos dos arquivos são estruturados para serem compatíveis com as políticas de Row-Level Security (RLS), garantindo que cada usuário só possa acessar suas próprias mídias.

## 16. UX Avançada

### Modal de Progresso e Mídia Inteligente

- **Modal de Progresso Unificado:** Um modal reutilizável (`src/lib/modal.ts`) fornece feedback em tempo real sobre o andamento de processos demorados, como upload e publicação.
- **Modal de Publicação em Lote:** A funcionalidade "Publicar Tudo" possui seu próprio modal de progresso, gerenciado pelo `PublishAllManager.ts`, que exibe o status individual de cada publicação (Aguardando, Publicando, Sucesso ou Falha), dando ao usuário feedback claro sobre o andamento do processo.
- **Lógica de Mídia Inteligente:** A interface de upload se adapta às regras de cada rede social, desabilitando opções não suportadas (ex: vídeo no Twitter se uma imagem já foi selecionada) e permitindo o upload de múltiplos arquivos para redes com suporte a carrossel (Instagram, Threads).

### Validações e Seletores

- **Avisos Proativos:** Para melhorar a experiência do usuário e evitar erros, os alertas (`alert()`) foram substituídos por modais customizados que informam sobre ações necessárias, como a obrigatoriedade de selecionar uma rede para gerar conteúdo, a necessidade de uma imagem para postar no Instagram ou a seleção de uma página específica para o Facebook.
- **Seleção de Página do Facebook:** O fluxo de publicação para o Facebook foi aprimorado. Em vez de um dropdown, um botão "Selecionar Página" foi adicionado ao card. Ao ser clicado, ele abre um modal que lista todas as páginas conectadas, permitindo que o usuário escolha de forma clara e direta em qual página deseja publicar.

## 17. Gestão Avançada de Prompts e Recursos

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

## 18. Próximos Passos

- **Implementar reutilização de mídias ao reabrir um post do histórico.**
- **Conexão com Pinterest (Em Espera):** A integração está em pausa. A solicitação de acesso à API foi recusada e a funcionalidade está oculta na interface do usuário.
- **Construir Página de Planos e Pagamentos:** Integrar o Stripe para que os usuários possam fazer upgrade de plano e comprar pacotes de pulsos.

## 19. Arquitetura de Pagamentos (Stripe)

Para garantir uma integração de pagamentos segura, robusta e à prova de falhas, o PostPulsar implementará um fluxo com **Stripe** baseado no conceito de **idempotência**. Isso previne cobranças duplicadas, mesmo que ocorram falhas de rede ou o usuário recarregue a página durante o processo.

A estratégia se baseia em dois pilares: **Chaves de Idempotência** e **Webhooks** como fonte da verdade.

### Fluxo da Transação

1.  **Estrutura no Banco de Dados:** Uma tabela `purchases` será criada para rastrear cada tentativa de transação. Ela conterá uma `idempotency_key` (UUID) gerada pelo cliente, o `user_id`, o `product_id`, o `status` (`pending`, `succeeded`, `failed`) e o `stripe_payment_intent_id` associado.

2.  **Início no Cliente (Frontend):**
    - Ao clicar em "Comprar", o cliente gera uma chave de idempotência (UUID v4) e a salva no `localStorage` para sobreviver a recarregamentos de página.
    - O cliente chama uma Edge Function (`create-payment-intent`), enviando o `product_id` e a `idempotency_key`. **O preço não é enviado pelo cliente**, em conformidade com o SSDLC.

3.  **Criação do Pagamento (Edge Function `create-payment-intent`):**
    - A função verifica se já existe uma compra na tabela `purchases` com a `idempotency_key` recebida.
    - **Se existir:** A requisição é uma tentativa repetida. A função busca o `PaymentIntent` existente no Stripe e retorna seu `client_secret` sem criar uma nova cobrança.
    - **Se não existir:**
      1.  Cria um novo registro na tabela `purchases` com status `pending`.
      2.  Busca o preço do produto do banco de dados (fonte da verdade).
      3.  Cria um `PaymentIntent` no Stripe, **passando a `idempotency_key` na requisição para o Stripe**. Isso garante a idempotência também no lado do Stripe.
      4.  Atualiza o registro na tabela `purchases` com o `stripe_payment_intent_id` retornado pelo Stripe.
      5.  Retorna o `client_secret` do `PaymentIntent` para o cliente.

4.  **Confirmação no Cliente:**
    - Com o `client_secret`, o frontend usa o Stripe.js (`stripe.confirmCardPayment`) para exibir o formulário de pagamento e concluir a transação.
    - Em caso de sucesso, a `idempotency_key` é removida do `localStorage`.

5.  **Fulfillment (Edge Function `stripe-webhook`):**
    - Esta é a etapa mais crítica e a **fonte final da verdade**.
    - Uma Edge Function (`stripe-webhook`) é configurada no painel do Stripe para receber eventos.
    - A função **primeiro verifica a assinatura do webhook** (`Stripe-Signature`) para garantir que a requisição veio do Stripe e não de um ator malicioso.
    - Ao receber um evento `payment_intent.succeeded`, a função:
      1.  Busca a compra na tabela `purchases` usando o `stripe_payment_intent_id`.
      2.  Atualiza o status da compra para `succeeded`.
      3.  **Concede o benefício ao usuário:** Adiciona os pulsos comprados à conta do usuário na tabela `profiles`.
    - A função retorna uma resposta `200 OK` para o Stripe para confirmar o recebimento do evento. Se não o fizer, o Stripe continuará tentando enviar o mesmo webhook.
