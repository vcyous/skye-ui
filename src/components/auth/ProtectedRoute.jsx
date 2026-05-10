import { Button, Flex, Result, Spin, Typography } from "antd";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

/**
 * ProtectedRoute - Enforces authentication and optional role-based access control
 *
 * Props:
 * - children: React component to render if authorized
 * - requiredRoles: string or array of role strings (owner, admin, manager, staff)
 * - fallback: what to render if user doesn't have required role (default: access denied screen)
 */
export default function ProtectedRoute({
  children,
  requiredRoles = null,
  fallback = null,
}) {
  const { isAuthenticated, isLoading, hasRole, currentRole, store } = useAuth();
  const location = useLocation();

  // Loading state
  if (isLoading) {
    return (
      <Flex
        vertical
        align="center"
        justify="center"
        style={{ minHeight: "100vh" }}
        gap={12}
      >
        <Spin />
        <Typography.Text type="secondary">Checking session...</Typography.Text>
      </Flex>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  // No store selected - redirect to store selector
  if (!store) {
    return <Navigate to="/select-store" replace />;
  }

  // Role-based access control
  if (requiredRoles && !hasRole(requiredRoles)) {
    // Return custom fallback or default access denied screen
    if (fallback) {
      return fallback;
    }

    return (
      <Flex
        vertical
        align="center"
        justify="center"
        style={{ minHeight: "100vh" }}
      >
        <Result
          status="403"
          title="Access Denied"
          subTitle={`This page requires ${
            Array.isArray(requiredRoles)
              ? requiredRoles.join(" or ")
              : requiredRoles
          } role. You are currently: ${currentRole}`}
          extra={
            <Button type="primary" onClick={() => window.history.back()}>
              Go Back
            </Button>
          }
        />
      </Flex>
    );
  }

  return children;
}
