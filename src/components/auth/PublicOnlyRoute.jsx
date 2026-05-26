import { Flex, Spin, Typography } from "antd";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

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

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
