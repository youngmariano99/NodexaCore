import * as Sentry from "@sentry/nextjs";

import { filtrarDatosSensibles } from "@/lib/sentry/filtrar-datos-sensibles";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
  beforeSend(event) {
    return filtrarDatosSensibles(event);
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
