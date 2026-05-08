import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();

  async function onSubmit(values) {
    setSubmitError("");

    setIsSubmitting(true);
    try {
      await login(values);
      const redirectPath = location.state?.from || "/";
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setSubmitError(err.message || "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <div aria-hidden="true" className="auth-ornament" />
      <Card className="auth-card">
        <Typography.Paragraph className="auth-brand">
          Skye Apps
        </Typography.Paragraph>
        <Typography.Title level={2}>Welcome back</Typography.Title>
        <Typography.Paragraph type="secondary">
          Sign in to access your commerce command center.
        </Typography.Paragraph>

        {submitError ? (
          <Alert
            type="error"
            message={submitError}
            showIcon
            style={{ marginBottom: 12 }}
          />
        ) : null}

        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Email is required." },
              { type: "email", message: "Enter a valid email address." },
            ]}
          >
            <Input autoComplete="email" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Password is required." }]}
          >
            <Input.Password
              autoComplete="current-password"
              visibilityToggle={{
                visible: showPassword,
                onVisibleChange: setShowPassword,
              }}
            />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={isSubmitting} block>
            Sign in
          </Button>
        </Form>

        <Typography.Paragraph className="auth-footer" type="secondary">
          Need an account? <Link to="/register">Create one</Link>
        </Typography.Paragraph>
      </Card>
    </section>
  );
}
