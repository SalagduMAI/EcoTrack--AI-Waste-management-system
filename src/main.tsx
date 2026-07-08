import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Global Fetch Interceptor to route relative requests to the correct Laravel backend
const originalFetch = window.fetch;
window.fetch = function (input, init) {
  if (typeof input === 'string') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const backendBase = isLocal 
      ? 'http://127.0.0.1:8000' 
      : 'https://app-a60754c1-3bb4-482f-871c-efb821eb06b9.cleverapps.io';

    if (input.startsWith('/api')) {
      input = backendBase + input;
    } else if (input.startsWith('/storage')) {
      input = backendBase + input;
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
