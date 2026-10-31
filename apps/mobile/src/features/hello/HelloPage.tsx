import { IonContent, IonInput } from '@ionic/react';
import { useState } from 'react';

import { APP_NAME, APP_VERSION } from '../../app/app-info';
import { loadTempServerUrl, saveTempServerUrl } from '../../app/provisional/temp-server-url';
import { es } from '../../i18n/es';
import './HelloPage.css';
import { ServerStatusPill } from './ServerStatusPill';
import { useServerStatus } from './useServerStatus';

function formatServerTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'America/Havana',
  }).format(date);
}

/**
 * Pantalla provisional de la etapa E0: nombre, versión y estado del servidor.
 * Diseño en proporción áurea: bloque de marca 38,2 % y bloque de contenido 61,8 %.
 * Se sustituye por el login en E1.
 */
export function HelloPage() {
  const [url, setUrl] = useState<string>(() => loadTempServerUrl());
  const status = useServerStatus(url);

  const handleUrlInput = (value: string) => {
    setUrl(value);
    saveTempServerUrl(value);
  };

  return (
    // Se usa la clase "ion-page" directamente; en F-1.7 pasa a IonPage con el router.
    <div className="ion-page">
      <IonContent fullscreen>
        <main className="hello">
          <header className="hello__brand">
            <span className="hello__eyebrow">{es.hello.event}</span>
            <h1 className="hello__title">{APP_NAME}</h1>
            <p className="hello__tagline">{es.app.tagline}</p>
            <span className="hello__version">
              {es.hello.versionLabel} {APP_VERSION}
            </span>
          </header>

          <section className="hello__body" aria-labelledby="server-title">
            <div className="hello__card">
              <div className="hello__card-head">
                <h2 id="server-title" className="hello__card-title">
                  {es.hello.serverTitle}
                </h2>
                <ServerStatusPill status={status} />
              </div>

              <IonInput
                label={es.hello.urlLabel}
                labelPlacement="floating"
                fill="outline"
                type="url"
                inputMode="url"
                autocapitalize="off"
                autocorrect={false}
                spellcheck={false}
                placeholder={es.hello.urlPlaceholder}
                helperText={es.hello.urlHelper}
                value={url}
                onIonInput={(event) => {
                  handleUrlInput(String(event.detail.value ?? ''));
                }}
              />

              {status.phase === 'online' && (
                <dl className="hello__details">
                  <div>
                    <dt>{es.hello.details.serverVersion}</dt>
                    <dd>{status.info.version}</dd>
                  </div>
                  {status.info.apiVersion !== null && (
                    <div>
                      <dt>{es.hello.details.apiVersion}</dt>
                      <dd>{status.info.apiVersion}</dd>
                    </div>
                  )}
                  {status.info.serverTime !== null && (
                    <div>
                      <dt>{es.hello.details.serverTime}</dt>
                      <dd>{formatServerTime(status.info.serverTime)}</dd>
                    </div>
                  )}
                </dl>
              )}

              {status.phase === 'offline' && (
                <p className="hello__reason">{es.hello.reasons[status.reason]}</p>
              )}

              <p className="hello__notice">{es.hello.simulatedNotice}</p>
            </div>

            <p className="hello__temp">{es.hello.tempNotice}</p>
          </section>
        </main>
      </IonContent>
    </div>
  );
}
