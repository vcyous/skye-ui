import { App, Card, Steps } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { completeOnboarding } from "../../services/api";
import LaunchStep from "./steps/LaunchStep";
import StoreBasicsStep from "./steps/StoreBasicsStep";
import TemplatePickStep from "./steps/TemplatePickStep";

interface WizardValues {
  storeName: string;
  currency: string;
  timezone: string;
  templateSlug: string;
}

const STEPS = [
  { title: "Your Store" },
  { title: "Template" },
  { title: "Launch" },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { refreshSession } = useAuth();

  const [current, setCurrent] = useState(0);
  const [isLaunching, setIsLaunching] = useState(false);
  const [values, setValues] = useState<WizardValues>({
    storeName: "",
    currency: "IDR",
    timezone: "Asia/Jakarta",
    templateSlug: "modern-minimal",
  });

  function handleBasics(basics: {
    storeName: string;
    currency: string;
    timezone: string;
  }) {
    setValues((prev) => ({ ...prev, ...basics }));
    setCurrent(1);
  }

  function handleTemplate(templateSlug: string) {
    setValues((prev) => ({ ...prev, templateSlug }));
    setCurrent(2);
  }

  async function handleLaunch() {
    setIsLaunching(true);
    try {
      await completeOnboarding(values);
      await refreshSession();
      navigate("/store/website-builder", { replace: true });
    } catch (err: any) {
      message.error(err.message || "Failed to launch store. Please try again.");
    } finally {
      setIsLaunching(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#EDF4F2",
        padding: 24,
      }}
    >
      <Card style={{ width: "100%", maxWidth: 640 }}>
        <div style={{ marginBottom: 32 }}>
          <Steps current={current} items={STEPS} size="small" />
        </div>

        {current === 0 && <StoreBasicsStep onNext={handleBasics} />}
        {current === 1 && (
          <TemplatePickStep
            onNext={handleTemplate}
            onBack={() => setCurrent(0)}
          />
        )}
        {current === 2 && (
          <LaunchStep
            values={values}
            onLaunch={handleLaunch}
            onBack={() => setCurrent(1)}
            isLaunching={isLaunching}
          />
        )}
      </Card>
    </div>
  );
}
