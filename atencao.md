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

### 4. Padronização da Resposta da API (Frontend/Backend)

- **Erro "Could not retrieve authorization URL" (ou similar) na Interface:** Este erro pode ocorrer na interface do usuário ao tentar iniciar um fluxo de conexão (ex: clicar em "Link Account"), mas os logs da função de backend (`...-auth-start`) mostram um status `200 OK`, indicando que a execução foi bem-sucedida.
    - **Causa:** Inconsistência no "contrato" da API entre o frontend e o backend. A função de backend está, de fato, retornando a URL de autorização, mas o nome da propriedade no objeto JSON de resposta (ex: `{ "authUrl": "..." }`) é diferente do que o código do frontend espera (ex: `data.authorizationUrl`). Como a propriedade esperada não é encontrada, o frontend assume que a chamada falhou.
    - **Solução:** Padronizar. Garanta que **todas** as funções de início de autenticação (`...-auth-start`) retornem o objeto JSON com a URL de autorização usando **exatamente o mesmo nome de propriedade** (ex: `authorizationUrl`). Verifique se o código do frontend está lendo essa propriedade com o nome correto. Isso evita que uma correção para uma integração quebre outra.

---
### 5. A Confusão de IDs do Instagram: Usuário vs. Conta Profissional

A lição mais difícil aprendida durante a integração do Instagram foi a diferença sutil, mas crucial, entre os vários tipos de IDs.

-   **O Problema:** A publicação de conteúdo falhava com um erro genérico, mesmo com um token de acesso aparentemente válido.
-   **A Causa:** O fluxo de "Business Login for Instagram" retorna um **ID de Usuário do Instagram** (`user_id`) no primeiro passo (troca do código pelo token). **Este NÃO é o ID correto para publicar conteúdo.**
-   **A Solução:** Para publicar, é necessário o **ID de Conta Profissional do Instagram**. A única maneira de obtê-lo, de acordo com a documentação e nossos testes, é fazer uma **segunda chamada** à API após obter o token de acesso: `GET /me?fields=user_id,username`. O campo `user_id` retornado por *esta chamada específica* é o ID da conta profissional que deve ser usado em todas as operações de publicação.
-   **Lição:** Nunca presuma que o primeiro ID recebido em um fluxo OAuth da Meta é o ID correto para todas as operações. Sempre verifique a documentação do endpoint específico que você irá usar para saber qual formato de ID ele espera.

### 6. Documentação da API vs. Realidade (Teste Empírico)

-   **O Problema:** A documentação oficial da API de Conteúdo do Instagram afirmava categoricamente que apenas o formato de imagem **JPEG** era suportado para publicação via `image_url`.
-   **O Teste:** Decidimos testar na prática e permitir o upload de `image/png` e `image/webp` além do `image/jpeg`.
-   **O Resultado:**
    -   `image/png` funcionou perfeitamente.
    -   `image/webp` falhou durante o processo de upload para o Supabase Storage, antes mesmo de chegar à API do Instagram.
-   **Lição:** A documentação da API, especialmente de grandes plataformas, pode estar desatualizada, incompleta ou ser excessivamente conservadora. Sempre que possível, realize testes empíricos para validar as limitações. Neste caso, descobrimos que PNG era suportado, o que melhorou a funcionalidade para o usuário. Também confirmamos que WebP não era uma opção viável no nosso fluxo atual.