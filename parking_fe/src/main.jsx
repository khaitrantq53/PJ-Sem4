import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.jsx';
import { initSmoothInputCaret } from './features/smooth-input/smoothInput.runtime.js';
import './styles/home.css';

createRoot(document.getElementById('root')).render(
  <App />,
);

initSmoothInputCaret();
