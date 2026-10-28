# Control de Caja

App móvil **offline-first** para la gestión operativa de caja, pensada como frontend de un ERP.
Proyecto del **Avangenio Hackathon** (26 oct – 28 nov 2026).

> **Importante:** el servidor incluido en este repositorio es una **simulación** del ERP para la
> demostración. No es una integración real con ningún ERP.

## Estado

En construcción — **Etapa E0 (cimientos y contratos)**. Este README es provisional y se
reescribe en la etapa E8.

## Qué hace (alcance del MVP)

1. Inicio de sesión con usuarios y roles de demostración.
2. Apertura de caja con saldo inicial.
3. Registro de movimientos (tipo, monto, descripción, fecha y usuario).
4. Consulta de movimientos y saldo esperado.
5. Conteo de efectivo y cierre, mostrando la diferencia.
6. Guardado local sin conexión con estado de sincronización visible.
7. Sincronización al recuperar la conexión, sin duplicados, mostrando aceptación o rechazo.

## Estructura del repositorio

```
.
├── apps/
│   ├── mobile/    # App móvil (React + Ionic + Capacitor)
│   └── server/    # Servidor simulado del ERP (Fastify + SQLite)
├── packages/
│   └── domain/    # Reglas de negocio puras en TypeScript (compartidas)
├── docs/          # Contratos, arquitectura, manuales y plan de trabajo
└── legacy/        # Primer prototipo en Python (solo referencia)
```

`apps/` y `packages/` se van creando por etapas (ver `docs/plan/`).

## Requisitos

- Node.js 22 o superior (`nvm install` lee la versión de `.nvmrc`).
- npm 10 o superior.

## Inicio rápido

```bash
nvm install && nvm use
npm install
npm run lint
npm run format:check
```

Los comandos `npm run dev`, `npm run server` y `npm test` quedan operativos a medida que se
crean las aplicaciones (etapa E0 en adelante).

## Documentación

- Plan de trabajo: `docs/plan/PLAN_FRONTEND.md` y `docs/plan/PLAN_BACKEND.md`
- Enunciado del reto: `docs/reto/tarea.md`

## Licencia

MIT. Ver `LICENSE`.
