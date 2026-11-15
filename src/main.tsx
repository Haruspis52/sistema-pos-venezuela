import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

(window as any).__POS_REACT_MOUNTED__ = true;
try {
  sessionStorage.removeItem("pos_updating_in_progress");
  if (window.location.search.includes("updated=")) {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("updated");
    const nextSearch = cleanUrl.searchParams.toString();
    window.history.replaceState(
      {},
      document.title,
      cleanUrl.pathname + (nextSearch ? `?${nextSearch}` : "") + cleanUrl.hash
    );
  }
} catch {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
