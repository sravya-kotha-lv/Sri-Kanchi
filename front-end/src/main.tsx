import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { CatalogProvider } from './context/CatalogContext';
import { ShopProvider } from './context/ShopContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CatalogProvider>
      <ShopProvider>
        <App />
      </ShopProvider>
    </CatalogProvider>
  </React.StrictMode>,
);

