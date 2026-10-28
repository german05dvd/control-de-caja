# Plan de trabajo — FRONTEND, DEPLOY y API

> **Documento 1 de 2.** El otro es `PLAN_BACKEND.md` (datos, reglas de negocio, sincronización, servidor, manuales y registros).
> **Ubicación en el repo:** `docs/plan/PLAN_FRONTEND.md`
> **Quién lo ejecuta:** el integrante de Frontend / Deploy / API.
> **Producto:** app móvil Android *offline-first* de control de caja (reto "Offline-First Mobile App for Operational Cash Management", Avangenio Hackathon). El servidor es una **simulación** del ERP y así debe presentarse siempre.

---

## 0. Cómo leer este documento

- **Etapa** = un trozo de producto que se puede usar. Al final de **cada** etapa se genera una APK real y se prueba en un teléfono. No se empieza una etapa con la anterior rota.
- **IDs de tarea:** `F-<etapa>.<n>` en este documento, `B-<etapa>.<n>` en `PLAN_BACKEND.md`. Una tarea indica `Depende de:` cuando necesita algo del otro documento.
- **No superposición:** cada archivo tiene **un único dueño** (§2). Si necesitas un cambio en un archivo ajeno, abres un Issue o un PR dirigido al dueño; no lo editas.
- **Pruebas de aceptación:** viven solo aquí (porque se hacen en la app). El otro documento tiene las pruebas *automáticas* que debe pasar cada etapa.
- **Formato de datos que me llega del backend:** la especificación completa está en `PLAN_BACKEND.md` §2. Aquí solo se resume en la §3.
- **Sin código todavía:** este plan describe *qué lleva cada archivo*, no lo escribe.

---

## 1. Reglas comunes del equipo

### 1.1 Flujo de Git
- `main` está protegida: nada se sube directo. Todo entra por Pull Request con **la aprobación del otro**.
- Ramas: `feat/e<etapa>-<tema>` (ej. `feat/e3-nuevo-movimiento`), `fix/<tema>`, `docs/<tema>`.
- Commits con prefijo: `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `ci:`.
- Merge con *squash* para que `main` quede legible.
- Plantilla de PR (`.github/pull_request_template.md`): qué cambia, tarea (`F-x.y`/`B-x.y`), cómo probarlo, checklist de DoD.

### 1.2 Hito de etapa (cómo se genera la APK)
1. Todas las tareas de la etapa están en `main` y el CI está en verde.
2. Se crea la etiqueta del hito (`v0.<etapa>.0`; E0 usa `v0.0.1`; E8 usa `v1.0.0`) y se sube a GitHub.
3. El workflow `release-apk.yml` compila la APK en los servidores de GitHub y la publica en **Releases**.
4. Se descarga la APK (desde el navegador del teléfono o desde la PC y por USB/WhatsApp) y se instala permitiendo "orígenes desconocidos".
5. Ambos ejecutan la **Prueba en el teléfono** de la etapa. El Backend anota el resultado en `docs/registro-de-pruebas.md`; los fallos se abren como Issues con las etiquetas `etapa-N` y `front` o `back`.
6. La etapa está **cerrada** solo cuando la prueba pasa completa.

Entre hitos se desarrolla en la PC con el navegador (`npm run dev`, modo móvil de DevTools). Además, cada merge a `main` genera una **APK de depuración como artefacto** del CI para probar rápido sin etiquetar.

### 1.3 Definición de "tarea terminada" (DoD)
- Compila, pasa `lint` y las pruebas del workspace que tocaste.
- Si añade un código de error, una acción de permiso, un campo o un endpoint, el **contrato correspondiente en `docs/contratos/`** está actualizado en el mismo PR.
- Revisado y aprobado por el otro integrante.
- Sin textos en español dentro de componentes (van en `src/i18n/`).

### 1.4 Convenciones
- **Código en inglés** (carpetas, tipos, funciones). **Textos de la interfaz y documentación en español.**
- Componentes React: `PascalCase.tsx`. Resto de archivos: `kebab-case.ts`.
- Un componente por archivo; las pantallas terminan en `Page`.
- Ningún componente accede a Dexie ni a `fetch`: solo usa los **puertos** (`ports.ts`) a través de hooks.

### 1.5 Trabajar con IA sin romper el contrato
Al pedir código a una IA, pega siempre como contexto: `ports.ts`, `docs/contratos/modelo-de-datos.md` y el contrato que afecte a la tarea. Pide que genere **solo dentro de tu carpeta** (§2) y que no invente campos ni códigos de error. Revisa que respete la regla de no acceso directo a datos (§1.4).

---

## 2. Propiedad de archivos (fuente única para ambos documentos)

| Zona | Dueño |
|---|---|
| `.github/**` (workflows, plantilla de PR) | **Frontend** |
| Raíz: `package.json`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc`, `.editorconfig`, `.gitignore`, `.nvmrc`, `LICENSE`, `README.md`, `CHANGELOG.md` | **Frontend** |
| `apps/mobile/` **excepto** `src/data/**` y `src/sync/**` | **Frontend** (incluye `src/app`, `src/ui`, `src/features`, `src/i18n`, `android/`, `resources/`, configs y `src/app/fakes/`) |
| `apps/mobile/src/sync/api-client.ts` y `apps/mobile/src/sync/serializers.ts` | **Frontend** (excepciones dentro de `sync/`) |
| `packages/domain/src/ports.ts` y `packages/domain/src/sync-contract/**` | **Frontend** (excepciones dentro de `domain/`) |
| `docs/arquitectura.md`, `docs/decisiones.md`, `docs/checklist-ui.md`, `docs/contratos/api-sync.md`, `docs/contratos/pantallas.md`, `docs/plan/PLAN_FRONTEND.md` | **Frontend** |
| `packages/domain/**` (resto) | **Backend** |
| `apps/mobile/src/data/**` y `apps/mobile/src/sync/**` (resto) | **Backend** |
| `apps/server/**` | **Backend** |
| `docs/contratos/modelo-de-datos.md`, `docs/contratos/roles-permisos.md`, `docs/manual-usuario.md`, `docs/manual-tecnico.md`, `docs/registro-de-pruebas.md`, `docs/guion-demo.md`, `docs/limitaciones.md`, `docs/plan/PLAN_BACKEND.md` | **Backend** |

> Nota de refinamiento: en la estructura acordada había un único `docs/contratos.md`. Pasa a ser la carpeta `docs/contratos/` con un archivo por contrato, para que cada archivo tenga un solo dueño.

---

## 3. Qué recibo del Backend (resumen)

Lo detallado está en `PLAN_BACKEND.md` §2. En una línea cada cosa:
1. Reglas puras de dominio que devuelven `Result` (nunca lanzan por errores de negocio); los errores son **códigos**, no textos. Yo los traduzco en `src/i18n/`.
2. Repositorios que implementan mis puertos (`ports.ts`), todos asíncronos, con métodos `watch*` para listas en vivo.
3. Montos siempre en **centavos enteros** (`...Minor`), fechas en **ISO-8601 UTC** (`...At`), enums en `snake_case`.
4. Un `createServices()` único que me entrega todos los repositorios y el motor de sincronización.
5. Yo le entrego: `ports.ts` (lo que la UI necesita), el contrato HTTP (`api-sync.md` + `sync-contract/`) y los textos en español de cada código.

---

## 4. Mapa de etapas

| Etapa | Nombre | Qué se puede probar al terminar | Peso | ¿Recortable? |
|---|---|---|---|---|
| E0 | Cimientos y contratos | APK "hola mundo" instalada, habla con el servidor | M | No |
| E1 | Acceso y roles | Login con 3 usuarios, pestañas según rol | M | No |
| E2 | Apertura de caja | Abrir caja con saldo inicial, persiste al reiniciar | S | No |
| E3 | Movimientos y saldo | Registrar, listar y ver saldo esperado | L | No |
| E4 | Conteo y cierre | Contar, ver diferencia, cerrar, historial | M | No |
| E5 | Offline real y estados | Modo avión, reinicio, cola y estados visibles | M | No |
| E6 | Sincronización | Sincronizar con el servidor simulado, duplicados, rechazos | L | No |
| E7 | Ampliación | Pagos, transferencias, anulaciones, auditoría, exportar | L | **Sí** (primero lo que se recorta) |
| E8 | Pulido y entrega | Release `v1.0.0`, demo ensayada | M | No |

Línea de corte: el MVP mínimo del reto es **E0 a E6 + E8**. Si el tiempo aprieta, E7 se recorta por partes (se conservan las anulaciones y la auditoría antes que las transferencias).

---

## ETAPA E0 — Cimientos y contratos

**Objetivo.** Repo listo, APK vacía instalada en un teléfono comunicándose con el servidor, y los contratos firmados por ambos.

### Prueba en el teléfono
1. El CI de `main` está en verde y produce una APK de depuración como artefacto.
2. Al subir la etiqueta `v0.0.1`, aparece una Release con la APK firmada.
3. Instalar la APK: se abre, muestra nombre, versión y una línea **"Servidor: conectado / sin conexión"**.
4. Con el servidor corriendo en una PC en la misma Wi-Fi y escribiendo su IP en el campo temporal, la línea pasa a "conectado".
5. Detener el servidor: pasa a "sin conexión" en pocos segundos.

### Tareas
- **F-0.1 Raíz del monorepo.** Archivos en la raíz:
  - `package.json`: `workspaces` = `packages/*` y `apps/*`; scripts `dev` (app en navegador), `server`, `test` (todos los workspaces), `lint`, `build`, `build:android`.
  - `tsconfig.base.json`: TypeScript estricto, `paths` hacia `@caja/domain`.
  - `eslint.config.js` y `.prettierrc`: reglas comunes; una regla que **prohíba importar `dexie` o `fetch` desde `src/features` y `src/ui`**.
  - `.nvmrc` con la versión de Node LTS elegida, `.editorconfig`, `.gitignore` (node_modules, dist, android/build, `.env`, keystores), `LICENSE`, `README.md` provisional (qué es + cómo arrancar).
- **F-0.2 Esqueleto de la app.** `apps/mobile/`: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/app/App.tsx`, `src/ui/theme/variables.css`. La pantalla inicial (`src/features/hello/HelloPage.tsx`) muestra nombre, versión y el estado del servidor con un campo temporal para la URL.
- **F-0.3 Capacitor y Android.** `apps/mobile/capacitor.config.ts` (appId, appName, `webDir: dist`, permiso de HTTP en claro hacia la red local), carpeta `apps/mobile/android/` generada por Capacitor y subida al repo, y ajustes del manifiesto para permitir HTTP en claro y acceso a red. `apps/mobile/resources/icon.png` y `splash.png` provisionales.
- **F-0.4 Workflows.**
  - `.github/workflows/ci.yml`: en cada PR y push a `main` instala dependencias, ejecuta lint y pruebas de todos los workspaces y compila el web; en `main` además compila la APK de depuración y la sube como artefacto.
  - `.github/workflows/release-apk.yml`: al subir una etiqueta `v*`, instala Node, Java (la versión que exija la versión de Capacitor elegida: **verificar en su documentación**), el SDK de Android, compila el web, sincroniza Capacitor, compila la APK de *release*, la firma y crea la Release con el archivo adjunto.
  - `.github/pull_request_template.md`.
- **F-0.5 Firma de la APK.** Documentar en `docs/arquitectura.md` (sección "Firma") el plan:
  - **Plan A:** generar un keystore propio con `keytool` y guardarlo en los *Secrets* del repo (archivo en base64, contraseña, alias).
  - **Plan B (si no se puede instalar un JDK):** keystore de demostración subido al repo, declarado como **no secreto**. Esto mantiene la misma firma entre versiones, de modo que las actualizaciones se instalan sobre la app anterior.
- **F-0.6 `packages/domain/src/ports.ts`.** Interfaces que la UI necesita, **sin implementación**:
  - `UserRepository` (`listDemoUsers`, `getById`, `verifyPin`).
  - `RegisterRepository` (`list`, `getById`).
  - `SessionRepository` (`openSession`, `closeSession`, `getById`, `getOpenForUser`, `listByUser`, `listAll`, `watchOpenForUser`, `watchAll`).
  - `MovementRepository` (`add`, `reverse`, `getById`, `listBySession`, `watchBySession`).
  - `OutboxRepository` (`getSummary`, `listEntries`, `watchSummary`, `watchEntries`, `retryEntry`).
  - `AuditRepository` (`listByEntity`, `list`, `watchRecent`).
  - `SettingsRepository` (`get`, `set`, `watch`).
  - `SyncEngine` (`start`, `stop`, `syncNow`, `getState`, `subscribe`) y `Connectivity` (`isServerReachable`, `subscribe`).
  - `ApiClient` (`health`, `login`, `sendBatch`) y el tipo `ApiResult` (éxito con resultados por registro, o fallo clasificado como red, HTTP o contrato roto). El motor del Backend recibe un `ApiClient` por inyección; yo implemento el real en E6.
  - `Services`: objeto que agrupa todo lo anterior.
  - Reglas: todo asíncrono; los `watch*` llaman al callback **de inmediato** con el valor actual y devuelven una función para cancelar; los métodos de escritura devuelven `Result` (ver `PLAN_BACKEND.md` §2).
- **F-0.7 `docs/contratos/api-sync.md` v1** (y carpeta vacía `packages/domain/src/sync-contract/`). Contrato HTTP: `GET /health`, `POST /auth/token`, `POST /sync`. Para cada uno: cabeceras (`Authorization`, `X-Device-Id`, `X-Api-Version`), campos de petición y respuesta, resultado por registro (`accepted`, `rejected`, `duplicate`), lista de códigos de motivo, tiempos de espera, versión del contrato (`apiVersion: 1`). Regla de idempotencia: el mismo `recordId` enviado dos veces nunca crea dos registros.
- **F-0.8 `docs/contratos/pantallas.md` v1.** Una fila por pantalla: ruta, rol que puede entrar, datos que usa (puerto), acciones y estados (cargando, vacío, error). Pantallas: Login, Inicio, Abrir caja, Detalle de sesión, Nuevo movimiento, Detalle de movimiento, Conteo y cierre, Resumen de cierre, Historial, Detalle de sesión cerrada, Sincronización, Detalle de registro de cola, Auditoría, Ajustes, Perfil.
- **F-0.9 `docs/arquitectura.md` y `docs/decisiones.md` v1.** Arquitectura: diagrama de dependencias (`domain` ← `mobile`/`server`), regla de puertos, firma de la APK. Decisiones: una línea por decisión con alternativa descartada (Capacitor, React, Ionic, Dexie, Fastify, monorepo, estados de sincronización, centavos enteros, movimientos inmutables).
- **F-0.10 Cierre de contratos.** Revisión cruzada junto con `B-0.9`: ambos leen los 5 contratos (`modelo-de-datos`, `roles-permisos`, `api-sync`, `pantallas`, `ports.ts`), abren Issues con dudas y aprueban un PR "contratos v1".
- **F-0.11 Primer hito `v0.0.1`.** Ejecutar la prueba de la etapa.

### Integración
La app solo llama a `GET /health` (a través de un `fetch` provisional dentro de `HelloPage`; se sustituirá por `api-client.ts` en E6).

### Terminada cuando
La prueba pasa, los contratos están aprobados y ninguno de los dos queda bloqueado esperando al otro.

---

## ETAPA E1 — Acceso y roles

**Objetivo.** Entrar con un usuario de demostración y un PIN, ver una navegación que depende del rol y mantener la sesión tras reiniciar la app.

### Prueba en el teléfono
1. Aparecen 3 usuarios (Vendedor, Supervisor, Contabilidad) con su rol visible.
2. PIN incorrecto: mensaje claro y contador de intentos; tras varios fallos, bloqueo temporal con cuenta atrás.
3. PIN correcto: entra al shell con pestañas **diferentes por rol** (el contador no ve nada que escriba).
4. Cerrar la app desde multitarea y volver a abrir: sigue dentro con el mismo usuario.
5. Perfil → "Cerrar sesión" vuelve al login.
6. Tema claro/oscuro correcto y sin textos cortados en pantallas pequeñas.

### Tareas
- **F-1.1 Sistema de diseño base.** `apps/mobile/src/ui/theme/variables.css` (tokens: paleta oscura azul-petróleo y variante clara, espaciado en múltiplos de 4, radios, sombras, escala tipográfica, colores semánticos de ingreso/egreso/advertencia/error), `src/ui/theme/theme.ts` (aplica claro/oscuro según el sistema y permite forzarlo), y fuente incluida en el paquete (sin depender de Google Fonts, por los bloqueos).
- **F-1.2 Componentes base** en `src/ui/components/`: `AppButton.tsx` (variantes primaria/secundaria/peligro, estado cargando), `Card.tsx`, `AppHeader.tsx`, `UserAvatar.tsx` (iniciales y color), `PinPad.tsx` (teclado numérico de 4 dígitos con puntos y borrar), `EmptyState.tsx`.
- **F-1.3 Textos y errores.** `src/i18n/es.ts` (textos generales) y `src/i18n/error-codes.ts` (**un texto en español por cada `ErrorCode` del dominio**). Prueba en `src/i18n/error-codes.test.ts` que recorre todos los códigos exportados por el dominio y falla si falta alguno.
- **F-1.4 Servicios y fakes.** `src/app/providers/ServicesProvider.tsx` (entrega `Services` por contexto; elige entre servicios reales o *fakes* con la variable `VITE_USE_FAKES`). `src/app/fakes/create-fake-services.ts`: implementaciones en memoria de los puertos con datos fijos, para desarrollar pantallas antes de que el Backend entregue.
- **F-1.5 Estado de autenticación.** `src/app/store/auth-store.ts` (Zustand): `currentUser`, `login(userId, pin)`, `logout()`, `restore()` (lee el usuario activo de `SettingsRepository`).
- **F-1.6 Pantallas de acceso.** `src/features/auth/LoginPage.tsx` (tarjetas de usuario), `src/features/auth/PinPage.tsx` (PinPad, errores traducidos, cuenta atrás de bloqueo), `src/features/auth/useAuth.ts`.
- **F-1.7 Shell y rutas.** `src/app/routes.tsx` y `src/app/AppShell.tsx`: pestañas inferiores (Caja, Movimientos, Sincronización, Perfil; las que no aplican al rol no se muestran), guardas `RequireAuth.tsx` y `RequirePermission.tsx`.
- **F-1.8 Permisos en la UI.** `src/ui/permissions/Can.tsx` y `usePermission.ts`: envuelven `can(role, action)` del dominio. Regla: **la UI oculta o deshabilita, pero la autoridad es el dominio**.
- **F-1.9 Perfil.** `src/features/profile/ProfilePage.tsx`: usuario, rol, lista legible de "qué puedes hacer" (se genera desde la matriz de permisos), versión de la app y botón de cerrar sesión.
- **F-1.10 Actualizar `pantallas.md`** y hacer el hito `v0.1.0`.

**Depende de:** `B-1.1` a `B-1.6` (base local, usuarios, PIN, permisos). Mientras tanto se trabaja con los *fakes* de F-1.4.

### Integración
Se cambia `VITE_USE_FAKES` a falso. Los 3 usuarios deben venir de la base local (`B-1.2`), no de los fakes.

### Terminada cuando
Se supera la prueba con servicios reales y el test de textos de errores pasa.

---

## ETAPA E2 — Apertura de caja

**Objetivo.** Abrir una sesión de caja con saldo inicial, persistirla y mostrar el estado en Inicio.

### Prueba en el teléfono
1. Con el Vendedor: Inicio muestra "Sin caja abierta" y el botón **Abrir caja**.
2. Abrir con `0,00` y con `1.250,50`: ambos funcionan; la pantalla muestra caja asignada, hora de apertura y saldo inicial.
3. Entradas inválidas (vacío, `abc`, `-5`, `12.5`, tres decimales): mensaje de error por campo, sin cerrar el formulario.
4. Intentar abrir una segunda caja con el mismo usuario: no es posible (botón ausente y, si se fuerza, error traducido).
5. Matar y reabrir la app: la caja sigue abierta con los mismos datos.
6. El Supervisor abre su propia caja; el Contador **no** ve el botón y ve el listado de todas las cajas en solo lectura.

### Tareas
- **F-2.1 Componentes de monto.** `src/ui/components/AmountInput.tsx` (teclado numérico decimal, formato en vivo con `formatAmount`, entrega el texto crudo; la conversión a centavos la hace `parseAmount` del dominio) y `src/ui/components/AmountText.tsx` (cifras tabulares, signo y color por ingreso/egreso).
- **F-2.2 Diálogos y tarjetas.** `ConfirmDialog.tsx` y `SessionStatusCard.tsx` en `src/ui/components/`.
- **F-2.3 Pantalla Inicio.** `src/features/cash-session/HomePage.tsx`: tres estados (sin caja, caja abierta, vista de solo lectura para el Contador). Muestra caja asignada, hora de apertura y saldo inicial. Los botones de movimientos y cierre se añaden en E3/E4 (no se dejan botones muertos).
- **F-2.4 Abrir caja.** `src/features/cash-session/OpenSessionPage.tsx`: `AmountInput`, caja asignada (solo lectura, viene de `RegisterRepository`), confirmación y errores por campo traducidos.
- **F-2.5 Hook.** `src/features/cash-session/useCashSession.ts`: usa `watchOpenForUser` y entrega `{ session, loading }`.
- **F-2.6 Listado de cajas.** `src/features/cash-session/AllSessionsPage.tsx`: para Supervisor y Contador (acción `session.viewAll`): usuario, caja, estado, saldo inicial, apertura.
- **F-2.7 Actualizar `pantallas.md`** y hito `v0.2.0`.

**Depende de:** `B-2.1` a `B-2.5`.

### Integración
`SessionRepository.openSession` real. Verificar que el error de "ya tiene una caja abierta" llega como código y se traduce.

### Terminada cuando
La prueba pasa con base local real y sobrevive a un reinicio.

---

## ETAPA E3 — Movimientos y saldo esperado

**Objetivo.** Registrar movimientos de caja por tipo, verlos en lista y detalle, y ver el saldo esperado actualizado.

### Prueba en el teléfono
1. Con una caja abierta, **Registrar movimiento** ofrece los tipos agrupados en Ingresos y Egresos. El Vendedor **no** ve "Pago de salario"; el Supervisor sí.
2. Registrar una venta de `100,00`: aparece en la lista con su hora, tipo, descripción y la etiqueta de estado, y el saldo esperado sube `100,00`.
3. Registrar un reembolso y un gasto: el saldo esperado baja correctamente.
4. Validaciones: monto `0`, descripción de menos de 3 caracteres, fecha futura: cada una muestra su error junto al campo.
5. Filtros: Todos / Ingresos / Egresos y por tipo.
6. Abrir el detalle: se ven todos los campos, el usuario, las fechas y el historial.
7. Reiniciar la app: todo sigue ahí.
8. El Contador no puede registrar (el botón no aparece).
9. Perfil → "Cargar datos de ejemplo" (solo en modo demo) llena la caja con un conjunto de movimientos.

### Tareas
- **F-3.1 Textos de tipos.** `src/i18n/movement-types.ts`: por cada tipo del catálogo del dominio, etiqueta en español, nombre de icono y color semántico.
- **F-3.2 Componente de estado.** `src/ui/components/SyncBadge.tsx`: variantes para `local`, `pending`, `syncing`, `synced`, `error` y `rejected` (texto + icono; nunca solo color). En E3 todo se mostrará como `local`; en E5 se conecta al estado real.
- **F-3.3 Nuevo movimiento.**
  - `src/features/movements/NewMovementPage.tsx`: paso 1 elegir tipo, paso 2 formulario, paso 3 resumen y confirmar.
  - `src/features/movements/MovementTypePicker.tsx`: cuadrícula de tipos filtrada por `canCreateMovementType(role, type)`.
  - `src/features/movements/MovementForm.tsx` y `FormField.tsx`: el formulario se **genera a partir de los campos obligatorios del catálogo** del dominio (monto, descripción, fecha y hora; referencia cuando el tipo la exige). Valida con `validateNewMovement` y pinta cada `DomainError` junto a su campo (`error.field`).
- **F-3.4 Lista.** `src/features/movements/MovementsPage.tsx`: tarjeta de resumen (ingresos, egresos, saldo esperado) con `SessionSummaryCard.tsx`, chips de filtro, lista agrupada por día y estado vacío. `MovementListItem.tsx`: icono por tipo, monto con signo y color, descripción, hora y `SyncBadge`.
- **F-3.5 Detalle.** `src/features/movements/MovementDetailPage.tsx`: todos los campos, id corto (útil para soporte), usuario, fechas, estado e historial obtenido de `AuditRepository.listByEntity`. El botón "Anular" aparece desactivado hasta E7.
- **F-3.6 Hooks.** `src/features/movements/useMovements.ts` y `useSessionSummary.ts` (usan `watchBySession` y `summarizeSession` del dominio).
- **F-3.7 Inicio.** En `HomePage.tsx`: tarjeta de saldo esperado y botón flotante "Registrar movimiento", este último controlado por `Can`.
- **F-3.8 Datos de ejemplo.** Botón en `ProfilePage.tsx` (visible solo con `VITE_DEMO_MODE=true`) que llama a `loadDemoData()` del Backend.
- **F-3.9 Actualizar `i18n/error-codes.ts`** con los códigos nuevos, `pantallas.md` y hito `v0.3.0`.

**Depende de:** `B-3.1` a `B-3.7`.

### Integración
`MovementRepository.add` real. Comprobar que un error de validación múltiple (varios campos) se pinta campo por campo.

### Terminada cuando
Se pasan las 9 comprobaciones y el saldo esperado coincide con el cálculo manual en al menos 3 escenarios.

---

## ETAPA E4 — Conteo y cierre

**Objetivo.** Contar el efectivo, ver la diferencia con el saldo esperado, cerrar la sesión y consultar el historial.

### Prueba en el teléfono
1. **Cerrar caja** abre el conteo con dos modos: *total directo* y *desglose por billetes*.
2. Con el desglose, el total se calcula solo; cambiar a *total directo* conserva el valor.
3. Contado igual al esperado: "Caja cuadrada", sin pedir nota.
4. Contado menor: "Faltante"; mayor: "Sobrante". En ambos casos la nota es **obligatoria** y no se puede confirmar sin ella.
5. Confirmar: aparece el **Resumen de cierre** (saldo inicial, ingresos y egresos por tipo, esperado, contado, diferencia, nota, responsable).
6. La caja queda **cerrada**: no se pueden añadir movimientos y el Inicio ofrece "Abrir nueva caja".
7. El Historial muestra las sesiones cerradas; abrir una muestra sus movimientos en solo lectura.
8. El Supervisor y el Contador ven el historial de todos los usuarios; el Vendedor solo el suyo.
9. Reiniciar la app: todo se conserva.

### Tareas
- **F-4.1 Cierre en pasos.** `src/features/closing/ClosingPage.tsx`: 1) conteo, 2) revisión, 3) confirmación (con `ConfirmDialog`).
- **F-4.2 Contador de efectivo.** `src/features/closing/CashCounter.tsx`: alternador total/desglose, filas por denominación (cargadas de la configuración del dominio) con botones +/− y total en vivo. `src/features/closing/useClosing.ts` con la lógica de estado.
- **F-4.3 Tarjeta de diferencia.** `src/features/closing/VarianceCard.tsx`: esperado, contado, diferencia y etiqueta con color (cuadrada neutra, faltante/sobrante en advertencia o error). Textos en `i18n/closing.ts`.
- **F-4.4 Resumen.** `src/features/closing/ClosingSummaryPage.tsx`: formato tipo comprobante, con botón de compartir como texto mediante el plugin de compartir de Capacitor.
- **F-4.5 Historial.** `src/features/history/SessionHistoryPage.tsx` y `SessionDetailPage.tsx` (reutiliza `MovementListItem`, solo lectura).
- **F-4.6 Estados cerrados.** En `HomePage` y `MovementsPage`: ocultar "Registrar movimiento" cuando la sesión está cerrada, apoyándose en `canRegisterMovement(user, session)` del dominio.
- **F-4.7 Actualizar `pantallas.md`, `i18n/error-codes.ts`** y hito `v0.4.0`.

**Depende de:** `B-4.1` a `B-4.7`.

### Integración
`SessionRepository.closeSession` real. Comprobar que, tras cerrar, `MovementRepository.add` devuelve el código de sesión cerrada y la UI lo traduce.

### Terminada cuando
Los tres resultados (cuadrada, faltante, sobrante) se verifican en teléfono y la caja cerrada es inmutable.

---

## ETAPA E5 — Offline real y estados visibles

**Objetivo.** Garantizar que todo funciona sin conexión, que nada se pierde al reiniciar y que cada registro muestra su estado de sincronización. Todavía no se envía nada al servidor.

### Prueba en el teléfono
1. En Ajustes (como Supervisor), guardar la URL del servidor y usar **Probar conexión**: indica correcto o fallo.
2. Activar **modo avión**: aparece un banner "Sin conexión" en toda la app y todo sigue funcionando.
3. Registrar 5 movimientos y abrir/cerrar una caja con el modo avión activo.
4. Cerrar la app a la fuerza, reabrirla: los 5 movimientos y la sesión siguen allí.
5. Con la URL del servidor guardada, cada movimiento nuevo muestra la etiqueta **"Pendiente"**. Los creados *antes* de guardar la URL muestran **"Guardado local"** y pasan a "Pendiente" en cuanto se guarda.
6. La pestaña Sincronización muestra contadores por estado y la lista de registros en cola.
7. El botón "Sincronizar ahora" existe pero avisa que todavía no está disponible (se activa en E6).
8. Desactivar el modo avión: el banner desaparece o pasa a "Servidor inaccesible" si el servidor no está.

### Tareas
- **F-5.1 Banner de conexión.** `src/ui/components/ConnectionBanner.tsx`, integrado en `AppShell`: estados sin conexión, servidor inaccesible, sincronizando, conectado (este último no se muestra).
- **F-5.2 Pantalla de sincronización.** `src/features/sync-status/SyncStatusPage.tsx`: tarjeta de estado (conectado, última sincronización), contadores por estado, lista de registros (tipo, resumen, estado, intentos), filtro por estado y botón "Sincronizar ahora".
- **F-5.3 Estados reales.** Conectar `SyncBadge` a `movement.syncStatus` en la lista y el detalle (reemplaza el valor fijo de E3). `src/features/sync-status/useSyncSummary.ts`.
- **F-5.4 Ajustes.** `src/features/settings/SettingsPage.tsx`: URL del servidor con validación de formato, botón "Probar conexión" (usa `Connectivity`), identificador del dispositivo, interruptor de modo demo y versión. Solo para quien tenga `settings.manage`.
- **F-5.5 Indicador en la pestaña.** Insignia numérica en la pestaña Sincronización con `pending + error + rejected`.
- **F-5.6 Actualizar `pantallas.md`** y hito `v0.5.0`.

**Depende de:** `B-5.1` a `B-5.6`.

### Integración
Verificar que **cada escritura** (sesión y movimiento) crea su entrada de cola en la misma operación. Si un movimiento aparece sin cola, es un fallo de la etapa, no un detalle.

### Terminada cuando
La prueba pasa, incluida la persistencia tras matar la app con registros pendientes.

---

## ETAPA E6 — Sincronización con el servidor simulado

**Objetivo.** Enviar los registros al servidor simulado, sin duplicados, con reintentos, y mostrar el resultado (aceptado o rechazado, con motivo).

### Prueba en el teléfono
1. Servidor corriendo en la PC; teléfono y PC en la misma Wi-Fi (o hotspot) **sin internet**: la sincronización funciona igual.
2. Con 5 registros pendientes, tocar **Sincronizar ahora**: pasan a "Sincronizando" y luego a "Sincronizado"; el panel web del servidor muestra los 5.
3. Hacer una venta superior al límite del servidor: queda **"Rechazado"** y el detalle muestra el motivo en español y qué hacer.
4. Detener el servidor a mitad de una sincronización: los registros pasan a "Con error" con intentos y próximo reintento visibles; al reactivar el servidor se completan solos.
5. En el panel de demo del servidor, activar **"perder la respuesta de las próximas N peticiones"**: el servidor procesa el registro pero la app no recibe la respuesta, la da por fallida y reintenta; el servidor lo detecta como duplicado y el panel sigue mostrando **un solo** registro.
6. Matar la app durante "Sincronizando": al reabrir, los registros vuelven a "Pendiente" y se envían sin duplicarse.
7. Activar modo avión, registrar datos, desactivarlo: la sincronización se dispara sola.
8. Un registro "Rechazado" **no** se reintenta automáticamente; uno "Con error" sí.

### Tareas
- **F-6.1 Contrato final.** `packages/domain/src/sync-contract/`:
  - `sync-request.ts` y `sync-response.ts`: esquemas de validación (zod) de la petición (`deviceId`, `sentAt`, lista de registros con `recordId`, `kind` = sesión o movimiento, `operation`, carga útil) y de la respuesta (resultado por `recordId`).
  - `auth-contract.ts`: petición y respuesta del token.
  - `reason-codes.ts`: lista cerrada de códigos de motivo (`AMOUNT_OVER_LIMIT`, `SESSION_NOT_FOUND`, `SESSION_CLOSED_SERVER`, `INVALID_TYPE`, `INVALID_PAYLOAD`, `UNAUTHORIZED`, `FORCED_REJECTION`).
  - `index.ts` con `API_VERSION = 1`.
  Servidor y app validan con **los mismos esquemas**.
- **F-6.2 Cliente HTTP.** `apps/mobile/src/sync/api-client.ts`: métodos `health()`, `login(userId, pin)` y `sendBatch(records)`; tiempo máximo de 8 s con cancelación; añade las cabeceras del contrato; **clasifica el fallo** como red, HTTP o contrato roto (respuesta que no cumple el esquema); devuelve siempre un `ApiResult`, nunca lanza.
- **F-6.3 Serializadores.** `apps/mobile/src/sync/serializers.ts`: convierte `Movement` y `CashSession` en registros del contrato (centavos enteros, fechas ISO UTC, sin campos locales como `syncStatus`) y convierte los resultados del servidor en la entrada que espera el motor del Backend.
- **F-6.4 Detalle de registro de cola.** `src/features/sync-status/SyncEntryDetailPage.tsx`: estado, intentos, último error, cuenta atrás del próximo reintento, motivo del servidor y botón **Reintentar** (solo en "Con error"; no en "Rechazado").
- **F-6.5 Textos de motivos.** `src/i18n/reason-codes.ts`: por cada motivo del servidor, un texto humano y una **acción sugerida**. Test que falla si falta alguno.
- **F-6.6 Avisos.** Mensaje tras sincronizar ("3 sincronizados, 1 rechazado") y activación del botón "Sincronizar ahora" y del banner "Sincronizando".
- **F-6.7 Ajustes ampliados.** En `SettingsPage.tsx`: versión y hora del servidor tras "Probar conexión", estado del token.
- **F-6.8 Verificación Android.** Confirmar en teléfono real que el HTTP en claro hacia la IP de la PC funciona con la APK de *release*.
- **F-6.9 `api-sync.md` final** con ejemplos de petición y respuesta, y hito `v0.6.0`.

**Depende de:** `B-6.1` a `B-6.9` (servidor, motor de sincronización, panel de demo).

### Integración
El motor del Backend usa mi `ApiClient` y mis serializadores. Punto crítico: la forma exacta de `ApiResult` y del resultado por registro, ya fijada en `api-sync.md`; **cualquier cambio es un PR conjunto**.

### Terminada cuando
Las 8 pruebas pasan, incluida la de "sin duplicados" comprobada en el panel del servidor.

---

## ETAPA E7 — Ampliación funcional (recortable)

**Objetivo.** Pagos, transferencias, anulaciones, vista de auditoría y exportación para el Contador.

### Prueba en el teléfono
1. **Pago** a un tercero: exige contraparte y referencia; baja el saldo esperado.
2. **Transferencia de salida** hacia otra caja: exige caja destino y código de referencia; en la otra sesión se registra la **transferencia de entrada**; el panel del servidor marca pares sin emparejar.
3. **Anular** un movimiento (con motivo): el original queda marcado "Anulado", aparece el movimiento inverso enlazado y el saldo esperado vuelve al valor anterior.
4. No se puede anular dos veces, ni anular una anulación, ni en una caja cerrada.
5. En un registro **Rechazado**, la acción **Corregir** guía el flujo (anular y volver a registrar con los datos precargados).
6. **Auditoría** (Supervisor y Contador): línea de tiempo con filtros por usuario, acción y fecha.
7. El Contador exporta una sesión a **CSV** y lo comparte; el archivo abre bien en una hoja de cálculo con acentos correctos.

### Tareas
- **F-7.1 Formularios ampliados.** Extender `MovementForm.tsx` para los campos de pago y transferencia; `src/features/movements/CounterpartyPicker.tsx` (lista de cajas desde `RegisterRepository`).
- **F-7.2 Anulación.** En `MovementDetailPage.tsx`: botón "Anular", diálogo con motivo; `src/features/movements/ReversalLink.tsx` (enlace original ↔ inverso) y estilo "Anulado" en la lista.
- **F-7.3 Corrección de rechazados.** En `SyncEntryDetailPage.tsx`: acción "Corregir" con flujo guiado.
- **F-7.4 Auditoría.** `src/features/audit/AuditPage.tsx` (línea de tiempo con filtros) y `AuditEntryItem.tsx`.
- **F-7.5 Exportación.** `src/features/export/useExport.ts` y botón en el detalle de sesión: usa el CSV generado por el dominio, lo guarda con el plugin de archivos de Capacitor y lo comparte con el de compartir.
- **F-7.6 Actualizar** `pantallas.md`, `i18n/*` (tipos nuevos y códigos nuevos) y hito `v0.7.0`.

**Depende de:** `B-7.1` a `B-7.6`.

### Terminada cuando
Las 7 pruebas pasan o se acuerda por escrito qué parte se recorta y se documenta en `docs/limitaciones.md` (a través del Backend).

---

## ETAPA E8 — Pulido, endurecimiento y entrega

**Objetivo.** Producto presentable, estable, documentado y empaquetado.

### Prueba en el teléfono
1. Recorrido completo del `docs/guion-demo.md` **tres veces seguidas** sin fallos, con los tres roles.
2. Todas las pantallas tienen estados de carga, vacío y error; ninguna queda en blanco.
3. Se ve bien en tema claro y oscuro, en una pantalla pequeña y con el tamaño de letra del sistema aumentado.
4. Arranque en frío en el teléfono más modesto disponible en un tiempo razonable (medir y anotar).
5. Instalar `v1.0.0` **sobre** una versión anterior: se actualiza sin perder datos.
6. Alguien ajeno al equipo instala la APK siguiendo solo el README y completa el flujo.

### Tareas
- **F-8.1 Auditoría visual.** `docs/checklist-ui.md`: lista por pantalla (espaciado, alineación, tipografía, estados vacíos/carga/error, objetivos táctiles de al menos 44 px, contraste, teclado que no tapa campos, zona segura de la barra del sistema). Se recorre y se corrige todo lo que falle.
- **F-8.2 Marca.** Nombre final, icono y pantalla de arranque definitivos en `apps/mobile/resources/` (se generan los recursos de Android en el CI), color de la barra de estado y etiqueta de la app.
- **F-8.3 Robustez de la UI.** `src/app/ErrorBoundary.tsx` y `ErrorScreen.tsx` (nunca pantalla en blanco), avisos (toasts) consistentes, cinta "MODO DEMO / SERVIDOR SIMULADO" visible cuando corresponda, y en Ajustes un botón **"Restablecer datos locales"** con doble confirmación que llama a `resetLocalData()` del Backend (`B-8.2`).
- **F-8.4 Rendimiento.** Revisar listas largas (virtualizar si hay más de unos cientos de filas), tamaño del paquete y tiempo de arranque.
- **F-8.5 Release final.** Workflow de *release* con firma estable, `CHANGELOG.md`, notas de la Release, versión `1.0.0`.
- **F-8.6 README final.** Qué es (con la aclaración de que el servidor es simulado), captura o GIF, insignia de CI, enlace a la APK, instalación en dos líneas, inicio rápido (`npm install`, `npm run dev`, `npm run server`, `npm test`), mapa de la documentación, estructura del repo.
- **F-8.7 `docs/arquitectura.md` y `docs/decisiones.md` finales.**
- **F-8.8 Capturas** de cada pantalla por rol y entrega al Backend para el manual de usuario (en `docs/img/`).
- **F-8.9 Ensayo de la demo** y grabación de un vídeo corto (enlazado desde el README; el archivo pesado no se sube al repo). Hito `v1.0.0`.

**Depende de:** `B-8.1` a `B-8.6`.

### Terminada cuando
La Release `v1.0.0` está publicada, el README permite a un ajeno instalar y probar, y el criterio de la §5 se cumple entero.

---

## 5. Criterio de proyecto terminado (del `tarea.md`)

Se puede presentar cuando el producto: abre una sesión; registra y consulta movimientos **sin conexión**; los **conserva al reiniciar**; muestra el saldo y las diferencias del conteo; **sincroniza después sin duplicar**; los **permisos afectan** a las acciones principales; y los **errores de sincronización son visibles**. Equivale a E0–E6 completas y E8 hecha.

---

## 6. Riesgos y plan B

| Riesgo | Plan B |
|---|---|
| GitHub Actions falla o es lenta para compilar la APK | Mantener la app probable en el navegador con `npm run dev` y exponerla en la red local; compilar la APK en la PC de quien consiga instalar el SDK por otros medios (copias offline). |
| No se puede generar el keystore (sin JDK) | Plan B de F-0.5: keystore de demostración en el repo. |
| El teléfono bloquea la instalación | Activar "orígenes desconocidos" para el navegador o gestor de archivos usado; documentarlo en el manual. |
| Wi-Fi sin acceso a la PC (aislamiento de clientes) | Usar el punto de acceso del teléfono o de la PC; abrir el puerto en el cortafuegos de Windows (guía en `manual-tecnico.md`). |
| El Backend se retrasa | Seguir con los *fakes* (F-1.4); la integración se hace al final de la etapa. |
| Cambio de contrato a mitad de etapa | PR conjunto con ambos contratos actualizados; nunca cambios unilaterales. |
| Se agota el tiempo | Recortar E7 por partes; E8 no se recorta. |
