# Decisiones técnicas

> Dueño: Frontend. Una línea por decisión, con la alternativa descartada y el motivo.

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| **Capacitor** para empaquetar la app Android | React Native / Expo, Flutter, Kivy | Expo y las herramientas de Flutter/Android Studio presentan bloqueos desde Cuba. Capacitor permite desarrollar en el navegador y compilar la APK en la nube. |
| **React 18 + TypeScript + Vite** | React 19, JavaScript | Compatibilidad segura con Ionic; tipos estrictos para el dinero. |
| **Ionic React** (modo Material) | Tailwind a mano | Navegación, gestos y áreas seguras ya resueltos; aspecto igual en todos los teléfonos. |
| **Dexie (IndexedDB)** | SQLite con plugin | Menos configuración nativa; suficiente para el MVP. |
| **Monorepo** (`domain`, `mobile`, `server`) | Repos separados | Reglas y tipos compartidos entre app y servidor, sin desincronizarse. |
| **Puertos** (interfaces) entre pantallas y datos | Acceso directo a la base | Permite trabajar en paralelo con servicios falsos y probar sin interfaz. |
| **Dinero en centavos enteros** | Decimales | Evita errores de coma flotante. |
| **Movimientos inmutables**, corrección por movimiento inverso | Editar o borrar | Auditoría y sincronización sin conflictos. |
| **Estados de sincronización**: `local`, `pending`, `syncing`, `synced`, `error`, `rejected` | Booleano "sincronizado" | Distingue fallos transitorios (se reintentan) de rechazos (requieren acción). |
| **Saldo esperado físico** (cuenta lo no aceptado por el servidor) | Excluir lo rechazado | El dinero entró o salió igual; el rechazo es un problema de registro. |
| **APK compilada en GitHub Actions** | Android Studio local | Android Studio y Gradle descargan de servidores de Google, bloqueados desde Cuba. |
| **Firma con `apksigner` en el workflow** | Configurar firma en Gradle | No hay que editar archivos Gradle generados por Capacitor. |
| **HTTP en claro hacia la red local** | HTTPS con certificado | El servidor simulado corre en una PC sin dominio; solo para la demostración. |
| **Servidor Fastify + SQLite** simulado | Servicio en la nube | Funciona sin internet y sin cuentas externas. |
| **Node 22 y npm workspaces** | pnpm / yarn | Una herramienta menos que instalar; versión fijada en `.nvmrc`. |
| **Diseño en proporción áurea** y paleta celadón | Escala tipográfica estándar | Decisión del equipo; coherencia visual medible (hay una prueba que la vigila). |
| **Fuente Arimo incluida en la app** (métricas de Arial) | Arial o Calibri del sistema | Android no trae Arial ni Calibri; así se ve igual en todos los teléfonos. |
| **Texto con tonos profundos derivados** de la paleta | Texto con los tonos base | Los tonos base no alcanzan el contraste mínimo de 4,5:1 sobre fondo claro. |
| **`appId` `com.cashflow.app`** | — | Cambiarlo después de publicar obliga a reinstalar la app. |
| **Fetch provisional en `src/app/provisional/`** hasta E6 | `fetch` dentro de la pantalla | La regla de lint prohíbe `fetch` en `features/` y `ui/`. |
