# Control de Caja — Python

Prototipo de gestión de caja creado con Python, Kivy y SQLite. Guarda los movimientos localmente para poder trabajar sin conexión. La sincronización con un ERP todavía no está implementada.

## Requisitos

- Windows 10/11
- Python 3.12 de 64 bits

## Instalar y ejecutar

Abre PowerShell en esta carpeta y ejecuta:

```powershell
py -3.12 -m pip install -r requirements.txt
py -3.12 main.py
```

## Probar

```powershell
py -3.12 -m unittest -v
```

## Perfiles

- **Vendedor:** registra movimientos y administra su caja.
- **Supervisor:** puede registrar pagos de salarios.
- **Contabilidad:** consulta la sesión en modo de solo lectura.

Los perfiles son de demostración, no hay autenticación real y la base de datos no está cifrada. No uses esta versión para transacciones reales.

## Android

El proyecto incluye `buildozer.spec`. Para generar una APK se necesita Linux o WSL2; desde la carpeta del proyecto:

```bash
python3 -m pip install buildozer
buildozer android debug
```
