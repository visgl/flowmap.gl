import React from 'react';
import ReactDOM from 'react-dom/client';
import {UI_INITIAL} from '@flowmap.gl/examples-common';
import App from '../App';
import '../index.css';

// This entry point uses the light Positron basemap. URL settings can override it.
UI_INITIAL.darkMode = false;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App globeExample />
  </React.StrictMode>,
);
