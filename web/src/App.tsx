import { AppShell } from "@/components/layout/AppShell";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/authStore";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  RouterProvider,
} from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "sonner";

// ── Lazy screens ──────────────────────────────────────────────────────────────

const LoginScreen = lazy(() =>
  import("@/screens/LoginScreen").then((m) => ({ default: m.LoginScreen })),
);
const DashboardScreen = lazy(() =>
  import("@/screens/DashboardScreen").then((m) => ({
    default: m.DashboardScreen,
  })),
);

// Projects
const ProjectListScreen = lazy(() =>
  import("@/screens/ProjectListScreen").then((m) => ({
    default: m.ProjectListScreen,
  })),
);
const CreateProjectScreen = lazy(() =>
  import("@/screens/CreateProjectScreen").then((m) => ({
    default: m.CreateProjectScreen,
  })),
);
const ProjectDetailScreen = lazy(() =>
  import("@/screens/ProjectDetailScreen").then((m) => ({
    default: m.ProjectDetailScreen,
  })),
);

// Tickets
const TicketDetailScreen = lazy(() =>
  import("@/screens/WebTicketDetailScreen").then((m) => ({
    default: m.WebTicketDetailScreen,
  })),
);

const AcUnitCleaningReportScreen = lazy(() =>
  import("@/screens/AcUnitCleaningReportScreen").then((m) => ({
    default: m.AcUnitCleaningReportScreen,
  })),
);

// Customers
const CustomerListScreen = lazy(() =>
  import("@/screens/CustomerListScreen").then((m) => ({
    default: m.CustomerListScreen,
  })),
);
const CustomerDetailScreen = lazy(() =>
  import("@/screens/CustomerDetailScreen").then((m) => ({
    default: m.CustomerDetailScreen,
  })),
);
const CreateCustomerScreen = lazy(() =>
  import("@/screens/CreateCustomerScreen").then((m) => ({
    default: m.CreateCustomerScreen,
  })),
);
const EditCustomerScreen = lazy(() =>
  import("@/screens/EditCustomerScreen").then((m) => ({
    default: m.EditCustomerScreen,
  })),
);
const EditLocationScreen = lazy(() =>
  import("@/screens/EditLocationScreen").then((m) => ({
    default: m.EditLocationScreen,
  })),
);

// Locations
const CreateLocationScreen = lazy(() =>
  import("@/screens/CreateLocationScreen").then((m) => ({
    default: m.CreateLocationScreen,
  })),
);
const LocationDetailScreen = lazy(() =>
  import("@/screens/LocationDetailScreen").then((m) => ({
    default: m.LocationDetailScreen,
  })),
);

// AC Units
const AcUnitListScreen = lazy(() =>
  import("@/screens/AcUnitListScreen").then((m) => ({
    default: m.AcUnitListScreen,
  })),
);
const RegisterAcUnitScreen = lazy(() =>
  import("@/screens/RegisterAcUnitScreen").then((m) => ({
    default: m.RegisterAcUnitScreen,
  })),
);
const AcUnitDetailScreen = lazy(() =>
  import("@/screens/AcUnitDetailScreen").then((m) => ({
    default: m.AcUnitDetailScreen,
  })),
);

// Technicians
const TechnicianListScreen = lazy(() =>
  import("@/screens/TechnicianListScreen").then((m) => ({
    default: m.TechnicianListScreen,
  })),
);

// Reports + KPI
const ReportsScreen = lazy(() =>
  import("@/screens/ReportsScreen").then((m) => ({ default: m.ReportsScreen })),
);
const ReminderScreen = lazy(() =>
  import("@/screens/ReminderScreen").then((m) => ({
    default: m.ReminderScreen,
  })),
);
const TechnicianDetailScreen = lazy(() =>
  import("@/screens/TechnicianDetailScreen").then((m) => ({
    default: m.TechnicianDetailScreen,
  })),
);
const TechnicianHistoryScreen = lazy(() =>
  import("@/screens/TechnicianHistoryScreen").then((m) => ({
    default: m.TechnicianHistoryScreen,
  })),
);
const AcUnitHistoryScreen = lazy(() =>
  import("@/screens/AcUnitHistoryScreen").then((m) => ({
    default: m.AcUnitHistoryScreen,
  })),
);
const LaporanScreen = lazy(() =>
  import("@/screens/LaporanScreen").then((m) => ({ default: m.LaporanScreen })),
);
const CreateBookingRequestScreen = lazy(() =>
  import("@/screens/CreateBookingRequestScreen").then((m) => ({
    default: m.CreateBookingRequestScreen,
  })),
);
const BookingRequestListScreen = lazy(() =>
  import("@/screens/BookingRequestListScreen").then((m) => ({
    default: m.BookingRequestListScreen,
  })),
);

// Settings
const SettingsScreen = lazy(() =>
  import("@/screens/SettingsScreen").then((m) => ({
    default: m.SettingsScreen,
  })),
);

// ── Loading fallback ──────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div
        className="w-6 h-6 border-2 border-blue-600
                            border-t-transparent rounded-full animate-spin"
      />
    </div>
  );
}

// ── Suspense wrapper ──────────────────────────────────────────────────────────

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// ── Protected layout ──────────────────────────────────────────────────────────

// ── Role guard component ──────────────────────────────────────────────────────
function RoleGuard({
  children,
  allowed,
}: {
  children: React.ReactNode;
  allowed: string[];
}) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" />;
  if (!allowed.includes(user.role)) return <Navigate to="/dashboard" />;
  return <>{children}</>;
}

function ProtectedLayout() {
  const { user, isInitialized, isLoading } = useAuthStore();
  if (!isInitialized || isLoading) return <PageLoader />;
  if (!user) return <Navigate to="/login" />;
  return <AppShell />;
}

// ── Routes ────────────────────────────────────────────────────────────────────

const rootRoute = createRootRoute();
const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "protected",
  component: ProtectedLayout,
});

// Auth
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: () => (
    <S>
      <LoginScreen />
    </S>
  ),
});

// Index
const indexRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/",
  component: () => <Navigate to="/dashboard" />,
});

// Dashboard
const dashboardRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/dashboard",
  component: () => (
    <S>
      <DashboardScreen />
    </S>
  ),
});

// ── Projects ──────────────────────────────────────────────────────────────────

const projectsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/projects",
  component: () => (
    <S>
      <ProjectListScreen />
    </S>
  ),
});

const bookingRequestListRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/projects/bookings",
  component: () => (
    <RoleGuard allowed={["admin", "admin_sales"]}>
      <S>
        <BookingRequestListScreen />
      </S>
    </RoleGuard>
  ),
});

const createBookingRequestRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/projects/bookings/new",
  component: () => (
    <RoleGuard allowed={["admin", "admin_sales"]}>
      <S>
        <CreateBookingRequestScreen />
      </S>
    </RoleGuard>
  ),
});

const createProjectRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/projects/create",
  component: () => (
    <RoleGuard allowed={["admin", "admin_sales"]}>
      <S>
        <CreateProjectScreen />
      </S>
    </RoleGuard>
  ),
});

const projectDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/projects/$projectId",
  component: () => (
    <S>
      <ProjectDetailScreen />
    </S>
  ),
});

// ── Tickets ───────────────────────────────────────────────────────────────────

const ticketDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/tickets/$ticketId",
  component: () => (
    <S>
      <TicketDetailScreen />
    </S>
  ),
});

// ← Route registered, file + export name now correct ✅
const acUnitCleaningReportRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/tickets/$ticketId/units/$acUnitId",
  component: () => (
    <S>
      <AcUnitCleaningReportScreen />
    </S>
  ),
});

// ── Customers ─────────────────────────────────────────────────────────────────

const customersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/customers",
  component: () => (
    <S>
      <CustomerListScreen />
    </S>
  ),
});

const createCustomerRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/customers/create",
  component: () => (
    <S>
      <CreateCustomerScreen />
    </S>
  ),
});

const editCustomerRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/customers/$customerId/edit",
  component: () => (
    <S>
      <EditCustomerScreen />
    </S>
  ),
});

const customerDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/customers/$customerId",
  component: () => (
    <S>
      <CustomerDetailScreen />
    </S>
  ),
});

// ── Locations ─────────────────────────────────────────────────────────────────

const createLocationRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/customers/$customerId/locations/create",
  component: () => (
    <S>
      <CreateLocationScreen />
    </S>
  ),
});

const locationDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/customers/$customerId/locations/$locationId",
  component: () => (
    <S>
      <LocationDetailScreen />
    </S>
  ),
});

const editLocationRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/customers/$customerId/locations/$locationId/edit",
  component: () => (
    <S>
      <EditLocationScreen />
    </S>
  ),
});

// ── AC Units ──────────────────────────────────────────────────────────────────

const acUnitDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/ac-units/$acUnitId",
  component: () => (
    <S>
      <AcUnitDetailScreen />
    </S>
  ),
});

const acUnitHistoryRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/ac-units/$acUnitId/history",
  component: () => (
    <S>
      <AcUnitHistoryScreen />
    </S>
  ),
});

const registerAcUnitRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/ac-units/register",
  component: () => (
    <S>
      <RegisterAcUnitScreen />
    </S>
  ),
});

// ── Technicians ───────────────────────────────────────────────────────────────

const techniciansRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/technicians",
  component: () => (
    <S>
      <TechnicianListScreen />
    </S>
  ),
});

const technicianDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/technicians/$technicianId",
  component: () => (
    <S>
      <TechnicianDetailScreen />
    </S>
  ),
});

const technicianHistoryRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/technicians/$technicianId/history",
  component: () => (
    <S>
      <TechnicianHistoryScreen />
    </S>
  ),
});

// ── Reports + KPI ─────────────────────────────────────────────────────────────

const reportsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/reports",
  component: () => (
    <S>
      <ReportsScreen />
    </S>
  ),
});

// KPI route removed ✅

// ── Settings ──────────────────────────────────────────────────────────────────

const laporanRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/laporan",
  component: () => (
    <RoleGuard allowed={["admin", "manager", "developer"]}>
      <S>
        <LaporanScreen />
      </S>
    </RoleGuard>
  ),
});

const remindersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/reminders",
  component: () => (
    <RoleGuard allowed={["admin", "admin_sales"]}>
      <S>
        <ReminderScreen />
      </S>
    </RoleGuard>
  ),
});

const settingsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/settings",
  component: () => (
    <S>
      <SettingsScreen />
    </S>
  ),
});

// ── Route tree ────────────────────────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([
    indexRoute,
    dashboardRoute,
    // Projects
    projectsRoute,
    createProjectRoute,
    // Booking routes MUST come before projectDetailRoute ✅
    // otherwise /projects/bookings matches /projects/$projectId
    bookingRequestListRoute,
    createBookingRequestRoute,
    projectDetailRoute,
    // Tickets — specific before general ✅
    acUnitCleaningReportRoute, // ← /tickets/$id/units/$unitId FIRST ✅
    ticketDetailRoute, // ← /tickets/$id SECOND ✅
    // Customers
    customersRoute,
    createCustomerRoute,
    editCustomerRoute,
    createLocationRoute,
    editLocationRoute,
    locationDetailRoute,
    customerDetailRoute,
    // AC Units — /ac-units list removed ✅
    registerAcUnitRoute,
    acUnitDetailRoute,
    acUnitHistoryRoute,
    // Technicians
    techniciansRoute,
    technicianDetailRoute,
    technicianHistoryRoute,
    // Reports
    reportsRoute,
    // Laporan BI
    laporanRoute,
    // Reminders
    remindersRoute,
    // Settings
    settingsRoute,
  ]),
]);

const router = createRouter({ routeTree });

// ── App initializer ───────────────────────────────────────────────────────────

function AppInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  useEffect(() => {
    initialize();
  }, [initialize]);
  return <>{children}</>;
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInitializer>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors />
        {import.meta.env.DEV && <ReactQueryDevtools />}
      </AppInitializer>
    </QueryClientProvider>
  );
}
