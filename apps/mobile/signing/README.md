# Llave de firma de demostración

`demo-release.keystore` es una llave **de demostración**, pública a propósito (contraseña
`cashflow-demo`, alias `cashflow`). Sirve para que todas las APK de las etapas del hackatón
tengan **la misma firma** y se puedan instalar unas sobre otras sin desinstalar.

**No es segura. No se usa para publicar en ninguna tienda.**

Para usar una llave propia (Plan A), crea los secretos del repositorio descritos en
`docs/arquitectura.md` (sección "Firma de la APK"). El workflow `release-apk.yml` usa
automáticamente los secretos si existen y, si no, esta llave.
