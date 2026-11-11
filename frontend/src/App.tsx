import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';

// Layouts
import AppLayout from './layouts/AppLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import MyDayPage from './pages/myday/MyDayPage';
import ActivitiesPage from './pages/activities/ActivitiesPage';
import TasksPage from './pages/tasks/TasksPage';
import FollowupsPage from './pages/followups/FollowupsPage';
import CalendarPage from './pages/calendar/CalendarPage';
import AssetsPage from './pages/assets/AssetsPage';
import RentalsPage from './pages/rentals/RentalsPage';
import VendorsPage from './pages/vendors/VendorsPage';
import InvoicesPage from './pages/invoices/InvoicesPage';
import PaymentsPage from './pages/payments/PaymentsPage';
import CCTVPage from './pages/cctv/CCTVPage';
import UsersPage from './pages/users/UsersPage';
import NetworkPage from './pages/network/NetworkPage';
import WarrantyPage from './pages/warranty/WarrantyPage';
import ISPPage from './pages/isp/ISPPage';
import PlaceholderPage from './components/common/PlaceholderPage';

// Placeholder imports for other modules
import {
  Ticket, Monitor, Laptop, Building2, FileText, CreditCard,
  Wifi, Radio, Video, Database, FileCheck, Wrench, Key, Shield,
  Package, Bell, DollarSign, BarChart3, KanbanSquare, Calendar,
  BellRing, Users, FileSearch, Settings, Network, HardDrive,
} from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Auth */}
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />

          {/* Protected App */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="my-day" element={<MyDayPage />} />
            <Route path="activities" element={<ActivitiesPage />} />
            <Route path="tasks" element={<TasksPage />} />

            {/* Tickets */}
            <Route
              path="tickets"
              element={<PlaceholderPage title="Incident Tickets" subtitle="Create and manage IT incident tickets" icon={Ticket} phase={2} />}
            />
            <Route
              path="tickets/:id"
              element={<PlaceholderPage title="Ticket Detail" subtitle="Ticket details and actions" icon={Ticket} />}
            />

            {/* Assets */}
            <Route path="assets" element={<AssetsPage />} />
            <Route
              path="assets/:id"
              element={<PlaceholderPage title="Asset Detail" subtitle="Complete asset history and details" icon={Monitor} />}
            />
            <Route path="rentals" element={<RentalsPage />} />

            {/* Vendors */}
            <Route path="vendors" element={<VendorsPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="payments" element={<PaymentsPage />} />

            {/* Infrastructure */}
            <Route
              path="isp"
              element={<PlaceholderPage title="ISP / Internet" subtitle="ISP connections and billing" icon={Wifi} phase={4} />}
            />
            <Route path="network" element={<NetworkPage />} />
            <Route path="cctv" element={<CCTVPage />} />
            <Route
              path="backups"
              element={<PlaceholderPage title="Backup Monitor" subtitle="Daily backup job status" icon={HardDrive} phase={4} />}
            />

            {/* Contracts */}
            <Route
              path="amc"
              element={<PlaceholderPage title="AMC Contracts" subtitle="Annual maintenance contracts and renewals" icon={FileCheck} phase={5} />}
            />
            <Route
              path="maintenance"
              element={<PlaceholderPage title="Preventive Maintenance" subtitle="PM schedules and calendar" icon={Wrench} phase={5} />}
            />
            <Route
              path="licenses"
              element={<PlaceholderPage title="Software Licenses" subtitle="License tracking and renewals" icon={Key} phase={5} />}
            />
            <Route path="warranty" element={<WarrantyPage />} />

            {/* Operations */}
            <Route
              path="purchases"
              element={<PlaceholderPage title="Procurement" subtitle="Purchase requests and approvals" icon={Package} phase={6} />}
            />
            <Route path="followups" element={<FollowupsPage />} />
            <Route
              path="expenses"
              element={<PlaceholderPage title="IT Expenses" subtitle="Monthly IT expense tracking" icon={DollarSign} phase={6} />}
            />

            {/* Reports */}
            <Route
              path="reports"
              element={<PlaceholderPage title="Reports" subtitle="Generate PDF and Excel reports" icon={BarChart3} phase={7} />}
            />
            <Route
              path="kpi"
              element={<PlaceholderPage title="KPI Dashboard" subtitle="Infrastructure performance KPIs" icon={KanbanSquare} phase={7} />}
            />
            <Route path="calendar" element={<CalendarPage />} />

            {/* System */}
            <Route
              path="notifications"
              element={<PlaceholderPage title="Notifications" subtitle="System alerts and reminders" icon={BellRing} />}
            />
            <Route path="users" element={<UsersPage />} />
            <Route
              path="audit"
              element={<PlaceholderPage title="Audit Log" subtitle="System activity audit trail" icon={FileSearch} phase={8} />}
            />
            <Route
              path="settings"
              element={<PlaceholderPage title="Settings" subtitle="System configuration and preferences" icon={Settings} phase={8} />}
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>

          {/* Redirect all unknown paths to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
