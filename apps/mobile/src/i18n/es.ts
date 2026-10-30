/**
 * Textos de la interfaz en español.
 * F-1.3 ampliará este archivo; los códigos de error del dominio irán en error-codes.ts.
 */
export const es = {
  app: {
    name: 'Control de Caja',
    tagline: 'Gestión operativa de caja, con o sin conexión',
  },
  hello: {
    event: 'Avangenio Hackathon',
    versionLabel: 'Versión',
    serverTitle: 'Servidor',
    urlLabel: 'Dirección del servidor',
    urlPlaceholder: 'http://192.168.1.10:3000',
    urlHelper: 'Provisional en esta etapa. Escribe la IP de la PC y el puerto.',
    simulatedNotice: 'El servidor es una simulación del ERP, no una integración real.',
    tempNotice: 'Pantalla provisional de la etapa E0.',
    status: {
      unset: 'Sin configurar',
      checking: 'Comprobando…',
      online: 'Conectado',
      offline: 'Sin conexión',
    },
    reasons: {
      network:
        'No se pudo llegar al servidor. Revisa la dirección y que ambos estén en la misma red.',
      timeout: 'El servidor tardó demasiado en responder.',
      http: 'El servidor respondió con un error.',
      invalid: 'La respuesta del servidor no tiene el formato esperado.',
    },
    details: {
      serverVersion: 'Versión del servidor',
      apiVersion: 'Versión de la API',
      serverTime: 'Hora del servidor',
    },
  },
} as const;
