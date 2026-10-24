import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { APP_VERSION } from './version'

const el = document.getElementById('root')!
createRoot(el).render(<App />)

// Register the service worker. The version in the URL makes each release a new worker,
// which replaces the old cache (see public/sw.js).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(APP_VERSION)}`).catch(console.error);
  });
}
