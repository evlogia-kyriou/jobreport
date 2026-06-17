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
  import("@/screens/TicketDetailScreen").then((m) => ({
    default: m.TicketDetailScreen,
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
const KpiScreen = lazy(() =>
  import("@/screens/KpiScreen").then((m) => ({ default: m.KpiScreen })),
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

const createProjectRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/projects/create", // ← before $projectId
  component: () => (
    <S>
      <CreateProjectScreen />
    </S>
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
  path: "/customers/create", // ← before $customerId
  component: () => (
    <S>
      <CreateCustomerScreen />
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

// ── AC Units ──────────────────────────────────────────────────────────────────

const acUnitsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/ac-units",
  component: () => (
    <S>
      <AcUnitListScreen />
    </S>
  ),
});

const acUnitDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/ac-units/$acUnitId",
  component: () => (
    <S>
      <AcUnitDetailScreen />
    </S>
  ),
});

const registerAcUnitRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/ac-units/register", // ← before $acUnitId
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

const kpiRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/technicians/$technicianId/kpi",
  component: () => (
    <S>
      <KpiScreen />
    </S>
  ),
});

// ── Settings ──────────────────────────────────────────────────────────────────

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
    createProjectRoute, // ← before projectDetailRoute
    projectDetailRoute,
    // Tickets
    ticketDetailRoute,
    // Customers
    customersRoute,
    createCustomerRoute, // ← before customerDetailRoute
    createLocationRoute,
    locationDetailRoute,
    customerDetailRoute,
    // AC Units
    acUnitsRoute,
    registerAcUnitRoute,
    acUnitDetailRoute,
    // Technicians
    techniciansRoute,
    // Reports
    reportsRoute,
    kpiRoute,
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
