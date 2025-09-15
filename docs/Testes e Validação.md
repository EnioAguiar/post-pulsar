# Testes e Validação do PostPulsar

Este documento descreve a estratégia e as ferramentas utilizadas para garantir a estabilidade, performance e correção da aplicação PostPulsar antes do lançamento e durante o desenvolvimento contínuo.

## 1. Estratégia de Testes

A nossa estratégia é baseada em três pilares principais, conforme o guia inicial em `validador`:

1.  **Teste de Carga e Estresse:** Simular múltiplos usuários simultâneos para encontrar gargalos de performance e limites de APIs de terceiros.
2.  **Validação de Endpoints:** Garantir que cada API (Edge Function) se comporta como esperado, retornando os dados e os códigos de status corretos.
3.  **Testes de Ponta a Ponta (E2E):** Simular a jornada completa de um usuário real na interface para validar os fluxos críticos (login, geração de post, etc.).

## 2. Teste de Carga com k6

O primeiro pilar implementado foi o teste de carga, utilizando a ferramenta **k6** por sua simplicidade e eficiência.

- **Ferramenta:** [k6 (by Grafana Labs)](https://k6.io/)
- **Arquivo de Script:** `tests/load-test.js`
- **Foco do Teste:** A função mais crítica e complexa do sistema, `pulsar-v1`.

### 2.1. Configuração

1.  **Instalação:** O k6 precisa ser instalado no sistema operacional. Para sistemas Debian/Ubuntu, os comandos são:

    ```bash
    sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
    echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
    sudo apt-get update
    sudo apt-get install k6
    ```

2.  **Autenticação:** O teste precisa simular um usuário autenticado. Para isso, é necessário um **JSON Web Token (JWT)**.
    - **Obtenção do JWT:** Faça login na aplicação, abra as Ferramentas de Desenvolvedor (F12), vá para `Application > Local Storage`, encontre a chave `sb-<project_id>-auth-token` e copie o valor da propriedade `access_token`.
    - **Configuração do Script:** Cole o JWT copiado na variável `SUPABASE_ANON_KEY` dentro do arquivo `tests/load-test.js`.

### 2.2. Execução

Com o k6 instalado e o script configurado, o teste é executado com um único comando a partir da raiz do projeto:

```bash
k6 run tests/load-test.js
```

O script atual simula 5 usuários simultâneos fazendo requisições para a função `pulsar-v1` durante 20 segundos.

## 3. Descobertas Iniciais (Sessão de 13/09/2025)

A primeira execução dos testes de carga foi fundamental e nos permitiu diagnosticar uma série de problemas em cascata:

1.  **Falha de Permissão (RLS):** O teste inicial, usando a chave anônima (`anon key`), falhou 100% das vezes. Isso validou que nossas políticas de Row-Level Security estavam funcionando corretamente, impedindo o acesso de usuários não autenticados.

2.  **Link Quebrado:** Após corrigir a autenticação usando um JWT, os testes continuaram a falhar. A análise dos logs da função revelou o erro `Failed to fetch URL: Not Found`. Descobrimos que a URL usada no script de teste estava quebrada.

3.  **Limite de Taxa da API (Causa Raiz):** Com a URL corrigida, o teste finalmente conseguiu executar a função por completo. Os resultados mostraram que a função retornava `200 OK`, mas com um corpo de resposta vazio e tempos de resposta muito altos (picos de 12 segundos). A análise final dos logs da função revelou o erro definitivo: `[429 Too Many Requests] You exceeded your current quota`. Isso confirmou que o plano gratuito da API Gemini tem um limite de requisições por minuto muito baixo, que era rapidamente atingido pelo nosso teste de carga.

### 3.1. Solução

A solução para o problema de limite de taxa é **ativar o faturamento no projeto do Google AI Studio** para mover a conta da API para um plano com limites mais altos.

## 4. Próximos Passos

- [ ] Ativar o faturamento da API Gemini e re-executar o teste de carga para confirmar que todos os checks passam.
- [ ] Aumentar gradualmente o número de usuários virtuais (`vus`) no script do k6 para encontrar o ponto de quebra da aplicação.
- [ ] Implementar testes de ponta a ponta (E2E) com **Playwright** para simular fluxos de usuário completos.
- [ ] Criar uma coleção no **Postman** e usar **Newman** para validar a correção de todos os endpoints da API a cada deploy.
