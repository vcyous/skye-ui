import { Flex, Spin, Typography } from "antd";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

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

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return children;
}
