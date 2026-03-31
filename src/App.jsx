import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import AppShell from '@/components/layout/AppShell';
import DashboardPage from '@/pages/DashboardPage';
import UploadPage from '@/pages/UploadPage';
import MapPage from '@/pages/MapPage';
import RunPage from '@/pages/RunPage';
import ReviewPage from '@/pages/ReviewPage';
import DonePage from '@/pages/DonePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/session/:id/map" element={<MapPage />} />
            <Route path="/session/:id/run" element={<RunPage />} />
            <Route path="/session/:id/review" element={<ReviewPage />} />
            <Route path="/session/:id/done" element={<DonePage />} />
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>

        <Toaster
          position="top-right"
          richColors
          closeButton
          theme="dark"
          toastOptions={{
            style: {
              background: 'oklch(0.16 0.02 265 / 90%)',
              backdropFilter: 'blur(16px)',
              border: '1px solid oklch(0.35 0.03 265 / 40%)',
              color: 'oklch(0.95 0.005 265)',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
