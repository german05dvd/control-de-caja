import { useEffect, useState } from 'react';

import {
  checkServerHealth,
  normalizeServerUrl,
  type HealthFailureReason,
  type ServerInfo,
} from '../../app/provisional/server-health';

export type ServerStatus =
  | { phase: 'unset' }
  | { phase: 'checking' }
  | { phase: 'online'; info: ServerInfo }
  | { phase: 'offline'; reason: HealthFailureReason };

/** Espera tras dejar de teclear antes de la primera comprobación. */
const TYPING_DELAY_MS = 600;
/** Cada cuánto se vuelve a comprobar mientras la pantalla está abierta. */
const POLL_INTERVAL_MS = 5000;

/**
 * Comprueba periódicamente si el servidor responde.
 * Provisional (E0): se sustituye por Connectivity + ApiClient en E5/E6.
 */
export function useServerStatus(rawUrl: string): ServerStatus {
  const [status, setStatus] = useState<ServerStatus>({ phase: 'unset' });

  useEffect(() => {
    const baseUrl = normalizeServerUrl(rawUrl);
    if (baseUrl === null) {
      setStatus({ phase: 'unset' });
      return undefined;
    }

    let cancelled = false;
    setStatus({ phase: 'checking' });

    const run = async () => {
      const result = await checkServerHealth(baseUrl);
      if (cancelled) return;
      setStatus(
        result.ok
          ? { phase: 'online', info: result.info }
          : { phase: 'offline', reason: result.reason },
      );
    };

    const firstCheck = window.setTimeout(() => {
      void run();
    }, TYPING_DELAY_MS);
    const polling = window.setInterval(() => {
      void run();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(firstCheck);
      window.clearInterval(polling);
    };
  }, [rawUrl]);

  return status;
}
