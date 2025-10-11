# Guia para Submissão à Meta (Foco: Threads)

Este documento contém todo o material necessário para a submissão de análise do aplicativo para a integração com o Threads. A estratégia é criar uma justificativa e um vídeo focado exclusivamente nas permissões do Threads para simplificar o processo de revisão.

## 1. Lista de Permissões

- **Threads:** `threads_basic`, `threads_content_publish`

---

## 2. Textos de Justificativa (Em Inglês)

### Justificativa Geral (Para a Descrição Principal)

```text
Our application, PostPulsar, is a productivity tool for content creators. Its core purpose is to allow a user to generate and publish content to their social media accounts. This submission is specifically for our integration with Threads.

To provide a seamless experience, we request two permissions that work together in a clear user flow. Each permission is essential for a specific step in the user journey, as detailed below and demonstrated in the screencast.
```

### Justificativa Específica para `threads_basic`

```text
Our application uses the `threads_basic` permission to fetch the user's Threads account name.

This information is then displayed within our app on the "Connections" page immediately after the user successfully links their account.

The purpose of displaying this data is to provide essential feedback to the user. It allows them to visually verify that they have connected the correct account. This is a critical step that prevents users from accidentally publishing content to the wrong profile, thereby ensuring a secure and reliable user experience.
```

### Justificativa Específica para `threads_content_publish`

```text
The `threads_content_publish` permission is the core of our Threads integration.

Our app allows users to generate, edit, and approve content. This permission is used exclusively when the user takes the explicit action of clicking the "Publish" button for a post designated for their Threads account.

The user flow is as follows:
1. The user creates or generates content within our app's dashboard.
2. They select their linked Threads account as a destination.
3. They explicitly click "Publish".

Upon this user command, our backend uses the `threads_content_publish` permission to programmatically post the user-approved content to their Threads profile. Without this permission, the primary value of our tool for Threads users would be impossible.
```

---

## 3. Instruções para o Revisor (Testing Instructions)

**IMPORTANT: Please use a fresh, new test user for this review to ensure the full permission consent screen is displayed.**

**Login Credentials:**
* **URL:** https://www.post-pulsar.com/login
* **Email:** meta-threads-review@post-pulsar.com
* **Password:** MetaReview2025!

**Test Account for Meta:**
* Please use a Meta test account (with Threads enabled) that has **never** been connected to our app before.

**Instructions:**
Follow the short, end-to-end screencast provided. The video will guide you through the entire flow for the Threads integration:
1. Logging into our app with the new credentials.
2. Navigating to the "Connections" page.
3. Connecting a Threads account and showing the permission grant screen.
4. Verifying the connection on our UI.
5. Navigating to the Dashboard to create and publish a post to Threads.
6. Verifying the final post on threads.net.

---

## 4. Roteiro para o Screencast (Foco: Threads)

**Foco:** Um fluxo contínuo e didático, provando cada permissão do Threads em um único vídeo curto.

**Preparação Crítica:**
1.  **Use um novo usuário de teste no PostPulsar:** `meta-threads-review@post-pulsar.com`.
2.  **Use uma conta de teste da Meta que NUNCA tenha sido conectada ao PostPulsar antes.**

---

### Roteiro do Vídeo

1.  **Início:** Comece na página de login do PostPulsar (`/login`).
    *   **Legenda:** *"This screencast demonstrates the end-to-end functionality for the requested Threads permissions."*

2.  **Login:** Faça login com a **nova conta de teste** (`meta-threads-review@post-pulsar.com`).
    *   **Legenda:** *"The user logs into their PostPulsar account."*

3.  **Navegar para Conexões:** Vá para a página `/app/connections`.
    *   **Legenda:** *"The user navigates to the 'Connections' page to link their Threads account."*

4.  **Iniciar Conexão com Threads:** Clique em "Link Threads Account".
    *   **Legenda:** *"The user starts the connection process for Threads."*

5.  **PROVA (Concessão de Permissões do Threads):**
    *   A janela de login da Meta aparece. Faça o login com a conta de teste.
    *   **MOMENTO CRÍTICO:** A tela de consentimento da Meta aparecerá. **PAUSE O VÍDEO. DÊ UM ZOOM SIGNIFICATIVO** na lista de permissões. Use o mouse para apontar para `threads_basic` e `threads_content_publish`.
    *   **Legenda:** *"CRITICAL STEP: The user is now granting the required permissions. As you can see, the app is requesting `threads_basic` to verify the account and `threads_content_publish` to publish content."*
    *   Clique para aprovar as permissões.

6.  **PROVA (`threads_basic`):**
    *   De volta à página de Conexões, a conta do Threads está conectada.
    *   **DÊ UM ZOOM no card da conexão do Threads**, mostrando claramente o nome da conta.
    *   **Legenda:** *"After connecting, our app uses the `threads_basic` permission to display the user's name. This provides essential visual feedback, confirming they've linked the correct account."*

7.  **Ir para o Dashboard e Gerar Conteúdo:**
    *   Navegue para o dashboard (`/app`). Crie um post de exemplo.
    *   **Legenda:** *"Now, the user will generate content to be published to Threads."*

8.  **Preparar para Publicar:**
    *   Marque a caixa de seleção do **Threads**.
    *   **Legenda:** *"The user selects Threads as the destination for the post."*

9.  **PROVA (`threads_content_publish`):**
    *   Clique no botão **"Publish"**.
    *   Enquanto o modal de progresso é exibido, a legenda deve explicar.
    *   **Legenda:** *"By clicking 'Publish', the user gives an explicit command. Our app now uses the `threads_content_publish` permission to post the approved content to their Threads profile."*

10. **Verificação Externa:**
    *   Após o sucesso, abra uma **nova aba** e navegue até o perfil do Threads (`threads.net`). Atualize e **mostre o novo post**.
    *   **Legenda:** *"The post has been successfully published to Threads, confirming the correct use of the publishing permission."*

11. **Verificação Interna (Opcional):**
    *   **Volte para a aba do PostPulsar.** Navegue para a página `/app/history`.
    *   **DÊ UM ZOOM na lista de histórico**, mostrando o post que acabou de ser publicado.
    *   **Legenda:** *"Finally, the app saves a record of the publication to the user's history."*

---

## 5. Anexo: Fluxo de Dados da Permissão `threads_basic`

1.  **Solicitação (Frontend):** O usuário clica em "Link Threads Account".
2.  **Autorização (Meta):** O usuário aprova a solicitação.
3.  **Busca dos Dados (Backend):** Nossa função de callback (`threads-auth-callback`) usa o código de autorização para obter um `access_token` e, com ele, busca o `username` do usuário.
4.  **Armazenamento (Backend):** A função salva esses dados na nossa tabela `social_connections`.
5.  **Exibição (Frontend):** A página de Conexões lê os dados do nosso banco e os exibe para o usuário.

---

## 6. Histórico de Submissão

- **Facebook & Instagram:** As permissões para Facebook (`pages_show_list`, `pages_manage_posts`, `pages_read_engagement`) e Instagram (`instagram_basic`, `instagram_content_publish`) foram aprovadas em 08/10/2025 após uma submissão com um vídeo único e detalhado.
- **Threads (Estratégia Atual):** Para simplificar o processo de revisão, esta submissão foca exclusivamente na integração com o Threads, com seu próprio vídeo e justificativas dedicadas.