/**
 * PROVISIONAL (etapa E0). Comprueba que el servidor responde en GET /health.
 * Se elimina en E6, cuando exista el ApiClient real (apps/mobile/src/sync/api-client.ts).
 * Vive en src/app/ (y no en features/) porque las pantallas no pueden usar fetch directamente.
 */

export interface ServerInfo {
  version: string;
  apiVersion: number | null;
  serverTime: string | null;
}

export type HealthFailureReason = 'network' | 'timeout' | 'http' | 'invalid';

export type HealthResult =
  { ok: true; info: ServerInfo } | { ok: false; reason: HealthFailureReason };

export interface HealthOptions {
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

/**
 * Convierte lo que escribe la persona en una URL base limpia (sin barra final).
 * Devuelve null si está vacío o no es una dirección válida.
 */
export function normalizeServerUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.hostname === '') return null;
    return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return null;
  }
}

function parseServerInfo(body: unknown): ServerInfo | null {
  if (typeof body !== 'object' || body === null) return null;
  const record = body as Record<string, unknown>;
  if (typeof record.version !== 'string') return null;

  return {
    version: record.version,
    apiVersion: typeof record.apiVersion === 'number' ? record.apiVersion : null,
    serverTime: typeof record.time === 'string' ? record.time : null,
  };
}

export async function checkServerHealth(
  baseUrl: string,
  options: HealthOptions = {},
): Promise<HealthResult> {
  const { timeoutMs = 4000, fetchFn = fetch } = options;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchFn(`${baseUrl}/health`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return { ok: false, reason: 'http' };

    const info = parseServerInfo(await response.json());
    if (info === null) return { ok: false, reason: 'invalid' };
    return { ok: true, info };
  } catch (error) {
    if (timedOut) return { ok: false, reason: 'timeout' };
    if (error instanceof SyntaxError) return { ok: false, reason: 'invalid' };
    return { ok: false, reason: 'network' };
  } finally {
    clearTimeout(timer);
  }
}
