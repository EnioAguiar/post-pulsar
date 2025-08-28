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
  - 1 rede social conectada.
  - 5 "pulsos" (gerações de conteúdo) por mês.

- **Plano Básico:**
  - **Preço:** $5/mês
  - 3 redes sociais conectadas.
  - 50 "pulsos" por mês.

- **Plano Pro:**
  - **Preço:** $15/mês
  - Redes sociais ilimitadas.
  - Pulsos ilimitados.

## 4. Modelo de Desenvolvimento Seguro (SSDLC)

Para garantir a segurança e a robustez do PostPulsar, todo o desenvolvimento seguirá os princípios do **Secure Software Development Lifecycle (SSDLC)**. A principal referência para mitigar vulnerabilidades será o **OWASP Top 10**.

**Diretrizes Práticas Invioláveis:**

1.  **Toda Lógica Crítica é Server-Side:** Ações que envolvem permissões, planos e pagamentos **devem** ser validadas e executadas no servidor.
    - **Exemplo (Anti-Manipulação de Preço):** O frontend exibe o preço de $15, mas quando o usuário clica em comprar, o servidor é que busca o preço de $15 no banco de dados para iniciar a transação com o Stripe. O preço enviado pelo cliente é ignorado.

2.  **Validação de Input em Todas as Entradas:** Nunca confiar em dados vindos do usuário (formulários, parâmetros de URL).
    - **Ação:** Usar as funções padrão do cliente Supabase (ex: `supabase.from('posts').insert(...)`) que utilizam "parameterized queries", prevenindo SQL Injection. Para outros inputs, usar bibliotecas de validação como a Zod.

3.  **Controle de Acesso com Row-Level Security (RLS):** O Supabase oferece RLS, que será nossa principal ferramenta de controle de acesso.
    - **Ação:** Habilitar RLS em todas as tabelas com dados de usuários. Criar políticas que garantam que "um usuário só pode ver e editar seus próprios dados".

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

## 8. Arquitetura da Funcionalidade Principal ("Pulsar")

A funcionalidade "Pulsar" é o coração do produto. Sua arquitetura é dividida em quatro etapas principais para garantir eficiência e segurança.

### Etapa 1: O Início (Frontend)

1.  **Ação do Usuário:** O usuário cola a URL de um artigo no dashboard e clica no botão "Pulsar".
2.  **Chamada de API:** O frontend faz uma chamada segura e autenticada para uma Supabase Edge Function (ex: `pulsar-v1`), enviando a URL como parâmetro.

### Etapa 2: O Coração da Operação (Edge Function `pulsar-v1`)

Esta etapa é executada inteiramente no servidor.

1.  **Validação:** A função valida a URL e as permissões do usuário (ex: verificar se ainda tem "pulsos" disponíveis no plano).
2.  **Scraping (Extração):** A função acessa a URL e extrai o conteúdo principal do artigo. A biblioteca `cheerio` foi a escolhida para esta tarefa, pois a alternativa (`metascraper`) se mostrou instável durante os testes no ambiente Deno das Supabase Edge Functions.
3.  **Geração com IA:** O texto limpo é enviado a um modelo de linguagem de IA (LLM) com prompts específicos para gerar os diferentes formatos de conteúdo (threads, posts, citações).
4.  **Armazenamento:** O resultado da IA (um objeto JSON estruturado) é salvo no banco de dados Supabase, vinculado ao usuário.
5.  **Resposta:** A função retorna o conteúdo gerado para o frontend.

### Etapa 3: A Exibição (Frontend)

1.  **Renderização:** O dashboard recebe os dados e os exibe em componentes organizados (uma caixa para cada tipo de conteúdo).
2.  **Interação:** Cada componente possui botões de "Copiar" e "Postar na Rede Social".

### Etapa 4: A Conexão (Postando nas Redes Sociais)

1.  **Autorização (OAuth):** Na página de Configurações, o usuário poderá conectar suas contas de redes sociais. Esse processo de autorização (OAuth) nos fornecerá uma chave de acesso (API Token).
2.  **Armazenamento Seguro:** As chaves de acesso são armazenadas no banco de dados de forma **criptografada**.
3.  **Ação de Postar:** Ao clicar em "Postar", outra Edge Function é chamada. Ela busca a chave criptografada, a descriptografa em memória e a utiliza para se comunicar com a API da rede social e publicar o conteúdo, garantindo que a chave nunca seja exposta no lado do cliente.

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

- **Solução para Docker Desktop:** Encontramos também problemas de permissão com o Docker Desktop. A solução foi trocar o contexto do Docker para o `default` do sistema (`docker context use default`) e rodar os comandos do Supabase com `sudo`, ou, de forma permanente, adicionar o usuário ao grupo `docker` com `sudo usermod -aG docker $USER` e reiniciar a sessão.