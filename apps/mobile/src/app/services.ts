/**
 * Punto único por el que la app móvil conoce los puertos del dominio.
 * En F-1.4 aquí se añade el ServicesProvider (servicios reales o falsos según VITE_USE_FAKES).
 */
export type {
  ApiClient,
  ApiResult,
  Connectivity,
  CreateServices,
  Services,
  SyncEngine,
} from '@caja/domain/ports';
