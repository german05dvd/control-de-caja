# Arquitectura

> Dueño: Frontend. Versión E0. Se completa en E8.

## Visión general

CashFlow es una app móvil Android **offline-first** para gestionar la caja operativa. Funciona sin conexión y sincroniza después con un servidor que **simula** al ERP (no es una integración real).

```
                  ┌───────────────────┐
                  │  packages/domain  │  reglas de negocio puras (TypeScript)
                  └─────────▲─────────┘
              ┌─────────────┴─────────────┐
     ┌────────┴────────┐         ┌────────┴────────┐
     │   apps/mobile   │ ──HTTP─▶│   apps/server   │
     │ React+Ionic+Cap │         │ Fastify + SQLite│
     └─────────────────┘         └─────────────────┘
```

**Regla de dependencias:** `domain` no depende de nada. `mobile` y `server` dependen de `domain`, nunca al revés ni entre sí (solo hablan por HTTP).

## Capas de la app móvil

```
Pantallas (features/) ─▶ hooks ─▶ PUERTOS (ports.ts) ◀─ data/ (Dexie)
                                                    ◀─ sync/ (cola, motor, conectividad)
                                          sync/ ─▶ ApiClient ─▶ servidor
```

| Carpeta | Responsabilidad | Dueño |
|---|---|---|
| `src/ui/` | sistema de diseño: tema y componentes sin lógica de negocio | Frontend |
| `src/features/` | pantallas y hooks, una carpeta por funcionalidad | Frontend |
| `src/app/` | arranque, rutas, proveedores, servicios falsos, código provisional | Frontend |
| `src/i18n/` | textos en español y traducción de códigos de error | Frontend |
| `src/data/` | base local (Dexie) y repositorios que implementan los puertos | Backend |
| `src/sync/` | cola, motor de sincronización, conectividad (cliente HTTP y serializadores: Frontend) | Backend |

**Regla de los puertos:** una pantalla nunca importa `data/` ni `sync/`, ni usa `fetch` ni Dexie. Solo conoce las interfaces de `packages/domain/src/ports.ts`. ESLint lo hace cumplir. Así el Frontend desarrolla con servicios falsos en memoria y el Backend entrega los reales sin que cambie ninguna pantalla.

## Flujo de un movimiento

1. La pantalla valida (para ayudar) y llama a `MovementRepository.add`.
2. El repositorio **revalida con el dominio** (para proteger), y en **una sola transacción** guarda el movimiento, su entrada de cola y la auditoría.
3. El motor toma las entradas pendientes por orden, las envía con `ApiClient` y aplica los resultados: `synced`, `rejected` o `error` (con reintentos).
4. La interfaz lee todo en vivo con los métodos `watch*`.

## Estados de sincronización

`local → pending → syncing → synced | rejected | error`. `error` se reintenta solo; `rejected` no. El saldo esperado es **físico**: cuenta todos los movimientos locales, estén o no aceptados.

## Diseño

Paleta celadón dada por el equipo y **proporción áurea** en tipografía (pasos de √φ), espaciado y radios (serie de Fibonacci), layout (38,2 % / 61,8 %) y escala tonal. Los tonos de texto son versiones profundas de los mismos matices para cumplir el contraste accesible. Detalle en `apps/mobile/src/ui/theme/variables.css`.

## Compilación y entrega

Por las restricciones de acceso a herramientas desde Cuba, **la APK se compila en GitHub Actions**, no en la PC.

- `ci.yml`: en cada PR formato, lint, tipos, pruebas y build web; en cada merge a `main`, además, una APK de depuración como artefacto.
- `release-apk.yml`: al subir una etiqueta `v*`, compila la APK de *release*, la firma y la publica en Releases.
- Desarrollo diario: en la PC con el navegador (`npm run dev`); no hace falta Android SDK.

### Firma de la APK

Cada APK debe llevar **la misma firma** para poder instalarse sobre la anterior sin desinstalar.

- **Plan A (llave propia).** Generar un keystore con `keytool`, codificarlo en base64 y guardarlo en los secretos del repositorio (Settings → Secrets and variables → Actions): `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. El workflow los usa si existen. La llave se conserva fuera del repo; si se pierde, hay que desinstalar la app antes de instalar una versión firmada con otra llave.
- **Plan B (llave de demostración, la activa hoy).** `apps/mobile/signing/demo-release.keystore` con contraseña pública (`cashflow-demo`, alias `cashflow`). Sirve para el hackatón; **no es segura** y no debe usarse para publicar.
- El workflow firma con `zipalign` y `apksigner` y **verifica** la firma antes de publicar. `versionCode` sube con cada ejecución y `versionName` sale de la etiqueta.

### Red local y HTTP

El servidor simulado se ejecuta en una PC de la misma red que el teléfono y se accede por IP **sin certificado**. Por eso: `server.cleartext` y `android.allowMixedContent` en `capacitor.config.ts`, y `usesCleartextTraffic` en el manifiesto de Android (lo aplica `scripts/patch-android-manifest.mjs`).

## Limitaciones conocidas (resumen)

Autenticación y cifrado de demostración, servidor simulado, una moneda por sesión. El detalle vive en `docs/limitaciones.md` (Backend).
