import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { auth } from './lib/firebase';
import { initializeWorkflows } from './workflows';
import { initializeEventBus } from './events';
import { onAuthStateChanged } from 'firebase/auth';

let isInitialized = false;

onAuthStateChanged(auth, (user) => {
  if (user && !isInitialized) {
    console.log("[Runtime] User authenticated, initializing AI & workflows...");
    initializeWorkflows();
    initializeEventBus();
    isInitialized = true;
  }
});

const originalFetch = window.fetch;
Object.defineProperty(window, 'fetch', {
  configurable: true,
  writable: true,
  value: async (...args: any[]) => {
    const [resource] = args;
    if (typeof resource === 'string' && resource.startsWith('/api/')) {
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        if (args[1]) {
          args[1].headers = {
            ...args[1].headers,
            Authorization: `Bearer ${token}`
          };
        } else {
          args[1] = { headers: { Authorization: `Bearer ${token}` } };
        }
      }
    }
    return originalFetch(args[0], args[1]);
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
