import { IonApp } from '@ionic/react';

import { HelloPage } from '../features/hello/HelloPage';

/**
 * Raíz de la aplicación.
 * En F-1.7 se sustituirá HelloPage por las rutas y el shell con pestañas.
 */
export function App() {
  return (
    <IonApp>
      <HelloPage />
    </IonApp>
  );
}
