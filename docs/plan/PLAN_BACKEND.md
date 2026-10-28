# Plan de trabajo — BACKEND, DATOS, REGLAS, SINCRONIZACIÓN y DOCUMENTACIÓN

> **Documento 2 de 2.** El otro es `PLAN_FRONTEND.md` (interfaces, diseño, deploy y contrato de API).
> **Ubicación en el repo:** `docs/plan/PLAN_BACKEND.md`
> **Quién lo ejecuta:** el integrante de Backend.
> **Qué construyes:** el "cerebro" de la app: reglas del dinero, base de datos local, cola y motor de sincronización, el servidor simulado del ERP, y toda la documentación operativa (manuales y registro de pruebas).

---

## 0. Cómo leer este documento

- Las **etapas (E0–E8)** son las mismas que en `PLAN_FRONTEND.md`. Allí está el mapa de etapas, las reglas de Git, el flujo de hitos y la **Prueba en el teléfono** de cada etapa (no se repiten aquí).
- **IDs de tarea:** `B-<etapa>.<n>` aquí, `F-<etapa>.<n>` en el otro documento. `Depende de:` indica lo que necesitas del Frontend.
- **Tu parte de la prueba de etapa** son las **pruebas automáticas** que se listan en cada etapa y el **registro de pruebas** (§5).
- **No superposición:** tu territorio exacto está en `PLAN_FRONTEND.md` §2 (tabla de propiedad). Recuerda sus excepciones: `packages/domain/src/ports.ts` y `packages/domain/src/sync-contract/**` son del Frontend; `apps/mobile/src/sync/api-client.ts` y `serializers.ts` también.
- **Sin código todavía:** el plan dice *qué lleva cada archivo*, no lo escribe.

### Tu territorio, de un vistazo
`packages/domain/**` (menos lo anterior) · `apps/mobile/src/data/**` · `apps/mobile/src/sync/**` (menos `api-client.ts` y `serializers.ts`) · `apps/server/**` · `docs/contratos/modelo-de-datos.md` · `docs/contratos/roles-permisos.md` · `docs/manual-usuario.md` · `docs/manual-tecnico.md` · `docs/registro-de-pruebas.md` · `docs/guion-demo.md` · `docs/limitaciones.md`.

---

## 1. Idea general de tu parte

El Frontend **no sabe nada** de Dexie, de HTTP ni de reglas financieras: solo llama a tus funciones y repositorios y pinta lo que devuelven. Por eso tu entrega tiene dos capas:

1. **`packages/domain`** — TypeScript puro: tipos, dinero, catálogo de movimientos, reglas, permisos. Sin React, sin base de datos, sin red. Se prueba en segundos y la usan la app **y** el servidor, de modo que ambos aplican exactamente las mismas reglas.
2. **Implementaciones** — `apps/mobile/src/data` (base local con Dexie), `apps/mobile/src/sync` (cola, motor, conectividad) y `apps/server` (servidor simulado). Implementan las interfaces (`ports.ts`) que define el Frontend.

---

## 2. CONTRATO DE FORMATO DE SALIDA (lo más importante para que todo encaje)

Esta sección es la fuente única; el Frontend la resume en su §3. **Si algo de lo que entregues no cumple estas reglas, no encaja con la interfaz.**

### 2.1 Reglas de formato de todos tus archivos
1. **Dinero:** siempre entero en **centavos**. Todo campo de dinero termina en `Minor` (`amountMinor`, `openingBalanceMinor`). Nunca decimales ni `number` con coma flotante para dinero.
2. **Fechas:** siempre texto **ISO-8601 en UTC** con `Z` (`2026-11-03T14:05:00Z`). Todo campo de fecha termina en `At`. Nunca objetos `Date` en los datos. La conversión a hora de La Habana la hace la UI.
3. **Identificadores:** UUID v4 en texto para sesiones, movimientos, entradas de cola y auditoría. Los usuarios y cajas demo usan identificadores fijos legibles (`user-cashier-ana`, `reg-01`).
4. **Enumeraciones:** cadenas en `snake_case` minúsculas (`salary_payment`, `pending`). Se declaran una sola vez en `packages/domain/src/types/` y se exportan como tipos de unión.
5. **Entidades planas y serializables:** sin clases, sin funciones dentro, sin `undefined` (usa `null`). Todo lo que sale de un repositorio se puede convertir a JSON sin perder nada.
6. **Todo asíncrono** en repositorios y servicios. Los métodos `watch*(…, callback)`: llaman al `callback` **inmediatamente** con el valor actual y después en cada cambio; devuelven una función que cancela la suscripción.
7. **Funciones de reglas puras:** no leen el reloj ni el azar. Reciben `now` (texto ISO) y los identificadores ya generados. Así son deterministas y fáciles de probar.
8. **Errores de negocio nunca se lanzan:** se devuelven como `Result` (§2.2). **Solo se lanza** ante fallos técnicos inesperados (base corrupta, almacenamiento lleno).
9. **Sin textos de interfaz en tu código:** devuelves **códigos**; el Frontend los traduce.
10. **Cada cambio de estado deja rastro en auditoría** (`AuditEntry`), dentro de la misma transacción que el cambio.

### 2.2 `Result` y errores
- `packages/domain/src/result.ts`: `Result<T>` es éxito `{ ok: true, value }` o fallo `{ ok: false, errors }`, donde `errors` es **siempre una lista** de `DomainError` (para poder devolver varios errores de formulario a la vez).
- `DomainError` = `{ code, field?, params? }`. `field` es el nombre del campo del formulario al que pertenece (`amountMinor`, `description`…) y `params` datos para interpolar en el texto (por ejemplo `{ min: 3 }`).
- `packages/domain/src/errors.ts`: una constante con **todos los códigos** y su tipo `ErrorCode`. Es **obligatorio** declarar aquí cada código nuevo en el mismo PR que lo usa; el Frontend tiene una prueba que falla si falta su texto en español.
- Lista inicial (crece por etapa):
  - Acceso: `USER_NOT_FOUND`, `PIN_INVALID_FORMAT`, `PIN_WRONG`, `PIN_LOCKED`.
  - Permisos: `PERMISSION_DENIED`.
  - Dinero: `AMOUNT_REQUIRED`, `AMOUNT_FORMAT`, `AMOUNT_NOT_POSITIVE`, `AMOUNT_TOO_LARGE`.
  - Sesión: `OPENING_BALANCE_INVALID`, `SESSION_ALREADY_OPEN`, `SESSION_NOT_FOUND`, `SESSION_NOT_OPEN`, `SESSION_NOT_OWNED`, `SESSION_ALREADY_CLOSED`.
  - Movimiento: `MOVEMENT_TYPE_INVALID`, `MOVEMENT_TYPE_NOT_ALLOWED`, `FIELD_REQUIRED`, `DESCRIPTION_TOO_SHORT`, `DESCRIPTION_TOO_LONG`, `DATE_IN_FUTURE`, `DATE_BEFORE_SESSION`, `CURRENCY_MISMATCH`, `MOVEMENT_NOT_FOUND`.
  - Cierre: `COUNTED_INVALID`, `VARIANCE_NOTE_REQUIRED`, `DENOMINATION_INVALID`.
  - Anulación: `REVERSAL_REASON_REQUIRED`, `REVERSAL_ALREADY_DONE`, `REVERSAL_OF_REVERSAL`.
  - Sincronización: `SYNC_ENTRY_NOT_FOUND`, `SYNC_ENTRY_NOT_RETRYABLE`.
  - General: `UNEXPECTED`.

### 2.3 Superficie pública que el Frontend va a importar
Todo sale de `packages/domain/src/index.ts` (importable como `@caja/domain`). Lo que no está en esta lista es interno.
- **Tipos:** `Role`, `Action`, `User`, `Register`, `CashSession`, `Movement`, `MovementType`, `Direction`, `SyncStatus`, `OutboxEntry`, `AuditEntry`, `FieldKey`, `Result`, `DomainError`, `ErrorCode`.
- **Dinero:** `parseAmount(text) → Result<number>`, `formatAmount(minor)`, `formatSignedAmount(minor)`.
- **Catálogo:** `MOVEMENT_TYPES` (lista) y `getMovementTypeDef(type)` → `{ id, direction, requiredFields, optionalFields, allowedRoles }`.
- **Permisos:** `can(role, action)`, `canCreateMovementType(role, type)`, `canRegisterMovement(user, session)`.
- **Reglas:** `validateOpenSession`, `validateNewMovement`, `validateClose`, `validateReversal`, `computeVariance`, `summarizeSession`, `buildSessionReport`, `totalFromDenominations`.
- **Configuración:** `DENOMINATIONS`, `DEFAULT_CURRENCY`, límites de descripción.
- **Pruebas/demo:** `@caja/domain/testing` (constructores de datos de prueba) y `DEMO_USERS`/`DEMO_REGISTERS` (fuente única de los usuarios demo, usada por la app y el servidor).

Desde `apps/mobile/src/data/index.ts`: `createServices(deps)` (devuelve el objeto `Services` definido en `ports.ts`) y `loadDemoData()`, `resetLocalData()`.

### 2.4 Cómo encaja con lo del Frontend
- **Puertos:** tú implementas las interfaces de `ports.ts` (del Frontend). Si necesitas un método que no existe, abres un Issue; no lo añades tú.
- **Fakes:** el Frontend desarrolla con implementaciones en memoria. Tu implementación real debe comportarse **igual** (mismos `Result`, mismos códigos), de modo que el cambio sea una sola variable (`VITE_USE_FAKES`).
- **Contrato HTTP:** el servidor valida peticiones y respuestas con los **esquemas de `sync-contract/`** del Frontend. Tu motor de sincronización llama al `ApiClient` (interfaz en `ports.ts`) y recibe resultados en la forma del contrato; **no construyes ni parseas JSON a mano**.
- **Textos:** tú entregas códigos; el Frontend los traduce (`i18n/error-codes.ts`, `i18n/reason-codes.ts`).

### 2.5 Qué produce el Frontend y cómo te llega (para que lo conozcas)
- **Interfaz → tus repositorios:** cada pantalla acaba en una llamada a un puerto con datos ya normalizados (centavos enteros vía `parseAmount`, fechas ISO). Tú **revalidas siempre** con las reglas del dominio antes de escribir: la UI valida para ayudar, el dominio valida para proteger.
- **Cliente HTTP → motor de sincronización:** `ApiClient.sendBatch` devuelve siempre un `ApiResult` (nunca lanza): éxito con resultados por registro, o fallo clasificado como **red**, **HTTP** o **contrato roto**. Tu motor decide el reintento según esa clasificación.
- **Serializadores:** el Frontend convierte tus entidades en registros de la API. Por eso tus entidades no deben llevar campos que no sean serializables.

---

## 3. Qué debe contener la documentación de contratos a tu cargo

### `docs/contratos/modelo-de-datos.md`
- **Entidades y campos** (tipo, obligatorio, ejemplo):
  - `User`: `id`, `name`, `role`, `registerId|null`, `avatarColor`. (`pinHash` y `pinSalt` se guardan en la base pero **nunca** salen de un repositorio.)
  - `Register`: `id`, `name`.
  - `CashSession`: `id`, `userId`, `registerId`, `currency`, `openedAt`, `openingBalanceMinor`, `status` (`open`|`closed`), `closedAt`, `countedBalanceMinor`, `expectedBalanceMinor`, `varianceMinor`, `varianceNote`, `closedByUserId`, `denominationBreakdown` (denominación → cantidad), `syncStatus`.
  - `Movement`: `id`, `sessionId`, `userId`, `type`, `direction` (derivada del tipo, guardada para consultar), `amountMinor`, `currency`, `description`, `occurredAt`, `createdAt`, `reference`, `counterparty`, `counterpartyRegisterId`, `reversalOf`, `reversedBy`, `reversalReason`, `syncStatus`.
  - `OutboxEntry`: `id` (será el `recordId` de la API), `sequence` (entero creciente), `entityType` (`session`|`movement`), `entityId`, `operation` (`create`|`close`), `status`, `attempts`, `lastAttemptAt`, `nextAttemptAt`, `lastError` (`{ code, detail }`), `serverResult` (`{ result, reason }`), `createdAt`, `updatedAt`.
  - `AuditEntry`: `id`, `at`, `userId`, `action`, `entityType`, `entityId`, `details`.
  - Ajustes (clave/valor): `activeUserId`, `serverUrl`, `deviceId`, `authToken`, `tokenExpiresAt`, `lastSyncAt`, `demoMode`, bloqueos de PIN por usuario.
- **Estados de sincronización y transiciones permitidas:** `local → pending → syncing → synced | rejected | error`; `syncing → pending` (recuperación tras cierre forzado); `error → pending` (reintento). `synced` y `rejected` son finales.
  - `local` = guardado en el dispositivo **sin cola activa** (no hay servidor configurado).
  - `pending` = en cola, esperando envío o reintento.
  - `error` = fallo transitorio (red, 5xx, tiempo agotado); se reintenta.
  - `rejected` = el servidor dijo **no**; no se reintenta, requiere acción humana.
- **Reglas de negocio fijas:**
  - El saldo esperado es **físico**: `saldo inicial + ingresos − egresos`, contando **todos** los movimientos locales, estén o no aceptados por el servidor. Un rechazo es un problema de registro, no de dinero.
  - Los movimientos son **inmutables**; se corrigen con un movimiento inverso (E7).
  - Una sola caja abierta por usuario.
  - Una caja cerrada no admite movimientos.
- **Catálogo de tipos** (dirección, campos obligatorios, roles):
  - E3: `sale`, `collection`, `other_income` (ingresos); `refund`, `operating_expense`, `salary_payment` (solo supervisor), `other_expense` (egresos).
  - E7: `payment`, `transfer_out`, `transfer_in`, `reversal`.
- **Reglas de campos:** descripción de 3 a 140 caracteres; fecha no futura (tolerancia de 5 minutos) y no anterior a la apertura de la sesión; moneda igual a la de la sesión (`CUP` por defecto).

### `docs/contratos/roles-permisos.md`
Matriz **acción × rol** (la copia legible de `permissions/`):

| Acción | Vendedor (`cashier`) | Supervisor (`supervisor`) | Contabilidad (`accountant`) |
|---|---|---|---|
| `session.open` / `session.close` (propia) | Sí | Sí | No |
| `session.viewOwn` | Sí | Sí | — |
| `session.viewAll` | No | Sí (solo lectura) | Sí (solo lectura) |
| `movement.create` (todos los tipos salvo salarios) | Sí | Sí | No |
| `movement.create` tipo `salary_payment` | No | Sí | No |
| `movement.reverse` (en su caja abierta) | Sí | Sí | No |
| `sync.viewOwn` | Sí | Sí | — |
| `sync.viewAll` | No | Sí | Sí (solo lectura) |
| `sync.retry` | Sí | Sí | No |
| `audit.view` | No | Sí | Sí |
| `export.run` | No | Sí | Sí |
| `settings.manage` (URL del servidor, modo demo) | No | Sí | No |

El Supervisor **no** registra movimientos en la caja de otro usuario en el MVP. Nadie puede reabrir una caja cerrada.

---

## ETAPA E0 — Cimientos y contratos

**Tu objetivo.** Dejar el dominio y el servidor listos para recibir trabajo, y los contratos de datos y roles firmados.
**Prueba de etapa:** ver `PLAN_FRONTEND.md` E0. El servidor debe responder a `GET /health`.

- **B-0.1 Esqueleto de `packages/domain`.** `package.json` (nombre `@caja/domain`, sin dependencias de React/DOM), `tsconfig.json` que extiende la base, `vitest.config.ts`, `src/index.ts` (exporta todo lo público), carpetas `src/types`, `src/money`, `src/movement-types`, `src/rules`, `src/permissions`, `src/config`, `src/seed`, `src/testing`, `src/export` y `tests/`.
- **B-0.2 `src/result.ts` y `src/errors.ts`.** Según §2.2, con la lista inicial de códigos. Pruebas mínimas de los constructores de `Result`.
- **B-0.3 Tipos en `src/types/`.** Un archivo por entidad (`user.ts`, `register.ts`, `cash-session.ts`, `movement.ts`, `outbox-entry.ts`, `audit-entry.ts`, `sync-status.ts`, `role.ts`) con los campos y enumeraciones de `modelo-de-datos.md`.
- **B-0.4 `docs/contratos/modelo-de-datos.md`.** Según §3.
- **B-0.5 `docs/contratos/roles-permisos.md`.** Según §3.
- **B-0.6 Esqueleto de `apps/server`.** `package.json`, `tsconfig.json`, `src/index.ts` (escucha en todas las interfaces, puerto por variable de entorno), `src/config.ts`, `src/routes/health.ts` (devuelve versión del servidor, hora y `apiVersion`), permiso CORS abierto para la app y el navegador de desarrollo. Script `npm run server` en la raíz (lo pide el Frontend en F-0.1). Elegir y anotar en `manual-tecnico.md` la biblioteca de SQLite y avisar por Issue al Frontend para registrarlo en `decisiones.md`.
- **B-0.7 Infraestructura de pruebas.** Vitest en `domain` y `server`, `fake-indexeddb` disponible para `apps/mobile/src/data`, carpeta `packages/domain/tests/fixtures/` y `src/testing/builders.ts` (constructores `buildUser`, `buildSession`, `buildMovement` con valores por defecto sensatos).
- **B-0.8 Documentación inicial.** `docs/manual-tecnico.md` v1 (requisitos, cómo instalar y arrancar app y servidor), `docs/registro-de-pruebas.md` con la **plantilla** (§5), `docs/limitaciones.md` v1 (vacío con títulos), `docs/guion-demo.md` v1 (esqueleto).
- **B-0.9 Cierre de contratos.** Junto con `F-0.10`: lees `ports.ts`, `api-sync.md` y `pantallas.md`; abres Issues con cada incoherencia; apruebas el PR "contratos v1".

**Terminada cuando:** `npm test` corre en verde en `domain` y `server` (aunque sea con pocas pruebas), `GET /health` responde y los contratos están aprobados.

---

## ETAPA E1 — Acceso y roles

**Tu objetivo.** Base local con usuarios demo, verificación de PIN y matriz de permisos ejecutable.
**Prueba de etapa:** `PLAN_FRONTEND.md` E1.

- **B-1.1 Base local.** `apps/mobile/src/data/db.ts`: clase de base Dexie con versión de esquema `1` y tablas `users`, `registers`, `sessions`, `movements`, `outbox`, `audit`, `settings`. Índices: `sessions` por `userId` y `status`; `movements` por `sessionId` y por `[sessionId+createdAt]`; `outbox` por `status` y `sequence`; `audit` por `entityType+entityId` y por `at`. Documentar cómo se añaden versiones de esquema (migraciones).
- **B-1.2 Datos de arranque.** `packages/domain/src/seed/demo-users.ts` (`DEMO_USERS` y `DEMO_REGISTERS`: Vendedor, Supervisor y Contabilidad con identificadores fijos, rol, caja y color; PIN de demostración **documentados, no secretos**) y `apps/mobile/src/data/seed.ts` (siembra idempotente al primer arranque: guarda el PIN **ya cifrado**; reintentarlo no duplica nada).
- **B-1.3 Cifrado del PIN.** `apps/mobile/src/data/pin-hash.ts`: deriva el PIN con una sal por usuario mediante la API criptográfica del navegador y compara en tiempo constante. Dejar escrito en `limitaciones.md` que esto es de demostración, no seguridad real.
- **B-1.4 Reglas de acceso y permisos.**
  - `packages/domain/src/rules/auth-rules.ts`: formato del PIN (4 dígitos), política de bloqueo (tras 5 fallos, bloqueo de 60 s; devuelve segundos restantes en `params`).
  - `packages/domain/src/permissions/actions.ts` (lista de acciones) y `permissions.ts` (`can`, `canCreateMovementType`, `canRegisterMovement`) que implementan **exactamente** la matriz de `roles-permisos.md`.
- **B-1.5 Repositorios de usuario y ajustes.** `data/repositories/user-repository.ts` (`listDemoUsers`, `getById`, `verifyPin` que devuelve `Result` con intentos restantes o `PIN_LOCKED`) y `data/repositories/settings-repository.ts` (`get`, `set`, `watch`; genera y guarda el `deviceId` en el primer arranque; guarda el usuario activo).
- **B-1.6 Auditoría de acceso.** `data/audit-log.ts` (escritura de `AuditEntry` reutilizable por todos los repositorios dentro de su transacción) y `data/repositories/audit-repository.ts`. Acciones de esta etapa: `login_success`, `login_failed`, `logout`.
- **B-1.7 `createServices()` parcial.** `apps/mobile/src/data/create-services.ts` devuelve ya `UserRepository`, `SettingsRepository` y `AuditRepository`; el resto se añade por etapa.

**Pruebas automáticas que deben pasar:** matriz de permisos completa (cada acción × cada rol); PIN correcto, incorrecto, mal formado y bloqueo con su cuenta atrás; siembra idempotente; `verifyPin` nunca devuelve `pinHash`; auditoría escrita en login correcto y fallido.
**Documentación:** `manual-usuario.md` sección "Acceso y roles"; entrada de la etapa en `registro-de-pruebas.md`.
**Terminada cuando:** el Frontend cambia a servicios reales y los 3 usuarios aparecen desde la base local.

---

## ETAPA E2 — Apertura de caja

**Tu objetivo.** Dinero correctamente interpretado y formateado, y sesión de caja persistida con la regla de "una abierta por usuario".
**Prueba de etapa:** `PLAN_FRONTEND.md` E2.

- **B-2.1 Dinero.** `packages/domain/src/money/parse-amount.ts`, `format-amount.ts` y `index.ts`.
  - Entrada: la coma es el único separador decimal (máximo 2 decimales); el punto solo se acepta como separador de miles en grupos de 3. `12.5` es inválido (`AMOUNT_FORMAT`).
  - Salida: `1.234,50`; versión con signo (`+ 100,00`, `− 50,00`).
  - Límite máximo seguro configurable (`AMOUNT_TOO_LARGE`).
  - Pruebas: casos válidos, inválidos, límites, ida y vuelta (`parse(format(x)) = x`) y ejemplos en miles de millones.
- **B-2.2 Reglas de sesión.** `packages/domain/src/rules/session-rules.ts`: `validateOpenSession(user, openingBalanceMinor, existingOpenSession, now)` (rol permitido, saldo `≥ 0`, sin caja abierta). Devuelve `Result` con errores por campo.
- **B-2.3 Repositorios de sesión y cajas.**
  - `data/repositories/register-repository.ts` (`list`, `getById`).
  - `data/repositories/session-repository.ts`: `openSession` (en **una transacción**: revalida con el dominio, comprueba que no haya otra abierta, genera UUID, guarda y audita), `getOpenForUser`, `getById`, `listByUser`, `listAll`, `watchOpenForUser`, `watchAll`. `closeSession` queda como método que devuelve `UNEXPECTED` hasta E4.
- **B-2.4 Auditoría.** Acción `session_opened` con saldo inicial en `details`.
- **B-2.5 Documentación y registro.** `manual-usuario.md` "Abrir caja"; actualizar `modelo-de-datos.md` si cambió algo; entrada en `registro-de-pruebas.md`.

> Nota de diseño: en E5 las escrituras pasarán a crear también su entrada de cola **en la misma transacción**. Los métodos y sus firmas no cambian; solo se añade esa escritura.

**Pruebas automáticas que deben pasar:** parseo y formato de dinero; doble apertura simultánea (dos llamadas a la vez: solo una tiene éxito); persistencia tras cerrar y reabrir la base; el Contador no puede abrir; saldo negativo y no numérico rechazados.
**Terminada cuando:** la prueba de teléfono pasa con base real y una apertura sobrevive al reinicio.

---

## ETAPA E3 — Movimientos y saldo esperado

**Tu objetivo.** Catálogo de tipos, validación completa de movimientos y cálculo del saldo esperado.
**Prueba de etapa:** `PLAN_FRONTEND.md` E3.

- **B-3.1 Catálogo.** `packages/domain/src/movement-types/catalog.ts`: una definición por tipo con `id`, `direction`, `requiredFields`, `optionalFields` (usando las claves `amountMinor`, `description`, `occurredAt`, `reference`, `counterparty`, `counterpartyRegisterId`) y `allowedRoles`. En E3 solo los 7 tipos de la etapa; `getMovementTypeDef` y `MOVEMENT_TYPES` exportados.
- **B-3.2 Validación de movimientos.** `packages/domain/src/rules/movement-rules.ts`: `validateNewMovement(input, context { user, session, now })` devuelve **todos** los errores a la vez: sesión abierta y propia, rol y tipo permitidos, monto `> 0` y dentro del límite, descripción de 3 a 140, fecha no futura ni anterior a la apertura, moneda igual a la de la sesión, campos obligatorios del tipo (`FIELD_REQUIRED` con `field`).
- **B-3.3 Saldo.** `packages/domain/src/rules/balance-rules.ts`: `summarizeSession(session, movements)` devuelve ingresos, egresos, **saldo esperado**, cantidad por tipo y cantidad por estado de sincronización. Cuenta todos los movimientos sin importar su estado.
- **B-3.4 Repositorio de movimientos.** `data/repositories/movement-repository.ts`: `add` (dentro de una transacción: revalida con el dominio, comprueba sesión abierta, genera UUID y `createdAt`, estado inicial `local`, audita), `getById`, `listBySession` (más recientes primero), `watchBySession`. `reverse` queda como `UNEXPECTED` hasta E7.
- **B-3.5 Utilidades.** `apps/mobile/src/data/id.ts` (UUID v4 con alternativa si la API no existe) y `data/clock.ts` (reloj inyectable para pruebas).
- **B-3.6 Escenarios y datos de ejemplo.**
  - `packages/domain/tests/fixtures/scenarios.ts`: escenarios nombrados que reflejan el `tarea.md` (venta, egreso, reembolso, rol no autorizado a pagar salarios, sesión cerrada, monto cero, descripción corta, fecha futura).
  - `apps/mobile/src/data/demo-data.ts`: `loadDemoData()` crea una caja con un conjunto realista de movimientos (idempotente: no se duplica si se llama dos veces).
- **B-3.7 Auditoría y documentación.** Acción `movement_created`; `manual-usuario.md` "Registrar movimientos"; `registro-de-pruebas.md`.

**Pruebas automáticas que deben pasar:** cada escenario de `scenarios.ts`; saldo esperado en al menos 5 combinaciones calculadas a mano; validación múltiple devuelve todos los errores; el repositorio rechaza escribir un movimiento inválido aunque la UI lo envíe; `watchBySession` notifica en cada alta.
**Terminada cuando:** el saldo esperado de la app coincide con el cálculo manual en 3 escenarios en el teléfono.

---

## ETAPA E4 — Conteo y cierre

**Tu objetivo.** Reglas de conteo y cierre atómico, informe de sesión y consulta del historial.
**Prueba de etapa:** `PLAN_FRONTEND.md` E4.

- **B-4.1 Reglas de cierre.** `packages/domain/src/rules/closing-rules.ts`: `computeVariance(expectedMinor, countedMinor)` devuelve `{ varianceMinor, kind }` con `kind` = `balanced`, `shortage` o `surplus`; `validateClose(user, session, countedMinor, note, now)` exige sesión abierta y propia, contado `≥ 0` y **nota de al menos 3 caracteres cuando hay diferencia** (`VARIANCE_NOTE_REQUIRED`).
- **B-4.2 Denominaciones.** `packages/domain/src/config/denominations.ts` (lista editable de denominaciones en centavos; **verificar los billetes actualmente en circulación antes de fijarla**) y `rules/denomination-rules.ts` con `totalFromDenominations(counts)` (cantidades enteras `≥ 0` y con tope razonable; `DENOMINATION_INVALID`).
- **B-4.3 Cierre atómico.** `session-repository.closeSession(...)`: en una transacción **recalcula** el esperado desde los movimientos guardados (no confía en lo que mande la UI), guarda contado, esperado, diferencia, nota, desglose, `closedAt` y `closedByUserId`, y audita. Un segundo cierre devuelve `SESSION_ALREADY_CLOSED`. Tras cerrar, `movement-repository.add` devuelve `SESSION_NOT_OPEN`.
- **B-4.4 Informe.** `packages/domain/src/rules/session-report.ts`: `buildSessionReport(session, movements)` devuelve un objeto estructurado (datos de sesión, totales por tipo, esperado, contado, diferencia, nota, responsable). Lo usan el resumen de cierre y, en E7, la exportación.
- **B-4.5 Historial.** `session-repository`: `listByUser` y `listAll` admiten filtrar por estado (`closed`).
- **B-4.6 Auditoría.** `session_closed` con esperado, contado y diferencia en `details`.
- **B-4.7 Documentación y registro.** `manual-usuario.md` "Contar y cerrar la caja"; `registro-de-pruebas.md`.

**Pruebas automáticas que deben pasar:** cuadrada, faltante y sobrante (con y sin nota); doble cierre; movimiento tras el cierre; el esperado recalculado ignora un valor manipulado; total por denominaciones correcto y entradas inválidas rechazadas; informe con totales coherentes.
**Terminada cuando:** los tres resultados de conteo se verifican en el teléfono y la caja cerrada no admite cambios.

---

## ETAPA E5 — Offline real y estados visibles

**Tu objetivo.** Cola de salida (outbox) transaccional, estados de sincronización por registro y detección de conexión. Todavía **no hay motor ni servidor** en uso.
**Prueba de etapa:** `PLAN_FRONTEND.md` E5.

- **B-5.1 Cola.** `apps/mobile/src/data/outbox.ts`: operaciones internas `enqueue(entity, operation)` (asigna `sequence` creciente y crea la entrada) y cambios de estado. Regla de arranque: al crear una sesión o un movimiento, **si hay URL de servidor configurada** se crea la entrada y el registro pasa a `pending`; **si no la hay**, queda en `local`. Al guardarse la URL por primera vez, se encolan en orden todos los registros `local` existentes.
- **B-5.2 Escritura atómica.** Modificar `session-repository` y `movement-repository` para que **la entidad, su entrada de cola y su auditoría se guarden en la misma transacción**: o se guarda todo o nada.
- **B-5.3 Repositorio de cola para la UI.** `apps/mobile/src/sync/outbox-repository.ts`: `getSummary()` (contadores por estado), `listEntries(filtro)`, `watchSummary`, `watchEntries`, `retryEntry(id)` (solo si está en `error`; si no, `SYNC_ENTRY_NOT_RETRYABLE`).
- **B-5.4 Transiciones.** `packages/domain/src/sync/status-transitions.ts`: función pura `canTransition(from, to)` con la tabla de §3. Todo cambio de estado en la base pasa por ella.
- **B-5.5 Estado del motor y conectividad.**
  - `apps/mobile/src/sync/sync-state.ts`: estado observable (`phase`: `idle`, `offline`, `syncing`, `error`; `lastSyncAt`; `pendingCount`; `lastError`) y `NullSyncEngine` (cumple la interfaz `SyncEngine` sin enviar nada).
  - `apps/mobile/src/sync/connectivity.ts`: combina el evento de red del dispositivo con una **comprobación real** (`GET /health` con tiempo máximo), porque una Wi-Fi puede estar conectada sin llegar al servidor. Emite cambios y expone `isServerReachable()`.
- **B-5.6 Documentación y registro.** `manual-tecnico.md` "Cómo se guarda un registro (offline-first)"; `manual-usuario.md` "Trabajar sin conexión"; `registro-de-pruebas.md`.

**Pruebas automáticas que deben pasar:** atomicidad (si falla la cola, no queda el movimiento); persistencia al cerrar y reabrir la base; orden por `sequence`; encolado retroactivo al configurar la URL; todas las transiciones permitidas y prohibidas; `retryEntry` solo en `error`.
**Terminada cuando:** en el teléfono, 5 movimientos hechos en modo avión sobreviven a matar la app y figuran como pendientes.

---

## ETAPA E6 — Sincronización con el servidor simulado

**Tu objetivo.** Servidor que acepta o rechaza, y motor que envía sin duplicar, reintenta y recupera.
**Prueba de etapa:** `PLAN_FRONTEND.md` E6.

### Servidor (`apps/server`)
- **B-6.1 Base y esquema.** `src/db/db.ts` y `src/db/schema.ts`: tablas `users` (sembrada desde `DEMO_USERS`), `sessions`, `movements`, `sync_log` (registro de **cada** registro recibido: `recordId`, tipo, resultado, motivo, `deviceId`, `userId`, `receivedAt`) y `config`. Restricción única por `recordId` y por id de movimiento.
- **B-6.2 Autenticación.** `src/routes/auth.ts` (`POST /auth/token`: valida usuario y PIN, entrega un token firmado con caducidad) y `src/auth/token.ts` + `requireAuth`. Un `401` no es un rechazo del registro: el cliente renueva el token y reintenta.
- **B-6.3 Ruta de sincronización.** `src/routes/sync.ts` (`POST /sync`): valida la petición con los esquemas de `sync-contract/`, procesa los registros **en orden**, y responde un resultado **por registro**. **Idempotencia:** un `recordId` ya procesado devuelve `duplicate` con el resultado original y no toca los datos.
- **B-6.4 Reglas del servidor.** `src/services/sync-service.ts`: reutiliza las reglas del dominio y añade las del "ERP simulado": `AMOUNT_OVER_LIMIT` (límite por movimiento configurable; valor por defecto documentado), `SESSION_NOT_FOUND` (movimiento de una sesión desconocida), `SESSION_CLOSED_SERVER`, `INVALID_TYPE`, `INVALID_PAYLOAD`, `FORCED_REJECTION`. Cada registro se procesa en su propia transacción.
- **B-6.5 Panel y controles de demostración.**
  - `GET /` (`src/views/dashboard.html`): página que se actualiza sola con contadores, últimos 50 registros recibidos con su resultado y, **siempre visible, el rótulo "SIMULACIÓN — no es el ERP real"**.
  - `src/routes/demo.ts`: `GET /demo/state`, `POST /demo/config` (límite de monto, **rechazar los próximos N**, **latencia artificial**, **fallar los próximos N** con HTTP 503, **perder la respuesta de los próximos N**: el servidor procesa el registro pero corta la respuesta, de modo que el cliente cree que falló y reintenta, lo que produce un duplicado real), `POST /demo/close-session/:id` y `POST /demo/reset`.

### Motor en la app (`apps/mobile/src/sync`)
- **B-6.6 Motor.** `sync-engine.ts` (implementa `SyncEngine`): un solo ciclo a la vez; comprueba conectividad; asegura token (pidiéndolo al `ApiClient`; ante `401`, renueva una vez); toma las entradas **vencidas** (`pending`, o `error` cuyo `nextAttemptAt` ya pasó) **por orden de `sequence`** en lotes de 20; las marca `syncing`; llama a `sendBatch`; aplica los resultados **en una transacción**:
  - `accepted` o `duplicate` → `synced`.
  - `rejected` → `rejected`, guardando el motivo; no se reintenta.
  - fallo de red, HTTP 5xx o tiempo agotado → `error`, `attempts + 1` y `nextAttemptAt` según la espera creciente; el ciclo se detiene en el primer fallo de red.
  - contrato roto → `error` con el detalle (es un fallo nuestro, no del servidor).
  - Al arrancar, toda entrada que quedó en `syncing` vuelve a `pending` (recuperación tras cierre forzado).
- **B-6.7 Espera y disparadores.** `backoff.ts` (función pura: 1 s, 5 s, 30 s, 2 min, 10 min como tope; tras un máximo de intentos queda en `error` sin próximo intento automático hasta "Reintentar" manual) y `triggers.ts` (arranque de la app, vuelta a primer plano, recuperación de conexión, intervalo de 30 s en primer plano, botón manual).
- **B-6.8 `createServices()` completo.** Ahora recibe el `ApiClient` del Frontend como dependencia, crea el motor real y lo devuelve en `Services`. Actualiza el estado visible (`sync-state.ts`) y las acciones de auditoría `sync_accepted`, `sync_rejected`, `sync_failed`.
- **B-6.9 Documentación y registro.** `manual-tecnico.md`: protocolo de sincronización, **cómo ejecutar el servidor en la demo** (IP de la PC con `ipconfig`, regla de cortafuegos de Windows para el puerto, Wi-Fi sin internet o punto de acceso del teléfono) y solución de problemas; `manual-usuario.md` "Sincronización y errores"; `registro-de-pruebas.md`.

**Pruebas automáticas que deben pasar:**
- Servidor (peticiones simuladas sin red real): idempotencia, cada código de rechazo, `401`, procesamiento en orden, panel con datos correctos.
- Motor (con un `ApiClient` falso y reloj simulado): lote mixto aceptado/rechazado, caída de red a mitad de lote, calendario de reintentos, recuperación tras cierre forzado, **respuesta perdida seguida de reintento = un solo registro en el servidor**, orden estricto.
**Terminada cuando:** las 8 pruebas del teléfono pasan, incluida la de "sin duplicados" visible en el panel.

---

## ETAPA E7 — Ampliación funcional (recortable)

**Tu objetivo.** Pagos, transferencias, anulaciones, auditoría consultable y exportación.
**Prueba de etapa:** `PLAN_FRONTEND.md` E7.

- **B-7.1 Catálogo ampliado.** Añadir `payment` (exige contraparte y referencia), `transfer_out` y `transfer_in` (exigen caja de contraparte y código de referencia) y `reversal` (generado por el sistema). Actualizar `modelo-de-datos.md`.
- **B-7.2 Anulaciones.** `packages/domain/src/rules/reversal-rules.ts`: `validateReversal(user, original, session, reason, now)`: solo en la sesión abierta, motivo obligatorio, sin anular lo ya anulado ni una anulación. `movement-repository.reverse` crea el movimiento inverso (dirección contraria, mismo monto, `reversalOf` apuntando al original) y marca el original (`reversedBy`), en una sola transacción con su cola y auditoría. El saldo esperado vuelve al valor previo sin cambiar `summarizeSession`.
- **B-7.3 Migración de esquema.** Subir la base local a la **versión 2** (nuevos índices por `reversalOf` y contraparte) con migración probada desde datos reales de la versión 1.
- **B-7.4 Auditoría y exportación.** `audit-repository` con filtros (usuario, acción, rango de fechas) y paginación; `packages/domain/src/export/session-csv.ts`: texto CSV a partir de `buildSessionReport`, con separador `;`, decimales con coma y marca de orden de bytes para que abra bien con acentos en hojas de cálculo.
- **B-7.5 Servidor.** Aceptar los tipos nuevos; validar `reversalOf` (`REVERSAL_TARGET_UNKNOWN` como nuevo motivo, coordinado con el contrato del Frontend); en el panel, listar **transferencias sin pareja**.
- **B-7.6 Documentación y registro.** `manual-usuario.md` "Pagos, transferencias, anulaciones, auditoría y exportación"; `limitaciones.md` con lo que se recortó, si hubo recortes; `registro-de-pruebas.md`.

**Pruebas automáticas que deben pasar:** anulación feliz y las tres prohibiciones; el saldo esperado antes y después; migración v1→v2 conserva los datos; CSV con acentos y comas dentro de las descripciones correctamente escapadas; transferencias emparejadas y no emparejadas en el panel.
**Terminada cuando:** pasan las 7 pruebas del teléfono o el recorte está acordado y documentado.

---

## ETAPA E8 — Pulido, endurecimiento y entrega

**Tu objetivo.** Datos y documentación a prueba de demo: estable, probado de extremo a extremo y explicado.
**Prueba de etapa:** `PLAN_FRONTEND.md` E8.

- **B-8.1 Prueba de extremo a extremo sin interfaz.** `apps/mobile/src/data/e2e/full-flow.test.ts`: dominio + repositorios + motor + servidor en el mismo proceso, ejecutando el flujo completo del `tarea.md` (abrir, registrar sin conexión, contar y cerrar, reconectar, sincronizar). Más una prueba de carga con 1.000 registros.
- **B-8.2 Robustez de datos.** Manejo de almacenamiento lleno y de migraciones bloqueadas, `apps/mobile/src/data/reset.ts` con `resetLocalData()` (borra todo y vuelve a sembrar; el Frontend le pone un botón con doble confirmación) y `data/export-db.ts` (volcado de la base local para soporte).
- **B-8.3 Escenario de demo.** Ampliar `demo-data.ts` con `loadDemoScenario()`: deja la app en un estado conocido que incluye, a propósito, un movimiento que el servidor va a rechazar por el límite.
- **B-8.4 Cobertura y calidad.** Cobertura de líneas del dominio ≥ 90 %, de `data` y `sync` ≥ 80 %; sin `any` implícito; sin PIN ni tokens en registros del servidor.
- **B-8.5 Documentación final.**
  - `manual-usuario.md`: por rol, con las capturas que entregue el Frontend (`docs/img/`).
  - `manual-tecnico.md`: arquitectura de datos, protocolo, ejecución del servidor, solución de problemas.
  - `guion-demo.md` definitivo (≈ 5 minutos): abrir caja → modo avión → registrar → reiniciar la app → contar y cerrar con diferencia → reconectar → ver aceptados y un rechazo → panel del servidor.
  - `limitaciones.md`: PIN y base **sin cifrado real**, autenticación simulada, **servidor simulado y no el ERP**, moneda única por sesión, y siguientes pasos.
  - `registro-de-pruebas.md` completo con todas las etapas.
- **B-8.6 Revisión de seguridad básica.** Lista en `limitaciones.md`: sin secretos en el repo, caducidad de token, validación de toda entrada en el servidor, CORS, registros sin datos sensibles.

**Terminada cuando:** la prueba de extremo a extremo y la de carga pasan, la documentación está completa y el guion de demo se ha ejecutado tres veces seguidas sin fallos.

---

## 4. Documentación a tu cargo: cuándo se actualiza cada archivo

| Archivo | Se crea | Se actualiza | Versión final |
|---|---|---|---|
| `contratos/modelo-de-datos.md` | E0 | E2 (sesión), E3 (movimiento), E7 (tipos nuevos) | E8 |
| `contratos/roles-permisos.md` | E0 | solo si cambia la matriz | E1 |
| `manual-tecnico.md` | E0 | E1, E5, E6 | E8 |
| `manual-usuario.md` | E1 | cada etapa | E8 (con capturas) |
| `registro-de-pruebas.md` | E0 | cada etapa | E8 |
| `guion-demo.md` | E0 | E6 y E7 | E8 |
| `limitaciones.md` | E0 | cuando surja una limitación | E8 |

---

## 5. Registro de pruebas (formato de entrada)

Al cerrar cada etapa añades **una entrada** a `docs/registro-de-pruebas.md`, con esta estructura:

1. **Etapa y hito:** `E3 — v0.3.0`.
2. **Fecha y quién probó.**
3. **Dispositivo:** modelo y versión de Android.
4. **Pruebas automáticas:** número que pasan sobre el total y cobertura del dominio.
5. **Prueba en el teléfono:** tabla `paso | resultado (✓/✗) | observación | Issue`. Los pasos son los de la etapa en `PLAN_FRONTEND.md`, con la misma numeración.
6. **Fallos abiertos y su Issue**, con etiqueta `etapa-N` y `front` o `back`.
7. **Veredicto:** etapa cerrada, sí o no, y qué falta si es no.

---

## 6. Reglas de calidad de tu parte

- Cada regla de negocio nueva viene con su prueba en el **mismo PR**.
- Los datos de prueba salen de `packages/domain/tests/fixtures/` y de `@caja/domain/testing`; no se crean datos sueltos dentro de cada prueba.
- Ningún repositorio confía en lo que llega de la UI: **revalida con el dominio**.
- Ningún cambio de contrato (campos, códigos, endpoints) se hace en solitario: PR conjunto con el Frontend.
- Si dudas de a quién le toca un archivo, mira la tabla de `PLAN_FRONTEND.md` §2; si no está, lo decidís juntos antes de crearlo.
