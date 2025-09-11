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
-   **A Solução:** Para publicar, é necessário o **ID de Conta Profissional do Instagram**. A única maneira de obtê-lo, de acordo com a documentação e nossos testes, é fazer uma **segunda chamada** à API após obter o token de acesso: `GET /me?fields=user_id,username`. O campo `user_id` retornado por *esta chamada específica* é o ID da conta profissional necessário. Este ID, junto com o `username` correto, é então salvo no banco de dados, permitindo que as publicações futuras funcionem corretamente.
-   **Lição:** Nunca presuma que o primeiro ID recebido em um fluxo OAuth da Meta é o ID correto para todas as operações. Sempre verifique a documentação do endpoint específico que você irá usar para saber qual formato de ID ele espera.

### 6. Documentação da API vs. Realidade (Teste Empírico)

-   **O Problema:** A documentação oficial da API de Conteúdo do Instagram afirmava categoricamente que apenas o formato de imagem **JPEG** era suportado para publicação via `image_url`.
-   **O Teste:** Decidimos testar na prática e permitir o upload de `image/png` e `image/webp` além do `image/jpeg`.
-   **O Resultado:**
    -   `image/png` funcionou perfeitamente.
    -   `image/webp` falhou durante o processo de upload para o Supabase Storage, antes mesmo de chegar à API do Instagram.
-   **Lição:** A documentação da API, especialmente de grandes plataformas, pode estar desatualizada, incompleta ou ser excessivamente conservadora. Sempre que possível, realize testes empíricos para validar as limitações. Neste caso, descobrimos que PNG era suportado, o que melhorou a funcionalidade para o usuário. Também confirmamos que WebP não era uma opção viável no nosso fluxo atual.

---

### 7. Publicação de Vídeo no Instagram: Assincronicidade e Requisitos

**Atenção:** Esta funcionalidade foi **temporariamente revertida**. A complexidade e os requisitos técnicos (especialmente a falta de suporte ao `ffmpeg` para processamento de vídeo no ambiente das Supabase Edge Functions) tornaram a implementação instável. As lições aprendidas foram mantidas aqui como referência para uma futura tentativa.

A API do Instagram para publicar vídeos (Reels) é significativamente mais complexa que a de imagens.

-   **O Problema:** Tentar publicar um vídeo da mesma forma que uma imagem resulta em erros de "mídia não pronta" (`Media ID is not available`) ou "tipo de mídia não aceito".
-   **A Causa 1 (Tipo de Mídia):** A API descontinuou o `media_type: 'VIDEO'` para posts no feed. O valor correto e obrigatório é **`media_type: 'REELS'`**.
-   **A Causa 2 (Processamento Assíncrono):** Após criar o container do vídeo, o Instagram leva tempo para processá-lo. Tentar publicar o container imediatamente falha.
-   **A Solução (Polling):** É mandatório implementar um loop de verificação (polling) após criar o container. A aplicação deve fazer chamadas `GET` para o endpoint do container, verificando o `status_code`. A publicação final só deve ser tentada quando o status for **`FINISHED`**.
-   **A Causa 3 (Especificações Rígidas):** Se o status do container se torna `ERROR` durante o polling, significa que o arquivo de vídeo não atende às especificações técnicas da API, que são muito rigorosas. A ausência de uma **faixa de áudio (mesmo que silenciosa)** é uma causa comum de falha.
-   **Lição:** Para vídeos, o fluxo é: **1. Criar Container** -> **2. Verificar Status em Loop até 'FINISHED'** -> **3. Publicar Container**. Garanta que o arquivo de vídeo de teste atenda a todas as especificações (codec, framerate, áudio) para um debug eficaz.

### 8. Erro 403 do Twitter: Permissões vs. Conteúdo

-   **O Problema:** Uma chamada para publicar um tweet retorna um erro `403 Forbidden`, mesmo que as permissões do app no Portal de Desenvolvedor estejam como "Read and Write" e já tenha funcionado antes.
-   **A Causa (Conteúdo Duplicado):** A API do Twitter possui uma regra anti-spam agressiva. Se uma aplicação tenta postar o mesmo texto (ou um texto muito similar) várias vezes em um curto período, a API retorna um erro `403` genérico. Isso é comum de acontecer durante testes e debugging.
-   **Solução:** Para testar, garanta que o conteúdo de cada post seja único. Uma simples adição de um número ou caractere aleatório no final do texto é suficiente para passar por essa verificação.
-   **Lição:** Um erro `403` no Twitter nem sempre significa um problema de permissão de escopo da aplicação. Pode ser uma rejeição baseada no conteúdo do post, especialmente se for duplicado.

### 9. Provedor Nativo do Supabase vs. Múltiplos Apps da Meta

- **O Problema:** Ao tentar integrar o Threads após já ter uma integração com o Instagram, o fluxo de autenticação falhava com erros de `client_id` inválido.
- **A Causa:** O provedor de autenticação nativo do Supabase (ex: `supabase.auth.signInWithOAuth({ provider: 'facebook' })`) utiliza uma única configuração no painel do Supabase (em **Authentication > Providers**). Isso significa que só é possível salvar um par de `Client ID` e `Client Secret` para o provedor "Facebook". Como o PostPulsar precisa de um App da Meta para o Instagram e um App da Meta **diferente** para o Threads, o método nativo entra em conflito, tentando usar as credenciais erradas.
- **Lição:** Se sua aplicação precisa se conectar a múltiplos serviços que estão sob o mesmo "guarda-chuva" de um provedor do Supabase (como Instagram e Threads, ambos da Meta), o fluxo de autenticação nativo não é suficiente. A solução é usar **Edge Functions customizadas** (ex: `threads-auth-start`, `instagram-auth-start`) para cada integração. Isso lhe dá controle total para usar as credenciais corretas (armazenadas em **Settings > Secrets**) para cada chamada de API.

### 10. UI do Painel da Meta: O Campo de URL de Redirecionamento

- **O Problema:** O painel de desenvolvedor da Meta se recusava a salvar a URL de redirecionamento do OAuth (`.../callback`), mesmo que a URL estivesse perfeitamente correta, mostrando um erro genérico.
- **A Causa:** A recusa não era pela URL em si, mas por um de dois motivos: 1) Outros campos obrigatórios na página (como URL da Política de Privacidade) não estavam preenchidos. 2) Uma peculiaridade da interface do usuário.
- **Solução:** Primeiro, garanta que todos os campos de URL (Política de Privacidade, Termos de Serviço, etc.) na página de **Configurações > Básico** estejam preenchidos. Segundo, e mais importante, ao colar a URL no campo **URIs de redirecionamento do OAuth válidos**, você precisa **clicar na URL que aparece em um menu suspenso/autocomplete** abaixo do campo. Apenas colar o texto não é suficiente; você precisa selecionar a sugestão para que o painel a registre como um item válido antes de salvar.
- **Lição:** Painéis de configuração complexos podem ter peculiaridades de UI. Se um campo válido não é aceito, procure por interações não óbvias, como a necessidade de selecionar um item de uma lista gerada automaticamente após colar o texto.

### 11. OAuth 1.0a do Twitter: `authorize` vs. `authenticate`

- **O Problema:** O fluxo de autenticação OAuth 1.0a falhava no passo final de obter o token de acesso, retornando um erro genérico como `This feature is temporarily unavailable`.
- **A Causa:** O código estava usando a URL `https://api.twitter.com/oauth/authenticate`. Este endpoint é destinado para um fluxo de "Login com Twitter" e não para autorizar uma aplicação a realizar ações em nome do usuário.
- **A Solução:** A URL correta para o fluxo de 3 etapas que obtém permissões é `https://api.twitter.com/oauth/authorize`.
- **Lição:** A diferença de uma única palavra no endpoint da API pode mudar completamente o contexto da autorização. Para obter tokens de acesso que podem realizar ações, o endpoint `authorize` é o correto.

### 12. Sincronização de Schema do Supabase (Cache da API)

- **O Problema:** As Edge Functions falhavam com o erro `Could not find the 'column_name' column ... in the schema cache`, mesmo após os arquivos de migração locais estarem corretos e o comando `supabase db push` ter sido executado (aparentemente com sucesso).
- **A Causa:** A camada de API do Supabase (PostgREST) mantém um cache do schema do banco de dados. Às vezes, este cache não é invalidado corretamente, e a API não "enxerga" as novas colunas, mesmo que elas existam no banco de dados.
- **A Solução:**
    1.  **Primeira Tentativa:** Forçar a CLI a reaplicar a migração. Isso foi feito marcando a migração como revertida (`supabase migration repair --status reverted <id>`) e depois empurrando novamente com `supabase db push --include-all`.
    2.  **Solução Definitiva:** Quando a primeira tentativa não resolve, a forma mais garantida de limpar o cache é reiniciar o projeto Supabase através do painel de controle em **Settings > General > Restart project**. Esta ação não apaga dados e força a recarga de todo o schema.

### 13. Problemas com Bibliotecas OAuth 1.0a em Deno

-   **O Problema:** Ao implementar a publicação no Twitter/X com OAuth 1.0a, a função falhava consistentemente com `401 Unauthorized`, mesmo com credenciais e lógica de assinatura aparentemente corretas.
-   **A Causa:** A versão da biblioteca `deno-oauth-1.0a` disponível no JSR (`jsr:@andreivarapayeu/deno-oauth-1-0a`) era um *fork* que se mostrou incompatível ou com um bug sutil na geração da assinatura para a API v2 do Twitter.
-   **A Solução:** A troca da importação da biblioteca para a versão original hospedada diretamente no GitHub (`https://raw.githubusercontent.com/snsinfu/deno-oauth-1.0a/main/mod.ts`) resolveu o problema. Além disso, a assinatura de requisições com corpo JSON para a API v2 do Twitter exige que o `body` **não seja passado** para a função `client.sign()`, e que o `signature` seja explicitamente definido na criação do `OAuthClient`.
-   **Lição:** Em casos de erros persistentes de `401 Unauthorized` com bibliotecas OAuth, especialmente em ambientes como Deno com módulos remotos, considere a possibilidade de incompatibilidades ou bugs na própria biblioteca. Verificar a fonte original ou tentar versões alternativas pode ser necessário.

### 14. Sincronização de Features: Frontend, Backend e Banco de Dados

- **O Problema:** A interface quebrava ao carregar a página (`Pulse Balance: Error`) ou funcionalidades pareciam incompletas (um card de rede social não aparecia).
- **A Causa:** Uma nova feature (ex: uma preferência de usuário para o tamanho do post do Facebook) foi implementada em apenas uma ou duas das três camadas necessárias:
    1.  **Frontend:** O código da página (`index.astro`) foi alterado para *tentar ler* a nova preferência.
    2.  **Banco de Dados:** A coluna (`default_facebook_chars`) **não foi criada** na tabela `profiles`.
    3.  **Backend:** A função (`pulsar-v1`) **não foi atualizada** para usar a nova preferência e gerar o conteúdo correspondente.
- **Lição:** Ao adicionar uma nova funcionalidade, especialmente uma que envolve dados do usuário, é crucial implementar a mudança em todas as camadas relevantes de forma síncrona. O fluxo de trabalho deve ser: 1. **Criar a migração** do banco de dados. 2. **Atualizar a lógica do backend** para ler/gravar os novos dados. 3. **Atualizar a interface** para exibir e interagir com a nova funcionalidade. Esquecer qualquer uma dessas etapas levará a erros ou comportamento inesperado.

### 15. O Perigo dos Dados Sujos: Aspas Inesperadas em Valores de ENUM

-   **O Problema:** A lógica de planos de usuário (free, basic, pro) não funcionava. Usuários de planos pagos não viam as funcionalidades correspondentes (upload de imagem/vídeo), como se estivessem sempre no plano 'free'.
-   **A Causa (com Provas):** Após adicionar logs de diagnóstico no frontend, descobrimos o que a API do Supabase estava retornando. O log crucial foi: `DEBUG: Profile data object: {..., plan_type: "'pro'", ...}`. O valor para `plan_type` não era `pro`, mas sim `'pro'` (uma string contendo aspas). A causa raiz foi a definição do tipo `ENUM` na migração inicial do banco de dados, que usou aspas triplas (`'''pro'''`), resultando em literais com aspas. A comparação no JavaScript (`plan === 'pro'`) consequentemente sempre falhava.
-   **A Solução:** A correção imediata e segura foi tratar o dado no cliente. Modificamos a linha de código que define a variável do plano para "limpar" a string, removendo as aspas extras: `userPlan = (profile.plan_type || 'free').replace(/'/g, "");`.
-   **Lição:** A fonte de um bug pode não estar na lógica da aplicação, mas nos próprios dados. Quando uma comparação ou condição falha persistentemente apesar de uma lógica aparentemente correta, o próximo passo é **inspecionar os dados brutos** que estão sendo usados na operação. Adicionar logs temporários foi a única forma de descobrir essa inconsistência sutil.

### 16. O Perigo do Schema Desincronizado: Erro de `ON CONFLICT`

-   **O Problema:** As funções de callback do LinkedIn e Twitter começaram a falhar com o erro `there is no unique or exclusion constraint matching the ON CONFLICT specification`.
-   **A Causa:** A investigação revelou que a restrição `UNIQUE` na tabela `social_connections` (nas colunas `user_id, provider`) não existia mais no banco de dados de produção, embora os arquivos de migração locais dissessem que deveria existir. A suspeita é que a restrição foi removida manualmente através do painel do Supabase para permitir o suporte a múltiplas páginas do Facebook, e essa alteração não foi registrada em uma migração.
-   **A Lição:** Alterações manuais no schema do banco de dados de produção são perigosas e levam a uma dessincronização entre o ambiente local e o de produção. Todas as alterações de schema, sem exceção, devem ser feitas através de arquivos de migração para garantir a consistência.
-   **A Solução:**
    1.  Criamos uma nova migração para adicionar uma restrição `UNIQUE` mais flexível: `UNIQUE(user_id, provider, provider_user_id)`.
    2.  Esta nova restrição continua a garantir a unicidade para provedores como LinkedIn e Twitter, mas permite múltiplas entradas para o Facebook, desde que o `provider_user_id` (o ID da página) seja diferente.
    3.  As funções de callback foram atualizadas para usar a nova regra no `onConflict`, resolvendo o problema de forma definitiva e robusta.

### 17. Upload de Vídeo no LinkedIn: Multipart e Versão de API

- **O Problema:** O upload de vídeos para o LinkedIn falhava consistentemente com erros genéricos `500 Internal Server Error` ou `426 NONEXISTENT_VERSION`.
- **A Causa (Dupla):**
    1.  **Tamanho do Arquivo:** A API do LinkedIn exige que vídeos com mais de 4MB sejam enviados em múltiplos pedaços (multipart upload). Tentar enviar um arquivo maior de uma só vez resulta em um erro `500` não descritivo.
    2.  **Versão da API:** A API é sensível à versão (`LinkedIn-Version`). Tentar usar uma versão muito recente (ex: `202509` no início de Setembro de 2025) retorna um erro `426`, pois a versão ainda não está ativa. A versão estável geralmente é a do mês anterior (ex: `202508`).
- **A Solução:**
    1.  Implementar uma lógica que, após a chamada de `initializeUpload`, verifica o número de `uploadInstructions` retornadas.
    2.  Se houver mais de uma instrução, o código deve entrar em um loop, fatiar o arquivo de vídeo (`blob.slice(...)`) para cada parte e fazer um `PUT` para a `uploadUrl` de cada instrução.
    3.  É crucial que a requisição `PUT` para cada pedaço contenha os cabeçalhos `Authorization` e `LinkedIn-Version`.
    4.  Coletar todos os `ETag`s de resposta de cada upload de pedaço e enviá-los na chamada final de `finalizeUpload`.
- **Lição:** Erros genéricos como `500` podem mascarar problemas específicos como limites de tamanho. Sempre verifique os limites da API e implemente o fluxo de multipart quando necessário. Além disso, a versão da API deve ser tratada como uma configuração potencialmente variável, usando sempre a última versão *estável* confirmada.

### 18. Debugging de DOM: Quando `querySelector` Falha Misteriosamente

- **O Problema:** Uma funcionalidade de UI (desabilitar um botão de upload de vídeo ao selecionar uma imagem) falhava consistentemente com o erro `Cannot read properties of null (reading 'querySelector')`. A lógica parecia correta, e a estrutura HTML também, mas o seletor não encontrava o elemento irmão.
- **A Causa (Seletores e Estrutura):** A causa raiz era uma combinação de dois problemas: 1) Um atributo `data-network` foi adicionado desnecessariamente aos elementos filhos, fazendo com que o seletor `closest('[data-network]')` parasse no próprio elemento em vez de subir para o contêiner pai que continha ambos os seletores (imagem e vídeo). 2) A lógica não verificava se o contêiner pai tinha sido encontrado corretamente antes de tentar buscar elementos filhos dentro dele.
- **A Solução Definitiva:**
    1.  **Simplificar o HTML:** Remover os atributos `data-network` redundantes dos elementos internos (`.image-feature`, `.video-feature`), deixando-o apenas no contêiner principal que agrupa um post de rede social.
    2.  **Corrigir o Seletor:** Ajustar o JavaScript para sempre começar a busca a partir do elemento que disparou o evento (o `<input>`) e usar `closest('[data-network]')` para encontrar o contêiner pai de forma confiável.
    3.  **Adicionar Logs de Diagnóstico:** A solução só foi encontrada após adicionar um `console.log(networkCard.innerHTML)` que imprimiu a estrutura HTML exata que o script estava "vendo". Isso imediatamente revelou que o seletor estava pegando o elemento errado.
- **Lição:** Quando a manipulação do DOM falha e a lógica parece correta, a suspeita deve recair sobre os seletores. A ferramenta mais poderosa para depurar isso não é apenas ler o código, mas forçar o script a mostrar o estado do DOM no momento da execução com `console.log` ou `console.dir`. Isso expõe qualquer suposição incorreta sobre a estrutura da página.
---
### 19. Refatoração de UI: O Perigo dos Arquivos Monolíticos

-   **O Problema:** A tentativa de modificar a lógica de um arquivo de UI (`index.astro`) com mais de 800 linhas resultou em erros consistentes e em um fluxo de trabalho frágil. A complexidade do arquivo tornou difícil isolar e substituir blocos de código de forma confiável.
-   **A Causa:** O arquivo se tornou um "monólito", contendo toda a estrutura HTML, a lógica de estado da página e a lógica de renderização de múltiplos sub-componentes (os cards de cada rede social).
-   **A Solução Estratégica:** Em vez de forçar a modificação, a decisão correta foi parar e refatorar. A lógica de renderização de componentes repetidos (como os cards) deve ser extraída para seus próprios módulos de UI (ex: uma função `createSocialPostCard()` em um arquivo `.ts` separado). O arquivo principal então se torna um "orquestrador", importando e chamando esses módulos.
-   **Lição:** Monitore ativamente a complexidade dos arquivos de UI. Quando um arquivo começa a exceder um tamanho razoável (ex: 500 linhas), priorize a refatoração antes de adicionar novas funcionalidades. Um pequeno desvio para limpar o código economiza tempo e previne erros no futuro.
---
### 20. A Saga do Carrossel de Vídeo do Instagram

- **O Problema:** A publicação de carrosséis contendo vídeos no Instagram se mostrou extremamente instável, com a API retornando erros de processamento ou de timeout de forma inconsistente.
- **A Investigação e a Solução:**
    1.  **Documentação Contraditória:** A documentação oficial da Meta é contraditória. Uma parte afirma que carrosséis podem conter vídeos, mas outra seção afirma que `Reels` não são permitidos em carrosséis, sugerindo que o `media_type` para vídeos em carrossel deveria ser `VIDEO`.
    2.  **Falha com `media_type: 'VIDEO'`:** Ao seguir a documentação e usar `media_type: 'VIDEO'`, a API retornava um erro de processamento imediato, tornando a publicação impossível.
    3.  **Sucesso com `media_type: 'REELS'`:** A solução foi descoberta através de testes empíricos. Ao **ignorar a documentação** e usar `media_type: 'REELS'` para **todos** os vídeos, inclusive os que estão dentro de um carrossel, a API passou a aceitar e processar a requisição com sucesso.
    4.  **Tempo de Processamento:** Mesmo com o parâmetro correto, o processamento de carrosséis de vídeo é muito lento. Foi necessário aumentar o tempo de espera (polling) da nossa função para 5 minutos para evitar falhas de timeout, o que se alinhou a uma recomendação encontrada na seção de *Troubleshooting* da própria documentação.
- **Conclusão (Estado Atual):** A funcionalidade de carrossel de vídeo no Instagram **está funcionando**, mas depende de uma implementação que vai contra a documentação oficial. A API se mostra instável e lenta, mas a combinação de `media_type: 'REELS'` para todos os itens de vídeo e um tempo de espera longo (5 minutos) provou ser a solução definitiva.
- **Lição:** A documentação de APIs de terceiros, mesmo as de grandes empresas, pode estar incorreta ou desatualizada. Quando a abordagem documentada falha, a experimentação empírica com parâmetros alternativos é um passo crucial para a depuração. Neste caso, o comportamento real da API era o oposto do que estava documentado.