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

-   **Plano Gratuito:**
    -   **20 Pulsos** por mês.
    -   1 Rede Social Conectada.

-   **Plano Classic:**
    -   **Preço:** $9/mês
    -   **100 Pulsos** por mês.
    -   3 Redes Sociais Conectadas.

-   **Plano Pro:**
    -   **Preço:** $29/mês
    -   **250 Pulsos** por mês.
    -   Redes Sociais Ilimitadas.
    -   Suporte Prioritário.

-   **Pacotes de Pulsos (para qualquer plano):**
    -   Compre **50 Pulsos** a qualquer momento por **$5**. (Estes pulsos não expiram).

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
- **Gerenciamento de Modais:** A lógica de exibição de modais, que é parte integral da experiência do usuário durante a autenticação e outras interações, foi centralizada no módulo `src/lib/modal.ts`. Isso corrige bugs de layout (conflitos de classes CSS `flex`/`hidden`) e garante um comportamento consistente em toda a aplicação.

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

1.  **Validação:** A função valida a URL e as permissões do usuário (ex: verificar se ainda tem "pulsos" disponíveis no plano).
2.  **Scraping (Extração):** A função acessa a URL e extrai o conteúdo principal do artigo. A biblioteca `cheerio` foi a escolhida para esta tarefa, pois a alternativa (`metascraper`) se mostrou instável durante os testes no ambiente Deno das Supabase Edge Functions.
3.  **Geração com IA:** O texto limpo, junto com as configurações de idioma e tamanho, é enviado a um modelo de linguagem de IA (LLM) com prompts específicos para gerar os diferentes formatos de conteúdo. Para aumentar a robustez, a comunicação com a API do Gemini foi encapsulada em um mecanismo de retentativa com *exponential backoff*. Isso permite que a função se recupere automaticamente de erros transitórios, como o `503 Service Unavailable`, melhorando a confiabilidade da geração de conteúdo.
4.  **Armazenamento:** O resultado da IA (um objeto JSON estruturado) é salvo no banco de dados Supabase, vinculado ao usuário.
5.  **Resposta:** A função retorna o conteúdo gerado para o frontend.

### Etapa 3: A Exibição (Frontend)

1.  **Renderização Dinâmica:** O dashboard recebe o objeto JSON com os múltiplos formatos de conteúdo (ex: `linkedIn`, `twitter`) e renderiza dinamicamente uma "janela" ou "card" separado para cada um.
2.  **Edição de Conteúdo:** Em vez de texto estático, o conteúdo é renderizado dentro de campos `<textarea>`, permitindo que o usuário edite e refine o material antes de publicar.
3.  **Interação Independente:** Cada janela de conteúdo é autônoma, contendo seu próprio texto e botões de ação ("Salvar Edições", "Copiar" e "Postar na Rede Social").

**Nota de Implementação:** Para gerenciar a complexidade do dashboard e evitar um arquivo monolítico, a lógica de renderização para os cards individuais de redes sociais é abstraída em um módulo de UI dedicado (`src/lib/ui/SocialPostCard.ts`). A página principal (`index.astro`) importa e chama este módulo para construir a interface, mantendo o código do dashboard limpo e focado no gerenciamento de estado e eventos. A interface de upload de mídia agora é renderizada condicionalmente com base no plano do usuário. A lógica, implementada em `src/lib/ui/SocialPostCard.ts`, exibe botões para upload de imagem única (Plano Basic) ou carrossel de imagens/vídeos (Plano Pro) para Instagram e Threads, enquanto oculta essas opções para usuários do plano Free, alinhando a UI diretamente com as regras de negócio.

### Etapa 4: A Conexão (Postando nas Redes Sociais)

A conexão com redes sociais é implementada através de um fluxo OAuth 2.0 seguro e padronizado, orquestrado por um conjunto de Edge Functions que garantem que os tokens de acesso nunca sejam expostos ao cliente.

#### Fluxo Padrão (LinkedIn, Twitter/X, Threads)

1.  **Início do Fluxo (`[provider]-auth-start`):**
    - **Ação:** Na página de conexões, o usuário clica em "Lincar Conta". O frontend chama a função específica do provedor (ex: `linkedin-auth-start`, `twitter-auth-start`, `threads-auth-start`).
    - **Lógica:** Esta função cria a URL de autorização específica da plataforma. Crucialmente, ela anexa um parâmetro `state` que contém o `user_id` do Supabase para identificar o usuário de forma segura. Para fluxos que exigem PKCE (como o do Twitter), o `code_verifier` também é salvo em uma tabela temporária (`oauth_state`) associado ao `state`.

2.  **Callback e Armazenamento de Credenciais (`[provider]-auth-callback`):**
    - **Ação:** Após o usuário autorizar no site da rede social, ele é redirecionado para esta função de callback.
    - **Lógica:** A função executa várias etapas críticas:
        1.  Valida o `state` para recuperar o `user_id` (e o `code_verifier`, se aplicável).
        2.  Troca o `code` de autorização por um `access_token` válido.
        3.  Usa o `access_token` para buscar o ID do usuário na plataforma (`provider_user_id`).
        4.  Salva as credenciais (`access_token`, `refresh_token`, `provider_user_id`, etc.) na tabela `social_connections`, associando-as ao `user_id` correto.
        5.  Redireciona o usuário de volta para a página de conexões no frontend.

**Nota sobre a Arquitetura do Twitter/X:** Diferente das outras integrações, a conexão com o Twitter/X foi refatorada para usar o fluxo **OAuth 1.0a**. Essa mudança foi necessária porque a API do Twitter para upload de mídia (essencial para postar imagens) exige esse padrão de autenticação mais antigo. **Este mesmo padrão de autenticação é utilizado para a publicação de tweets com e sem mídia.** O fluxo consiste em três etapas:
1.  **Obtenção de Request Token:** A função `twitter-auth-start` primeiro solicita um token temporário ao Twitter.
2.  **Autorização do Usuário:** O usuário é redirecionado para o Twitter para autorizar o aplicativo.
3.  **Obtenção de Access Token:** A função `twitter-auth-callback` recebe o usuário de volta e troca o token temporário (junto com um `oauth_verifier`) pelos tokens de acesso finais (`oauth_token` e `oauth_token_secret`), que são permanentes e são salvos no banco de dados.

**Nota sobre a Arquitetura do Threads:** A integração com o Threads também utiliza este fluxo de Edge Functions customizadas. A tentativa inicial de usar o provedor de autenticação nativo do Supabase (`signInWithOAuth`) falhou, pois o Supabase oferece apenas um "slot" de configuração para o provedor "Facebook". Como o PostPulsar precisa se conectar a múltiplos aplicativos da Meta (um para Instagram, outro para Threads), cada um com seu próprio Client ID, o fluxo nativo não era viável. A abordagem com Edge Functions customizadas garante que podemos usar as credenciais corretas para cada integração.

#### Fluxo Específico: Instagram Business Login

A integração com o Instagram utiliza um fluxo de autenticação mais recente e específico da Meta, que difere significativamente dos outros provedores.

- **Configuração do App na Meta:** A integração exige a criação de um aplicativo do tipo "Business" no painel da Meta, que habilita o produto "Instagram Business Login".
- **Endpoint de Autorização:** O fluxo é iniciado no endpoint `https://www.instagram.com/oauth/authorize`, em vez do endpoint padrão do Facebook.
- **Escopos de Permissão:** As permissões solicitadas são específicas do Instagram Business, como `instagram_business_basic` e `instagram_business_content_publish`, e não utilizam as permissões `pages_*` no momento da autorização.
- **Troca de Tokens:** A troca do código de autorização por um token de acesso de curta duração ocorre no endpoint `https://api.instagram.com/oauth/access_token`. A troca por um token de longa duração ocorre em `https://graph.instagram.com/access_token`. Esses passos são distintos dos endpoints `graph.facebook.com` usados por fluxos mais antigos.
- **Publicação:** A publicação de conteúdo no Instagram exige uma `image_url`.
    - **Suporte a Vídeo com Microserviço:** A funcionalidade de vídeo foi implementada com sucesso. Para contornar a ausência de ferramentas como `ffmpeg` nas Supabase Edge Functions, foi desenvolvido um microserviço dedicado em Node.js, hospedado na plataforma Railway, que agora realiza a transcodificação dos vídeos de forma eficaz.
    - **Fluxo de Upload de Imagem:** A imagem selecionada pelo usuário é enviada para um bucket público no **Supabase Storage** (`post-images`) somente no momento da publicação. A URL pública gerada é então passada para a Edge Function `publish-to-social`.
    - **Imagem Padrão:** Caso nenhuma imagem seja enviada, o sistema utiliza uma imagem de placeholder padrão (`/PostPulsar.png`) como fallback.

#### Fluxo Específico: Páginas do Facebook

A integração com as Páginas do Facebook, embora também seja da Meta, utiliza o fluxo mais tradicional de "Login do Facebook para Empresas".

- **Configuração do App na Meta:** Requer a adição do produto "Login do Facebook para Empresas" no painel de desenvolvedores.
- **Endpoint de Autorização:** O fluxo utiliza os endpoints padrão da Graph API do Facebook (ex: `https://www.facebook.com/v18.0/dialog/oauth`).
- **Escopos de Permissão:** As permissões solicitadas são focadas em páginas, como `pages_show_list` (para listar as páginas do usuário), `pages_manage_posts` (para publicar) e `pages_read_engagement` (para ler o engajamento).
- **Troca de Tokens e Armazenamento de Múltiplas Páginas:** Após o usuário autorizar, a função de callback (`facebook-auth-callback`) troca o código de autorização por um token de acesso de usuário. Este token é usado para chamar a API (`/me/accounts`) e obter a lista de **todas** as Páginas que o usuário gerencia. Em vez de salvar apenas uma, o sistema agora itera sobre essa lista e salva **cada página como uma linha separada** na tabela `social_connections`. Cada linha contém o `provider_user_id` (ID da Página) e o `access_token` de longa duração específico daquela página.
- **Seleção e Publicação (Frontend e Backend):**
    - **Dashboard:** Ao carregar, o dashboard consulta a tabela `social_connections`. Se encontrar múltiplas entradas para o provedor `facebook`, ele renderiza dinamicamente um **menu suspenso (`<select>`)** no card de publicação do Facebook.
    - **Ação do Usuário:** O usuário deve selecionar a página de destino desejada neste menu antes de publicar.
    - **Publicação:** Ao clicar em "Postar", o ID da página selecionada é enviado para a função `publish-to-social`. A função usa esse ID para buscar a linha correta na tabela `social_connections`, garantindo que o post seja enviado para a página escolhida, seja como uma publicação de texto (`/feed`) ou de foto (`/photos`).

#### Ação de Postar (`publish-to-social`)

- **Ação:** No dashboard, o usuário clica em "Postar na Rede Social".
- **Lógica Detalhada:** A função `publish-to-social` é chamada com a `network` (ex: `linkedin`), o `text` (o conteúdo final editado pelo usuário na `<textarea>`) e, opcionalmente, uma `mediaUrl`. Ela não busca mais o conteúdo no banco de dados, garantindo que a versão do usuário seja a publicada.
    1.  **Busca de Credenciais:** A função busca as credenciais do usuário para a rede específica na tabela `social_connections`.
    2.  **Tratamento de Mídia (se aplicável):** A função suporta múltiplos formatos de mídia em várias redes. Atualmente, **4 redes (LinkedIn, Twitter/X, Instagram, Facebook)** suportam publicação com **texto, imagem e vídeo**. A rede Threads suporta texto e imagem.
        -   **Para imagens:** Em redes como Instagram, LinkedIn, Facebook, Threads e Twitter/X, se uma `mediaUrl` de imagem é fornecida, a função baixa o arquivo do Supabase Storage e o envia para a API da rede para obter um ID de mídia.
        -   **Para vídeos:**
            -   **LinkedIn, Facebook, Instagram:** O upload de vídeo utiliza os fluxos específicos de cada plataforma, que podem envolver o microserviço de conversão (para Instagram) ou APIs de upload direto (LinkedIn, Facebook).
            -   **Twitter/X:** O upload de vídeo foi implementado usando o fluxo de upload em partes da API v1.1. A função baixa o vídeo do nosso Storage e executa os comandos `INIT` (para iniciar), `APPEND` (para enviar o arquivo em pedaços) e `FINALIZE` (para concluir). Um passo de `STATUS` verifica o processamento do vídeo antes de anexá-lo ao tweet. A publicação final do tweet com a mídia anexada usa a API v2.
    3.  **Chamada de API Específica:** Com as credenciais, o texto final e o ID da mídia (se houver) em mãos, ela monta e executa uma chamada `fetch` para a API da plataforma correspondente, publicando o conteúdo.

## 9. Sistema de Créditos ("Pulsos")

Os "Pulsos" são os créditos de uso que formam a base do nosso modelo de negócio Freemium. Cada pulso representa uma execução completa da funcionalidade de geração de conteúdo a partir de uma URL.

### Implementação Técnica

A implementação é dividida entre o banco de dados e a lógica da Edge Function principal.

**1. Banco de Dados (Supabase):**

-   Uma nova coluna, `monthly_pulses_remaining` (numérica), será adicionada à tabela de perfis de usuário.
-   **Valores Iniciais:**
    -   Plano Gratuito: `5`
    -   Plano Básico: `50`
    -   Plano Pro: `-1` (para representar ilimitado).
-   **Reset Mensal:** Uma **função agendada (cron job)** no Supabase será configurada para rodar no primeiro dia de cada mês, redefinindo os pulsos dos usuários para o valor padrão de seus respectivos planos.

**2. Lógica na Edge Function (`pulsar-v1`):**

A verificação e o débito dos pulsos ocorrem como o primeiro passo da validação na função:

1.  **Verificar:** A função lê o valor de `monthly_pulses_remaining` do usuário.
2.  **Validar:** Se o valor for `0`, a função para e retorna um erro de "limite atingido". Se for maior que `0` ou `-1`, a execução continua.
3.  **Decrementar:** Imediatamente após a validação bem-sucedida, a função subtrai `1` do contador de pulsos no banco de dados. Isso previne o uso duplicado do mesmo crédito em chamadas rápidas.

## 10. Notas de Desenvolvimento e Solução de Problemas

Esta seção documenta aprendizados e soluções para problemas comuns encontrados durante o desenvolvimento.

### Sincronizando Migrações Locais e de Produção (Erro PGRST205)

Durante o desenvolvimento, encontramos o erro `PGRST205: Could not find the table ... in the schema cache`.

- **Causa:** Este erro acontece quando uma nova tabela é criada via migração no ambiente de desenvolvimento local, mas a API do Supabase (PostgREST) ainda não foi notificada da mudança. Isso é especialmente comum ao testar a função em produção (`...supabase.co`) logo após aplicar a migração apenas localmente.

- **Fluxo de Trabalho Correto:**
    1.  Crie o arquivo de migração: `supabase migration new <nome_da_migracao>`
    2.  Adicione o código SQL ao arquivo de migração.
    3.  Aplique a migração ao seu banco de dados **local**: `supabase migration up`.
    4.  Teste a funcionalidade no seu ambiente de desenvolvimento local (`localhost`).
    5.  Após validar localmente, "empurre" a migração para o banco de dados de **produção**: `supabase db push`. Este passo é crucial e foi esquecido inicialmente, o que causou o erro no ambiente de produção.

### Resolvendo Erros de Autenticação em Edge Functions

- **Erro `401 Missing authorization header` em Callbacks Anônimos:**
    - **Causa:** Funções de callback (ex: `linkedin-auth-callback`) são chamadas por servidores externos (LinkedIn, Meta) que não possuem um token de autenticação do Supabase. Por padrão, o Supabase rejeita essas chamadas.
    - **Solução:** Adicionar `verify_jwt = false` no arquivo `supabase/config.toml` para a função de callback específica, tornando-a publicamente acessível.

- **Erro `401 Unauthorized` / `AuthSessionMissingError` em Funções Autenticadas:**
    - **Causa:** Durante a integração com o Instagram, mesmo com um token JWT válido sendo enviado pelo frontend, a chamada `supabase.auth.getUser()` dentro da Edge Function falhava em reconhecer a sessão. Isso parece ser um bug ou uma inconsistência na biblioteca `gotrue-js` no ambiente Deno.
    - **Solução (Workaround):** Em vez de usar `getUser()`, decodificar o JWT manualmente dentro da função para extrair o `user_id` (`sub`). Como o gateway do Supabase já valida a assinatura do token (com `verify_jwt = true`), esta é uma operação segura. Para operações de banco de dados subsequentes, inicializar o cliente Supabase com a `SUPABASE_SERVICE_ROLE_KEY`.

### Erros de Configuração da Plataforma Meta

- **Erro `Invalid App ID` ou `Invalid platform app`:**
    - **Causa:** Estes erros indicam uma incompatibilidade entre a URL de autorização gerada pelo nosso código e a configuração do aplicativo no painel da Meta. O fluxo "Instagram Business Login" usa endpoints (`www.instagram.com/oauth/authorize`) e escopos (`instagram_business_*`) diferentes do fluxo padrão do Facebook (`graph.facebook.com`).
    - **Solução:** Garantir que o código da função `...-auth-start` use exatamente os endpoints e escopos fornecidos pelo painel da Meta para o tipo de aplicativo configurado.

- **Erro `Função de desenvolvedor insuficiente`:**
    - **Causa:** Quando um aplicativo da Meta está em modo de desenvolvimento, apenas usuários com uma função definida (Administrador, Desenvolvedor, Testador) podem autorizá-lo.
    - **Solução:** No painel da Meta, ir em **Funções > Funções** e adicionar a conta do Facebook/Instagram usada para o teste à lista de **Testadores** (especificamente, "Testador do Instagram"). O convite deve ser aceito pelo usuário de teste.

- **Solução para Docker Desktop:** Encontramos também problemas de permissão com o Docker Desktop. A solução foi trocar o contexto do Docker para o `default` do sistema (`docker context use default`) e rodar os comandos do Supabase com `sudo`, ou, de forma permanente, adicionar o usuário ao grupo `docker` com `sudo usermod -aG docker $USER` e reiniciar a sessão.

### Solução da Integração com Instagram: Obtendo o ID de Conta Empresarial

A integração com a API do Instagram para publicação de conteúdo apresentou um desafio complexo, cuja solução foi encontrada após uma depuração detalhada.

- **Problema:** A publicação no Instagram falhava com um erro genérico da API, mesmo com a autenticação inicial funcionando.
- **Causa Raiz Confirmada:** A API de publicação de conteúdo do Instagram não utiliza o ID de usuário padrão retornado no primeiro passo da autenticação. Ela exige um **ID de Conta Profissional do Instagram**. A confirmação final veio quando um teste manual, inserindo o ID profissional correto no banco de dados, resultou em uma publicação bem-sucedida.
- **Solução Definitiva Implementada:** O fluxo de autenticação "Business Login for Instagram" foi mantido. A correção foi feita na função `instagram-auth-callback`. Após obter o token de acesso de longa duração, a função agora faz uma segunda chamada à API do Instagram (`GET /me?fields=user_id,username`). De acordo com a documentação da Meta, o campo `user_id` retornado por *esta chamada específica* é o ID da conta profissional necessário. Este ID, junto com o `username` correto, é então salvo no banco de dados, permitindo que as publicações futuras funcionem corretamente.

## 11. Configurações Avançadas e Persistência de Preferências

Para dar ao usuário controle granular sobre o conteúdo gerado e melhorar a experiência de uso, foi implementada uma seção de "Configurações Avançadas" com persistência de dados.

-   **Interface:** Um menu "sanfona" (accordion) chamado "Configurações Avançadas" foi adicionado ao dashboard. Ele contém inputs numéricos para definir o tamanho aproximado em caracteres para cada rede social suportada (ex: LinkedIn, Twitter/X).

-   **Persistência de Preferências (Banco de Dados):** Para que o usuário não precise inserir suas preferências a cada sessão, duas novas colunas foram adicionadas à tabela `profiles`: `default_linkedin_chars` e `default_twitter_chars`.

-   **Persistência de Preferências (Backend):** Uma nova função RPC, `update_char_preferences`, foi criada. Ela é chamada pelo frontend quando o usuário clica no botão "Salvar como Padrão" e atualiza de forma segura as colunas no perfil do usuário autenticado.

-   **Fluxo de Geração:** Ao carregar a página, o frontend busca as preferências salvas e preenche os campos. Ao clicar em "Pulsar", os valores atuais dos campos de configuração são enviados para a Edge Function `pulsar-v1`, que os utiliza para instruir o modelo de IA a gerar textos com o tamanho desejado para cada rede.

## 12. Melhorias de Experiência do Usuário (UX)

Para refinar a interação do usuário com a aplicação, diversas melhorias de qualidade de vida foram implementadas.

### Tratamento de Sessões Expiradas

-   **Problema:** Se o token de acesso de uma rede social expira, a publicação falha com uma mensagem de erro genérica da API, forçando o usuário a adivinhar o problema.
-   **Solução (Backend):** A função `publish-to-social` agora tenta proativamente renovar o `access_token` usando o `refresh_token` antes de cada publicação. Se a renovação falhar (indicando que a autorização foi revogada ou expirou completamente), a função retorna um erro específico: `SESSION_EXPIRED: [network]`.
-   **Solução (Frontend):** O script do dashboard agora identifica esse erro específico. Em vez de mostrar uma mensagem de erro genérica, ele exibe um modal claro e informativo, explicando que a sessão para aquela rede social expirou e instrui o usuário a se reconectar através da página de "Conexões", com um link direto.

### Persistência de Conteúdo

-   Para evitar a perda de trabalho, o último conteúdo gerado pelo usuário agora é salvo e recarregado automaticamente quando ele retorna ao dashboard. Ao carregar a página, uma consulta busca o último registro na tabela `generated_posts` e, se encontrado, o insere na área de visualização, permitindo que o usuário continue a edição e publicação sem precisar gerar o conteúdo novamente.

### Publicação no Threads

-   A lógica de publicação no Threads foi adicionada à função `publish-to-social`. Assim como no Instagram, o processo envolve a criação de um "container" de mídia que é então publicado. A função lida com a lógica de duas etapas e a atualização de tokens para garantir uma experiência de publicação robusta.

## 13. Modelo de Negócio (Atualizado com Vídeo)

Com a introdução da funcionalidade de vídeo, o modelo de negócio foi refinado para criar uma diferenciação clara entre os planos.

-   **Plano Gratuito:**
    -   **30 Pulsos** por mês.
    -   Publicação apenas de **texto**.
    -   Funcionalidades de imagem e vídeo desabilitadas.

-   **Plano Básico (ainda a ser nomeado):**
    -   Acesso a todas as redes sociais.
    -   Publicação de **texto e imagem**.
    -   Funcionalidade de vídeo desabilitada.

-   **Plano Pro:**
    -   Acesso a todas as redes sociais.
    -   Publicação de **texto, imagem e vídeo**.

A verificação do plano (`plan_type` na tabela `profiles`) é feita no backend (Edge Functions) para autorizar ou negar uma ação (como conversão de vídeo ou publicação), enquanto o frontend ajusta a UI dinamicamente para mostrar ou ocultar as funcionalidades correspondentes a cada plano.

## 14. Arquitetura de Vídeo com Microserviço Externo

A principal barreira técnica para suportar uploads de vídeo era a necessidade de processamento (transcodificação) para adequar os arquivos às especificações de cada rede social (ex: formato, resolução, codec). Como as Supabase Edge Functions não podem executar binários como o `ffmpeg`, a arquitetura a seguir foi implementada com sucesso.

-   **Componente Central: Microserviço de Conversão na Railway**
    -   **Por que Railway?** A escolha da Railway foi estratégica por sua facilidade de uso, deploy contínuo a partir de um `Dockerfile` e gerenciamento simplificado de variáveis de ambiente, o que permitiu isolar a complexidade do `ffmpeg` do resto da aplicação.
    -   **Implementação:** Foi criado um serviço em Node.js, "dockerizado", cuja única responsabilidade é receber uma URL de vídeo, processá-lo com `ffmpeg` e fazer o upload do resultado para o Supabase Storage. Ele expõe um endpoint de API seguro, protegido por uma chave.

-   **Fluxo de Dados Detalhado:**
    1.  **Seleção no Frontend:** O usuário (do plano "Pro") seleciona um vídeo no dashboard.
    2.  **Chamada da Edge Function:** O frontend **não faz o upload direto**. Em vez disso, chama a Edge Function `publish-to-social`, passando o arquivo de mídia junto com o texto.
    3.  **Upload para o Storage Bruto:** A função `publish-to-social` recebe o arquivo e primeiro o envia para um bucket privado no Supabase Storage (ex: `raw-videos`).
    4.  **Requisição de Conversão:** A função então faz uma chamada segura (`fetch`) para o microserviço na Railway, enviando a URL do vídeo bruto recém-enviado.
    5.  **Processamento Assíncrono:** O microserviço de conversão realiza o trabalho pesado, baixando, processando e fazendo o upload do vídeo finalizado para um bucket público (ex: `processed-videos`).
    6.  **Publicação Final:** A função `publish-to-social` utiliza a URL pública do vídeo já processado para realizar a publicação na rede social.

## 15. UX Avançada: Modal de Progresso e Mídia Inteligente

Para melhorar a experiência do usuário durante operações complexas e evitar erros, a interface de publicação foi aprimorada com duas funcionalidades centrais.

### 15.1 Modal de Progresso Unificado

A lógica de feedback ao usuário durante a publicação foi centralizada em um componente de modal reutilizável, gerenciado por `src/lib/modal.ts`.

-   **Objetivo:** Dar feedback claro e em tempo real sobre o andamento de um processo que pode ser demorado (como upload e processamento de vídeo), evitando a sensação de que a aplicação travou.
-   **Implementação:**
    -   As funções `showProgressModal()` e `updateProgressStep()` são chamadas a partir do script do dashboard (`src/pages/app/index.astro`).
    -   O modal exibe uma lista de etapas que é gerada dinamicamente com base no tipo de publicação (texto, imagem ou vídeo).
    -   Cada etapa é atualizada com ícones (`⏳`, `✅`, `❌`) para comunicar o status, e o modal lida com a exibição de mensagens de sucesso ou erro, centralizando o feedback em um único lugar.

### 15.2 Lógica de Mídia Inteligente

A interface de upload de mídia foi projetada para se adaptar dinamicamente às regras de cada rede social, prevenindo que o usuário tente realizar uma ação não suportada pela API da plataforma.

-   **Baseado em Pesquisa:** A lógica foi construída após confirmar as capacidades de cada API:
    -   **Suporte a Carrossel (Múltiplas Imagens/Vídeos):** Instagram, Threads.
    -   **Apenas Mídia Única (uma imagem OU um vídeo):** Facebook, LinkedIn, Twitter/X, Pinterest.
-   **Interface Adaptativa (Implementada):**
    -   Para **Instagram e Threads**, a UI agora permite o upload de múltiplos arquivos (imagens e vídeos) para a criação de posts em carrossel. Uma galeria de previews é exibida, permitindo ao usuário gerenciar os itens antes da publicação.
    -   **Nota sobre Carrossel de Vídeo no Instagram:** Esta funcionalidade foi implementada com sucesso, mas exige uma configuração específica que contradiz a documentação oficial da Meta. A API se mostrou instável, exigindo um tempo de espera maior para processamento e o uso do `media_type: 'REELS'` para todos os vídeos, inclusive os de carrossel. Veja a seção 20 do arquivo `docs/atencao.md` para o histórico completo da investigação.
    -   Para as **outras redes**, a UI reforça a seleção exclusiva: ao escolher uma imagem, a opção de vídeo é desabilitada (e vice-versa). O botão desabilitado muda de cor e exibe um ícone de informação `(i)` que, ao ser sobrevoado, explica por que a ação não está disponível, melhorando a experiência do usuário e prevenindo erros.

## 16. Gestão Avançada de Prompts e Recursos

Para aumentar a flexibilidade e o controle do usuário, bem como otimizar o uso de recursos, novas funcionalidades de gerenciamento de prompts e de dados foram implementadas.

### 16.1. Sistema de Prompts

Esta funcionalidade visa dar ao usuário mais controle sobre o estilo e o formato do conteúdo gerado pela IA.

-   **Plano Básico:** Terá acesso a 3 prompts pré-definidos (ex: "Post Curto e Direto", "Análise Profunda", "Thread para Twitter"). O usuário poderá escolher um desses para guiar a geração.
-   **Plano Pro:** Além dos prompts pré-definidos, o usuário terá uma interface para criar, nomear, salvar e apagar até 5 prompts personalizados. Isso permitirá que eles ajustem a IA para seu estilo de escrita pessoal ou para campanhas específicas.
-   **Implementação Técnica:** Foi criada uma nova tabela no Supabase, `user_prompts` (`id`, `user_id`, `name`, `text`), para armazenar os prompts customizados. A interface do dashboard agora permite a criação, listagem e exclusão desses prompts através de um modal de gerenciamento, e a Edge Function `pulsar-v1` foi atualizada para aceitar o texto do prompt selecionado e usá-lo para guiar a IA.

### 16.3. Otimização de Storage: Limpeza de Mídia Órfã

Para otimizar o uso do Supabase Storage e garantir que apenas mídias referenciadas por posts existentes sejam mantidas, foi implementada uma função de limpeza agendada.

-   **Objetivo:** Identificar e remover arquivos de imagem e vídeo que não estão mais vinculados a nenhum post gerado na tabela `generated_posts`.
-   **Implementação Técnica:** Uma nova Edge Function (`storage-cleanup`) foi criada. Esta função lista todos os arquivos nos buckets de mídia (`post-images`, `raw-videos`, `processed-videos`), compara suas URLs com as `media_urls` armazenadas na tabela `generated_posts` e apaga os arquivos que não possuem referência.
-   **Agendamento:** Um cron job (`pg_cron`) foi configurado no Supabase para executar a função `storage-cleanup` diariamente, garantindo a manutenção contínua do storage.

## 17. Próximos Passos

-   **Implementar Conexão com Pinterest:** Adicionar a funcionalidade completa de conexão e publicação para o Pinterest (atualmente em espera pela aprovação do app).
-   **Construir Página de Planos e Pagamentos:** Integrar o Stripe para que os usuários possam fazer upgrade de plano e comprar pacotes de pulsos.