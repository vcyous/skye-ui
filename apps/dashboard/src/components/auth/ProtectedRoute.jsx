import { Loader2, ShieldX } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({
  children,
  requiredRoles = null,
  fallback = null,
}) {
  const { isAuthenticated, isLoading, hasRole, currentRole, store } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Checking session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (!store) {
    return <Navigate to="/select-store" replace />;
  }

  if (
    store &&
    !store.onboardingCompletedAt &&
    location.pathname !== "/onboarding"
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  if (requiredRoles && !hasRole(requiredRoles)) {
    if (fallback) return fallback;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldX className="size-8" />
        </div>
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {`This page requires ${
            Array.isArray(requiredRoles)
              ? requiredRoles.join(" or ")
              : requiredRoles
          } role. You are currently: ${currentRole}`}
        </p>
        <Button onClick={() => window.history.back()}>Go Back</Button>
      </div>
    );
  }

  return children;
}
