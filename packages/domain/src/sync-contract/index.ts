/**
 * Contrato HTTP entre la app y el servidor simulado (versión 1).
 * Documentación: docs/contratos/api-sync.md. Dueño: Frontend/API.
 *
 * En F-6.1 este archivo se divide en sync-request.ts, sync-response.ts, auth-contract.ts y
 * reason-codes.ts, y se añaden esquemas de validación (zod). Hasta entonces solo hay tipos.
 */

export const API_VERSION = 1 as const;

/** Máximo de registros que el servidor acepta en una sola petición. */
export const MAX_BATCH_SIZE = 50;

// ── GET /health ───────────────────────────────────────────────────────────
export interface HealthResponse {
  status: 'ok';
  version: string;
  apiVersion: number;
  /** Hora del servidor, ISO-8601 UTC. */
  time: string;
}

// ── POST /auth/token ──────────────────────────────────────────────────────
export interface AuthRequest {
  userId: string;
  pin: string;
}

export interface AuthResponse {
  token: string;
  /** ISO-8601 UTC. */
  expiresAt: string;
}

// ── POST /sync ────────────────────────────────────────────────────────────
export type RecordKind = 'session' | 'movement';
export type RecordOperation = 'create' | 'close';

export interface SyncRecord {
  /** Identificador de la entrada de cola. Clave de idempotencia: el mismo id nunca crea dos veces. */
  recordId: string;
  kind: RecordKind;
  operation: RecordOperation;
  /** Campos de la entidad (ver docs/contratos/api-sync.md). Se tipa por completo en F-6.1. */
  payload: Record<string, unknown>;
}

export interface SyncRequest {
  deviceId: string;
  /** ISO-8601 UTC. */
  sentAt: string;
  records: SyncRecord[];
}

/** Motivos de rechazo por registro (el servidor dijo "no"; no se reintenta). */
export const REASON_CODES = [
  'AMOUNT_OVER_LIMIT',
  'SESSION_NOT_FOUND',
  'SESSION_CLOSED_SERVER',
  'INVALID_TYPE',
  'INVALID_PAYLOAD',
  'FORCED_REJECTION',
  'REVERSAL_TARGET_UNKNOWN',
] as const;

export type ReasonCode = (typeof REASON_CODES)[number];

export type RecordResultStatus = 'accepted' | 'rejected' | 'duplicate';

export interface RecordResult {
  recordId: string;
  result: RecordResultStatus;
  /** Solo en "duplicate": qué se respondió la primera vez. */
  originalResult: 'accepted' | 'rejected' | null;
  /** Solo cuando el resultado (o el original) es "rejected". */
  reason: ReasonCode | null;
  detail: string | null;
}

export interface SyncResponse {
  apiVersion: number;
  /** ISO-8601 UTC. */
  receivedAt: string;
  /** Mismo orden que la petición. */
  results: RecordResult[];
}

// ── Errores HTTP (afectan a toda la petición, no a un registro) ───────────
export type HttpErrorCode =
  'UNAUTHORIZED' | 'INVALID_REQUEST' | 'UNSUPPORTED_VERSION' | 'SERVER_ERROR';

export interface HttpErrorBody {
  error: { code: HttpErrorCode; message: string };
}
