import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import Clarity from '@microsoft/clarity';

const clarityProjectId = import.meta.env.VITE_CLARITY_PROJECT_ID;

if (clarityProjectId) {
  Clarity.init(clarityProjectId);
} else {
  console.info('Microsoft Clarity: VITE_CLARITY_PROJECT_ID is not set. Clarity tracking is disabled.');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
