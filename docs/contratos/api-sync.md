# Contrato HTTP app ↔ servidor simulado — v1

> Dueño: Frontend/API. Implementación en el servidor: Backend (`apps/server`).
> Tipos TypeScript: `packages/domain/src/sync-contract/` (fuente de verdad del formato).
> **El servidor es una simulación del ERP.** No es una integración real.

## Reglas generales

- Cuerpo y respuestas en JSON (`Content-Type: application/json`).
- Dinero en **centavos enteros** (`…Minor`). Fechas en **ISO-8601 UTC** con `Z` (`…At`, `time`, `sentAt`).
- Cabeceras en `/auth/token` y `/sync`: `X-Device-Id` (identificador del dispositivo) y `X-Api-Version: 1`.
- Tiempo máximo de espera del cliente: **8 s** por petición. Tamaño máximo del cuerpo: 1 MB.
- Versión del contrato: `apiVersion = 1`. Un cambio incompatible sube el número.
- **Idempotencia:** el mismo `recordId` enviado varias veces nunca crea dos registros.

## `GET /health` — sin autenticación

Respuesta `200`:

| Campo | Tipo | Notas |
|---|---|---|
| `status` | `"ok"` | |
| `version` | texto | versión del servidor |
| `apiVersion` | entero | versión del contrato que habla |
| `time` | ISO UTC | hora del servidor |

La app solo exige `version`; `apiVersion` y `time` se muestran si existen.

## `POST /auth/token`

Pide un token para sincronizar. No sustituye al login local (la app funciona sin conexión).

Petición: `{ userId, pin }` → Respuesta `200`: `{ token, expiresAt }`.
Errores: `401` con `{ error: { code: "UNAUTHORIZED", message } }` si usuario o PIN no valen.

## `POST /sync` — `Authorization: Bearer <token>`

Petición:

| Campo | Tipo | Notas |
|---|---|---|
| `deviceId` | texto | el mismo de `X-Device-Id` |
| `sentAt` | ISO UTC | |
| `records` | lista | de 1 a **50** registros; el servidor los procesa **en orden** |

Cada registro: `recordId`, `kind` (`session` \| `movement`), `operation` (`create` \| `close`) y `payload`.

| `kind` / `operation` | Campos de `payload` |
|---|---|
| `session` / `create` | `id`, `userId`, `registerId`, `currency`, `openedAt`, `openingBalanceMinor` |
| `session` / `close` | `id`, `closedAt`, `closedByUserId`, `countedBalanceMinor`, `expectedBalanceMinor`, `varianceMinor`, `varianceNote`, `denominationBreakdown` |
| `movement` / `create` | `id`, `sessionId`, `userId`, `type`, `amountMinor`, `currency`, `description`, `occurredAt`, `createdAt`, `reference`, `counterparty`, `counterpartyRegisterId`, `reversalOf`, `reversalReason` |

Los campos opcionales viajan como `null`, nunca se omiten. La app **no** envía campos locales como `syncStatus`.

Respuesta `200`: `{ apiVersion, receivedAt, results }`, con **un resultado por registro y en el mismo orden**:

| Campo | Tipo | Notas |
|---|---|---|
| `recordId` | texto | |
| `result` | `accepted` \| `rejected` \| `duplicate` | |
| `originalResult` | `accepted` \| `rejected` \| `null` | solo con `duplicate`: lo que se respondió la primera vez |
| `reason` | código \| `null` | si el resultado (u original) es `rejected` |
| `detail` | texto \| `null` | explicación para soporte, no para el usuario final |

### Cómo actúa la app según el resultado

| Resultado | Estado en la app | ¿Se reintenta? |
|---|---|---|
| `accepted` | `synced` | no |
| `duplicate` con `originalResult = accepted` | `synced` | no |
| `rejected`, o `duplicate` con `originalResult = rejected` | `rejected` (con el motivo) | **no** |
| fallo de red, tiempo agotado o HTTP 5xx | `error` | **sí**, con espera creciente |
| respuesta que no cumple el contrato | `error` (fallo nuestro) | sí |

### Motivos de rechazo por registro (`reason`)

| Código | Cuándo |
|---|---|
| `AMOUNT_OVER_LIMIT` | el monto supera el límite del servidor |
| `SESSION_NOT_FOUND` | movimiento de una sesión que el servidor no conoce |
| `SESSION_CLOSED_SERVER` | la sesión ya está cerrada en el servidor |
| `INVALID_TYPE` | tipo de movimiento desconocido |
| `INVALID_PAYLOAD` | falta un campo o tiene un valor imposible |
| `FORCED_REJECTION` | rechazo provocado desde el panel de demostración |
| `REVERSAL_TARGET_UNKNOWN` | anulación de un movimiento que el servidor no conoce (E7) |

Cada código nuevo exige actualizar `reason-codes` en el dominio y el texto en español de la app.

### Errores HTTP (afectan a toda la petición)

Cuerpo `{ error: { code, message } }`.

| Estado | `code` | Qué hace el cliente |
|---|---|---|
| 400 | `INVALID_REQUEST` | es un fallo nuestro: marca `error` con el detalle |
| 400 | `UNSUPPORTED_VERSION` | mismo tratamiento; hay que actualizar la app |
| 401 | `UNAUTHORIZED` | renueva el token **una vez** y reintenta; no es un rechazo del registro |
| 5xx | `SERVER_ERROR` | `error` con espera creciente |

## Panel y controles de demostración (solo servidor simulado)

No forman parte del contrato de la app. El servidor expone `GET /` (panel con la leyenda "SIMULACIÓN — no es el ERP real") y `/demo/*` para forzar rechazos, latencia, fallos y **pérdida de respuesta** (el servidor procesa el registro pero la app no recibe la respuesta, lo que provoca un reintento y un `duplicate` reales).
