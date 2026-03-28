import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';
import './index.css';

// Apply theme before first paint to avoid flash
document.documentElement.setAttribute(
  'data-theme',
  (localStorage.getItem('theme') as 'dark' | 'light') || 'light'
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
