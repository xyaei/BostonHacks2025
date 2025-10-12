// desktop-app/src/petRenderer.jsx

import React from 'react';
import { createRoot } from 'react-dom/client';
import PetDisplay from './components/PetDisplay';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <PetDisplay />
  </React.StrictMode>
);