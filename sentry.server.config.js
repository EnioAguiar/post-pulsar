import * as Sentry from "@sentry/astro";

Sentry.init({
  dsn: "https://d1c3c00b789e94d08c5cdda39a0db1d5@o4510127995682816.ingest.us.sentry.io/4510127998959616",
  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/astro/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
  // Enable logs to be sent to Sentry
  enableLogs: true,
  // Define how likely traces are sampled. Adjust this value in production,
  // or use tracesSampler for greater control.
  tracesSampleRate: 1.0,
});
