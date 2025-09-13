import http from 'k6/http';
import { check, sleep } from 'k6';

// --- CONFIGURAÇÃO DO TESTE ---
// O usuário precisa preencher estas variáveis
const SUPABASE_URL = 'https://wvfooigeytvdcfnzzrrg.supabase.co/functions/v1/pulsar-v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsImtpZCI6InZmVkF6WEZDeWJYcXpPYTAiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3d2Zm9vaWdleXR2ZGNmbnp6cnJnLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJlZGFmYjRkOS00YzMxLTQzNGYtYjE5ZS03MDFmMDA2ODM4ZmQiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU3NzkxNjE3LCJpYXQiOjE3NTc3ODgwMTcsImVtYWlsIjoid3cuZW5pb2FndWlhckBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIiwiZ29vZ2xlIl19LCJ1c2VyX21ldGFkYXRhIjp7ImF2YXRhcl91cmwiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NMOUNUd2M3eVk2LXRpaGNBQzlnUHd4dGJ5X0dfblh4d0RfZ1BUcUZGdGMtS2ZSNnpjPXM5Ni1jIiwiZW1haWwiOiJ3dy5lbmlvYWd1aWFyQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmdWxsX25hbWUiOiJFbmlvIEFndWlhciIsImlzcyI6Imh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbSIsIm5hbWUiOiJFbmlvIEFndWlhciIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0w5Q1R3Yzd5WTYtdGloY0FDOWdQd3h0YnlfR19uWHh3RF9nUFRxRkZ0Yy1LZlI2emM9czk2LWMiLCJwcm92aWRlcl9pZCI6IjExNDgyMzA4NzkxNDMwOTc0NTU5MyIsInN1YiI6IjExNDgyMzA4NzkxNDMwOTc0NTU5MyJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6Im9hdXRoIiwidGltZXN0YW1wIjoxNzU3NzEwOTg0fV0sInNlc3Npb25faWQiOiIyYWUzZTE2MC05MWNlLTRmZGQtYjNkZS1kYzczNDhhMGEwMzAiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.lyJdNWVUq9sLwcQvhXbpApRVBKDNQvE6IhzoRqkMyPg'; // Ou um JWT de teste de um usuário
const URL_PARA_TESTAR = 'https://brainnoises.com/blog/kde-gear-update-spinning-wheels/'; // Um artigo público para o teste

// --- OPÇÕES DO TESTE DE CARGA ---
export const options = {
  // 'vus' é o número de "usuários virtuais" que farão as requisições simultaneamente
  vus: 5,
  // 'duration' é o tempo total que o teste irá durar
  duration: '20s',
};

// --- O SCRIPT DE TESTE ---
// Esta é a função que cada usuário virtual irá executar repetidamente
export default function () {
  const headers = {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  const body = JSON.stringify({
    url: URL_PARA_TESTAR,
    // Deixe os outros parâmetros em branco para usar os padrões da função
    customPrompt: '',
    outputLanguage: 'pt-br',
    charLimits: {
        linkedin: 0,
        twitter: 0,
        instagram: 0,
        threads: 0,
        facebook: 0
    }
  });

  // Executa a requisição POST para a sua Edge Function
  const res = http.post(SUPABASE_URL, body, { headers: headers });

  // Verifica se a requisição foi bem-sucedida (status 200)
  check(res, {
    'status é 200': (r) => r.status === 200,
    'resposta contém "posts"': (r) => r.body.includes('posts'),
  });

  // Pausa por 1 segundo antes de fazer a próxima requisição
  sleep(1);
}
