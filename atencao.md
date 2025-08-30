# Atenção: Lições Aprendidas com Integrações OAuth

Este documento resume os principais desafios e soluções encontrados durante a implementação das conexões com redes sociais. Ele deve ser consultado antes de iniciar a integração com qualquer nova plataforma para evitar erros comuns.

---

### 1. Configuração de Aplicativos da Meta (Facebook/Instagram)

A plataforma da Meta possui múltiplos fluxos de autenticação que são fáceis de confundir.

- **Tipo de App é Crucial:** A escolha do tipo de aplicativo no início (ex: "Business") define todo o fluxo de autenticação. O fluxo **"Instagram Business Login"** é completamente separado do fluxo padrão do Facebook Login.
    - **Endpoints:** Ele usa seus próprios endpoints para autorização (ex: `https://www.instagram.com/oauth/authorize`).
    - **Permissões (Scopes):** Ele usa um conjunto próprio de permissões (ex: `instagram_business_basic`, `instagram_business_content_publish`).
    - **Lição:** Sempre verifique o fluxo exato para o tipo de app criado. Não presuma que a documentação de um fluxo se aplica a outro.

- **Erro "Função de desenvolvedor insuficiente":** Este erro ocorre quando o aplicativo da Meta está em modo de desenvolvimento. 
    - **Causa:** A conta de usuário (Facebook/Instagram) que está tentando autorizar o aplicativo não está registrada como uma função oficial no painel do app.
    - **Solução:** Vá em **Funções > Funções** no painel da Meta e adicione a conta de teste à lista de **"Testadores"** (especificamente "Testador do Instagram", se disponível). O convite precisa ser aceito por essa conta.

### 2. Autenticação em Edge Functions (Supabase)

- **Erro `AuthSessionMissingError`:** Encontramos um bug persistente onde a chamada `supabase.auth.getUser()` dentro de uma Edge Function falhava, mesmo recebendo um token de autenticação (JWT) válido.
    - **Causa:** Aparentemente uma inconsistência na biblioteca `gotrue-js` no ambiente Deno do Supabase.
    - **Solução (Workaround):** Não use `supabase.auth.getUser()` para obter o usuário. Em vez disso, decodifique o JWT manualmente para extrair o ID do usuário (`sub`). Esta é uma operação segura, pois o gateway do Supabase (com `verify_jwt = true`) já validou a assinatura do token. Para operações com o banco de dados, use um cliente inicializado com a `SUPABASE_SERVICE_ROLE_KEY`.

- **`verify_jwt = true` vs. `false`:**
    - **`true`:** Use para funções que são chamadas pelo seu próprio frontend por um usuário logado (ex: `...-auth-start`).
    - **`false`:** Use para funções de *callback*, que são chamadas por um servidor externo (ex: Meta, Google) que não possui o token de autenticação do seu usuário.

### 3. Schema do Banco de Dados

- **Erro `Could not find the 'column_name' column`:** Este erro ocorreu porque o código da função de callback tentou inserir dados em colunas que não existiam no banco de dados.
    - **Causa:** O código foi escrito presumindo uma estrutura de tabela que não correspondia à realidade do banco de dados.
    - **Lição:** **Sempre verifique o schema atual da tabela** (seja pelo Table Editor do Supabase ou olhando a **última** migração da tabela) antes de escrever código que lê ou grava nela. Não confie apenas no arquivo de migração de criação inicial.