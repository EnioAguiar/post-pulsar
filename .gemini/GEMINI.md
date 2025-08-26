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
