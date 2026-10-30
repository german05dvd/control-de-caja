import { describe, expect, it } from 'vitest';

import { checkServerHealth, normalizeServerUrl } from './server-health';

type FetchImpl = (url: string, init?: RequestInit) => Promise<Response>;

function stubFetch(impl: FetchImpl): typeof fetch {
  return impl as unknown as typeof fetch;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('normalizeServerUrl', () => {
  it('devuelve null si está vacío o solo hay espacios', () => {
    expect(normalizeServerUrl('')).toBeNull();
    expect(normalizeServerUrl('   ')).toBeNull();
  });

  it('añade http:// cuando falta el esquema', () => {
    expect(normalizeServerUrl('192.168.1.10:3000')).toBe('http://192.168.1.10:3000');
  });

  it('quita la barra final y pasa el host a minúsculas', () => {
    expect(normalizeServerUrl('http://192.168.1.10:3000/')).toBe('http://192.168.1.10:3000');
    expect(normalizeServerUrl('HTTPS://Example.com/api/')).toBe('https://example.com/api');
  });

  it('devuelve null para direcciones no válidas', () => {
    expect(normalizeServerUrl('http://')).toBeNull();
    expect(normalizeServerUrl('ht tp://x')).toBeNull();
  });
});

describe('checkServerHealth', () => {
  it('devuelve la información del servidor cuando responde bien', async () => {
    let calledUrl = '';
    const fetchFn = stubFetch((url) => {
      calledUrl = url;
      return Promise.resolve(
        jsonResponse({
          status: 'ok',
          version: '0.0.1',
          apiVersion: 1,
          time: '2026-11-03T14:05:00Z',
        }),
      );
    });

    const result = await checkServerHealth('http://192.168.1.10:3000', { fetchFn });

    expect(calledUrl).toBe('http://192.168.1.10:3000/health');
    expect(result).toEqual({
      ok: true,
      info: { version: '0.0.1', apiVersion: 1, serverTime: '2026-11-03T14:05:00Z' },
    });
  });

  it('acepta una respuesta sin apiVersion ni hora', async () => {
    const fetchFn = stubFetch(() => Promise.resolve(jsonResponse({ version: '0.0.1' })));
    const result = await checkServerHealth('http://x', { fetchFn });
    expect(result).toEqual({
      ok: true,
      info: { version: '0.0.1', apiVersion: null, serverTime: null },
    });
  });

  it('marca "http" si el servidor responde con error', async () => {
    const fetchFn = stubFetch(() => Promise.resolve(jsonResponse({}, 500)));
    expect(await checkServerHealth('http://x', { fetchFn })).toEqual({
      ok: false,
      reason: 'http',
    });
  });

  it('marca "invalid" si el cuerpo no es JSON o no trae versión', async () => {
    const notJson = stubFetch(() => Promise.resolve(new Response('hola', { status: 200 })));
    const noVersion = stubFetch(() => Promise.resolve(jsonResponse({ status: 'ok' })));

    expect(await checkServerHealth('http://x', { fetchFn: notJson })).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(await checkServerHealth('http://x', { fetchFn: noVersion })).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('marca "network" si la conexión falla', async () => {
    const fetchFn = stubFetch(() => Promise.reject(new TypeError('fetch failed')));
    expect(await checkServerHealth('http://x', { fetchFn })).toEqual({
      ok: false,
      reason: 'network',
    });
  });

  it('marca "timeout" si el servidor no responde a tiempo', async () => {
    const fetchFn = stubFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );

    expect(await checkServerHealth('http://x', { fetchFn, timeoutMs: 20 })).toEqual({
      ok: false,
      reason: 'timeout',
    });
  });
});
