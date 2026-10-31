/**
 * Ajusta AndroidManifest.xml tras `npx cap add android`.
 *  - Permite HTTP en claro (servidor simulado en la red local).
 *  - Asegura los permisos de red.
 * Es idempotente: se puede ejecutar varias veces sin duplicar nada.
 *
 * Uso (desde la raíz del repo):  node scripts/patch-android-manifest.mjs [ruta/AndroidManifest.xml]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const DEFAULT_PATH = 'apps/mobile/android/app/src/main/AndroidManifest.xml';
const PERMISSIONS = ['android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE'];

export function patchManifest(xml) {
  let result = xml;
  const changes = [];

  // 1) usesCleartextTraffic="true" en <application>
  if (/android:usesCleartextTraffic\s*=\s*"[^"]*"/.test(result)) {
    if (!/android:usesCleartextTraffic\s*=\s*"true"/.test(result)) {
      result = result.replace(
        /android:usesCleartextTraffic\s*=\s*"[^"]*"/,
        'android:usesCleartextTraffic="true"',
      );
      changes.push('usesCleartextTraffic -> true');
    }
  } else if (/<application\b/.test(result)) {
    result = result.replace(
      /<application\b/,
      '<application\n        android:usesCleartextTraffic="true"',
    );
    changes.push('usesCleartextTraffic añadido');
  } else {
    throw new Error('No se encontró la etiqueta <application> en el manifiesto.');
  }

  // 2) permisos de red
  for (const permission of PERMISSIONS) {
    if (!result.includes(`android:name="${permission}"`)) {
      result = result.replace(
        /<\/manifest>/,
        `    <uses-permission android:name="${permission}" />\n</manifest>`,
      );
      changes.push(`permiso ${permission} añadido`);
    }
  }

  return { xml: result, changes };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMain) {
  const path = process.argv[2] ?? DEFAULT_PATH;
  if (!existsSync(path)) {
    process.stderr.write(
      `No existe ${path}. Ejecuta antes: cd apps/mobile && npx cap add android\n`,
    );
    process.exit(1);
  }
  const { xml, changes } = patchManifest(readFileSync(path, 'utf8'));
  if (changes.length === 0) {
    process.stdout.write('AndroidManifest.xml ya estaba ajustado. Sin cambios.\n');
  } else {
    writeFileSync(path, xml);
    process.stdout.write(`AndroidManifest.xml actualizado:\n - ${changes.join('\n - ')}\n`);
  }
}
