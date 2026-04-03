import React from 'react';
import ReactDOM from 'react-dom/client';
import { ActionPicker } from './components/ActionPicker';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ActionPicker />
  </React.StrictMode>,
);
