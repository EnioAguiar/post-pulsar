import http from "k6/http";
import { check, sleep, group } from "k6";

// --- CONFIGURAÇÃO DO TESTE ---
// As variáveis são carregadas do ambiente.
// Exemplo de como rodar:
// k6 run -e SUPABASE_JWT='seu_jwt' tests/load-test.js

const SUPABASE_URL =
  __ENV.TARGET_URL ||
  "https://wvfooigeytvdcfnzzrrg.supabase.co/functions/v1/pulsar-v1";
const SUPABASE_JWT = __ENV.SUPABASE_JWT;

if (!SUPABASE_JWT) {
  throw new Error(
    "A variável de ambiente SUPABASE_JWT é obrigatória. Use -e SUPABASE_JWT='seu_jwt'",
  );
}

const URL_PARA_TESTAR =
  "https://brainnoises.com/blog/kde-gear-update-spinning-wheels/";
const TEXTO_PARA_TESTAR =
  'O PostPulsar é um micro-SaaS que utiliza IA para resolver o "inferno" do reaproveitamento de conteúdo. Ele transforma um único post de blog em múltiplos formatos de conteúdo para redes sociais (threads do Twitter, posts do LinkedIn, imagens de citação, etc.), economizando horas de trabalho manual para criadores de conteúdo.';

// --- OPÇÕES DO TESTE DE CARGA ---
export const options = {
  // Teste de fumaça: poucos usuários, curta duração, para garantir que tudo funciona.
  scenarios: {
    smoke_test: {
      executor: "constant-vus",
      vus: 3,
      duration: "25s",
    },
  },
  // Limites para o teste falhar (ex: se a taxa de sucesso for menor que 95%)
  thresholds: {
    http_req_failed: ["rate<0.05"], // menos de 5% de falhas
    http_req_duration: ["p(95)<25000"], // 95% das requisições devem ser < 25s
  },
};

// --- O SCRIPT DE TESTE ---
export default function () {
  const headers = {
    Authorization: `Bearer ${SUPABASE_JWT}`,
    "Content-Type": "application/json",
  };

  // Grupo de Cenários: agrupa testes relacionados
  group("Cenário 1: Pulsar a partir de URL", () => {
    const body = JSON.stringify({
      url: URL_PARA_TESTAR,
      targetNetwork: "linkedin", // Teste focado em uma rede
      outputLanguage: "pt-br",
    });

    const res = http.post(SUPABASE_URL, body, { headers: headers });

    check(res, {
      "[URL] Status é 200": (r) => r.status === 200,
      '[URL] Resposta contém "status: success"': (r) =>
        r.body.includes('"status":"success"'),
    });
    sleep(2);
  });

  group("Cenário 2: Pulsar a partir de Texto Manual", () => {
    const body = JSON.stringify({
      rawText: TEXTO_PARA_TESTAR,
      targetNetwork: "twitter", // Teste focado em outra rede
      outputLanguage: "en",
    });

    const res = http.post(SUPABASE_URL, body, { headers: headers });

    check(res, {
      "[Texto] Status é 200": (r) => r.status === 200,
      '[Texto] Resposta contém "status: success"': (r) =>
        r.body.includes('"status":"success"'),
    });
    sleep(2);
  });
}
