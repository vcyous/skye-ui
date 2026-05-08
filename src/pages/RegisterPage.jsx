import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();

  async function onSubmit(values) {
    setSubmitError("");

    setIsSubmitting(true);
    try {
      await register({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      navigate("/", { replace: true });
    } catch (err) {
      setSubmitError(err.message || "Registration failed. Please try again.");
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
        <Typography.Title level={2}>Create account</Typography.Title>
        <Typography.Paragraph type="secondary">
          Start managing your store with secure access.
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
            label="Name"
            name="name"
            rules={[{ required: true, message: "Name is required." }]}
          >
            <Input autoComplete="name" />
          </Form.Item>

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
            rules={[
              { required: true, message: "Password is required." },
              { min: 8, message: "Password must be at least 8 characters." },
            ]}
          >
            <Input.Password
              autoComplete="new-password"
              visibilityToggle={{
                visible: showPassword,
                onVisibleChange: setShowPassword,
              }}
            />
          </Form.Item>

          <Form.Item
            label="Confirm Password"
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Confirm password is required." },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("Password confirmation does not match."),
                  );
                },
              }),
            ]}
          >
            <Input.Password
              autoComplete="new-password"
              visibilityToggle={{
                visible: showPassword,
                onVisibleChange: setShowPassword,
              }}
            />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={isSubmitting} block>
            Create account
          </Button>
        </Form>

        <Typography.Paragraph className="auth-footer" type="secondary">
          Already have an account? <Link to="/login">Sign in</Link>
        </Typography.Paragraph>
      </Card>
    </section>
  );
}
