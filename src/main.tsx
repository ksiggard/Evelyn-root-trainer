import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const el = document.getElementById('root')!
createRoot(el).render(<App />)

// Register service worker for PWA

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  });
}
