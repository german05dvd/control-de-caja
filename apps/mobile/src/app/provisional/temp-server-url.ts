/**
 * PROVISIONAL (etapa E0). Recuerda la dirección del servidor escrita en la pantalla de prueba
 * para no tener que teclearla en cada arranque. Se sustituye por SettingsRepository en F-5.4.
 */
const STORAGE_KEY = 'caja.provisional.serverUrl';

export function loadTempServerUrl(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveTempServerUrl(value: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Sin almacenamiento disponible: la pantalla sigue funcionando, solo no recuerda el valor.
  }
}
