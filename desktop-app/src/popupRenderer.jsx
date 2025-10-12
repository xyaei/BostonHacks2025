// desktop-app/src/popupRenderer.jsx

import React from 'react';
import { createRoot } from 'react-dom/client';
import InterventionPopup from './components/InterventionPopup';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <InterventionPopup />
  </React.StrictMode>
);