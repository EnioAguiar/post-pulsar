# Guia de Contexto do Agente: PostPulsar

Este arquivo contém as diretrizes operacionais e comandos essenciais para trabalhar no projeto PostPulsar.

## Modelo de Desenvolvimento Seguro (SSDLC)

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

## Comandos Essenciais

| Comando         | Ação                                  |
| :-------------- | :------------------------------------ |
| `npm run dev`   | Inicia o servidor de desenvolvimento. |
| `npm run build` | Compila o site para produção.         |

---

## Contexto Adicional do Instagram Graph API

- Conseguimos confirmar o `instagram_business_account_id` para a conta `@post.pulsar`: `17841477743454252`.
- Encontramos o `media_id` para a postagem `https://www.instagram.com/post.pulsar/p/DQC5uM7Elui/`: `18048830786357807`.
- Realizamos uma chamada de API bem-sucedida para obter os insights dessa mídia usando a permissão `instagram_business_manage_insights` (que é a permissão correta para o fluxo "Instagram API with Instagram Login").
- O erro `Solicitação de parâmetros inválida: Invalid platform app` no fluxo de autorização foi resolvido ajustando os escopos para o fluxo **"Instagram API with Instagram Login"**, utilizando **`instagram_business_manage_insights`** (e removendo `pages_read_engagement`, `pages_show_list`).
- Para obter o "Acesso Avançado" à permissão `instagram_business_manage_insights` na Meta, é necessário:
  1. Fazer uma chamada bem-sucedida à API com a permissão (o que fizemos).
  2. Aguardar aproximadamente 24 horas para que o contador de uso no painel da Meta seja atualizado.
  3. O botão para "solicitar" o Acesso Avançado deve ser liberado.
  4. Passar pelo processo de App Review da Meta.
