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
  - **20 Pulsos** por mês.
  - 1 Rede Social Conectada.

- **Plano Classic:**
  - **Preço:** $9/mês
  - **100 Pulsos** por mês.
  - 3 Redes Sociais Conectadas.

- **Plano Pro:**
  - **Preço:** $29/mês
  - **250 Pulsos** por mês.
  - Redes Sociais Ilimitadas.
  - Suporte Prioritário.

- **Pacotes de Pulsos (para qualquer plano):**
  - Compre **50 Pulsos** a qualquer momento por **$5**. (Estes pulsos não expiram).

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

1.  **Ação do Usuário:** O usuário cola a URL de um artigo no dashboard e clica no botão "Pulsar".
2.  **Chamada de API:** O frontend faz uma chamada segura e autenticada para uma Supabase Edge Function (ex: `pulsar-v1`), enviando a URL e os parâmetros de linguagem e tamanho definidos pelo usuário.

### Etapa 2: O Coração da Operação (Edge Function `pulsar-v1`)

Esta etapa é executada inteiramente no servidor.

1.  **Validação e Débito de Pulso:** A função valida a URL, as permissões do usuário e **debita o pulso de geração** de conteúdo. Ela **não salva mais o post** no histórico nesta etapa.
2.  **Scraping (Extração):** A função acessa a URL e extrai o conteúdo principal do artigo. A biblioteca `cheerio` foi a escolhida para esta tarefa.
3.  **Geração com IA:** O texto limpo, junto com as configurações do usuário, é enviado a um modelo de linguagem de IA (LLM) para gerar os diferentes formatos de conteúdo.
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

### Etapa 4: A Conexão e Salvamento (Postando nas Redes Sociais)

A conexão com redes sociais é implementada através de um fluxo OAuth 2.0 seguro. A ação de publicar agora também é responsável por salvar o post no histórico.

#### Ação de Postar (`publish-to-social`)

- **Ação:** No dashboard, o usuário clica em "Postar na Rede Social" ou "Publicar Tudo".
- **Lógica Detalhada:**
  1.  **Salvar no Histórico:** A primeira coisa que a função `publish-to-social` faz é chamar uma função RPC (`save_post_to_history`) que salva o conteúdo completo (com as edições do usuário e URLs de mídia) na tabela `generated_posts`. Isso cria um registro permanente do que foi publicado.
  2.  **Débito de Pulso de Publicação:** A função debita um pulso adicional pela ação de publicar.
  3.  **Busca de Credenciais:** A função busca as credenciais do usuário para a rede específica na tabela `social_connections`.
  4.  **Publicação na Rede Social:** Com as credenciais e o conteúdo em mãos, ela executa a chamada de API para a plataforma correspondente, publicando o post.

**Nota sobre a Arquitetura da Função:** Para melhorar a manutenibilidade, a função monolítica `publish-to-social` foi refatorada. Ela agora atua como um roteador principal que delega a lógica de publicação específica de cada plataforma para módulos de serviço dedicados (ex: `services/linkedinService.ts`, `services/twitterService.ts`, `services/metaService.ts`).

## 9. Sistema de Créditos ("Pulsos")

Os "Pulsos" são os créditos de uso que formam a base do nosso modelo de negócio Freemium. O sistema foi refinado para ter dois tipos de cobrança:

- **Pulso de Geração:** Consumido ao clicar em "Pulsar". Custa 1 pulso por rede social selecionada.
- **Pulso de Publicação:** Consumido para cada publicação individual em uma rede social.

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
- **Reabrir do Histórico:** O usuário pode clicar em "Reopen" em um post antigo. Isso carrega o conteúdo e as mídias associadas de volta ao dashboard principal, pronto para edição ou nova publicação.

### Publicação no Threads

- A lógica de publicação no Threads foi adicionada à função `publish-to-social`, usando o fluxo de duas etapas da API (criar container, depois publicar).

## 13. Modelo de Negócio (Atualizado com Vídeo)

Com a introdução da funcionalidade de vídeo, o modelo de negócio foi refinado para criar uma diferenciação clara entre os planos.

- **Plano Gratuito:**
  - **30 Pulsos** por mês.
  - Publicação apenas de **texto**.
- **Plano Básico (ainda a ser nomeado):**
  - Publicação de **texto e imagem**.
- **Plano Pro:**
  - Publicação de **texto, imagem e vídeo**.

A verificação do plano (`plan_type`) é feita no backend para autorizar ou negar ações, e o frontend ajusta a UI dinamicamente.

## 14. Arquitetura de Vídeo com Microserviço Externo

A principal barreira técnica para suportar uploads de vídeo era a necessidade de processamento (transcodificação). A solução foi um microserviço em Node.js com `ffmpeg`, hospedado na Railway.

- **Fluxo de Dados:** Frontend -> `request-video-conversion` (Edge Function) -> Upload para bucket privado -> Chamada para microserviço na Railway (que analisa e converte/limpa o vídeo) -> Upload do resultado para bucket público -> `publish-to-social` usa a URL do vídeo processado.

## 15. UX Avançada: Modal de Progresso e Mídia Inteligente

- **Modal de Progresso Unificado:** Um modal reutilizável (`src/lib/modal.ts`) fornece feedback em tempo real sobre o andamento de processos demorados, como upload e publicação.
- **Lógica de Mídia Inteligente:** A interface de upload se adapta às regras de cada rede social, desabilitando opções não suportadas (ex: vídeo no Twitter se uma imagem já foi selecionada) e permitindo o upload de múltiplos arquivos para redes com suporte a carrossel (Instagram, Threads).

## 16. Gestão Avançada de Prompts e Recursos

- **Sistema de Prompts:** Usuários Pro podem criar, salvar e gerenciar até 5 prompts de IA personalizados, que são salvos na tabela `user_prompts`.
- **Otimização de Storage:** Uma função agendada (`storage-cleanup`) roda diariamente para identificar e remover mídias órfãs do Supabase Storage, otimizando o uso de recursos.

## 17. Próximos Passos

- **Implementar reutilização de mídias ao reabrir um post do histórico.**
- **Implementar Conexão com Pinterest:** Adicionar a funcionalidade completa de conexão e publicação para o Pinterest (atualmente em espera pela aprovação do app).
- **Construir Página de Planos e Pagamentos:** Integrar o Stripe para que os usuários possam fazer upgrade de plano e comprar pacotes de pulsos.