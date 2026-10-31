/**
 * PUERTOS: las interfaces que la interfaz de usuario necesita. No tienen implementación aquí.
 *
 *  - Las pantallas (apps/mobile/src/features y ui) solo conocen estas interfaces, a través de hooks.
 *  - El Backend las implementa con Dexie y el motor de sincronización (apps/mobile/src/data y sync).
 *  - El Frontend desarrolla antes con implementaciones falsas en memoria (src/app/fakes).
 *
 * Dueño: Frontend. Si necesitas un método nuevo, abre un Issue; no lo añadas tú.
 *
 * Reglas de formato (ver docs/plan/PLAN_BACKEND.md §2):
 *  - Todo es asíncrono. Los errores de negocio se devuelven como Result; solo se lanza ante
 *    fallos técnicos inesperados.
 *  - Dinero en centavos enteros (…Minor). Fechas ISO-8601 UTC (…At).
 *  - Los métodos watch* llaman al callback de inmediato con el valor actual y después en cada
 *    cambio. Devuelven una función que cancela la suscripción.
 *  - Toda operación de escritura indica quién la hace (userId) para validar permisos y auditar.
 */
import type {
  AuditEntry,
  CashSession,
  DomainError,
  Movement,
  MovementType,
  OutboxEntry,
  Register,
  Result,
  SyncStatus,
  User,
} from './index';
import type { AuthResponse, HealthResponse, SyncRequest, SyncResponse } from './sync-contract';

export type Unsubscribe = () => void;

// ── Usuarios y cajas ──────────────────────────────────────────────────────

export interface UserRepository {
  listDemoUsers(): Promise<User[]>;
  getById(userId: string): Promise<User | null>;
  /**
   * Éxito: devuelve el usuario. Fallo: PIN_WRONG (params: attemptsLeft), PIN_LOCKED
   * (params: secondsLeft), PIN_INVALID_FORMAT o USER_NOT_FOUND.
   */
  verifyPin(userId: string, pin: string): Promise<Result<User>>;
}

export interface RegisterRepository {
  list(): Promise<Register[]>;
  getById(registerId: string): Promise<Register | null>;
}

// ── Sesiones de caja ──────────────────────────────────────────────────────

export interface OpenSessionInput {
  userId: string;
  openingBalanceMinor: number;
}

export interface CloseSessionInput {
  userId: string;
  sessionId: string;
  countedBalanceMinor: number;
  /** Obligatoria cuando hay diferencia entre lo esperado y lo contado. */
  varianceNote: string | null;
  /** Denominación (en centavos, como texto) → cantidad de billetes o monedas. */
  denominationBreakdown: Record<string, number> | null;
}

export interface SessionFilter {
  status?: CashSession['status'];
}

export interface SessionRepository {
  openSession(input: OpenSessionInput): Promise<Result<CashSession>>;
  closeSession(input: CloseSessionInput): Promise<Result<CashSession>>;
  getById(sessionId: string): Promise<CashSession | null>;
  getOpenForUser(userId: string): Promise<CashSession | null>;
  listByUser(userId: string, filter?: SessionFilter): Promise<CashSession[]>;
  listAll(filter?: SessionFilter): Promise<CashSession[]>;
  watchOpenForUser(userId: string, callback: (session: CashSession | null) => void): Unsubscribe;
  watchAll(callback: (sessions: CashSession[]) => void, filter?: SessionFilter): Unsubscribe;
}

// ── Movimientos ───────────────────────────────────────────────────────────

export interface NewMovementInput {
  userId: string;
  sessionId: string;
  type: MovementType;
  amountMinor: number;
  description: string;
  occurredAt: string;
  reference?: string | null;
  counterparty?: string | null;
  counterpartyRegisterId?: string | null;
}

export interface ReverseMovementInput {
  userId: string;
  movementId: string;
  reason: string;
}

export interface MovementRepository {
  /** Los movimientos son inmutables: solo se añaden. Se corrigen con reverse (E7). */
  add(input: NewMovementInput): Promise<Result<Movement>>;
  reverse(input: ReverseMovementInput): Promise<Result<Movement>>;
  getById(movementId: string): Promise<Movement | null>;
  /** Más recientes primero. */
  listBySession(sessionId: string): Promise<Movement[]>;
  watchBySession(sessionId: string, callback: (movements: Movement[]) => void): Unsubscribe;
}

// ── Cola de sincronización (lectura para la interfaz) ─────────────────────

export type OutboxSummary = Record<SyncStatus, number>;

export interface OutboxFilter {
  status?: SyncStatus;
  entityType?: OutboxEntry['entityType'];
}

export interface OutboxRepository {
  getSummary(): Promise<OutboxSummary>;
  listEntries(filter?: OutboxFilter): Promise<OutboxEntry[]>;
  watchSummary(callback: (summary: OutboxSummary) => void): Unsubscribe;
  watchEntries(callback: (entries: OutboxEntry[]) => void, filter?: OutboxFilter): Unsubscribe;
  /** Solo para entradas en estado "error". Otro estado → SYNC_ENTRY_NOT_RETRYABLE. */
  retryEntry(entryId: string): Promise<Result<OutboxEntry>>;
}

// ── Auditoría ─────────────────────────────────────────────────────────────

export interface AuditFilter {
  userId?: string;
  action?: string;
  fromAt?: string;
  toAt?: string;
  limit?: number;
  offset?: number;
}

export interface AuditRepository {
  listByEntity(entityType: AuditEntry['entityType'], entityId: string): Promise<AuditEntry[]>;
  list(filter?: AuditFilter): Promise<AuditEntry[]>;
  watchRecent(limit: number, callback: (entries: AuditEntry[]) => void): Unsubscribe;
}

// ── Ajustes ───────────────────────────────────────────────────────────────

export type SettingKey =
  | 'activeUserId'
  | 'serverUrl'
  | 'deviceId'
  | 'authToken'
  | 'tokenExpiresAt'
  | 'lastSyncAt'
  | 'demoMode';

export interface SettingsRepository {
  get(key: SettingKey): Promise<string | null>;
  set(key: SettingKey, value: string | null): Promise<void>;
  watch(key: SettingKey, callback: (value: string | null) => void): Unsubscribe;
}

// ── Conectividad y motor de sincronización ────────────────────────────────

/** offline = sin red; server_unreachable = hay red pero no llega al servidor. */
export type ConnectivityState = 'online' | 'offline' | 'server_unreachable';

export interface Connectivity {
  getState(): ConnectivityState;
  /** Comprobación real contra el servidor (GET /health), no solo el estado de la red. */
  checkNow(): Promise<ConnectivityState>;
  subscribe(callback: (state: ConnectivityState) => void): Unsubscribe;
}

export interface SyncEngineState {
  phase: 'idle' | 'offline' | 'syncing' | 'error';
  lastSyncAt: string | null;
  pendingCount: number;
  lastError: { code: string; detail: string | null } | null;
}

export interface SyncEngine {
  start(): void;
  stop(): void;
  /** Dispara un ciclo ahora (botón "Sincronizar ahora"). */
  syncNow(): Promise<void>;
  getState(): SyncEngineState;
  subscribe(callback: (state: SyncEngineState) => void): Unsubscribe;
}

// ── Cliente HTTP (lo implementa el Frontend; lo usa el motor del Backend) ─

export interface ApiFailure {
  /** network = no hubo respuesta; timeout = tardó demasiado; http = estado de error; contract = respuesta con formato roto. */
  kind: 'network' | 'timeout' | 'http' | 'contract';
  status: number | null;
  detail: string | null;
}

/** Nunca lanza: siempre devuelve éxito o un fallo clasificado. */
export type ApiResult<T> = { ok: true; value: T } | { ok: false; failure: ApiFailure };

export interface ApiClient {
  health(): Promise<ApiResult<HealthResponse>>;
  login(userId: string, pin: string): Promise<ApiResult<AuthResponse>>;
  sendBatch(request: SyncRequest): Promise<ApiResult<SyncResponse>>;
}

// ── Agrupación ────────────────────────────────────────────────────────────

export interface Services {
  users: UserRepository;
  registers: RegisterRepository;
  sessions: SessionRepository;
  movements: MovementRepository;
  outbox: OutboxRepository;
  audit: AuditRepository;
  settings: SettingsRepository;
  connectivity: Connectivity;
  syncEngine: SyncEngine;
}

export interface ServicesDependencies {
  apiClient: ApiClient;
}

/** Fábrica que implementa el Backend en apps/mobile/src/data/create-services.ts. */
export type CreateServices = (dependencies: ServicesDependencies) => Services;

/** Reexportado para que la interfaz pueda tipar errores sin importar todo el dominio. */
export type { DomainError };
