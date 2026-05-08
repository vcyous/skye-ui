import { Alert, Button, Card, Form, Input, Modal, Typography } from "antd";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, requestPasswordReset } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [resetNotice, setResetNotice] = useState("");
  const [form] = Form.useForm();
  const [resetForm] = Form.useForm();

  async function onSubmit(values) {
    setSubmitError("");
    setResetNotice("");

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

  async function onResetSubmit(values) {
    setResetNotice("");
    setIsResetSubmitting(true);
    try {
      await requestPasswordReset(values.email);
      setResetNotice("Password reset email sent. Please check your inbox.");
      resetForm.resetFields();
      setIsResetOpen(false);
    } catch (err) {
      setResetNotice(err.message || "Unable to send reset email.");
    } finally {
      setIsResetSubmitting(false);
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

        {resetNotice ? (
          <Alert
            type="info"
            message={resetNotice}
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
        <Typography.Paragraph className="auth-footer" type="secondary">
          Forgot password?{" "}
          <Button type="link" size="small" onClick={() => setIsResetOpen(true)}>
            Reset it
          </Button>
        </Typography.Paragraph>
      </Card>

      <Modal
        title="Reset password"
        open={isResetOpen}
        onCancel={() => setIsResetOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={resetForm}
          layout="vertical"
          onFinish={onResetSubmit}
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

          <Button
            type="primary"
            htmlType="submit"
            loading={isResetSubmitting}
            block
          >
            Send reset link
          </Button>
        </Form>
      </Modal>
    </section>
  );
}
