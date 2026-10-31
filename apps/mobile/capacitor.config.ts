import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Cambiar el appId después de publicar una versión obliga a reinstalar la app: no se toca.
  appId: 'com.cashflow.app',
  appName: 'CashFlow',
  webDir: 'dist',
  backgroundColor: '#f5faf7',
  server: {
    // La app habla por HTTP con el servidor simulado en la red local (sin certificado).
    cleartext: true,
  },
  android: {
    // El WebView carga la app como https://localhost; sin esto bloquearía las peticiones http://.
    allowMixedContent: true,
    backgroundColor: '#f5faf7',
  },
};

export default config;
