import { setupIonicReact } from '@ionic/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/arimo/latin-400.css';
import '@fontsource/arimo/latin-700.css';
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import './ui/theme/variables.css';

import { App } from './app/App';

// Aspecto Material en todos los dispositivos: la app se ve igual en cualquier teléfono.
setupIonicReact({ mode: 'md' });

const container = document.getElementById('root');
if (!container) {
  throw new Error('No se encontró el elemento #root en index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
