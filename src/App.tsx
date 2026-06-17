// src/App.tsx
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
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "sonner";

// Lazy load screens
const LoginScreen = lazy(() =>
  import("@/screens/LoginScreen").then((m) => ({ default: m.LoginScreen })),
);
const DashboardScreen = lazy(() =>
  import("@/screens/DashboardScreen").then((m) => ({
    default: m.DashboardScreen,
  })),
);
const JobListScreen = lazy(() =>
  import("@/screens/JobListScreen").then((m) => ({ default: m.JobListScreen })),
);
const JobDetailScreen = lazy(() =>
  import("@/screens/JobDetailScreen").then((m) => ({
    default: m.JobDetailScreen,
  })),
);
const WorkerListScreen = lazy(() =>
  import("@/screens/WorkerListScreen").then((m) => ({
    default: m.WorkerListScreen,
  })),
);
const CreateWorkerScreen = lazy(() =>
  import("@/screens/CreateWorkerScreen").then((m) => ({
    default: m.CreateWorkerScreen,
  })),
);
const ApprovalQueueScreen = lazy(() =>
  import("@/screens/ApprovalQueueScreen").then((m) => ({
    default: m.ApprovalQueueScreen,
  })),
);
const ReportsScreen = lazy(() =>
  import("@/screens/ReportsScreen").then((m) => ({ default: m.ReportsScreen })),
);
const LocationDetailScreen = lazy(() =>
  import("@/screens/LocationDetailScreen").then((m) => ({
    default: m.LocationDetailScreen,
  })),
);

const AcUnitListScreen = lazy(() =>
  import("@/screens/AcUnitListScreen").then((m) => ({
    default: m.AcUnitListScreen, // ← verify this matches export name
  })),
);

const AcUnitDetailScreen = lazy(() =>
  import("@/screens/AcUnitDetailScreen").then((m) => ({
    default: m.AcUnitDetailScreen,
  })),
);

// Loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div
        className="w-6 h-6 border-2 border-brand-primary border-t-transparent
                            rounded-full animate-spin"
      />
    </div>
  );
}

// Protected route wrapper
function ProtectedLayout() {
  const { user, isInitialized, isLoading } = useAuthStore();

  if (!isInitialized || isLoading) return <PageLoader />;
  if (!user) return <Navigate to="/login" />;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

// Route tree
const rootRoute = createRootRoute();

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <LoginScreen />
    </Suspense>
  ),
});

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "protected",
  component: ProtectedLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/",
  component: () => <Navigate to="/dashboard" />,
});

const dashboardRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/dashboard",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <DashboardScreen />
    </Suspense>
  ),
});

const jobsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/jobs",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <JobListScreen />
    </Suspense>
  ),
});

const jobDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/jobs/$jobId",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <JobDetailScreen />
    </Suspense>
  ),
});

const workersRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/workers",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <WorkerListScreen />
    </Suspense>
  ),
});

const createWorkerRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/workers/create",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <CreateWorkerScreen />
    </Suspense>
  ),
});

const approvalsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/approvals",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <ApprovalQueueScreen />
    </Suspense>
  ),
});

const reportsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/reports",
  component: () => (
    <Suspense fallback={<PageLoader />}>
      <ReportsScreen />
    </Suspense>
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

const acUnitDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/ac-units/$acUnitId",
  component: () => (
    <S>
      <AcUnitDetailScreen />
    </S>
  ),
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([
    indexRoute,
    dashboardRoute,
    jobsRoute,
    jobDetailRoute,
    workersRoute,
    createWorkerRoute,
    approvalsRoute,
    reportsRoute,
  ]),
]);

const router = createRouter({ routeTree });

// Root app
function AppInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  useEffect(() => {
    initialize();
  }, [initialize]);
  return <>{children}</>;
}

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
