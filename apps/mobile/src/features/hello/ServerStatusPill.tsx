import { IonIcon } from '@ionic/react';
import { checkmarkCircle, closeCircle, helpCircle, syncCircle } from 'ionicons/icons';

import { es } from '../../i18n/es';
import type { ServerStatus } from './useServerStatus';

const ICONS = {
  unset: helpCircle,
  checking: syncCircle,
  online: checkmarkCircle,
  offline: closeCircle,
} as const;

interface ServerStatusPillProps {
  status: ServerStatus;
}

/** Estado del servidor con icono y texto (nunca solo color). */
export function ServerStatusPill({ status }: ServerStatusPillProps) {
  return (
    <span
      className={`status-pill status-pill--${status.phase}`}
      role="status"
      aria-live="polite"
      data-testid="server-status"
    >
      <IonIcon icon={ICONS[status.phase]} aria-hidden="true" />
      {es.hello.status[status.phase]}
    </span>
  );
}
