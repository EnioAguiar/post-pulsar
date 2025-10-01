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

After a user has generated content and selected a specific Facebook Page using the `pages_show_list` permission, they must take the explicit action of clicking our "Publish" button.

Upon this user command, our application uses the `pages_manage_posts` permission to programmatically publish the user-approved content directly to their chosen Facebook Page. Our app only uses this permission to *create* new posts; we do not use the edit or delete functionalities.

This permission is fundamental to our app's value proposition. Without it, users would not be able to publish their generated content to Facebook, rendering our tool incomplete for Facebook Page managers.
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

```text
Here are the testing credentials for our application, PostPulsar:

URL: https://postpulsar.com/login
Email: metareviewer@postpulsar.com
Password: StrongPasswordForMetaReview2025!

**Instructions:**

1.  Log in to PostPulsar using the credentials above.
2.  Navigate to the **"Connections"** page to link accounts OR to the **Dashboard** to test publishing.

**To Test `pages_show_list` and `pages_manage_posts`:**
1. Connect a Facebook account that manages at least two Pages.
2. Go to the main Dashboard and create a post.
3. Select the Facebook network checkbox.
4. Click the **"Select Page"** button. A modal will open, listing all the Facebook Pages you manage. (This demonstrates `pages_show_list`).
5. Select a page from the list and click the **"Publish"** button. (This demonstrates `pages_manage_posts`).

**To Test `instagram_basic`:**
1.  On the "Connections" page, click **"Link Instagram Account"** and follow the Meta login flow.
2.  **IMPORTANT:** After redirection, you will see the Instagram account's **Profile Picture and Name** displayed on the "Connections" page, demonstrating our use of this permission.

**To Test `instagram_content_publish`:**
1.  Ensure an Instagram account is connected.
2.  Navigate to the main **Dashboard**, generate a post, and select the Instagram account.
3.  Click the **"Publish"** button. The app will then use the permission to post the content.
```

---

## 4. Roteiros para os Screencasts

### Roteiro para `pages_show_list` + `pages_manage_posts`

**Foco:** Provar o fluxo completo de publicação no Facebook: selecionar a página e postar.

1.  **Início:** Comece no dashboard (`/app`), com a conta do Facebook já conectada.
2.  **Criação:** Gere um post de exemplo.
3.  **Seleção de Rede:** Marque a caixa de seleção do Facebook.
4.  **Prova (pages_show_list):** Clique em "Select Page". O modal com a lista de Páginas do Facebook irá aparecer. **Destaque esta lista.** Narre: *"Our app uses the `pages_show_list` permission to display a list of the user's managed pages, allowing them to choose a destination."*
5.  **Escolha:** Clique em uma das páginas da lista para selecioná-la.
6.  **Prova (pages_manage_posts):** A interface mostra a página selecionada. **Dê um zoom no botão "Publish".** Narre: *"Now that a page is selected, the user will click Publish. Our app will use the `pages_manage_posts` permission to post the content."*
7.  **Publicação:** Clique em "Publish" e mostre o indicador de sucesso.
8.  **Verificação Final:** Mude para a aba do Facebook, vá para a página que você selecionou, atualize e **mostre o novo post na timeline.** Narre: *"The post has been successfully published to the chosen page, demonstrating the correct use of the permission."*

### Roteiro para `instagram_basic`

**Foco:** Provar que você usa os dados do perfil para confirmação visual.

1.  **Início:** Comece na página `/app/connections`, mostrando o botão "Link Instagram Account".
2.  **Fluxo Meta:** Clique no botão, mostre o login da Meta, aprove as permissões.
3.  **Redirecionamento e Prova:** Ao voltar para `/app/connections`, **dê um zoom e destaque o card da conexão do Instagram, que agora mostra a foto de perfil e o nome da conta.** Narre em inglês: *"After connecting, the app uses the `instagram_basic` permission to display the user's profile picture and name, so they can visually verify the correct account is linked."*

### Roteiro para `instagram_content_publish`

**Foco:** Provar que a publicação é uma ação explícita do usuário.

1.  **Início:** Comece no dashboard principal (`/app`), com a conta já conectada.
2.  **Criação:** Gere um post e anexe uma imagem de exemplo.
3.  **Seleção:** Marque a caixa de seleção do Instagram.
4.  **Ação Explícita:** **Dê um zoom no botão "Publish"** antes de clicar. Narre em inglês: *"The user has approved this content and will now explicitly click Publish. Our app will now use the `instagram_content_publish` permission."*
5.  **Publicação:** Clique em "Publish" e mostre o indicador de sucesso.
6.  **Verificação Final:** Mude para a aba do Instagram, atualize a página e **mostre o novo post que acabou de aparecer no perfil.** Narre: *"The post has been successfully published, demonstrating the correct use of the permission."*

---

## 5. Anexo: Fluxo de Dados da Permissão `instagram_basic`

1.  **Solicitação (Frontend):** O usuário clica em "Link Instagram Account".
2.  **Autorização (Meta):** O usuário aprova a solicitação.
3.  **Busca dos Dados (Backend):** Nossa função de callback (`instagram-auth-callback`) usa o código de autorização para obter um `access_token` e, com ele, busca o `username` e `profile_picture_url` do usuário.
4.  **Armazenamento (Backend):** A função salva esses dados na nossa tabela `social_connections`.
5.  **Exibição (Frontend):** A página de Conexões lê os dados do nosso banco e os exibe para o usuário.
