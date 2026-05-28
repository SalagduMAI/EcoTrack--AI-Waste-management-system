import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Global Fetch Interceptor to route relative requests directly to the Laravel backend on port 8000,
// ensuring the application connects to the real database regardless of how it is served (Apache, Vite, etc.)
const originalFetch = window.fetch;
window.fetch = function (input, init) {
  if (typeof input === 'string') {
    if (input.startsWith('/api')) {
      input = 'http://127.0.0.1:8000' + input;
    } else if (input.startsWith('/storage')) {
      input = 'http://127.0.0.1:8000' + input;
    }
  }
  return originalFetch(input, init);
};

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[PWA] ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch((error) => {
        console.warn('[PWA] ServiceWorker registration failed: ', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
