import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';
import { ensureJsPDF } from './lib/utils/pdfLoader';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,        // 30 seconds — data is fresh briefly, then silently re-fetched
      gcTime: 1000 * 60 * 10,      // keep unused cache for 10 min so navigation feels instant
      refetchOnWindowFocus: true,   // silently refresh when user returns to the tab
      refetchOnMount: true,         // always refresh when a component mounts with stale data
      refetchOnReconnect: true,     // refresh after coming back online
      retry: 2,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
);

// Try to preload jsPDF for any legacy callers that expect a global
ensureJsPDF().catch(() => { });
