# Contrato de pantallas — v1

> Dueño: Frontend. Se actualiza en cada etapa. Las rutas son las de la app; los datos se obtienen
> **solo** a través de los puertos de `packages/domain/src/ports.ts` (mediante hooks).
> Roles: `cashier` = Vendedor, `supervisor` = Supervisor, `accountant` = Contabilidad.

## Navegación

- Antes del login: solo `/login` y `/login/pin`.
- Después del login: pestañas inferiores **Caja · Movimientos · Sincronización · Perfil**. Una pestaña que el rol no puede usar no se muestra.
- Las pantallas de detalle se abren sobre las pestañas y vuelven con "atrás".

## Pantallas

| Pantalla | Ruta | Roles | Puertos que usa | Acciones | Etapa |
|---|---|---|---|---|---|
| Login | `/login` | todos | `users` | elegir usuario | E1 |
| PIN | `/login/pin/:userId` | todos | `users`, `settings` | teclear PIN; ver bloqueo | E1 |
| Inicio (Caja) | `/tabs/caja` | todos | `sessions`, `movements`, `registers` | ver estado de caja, saldo esperado; ir a abrir, registrar o cerrar | E2–E4 |
| Abrir caja | `/caja/abrir` | cashier, supervisor | `sessions`, `registers` | introducir saldo inicial y confirmar | E2 |
| Todas las cajas | `/cajas` | supervisor, accountant | `sessions` | consultar (solo lectura) | E2 |
| Movimientos | `/tabs/movimientos` | cashier, supervisor | `movements` | listar, filtrar, resumen de saldo | E3 |
| Nuevo movimiento | `/movimientos/nuevo` | cashier, supervisor | `movements`, `sessions` | elegir tipo, rellenar, confirmar | E3 |
| Detalle de movimiento | `/movimientos/:id` | todos | `movements`, `audit` | ver campos e historial; anular (E7) | E3 |
| Conteo y cierre | `/caja/cerrar` | cashier, supervisor | `sessions`, `movements` | contar (total o desglose), ver diferencia, nota, confirmar | E4 |
| Resumen de cierre | `/caja/resumen/:sessionId` | todos | `sessions`, `movements` | consultar; compartir | E4 |
| Historial | `/historial` | todos (propio; supervisor y accountant, todos) | `sessions` | consultar | E4 |
| Detalle de sesión cerrada | `/historial/:sessionId` | todos | `sessions`, `movements` | consultar (solo lectura); exportar (E7) | E4 |
| Sincronización | `/tabs/sync` | todos (propio; supervisor y accountant, todos) | `outbox`, `syncEngine`, `connectivity` | ver contadores y cola; sincronizar ahora | E5–E6 |
| Detalle de registro de cola | `/sync/:entryId` | todos | `outbox` | ver estado, intentos, motivo; reintentar o corregir | E6–E7 |
| Auditoría | `/auditoria` | supervisor, accountant | `audit` | consultar y filtrar | E7 |
| Ajustes | `/ajustes` | supervisor | `settings`, `connectivity` | URL del servidor, probar conexión, modo demo, restablecer datos | E5–E8 |
| Perfil | `/tabs/perfil` | todos | `users`, `settings` | ver rol y permisos; cerrar sesión; datos de ejemplo (modo demo) | E1 |

## Estados que toda pantalla debe contemplar

1. **Cargando** (esqueleto o indicador, nunca pantalla en blanco).
2. **Vacío** (mensaje y, si procede, acción siguiente).
3. **Error** (mensaje traducido desde un código; nunca texto técnico).
4. **Sin permiso** (la ruta redirige o muestra aviso; la autoridad es el dominio).

## Reglas transversales

- Los errores del dominio llegan como **códigos**; el texto vive en `src/i18n/error-codes.ts`.
- El estado de sincronización se muestra siempre con `SyncBadge` (icono + texto, nunca solo color).
- Montos con `formatAmount`; fechas en hora de La Habana.
- La interfaz oculta o desactiva lo que el rol no puede hacer, pero el dominio también lo rechaza.
