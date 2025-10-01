# Testes de API do PostPulsar

Este diretório contém a coleção de testes de API do PostPulsar, usando Postman e Newman.

## Pré-requisitos

Você precisa ter o Node.js e o npm instalados.

## Instalação

Instale o Newman globalmente através do npm:

```sh
npm install -g newman
```

## Como Rodar os Testes

Para executar a suíte de testes, use o seguinte comando na raiz do projeto:

```sh
newman run "api-tests/PostPulsar.postman_collection.json" --environment="api-tests/PostPulsar.postman_environment.json"
```

### Variáveis de Ambiente

O arquivo `PostPulsar.postman_environment.json` contém as variáveis para o teste. Você precisará preencher o valor de `jwt` com um token de autenticação válido antes de rodar.

- `baseUrl`: A URL base para as funções do Supabase (ex: `https://<id-do-projeto>.supabase.co/functions/v1`).
- `jwt`: Um token de autenticação JWT válido de um usuário.
