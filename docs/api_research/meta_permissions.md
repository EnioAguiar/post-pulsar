# Guia para Submissão à Meta (Pós-Rejeição)

Este documento contém todo o material necessário para a próxima submissão de análise do aplicativo à Meta, com base no feedback recebido. A estratégia é criar uma justificativa e um vídeo focado para CADA permissão.

## 1. Lista de Permissões (Corrigida)

- **Facebook:** `pages_show_list`, `pages_manage_posts`
- **Instagram:** `instagram_basic`, `instagram_content_publish`
- **Threads:** `threads_basic`, `threads_content_publish`

---

## 2. Textos de Justificativa (Em Inglês)

### Justificativa Geral (Para a Descrição Principal)

```text
Our application, PostPulsar, is a productivity tool for content creators. Its core purpose is to allow a user to transform a single piece of content into multiple, optimized posts for their social media accounts, including Facebook Pages, Instagram Business, and Threads.

To provide a seamless and automated experience, we request a set of permissions that work together in a clear user flow. Each permission is essential for a specific step in the user journey, as detailed in the individual permission justifications.
```

### Justificativa Específica para `pages_show_list`

```text
The `pages_show_list` permission is essential for our application to function for users who manage one or more Facebook Pages.

We use this permission solely to retrieve a list of the Facebook Pages that the user administers. This list is then presented to the user within our app's dashboard in a dropdown selector right before publishing.

The user flow is as follows:
1. The user connects their Facebook account.
2. They create content within our app.
3. When they choose to publish to Facebook, our interface displays a selector populated with the list of their pages, which was fetched using `pages_show_list`.
4. The user **must select a specific page** from this list as the destination for their post.

This permission is critical because many of our users manage multiple pages. It empowers them to choose the correct destination for each post, preventing errors and giving them full control over their content. Without it, our app cannot function correctly.
```

### Justificativa Específica para `pages_manage_posts`

```text
The `pages_manage_posts` permission is the final and most critical step in our app's core workflow for Facebook.

After a user has generated content and selected a specific Facebook Page, they must take the explicit action of clicking our "Publish" button.

Upon this user command, our application uses `pages_manage_posts` to programmatically publish the user-approved content. Immediately following this, we use `pages_read_engagement` to verify the post's creation and retrieve its ID, ensuring a reliable and complete user experience. Our app only uses this permission to *create* new posts.

This permission is fundamental to our app's value proposition. Without it, users would not be able to publish their content to Facebook.
```

### Justificativa Específica para `pages_read_engagement`

```text
Our application uses the `pages_read_engagement` permission as a direct functional prerequisite to ensure the reliability of our core feature, which is handled by `pages_manage_posts`.

Our workflow is as follows:
1. A user creates and approves content within our app.
2. They click "Publish", and our app uses `pages_manage_posts` to send the content to their selected Facebook Page.
3. **Immediately after publishing, our app requires `pages_read_engagement` to make a lightweight API call to retrieve the ID and basic details of the newly created post.**

This final verification step is critical for two reasons:
- **To Confirm Success:** It allows us to definitively confirm to the user that their post was successfully published on Facebook, preventing duplicate posts caused by uncertainty.
- **For User History:** We save the ID of the published post in the user's history within our app. This allows them to keep a record of what was posted and provides a reference for future content management.

Without `pages_read_engagement`, we cannot reliably verify a publication or log its result, leading to a poor and untrustworthy user experience.
```

### Justificativa Específica para `instagram_basic`

```text
Our application uses the `instagram_basic` permission to fetch the user's Instagram professional account name and profile picture.

This information is then displayed within our app on the "Connections" page immediately after the user successfully links their account.

The purpose of displaying this data is to provide essential feedback to the user. It allows them to visually verify that they have connected the correct account. This is a critical step that prevents users from accidentally publishing content to the wrong profile, thereby ensuring a secure and reliable user experience.
```

### Justificativa Específica para `instagram_content_publish`

```text
The `instagram_content_publish` permission is the core feature of our application, PostPulsar.

Our app allows users to generate, edit, and approve content for their social media. This permission is used exclusively when the user takes the explicit action of clicking the "Publish" button for a post designated for their Instagram account.

The user flow is as follows: 
1. The user creates or generates content within our app's dashboard.
2. They can edit the text and attach media (images/videos).
3. They select their linked Instagram account as a destination.
4. They explicitly click "Publish".

Upon this user command, our backend uses the `instagram_content_publish` permission to programmatically post the user-approved content to their Instagram profile. Without this permission, the primary value proposition of our productivity tool—to save creators time by publishing their content—would be impossible.
```

---

## 3. Instruções para o Revisor (Testing Instructions)

**IMPORTANT: Please use a fresh, new test user for this review. Do not reuse previous test accounts. This is critical to ensure the full permission consent screen is displayed.**

**Login Credentials:**
* **URL:** https://www.post-pulsar.com/login
* **Email:** meta-review-4@post-pulsar.com
* **Password:** MetaReview2025!

**Test Account for Meta:**
* Please use a Meta test account (Facebook/Instagram) that has **never** been connected to our app before.

**Instructions:**
Follow the single, end-to-end screencast provided. The video will guide you through:
1. Logging into our app with the new credentials.
2. Navigating to the "Connections" page.
3. Connecting both a Facebook Page and an Instagram account, showing the permission grant screens for each.
4. Verifying the connections on our UI.
5. Navigating to the Dashboard to create and publish content.
6. Demonstrating the use of each requested permission in a single, continuous workflow.
7. Verifying the final posts on facebook.com and instagram.com.
8. Verifying the post history inside our app.

---

## 4. Roteiro para o Screencast Único (4ª Tentativa)

**Foco:** Um fluxo contínuo e didático, provando cada permissão na ordem correta, em um único vídeo.

**Preparação Crítica:**
1.  **Use um novo usuário de teste no PostPulsar:** `meta-review-4@post-pulsar.com`.
2.  **Use uma conta de teste do Facebook/Instagram que NUNCA tenha sido conectada ao PostPulsar antes.** Isso é obrigatório para forçar a aparição da tela de consentimento inicial.

---

### Roteiro do Vídeo

1.  **Início:** Comece na página de login do PostPulsar (`/login`).
    *   **Legenda:** *"This single screencast demonstrates the end-to-end functionality for all requested Meta permissions. The flow starts on the app's login page."*

2.  **Login:** Faça login com a **nova conta de teste** (`meta-review-4@post-pulsar.com`).
    *   **Legenda:** *"The user logs into their new PostPulsar account."*

3.  **Navegar para Conexões:** Vá para a página `/app/connections`.
    *   **Legenda:** *"The user navigates to the 'Connections' page to link their social accounts."*

4.  **Iniciar Conexão com Facebook:** Clique em "Link Facebook Account".
    *   **Legenda:** *"First, the user will connect their Facebook account to manage their Pages."*

5.  **PROVA (Concessão de Permissões do Facebook):**
    *   A janela de login da Meta aparece. Faça o login com a conta de teste do Facebook.
    *   **MOMENTO CRÍTICO:** A tela de consentimento da Meta aparecerá. **PAUSE O VÍDEO. DÊ UM ZOOM SIGNIFICATIVO** na lista de permissões. Use o mouse para apontar para `pages_show_list`, `pages_manage_posts`, e `pages_read_engagement`.
    *   **Legenda:** *"CRITICAL STEP: The user is now granting the required permissions. As you can see, the app is requesting `pages_show_list` to list the user's pages, `pages_manage_posts` to publish content, and `pages_read_engagement` to verify the publication."*
    *   Clique para aprovar as permissões.

6.  **Iniciar Conexão com Instagram:** De volta à página de Conexões, **imediatamente** clique em "Link Instagram Account".
    *   **Legenda:** *"Next, the user connects their Instagram account."*

7.  **PROVA (Concessão de Permissões do Instagram):**
    *   A janela da Meta aparece novamente.
    *   **PAUSE O VÍDEO. DÊ UM ZOOM SIGNIFICATIVO** na lista de permissões. Use o mouse para apontar para `instagram_basic` (ou `instagram_business_basic`) e `instagram_content_publish`.
    *   **Legenda:** *"The user now grants the Instagram permissions: `instagram_basic` to verify the account, and `instagram_content_publish` to post content."*
    *   Clique para aprovar.

8.  **PROVA (`instagram_basic`):**
    *   De volta à página de Conexões, ambas as contas estão conectadas.
    *   **DÊ UM ZOOM no card da conexão do Instagram**, mostrando claramente a foto de perfil e o nome da conta.
    *   **Legenda:** *"After connecting, our app uses the `instagram_basic` permission to display the user's profile picture and name. This provides essential visual feedback, confirming they've linked the correct account."*

9.  **Ir para o Dashboard e Gerar Conteúdo:**
    *   Navegue para o dashboard (`/app`). Crie um post de exemplo.
    *   **Legenda:** *"Now, the user will generate content to be published."*

10. **PROVA (`pages_show_list`):**
    *   Marque a caixa de seleção do **Facebook**. Clique no botão "Select Page".
    *   **DÊ UM ZOOM no modal que aparece**, mostrando a lista de Páginas do Facebook.
    *   **Legenda:** *"Our app now uses the `pages_show_list` permission to fetch and display a list of the user's managed pages, allowing them to choose a destination."*
    *   Selecione uma página da lista.

11. **Preparar para Publicar:**
    *   Marque a caixa de seleção do **Instagram**. Anexe uma imagem ao post do Instagram.
    *   **Legenda:** *"The user prepares the content for both Facebook and Instagram and will now publish to both simultaneously."*

12. **PROVA (`pages_manage_posts` e `instagram_content_publish`):**
    *   Clique no botão **"Publish All"**.
    *   Enquanto o modal de progresso é exibido, a legenda deve explicar.
    *   **Legenda:** *"By clicking 'Publish All', the user gives an explicit command. Our app now uses the `pages_manage_posts` and `instagram_content_publish` permissions to post the approved content to the selected destinations."*

13. **Verificação Externa:**
    *   Após o sucesso, abra uma **nova aba** e navegue até a Página do Facebook selecionada. Atualize e **mostre o novo post**.
    *   Abra **outra nova aba** e navegue até o perfil do Instagram. Atualize e **mostre o novo post**.
    *   **Legenda:** *"The posts have been successfully published to both Facebook and Instagram, confirming the correct use of the publishing permissions."*

14. **PROVA FINAL (`pages_read_engagement`):**
    *   **Volte para a aba do PostPulsar.** Navegue para a página `/app/history`.
    *   **DÊ UM ZOOM na lista de histórico**, mostrando claramente os dois posts que acabaram de ser publicados.
    *   **Legenda:** *"FINAL STEP: Immediately after publishing, the app uses `pages_read_engagement` to verify the post's creation and saves it to the user's history, as shown here. This provides a record for the user and confirms the publication was successful."*

---

## 5. Anexo: Fluxo de Dados da Permissão `instagram_basic`

1.  **Solicitação (Frontend):** O usuário clica em "Link Instagram Account".
2.  **Autorização (Meta):** O usuário aprova a solicitação.
3.  **Busca dos Dados (Backend):** Nossa função de callback (`instagram-auth-callback`) usa o código de autorização para obter um `access_token` e, com ele, busca o `username` e `profile_picture_url` do usuário.
4.  **Armazenamento (Backend):** A função salva esses dados na nossa tabela `social_connections`.
5.  **Exibição (Frontend):** A página de Conexões lê os dados do nosso banco e os exibe para o usuário.

---

## 6. Histórico de Rejeição e Ações Corretivas

### 1ª e 2ª Tentativas
- **Feedback:** Justificativas insuficientes.
- **Ação:** As justificativas em texto para cada permissão foram completamente reescritas para serem mais detalhadas e alinhadas com os casos de uso.

### 3ª Tentativa (06/10/2025)
- **Feedback:** "Screencast Not Aligned with Use Case Details" para todas as permissões.
- **Análise:** Os dois vídeos separados (`Instagram_caption.mp4`, `facebook_caption.mp4`) não foram suficientes. A análise concluiu que os vídeos falharam em:
    1.  **Mostrar a Tela de Consentimento Inicial:** Por reutilizar contas de teste, a tela de "Reconectar" foi mostrada em vez da tela de concessão de permissões, que é um passo exigido pelo revisor.
    2.  **Provar `pages_read_engagement`:** O fluxo não mostrou o post aparecendo na página de "Histórico" do aplicativo, que era a justificativa principal para essa permissão.
    3.  **Criar um Fluxo "End-to-End":** A separação em dois vídeos quebrou a narrativa de um fluxo único e contínuo.
- **Ação Corretiva (4ª Tentativa):**
    1.  **Unificar os Screencasts:** Criar um único vídeo que demonstre todas as permissões em um fluxo contínuo.
    2.  **Garantir Estado Limpo:** Usar uma conta de teste da Meta e um usuário do PostPulsar completamente novos para forçar a exibição da tela de consentimento inicial.
    3.  **Detalhar Provas Visuais:** O novo roteiro (Seção 4) inclui pausas, zooms e legendas explícitas para cada permissão, incluindo a etapa final de verificação na página de Histórico do aplicativo.

### 4ª Tentativa (08/10/2025)
- **Resultado:** APROVADO.
- **Análise:** A estratégia de criar um único vídeo, com um fluxo contínuo, usando contas de teste completamente novas e destacando visualmente cada permissão sendo concedida e usada foi bem-sucedida. As justificativas detalhadas e o roteiro preciso foram essenciais para a aprovação.
