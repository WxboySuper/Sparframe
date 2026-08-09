import { useEffect, useState } from 'react';
import { createWebComposition, startWebExtensions, webRegistry } from './composition';

const composition = createWebComposition();

export default function App() {
  const [status, setStatus] = useState('starting');
  useEffect(() => {
    const runtime = startWebExtensions();
    void runtime.ready.then(
      () => setStatus('ready'),
      () => setStatus('failed'),
    );
    return () => {
      void runtime.stop();
    };
  }, []);
  return (
    <main className="core-shell">
      <section className="hero-card">
        <div className="eyebrow">SPARFRAME CORE</div>
        <h1>A frame for the system you want to build.</h1>
        <p>
          The shell is running. Add application-owned extensions to contribute pages, actions, data
          sources, and services without changing the core.
        </p>
        <div className="status-row" aria-live="polite">
          <span className={`status-dot status-${status}`} />
          <span>Runtime {status}</span>
          <span className="status-divider">·</span>
          <span>Composition {composition.status}</span>
        </div>
      </section>
      <section className="detail-grid" aria-label="Core status">
        <article className="detail-card">
          <span className="card-label">Registered extensions</span>
          <strong>{webRegistry.list().length}</strong>
          <p>Your app starts with an intentionally empty catalog.</p>
        </article>
        <article className="detail-card">
          <span className="card-label">Next step</span>
          <strong>Build your surface</strong>
          <p>
            Run <code>pnpm sync</code> after adding an extension.
          </p>
        </article>
      </section>
    </main>
  );
}
