import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "../../context/AuthContext";
import { completeOnboarding } from "../../services/api";
import LaunchStep from "./steps/LaunchStep";
import StoreBasicsStep from "./steps/StoreBasicsStep";
import TemplatePickStep from "./steps/TemplatePickStep";

const STEPS = ["Your Store", "Template", "Launch"];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();

  const [current, setCurrent] = useState(0);
  const [isLaunching, setIsLaunching] = useState(false);
  const [values, setValues] = useState({
    storeName: "",
    currency: "IDR",
    timezone: "Asia/Jakarta",
    templateSlug: "modern-minimal",
  });

  function handleBasics(basics) {
    setValues((prev) => ({ ...prev, ...basics }));
    setCurrent(1);
  }

  function handleTemplate(templateSlug) {
    setValues((prev) => ({ ...prev, templateSlug }));
    setCurrent(2);
  }

  async function handleLaunch() {
    setIsLaunching(true);
    try {
      await completeOnboarding(values);
      await refreshSession();
      navigate("/dashboard/store/website-builder", { replace: true });
    } catch (err) {
      toast.error(err.message || "Failed to launch store. Please try again.");
    } finally {
      setIsLaunching(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-muted p-6">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-6">
          <div className="mb-8 flex items-center gap-2">
            {STEPS.map((title, i) => (
              <div key={title} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
                    i <= current
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`text-sm ${
                    i === current ? "font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {title}
                </span>
                {i < STEPS.length - 1 && (
                  <div className="ml-2 h-px flex-1 bg-border" />
                )}
              </div>
            ))}
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
        </CardContent>
      </Card>
    </div>
  );
}
