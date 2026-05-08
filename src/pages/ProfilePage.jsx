import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProfilePage() {
  const { user, syncProfile, saveProfile } = useAuth();
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  useEffect(() => {
    syncProfile().catch(() => {
      // Keep existing user snapshot if sync fails.
    });
  }, [syncProfile]);

  useEffect(() => {
    form.setFieldsValue({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
  }, [form, user]);

  async function onSubmit(values) {
    setFeedback({ type: "", message: "" });
    setIsSubmitting(true);
    try {
      await saveProfile({ name: values.name, phone: values.phone });
      setFeedback({
        type: "success",
        message: "Profile updated successfully.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to update profile.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header>
        <Typography.Title level={3} className="page-title">
          Profile
        </Typography.Title>
        <Typography.Text className="page-subtitle">
          Manage your account information and contact details.
        </Typography.Text>
      </header>

      <Card title="Account Settings" style={{ maxWidth: 700 }}>
        {feedback.message ? (
          <Alert
            type={feedback.type || "info"}
            message={feedback.message}
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: "Name is required." }]}
          >
            <Input autoComplete="name" />
          </Form.Item>

          <Form.Item name="email" label="Email">
            <Input disabled autoComplete="email" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone"
            rules={[{ max: 40, message: "Phone is too long." }]}
          >
            <Input autoComplete="tel" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            Save profile
          </Button>
        </Form>
      </Card>
    </section>
  );
}
