import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/stores/authStore';

// Pages
import LoginPage from '@/app/(auth)/login/page';
import DashboardPage from '@/app/(dashboard)/page';
import ClientsPage from '@/app/(dashboard)/clients/page';
import NewClientPage from '@/app/(dashboard)/clients/new/page';
import ClientDetailPage from '@/app/(dashboard)/clients/[id]/page';
import EditClientPage from '@/app/(dashboard)/clients/[id]/edit/page';
import PaymentsPage from '@/app/(dashboard)/payments/page';
import ActivityPage from '@/app/(dashboard)/activity/page';
import DocumentsPage from '@/app/(dashboard)/documents/page';
import StatisticsPage from '@/app/(dashboard)/statistics/page';
import SettingsPage from '@/app/(dashboard)/settings/page';
import AlertsPage from '@/app/(dashboard)/alerts/page';
import ExpensesPage from '@/app/(dashboard)/expenses/page';

const DashboardLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen bg-bg">
    <Sidebar />
    <div className="flex-1 pl-64">
      <TopBar />
      <main className="p-8">{children}</main>
    </div>
  </div>
);

const HomeRoute = () => {
  const { loading, user } = useAuthStore();
  const { isAdmin } = usePermissions();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (isAdmin) return <DashboardPage />;
  return <Navigate to="/clients" replace />;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { loading, user } = useAuthStore();
  const { isAdmin } = usePermissions();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!isAdmin) return <Navigate to="/clients" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <AuthGuard>
              <DashboardLayout>
                <HomeRoute />
              </DashboardLayout>
            </AuthGuard>
          }
        />

        <Route
          path="/clients"
          element={
            <AuthGuard>
              <DashboardLayout>
                <ClientsPage />
              </DashboardLayout>
            </AuthGuard>
          }
        />

        <Route
          path="/clients/new"
          element={
            <AuthGuard>
              <DashboardLayout>
                <NewClientPage />
              </DashboardLayout>
            </AuthGuard>
          }
        />

        <Route
          path="/clients/:id"
          element={
            <AuthGuard>
              <DashboardLayout>
                <ClientDetailPage />
              </DashboardLayout>
            </AuthGuard>
          }
        />

        <Route
          path="/clients/:id/edit"
          element={
            <AuthGuard>
              <DashboardLayout>
                <AdminRoute>
                  <EditClientPage />
                </AdminRoute>
              </DashboardLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/alerts"
          element={
            <AuthGuard>
              <DashboardLayout>
                <AlertsPage />
              </DashboardLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/expenses"
          element={
            <AuthGuard>
              <DashboardLayout>
                <ExpensesPage />
              </DashboardLayout>
            </AuthGuard>
          }
        />
        <Route
          path="/payments"
          element={
            <AuthGuard>
              <DashboardLayout>
                <AdminRoute>
                  <PaymentsPage />
                </AdminRoute>
              </DashboardLayout>
            </AuthGuard>
          }
        />

        <Route
          path="/activity"
          element={
            <AuthGuard>
              <DashboardLayout>
                <AdminRoute>
                  <ActivityPage />
                </AdminRoute>
              </DashboardLayout>
            </AuthGuard>
          }
        />

        <Route
          path="/documents"
          element={
            <AuthGuard>
              <DashboardLayout>
                <AdminRoute>
                  <DocumentsPage />
                </AdminRoute>
              </DashboardLayout>
            </AuthGuard>
          }
        />

        <Route
          path="/statistics"
          element={
            <AuthGuard>
              <DashboardLayout>
                <AdminRoute>
                  <StatisticsPage />
                </AdminRoute>
              </DashboardLayout>
            </AuthGuard>
          }
        />

        <Route
          path="/settings"
          element={
            <AuthGuard>
              <DashboardLayout>
                <AdminRoute>
                  <SettingsPage />
                </AdminRoute>
              </DashboardLayout>
            </AuthGuard>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </Router>
  );
}
