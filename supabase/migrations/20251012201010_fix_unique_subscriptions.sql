-- Deleta registros de assinaturas duplicados, mantendo apenas o mais recente para cada usuário.
-- Isso é necessário para limpar os dados antes de adicionar uma restrição UNIQUE.
-- A subconsulta identifica o 'ctid' (um identificador de linha físico e único) da linha mais recente
-- para cada 'user_id' e a consulta principal deleta todas as linhas que não correspondem a esse 'ctid'.
DELETE FROM
  public.subscriptions a
WHERE
  a.ctid <> (
    SELECT
      max(b.ctid)
    FROM
      public.subscriptions b
    WHERE
      a.user_id = b.user_id
  );

-- Adiciona uma restrição UNIQUE na coluna 'user_id' da tabela 'subscriptions'.
-- Isso garante que cada usuário possa ter apenas uma única linha de assinatura,
-- prevenindo a criação de duplicatas no futuro.
ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
