import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, requestPasswordReset } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    reset: resetReset,
    formState: { errors: resetErrors },
  } = useForm();

  async function onSubmit(values) {
    setIsSubmitting(true);
    try {
      await login(values);
      const redirectPath = location.state?.from || "/dashboard";
      navigate(redirectPath, { replace: true });
    } catch (err) {
      toast.error(err.message || "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onResetSubmit(values) {
    setIsResetSubmitting(true);
    try {
      await requestPasswordReset(values.email);
      toast.success("Password reset email sent. Please check your inbox.");
      resetReset();
      setIsResetOpen(false);
    } catch (err) {
      toast.error(err.message || "Unable to send reset email.");
    } finally {
      setIsResetSubmitting(false);
    }
  }

  return (
    <section className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Skye Apps
          </p>
          <h2 className="mt-2 text-2xl font-bold">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to access your commerce command center.
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-6 flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register("email", {
                  required: "Email is required.",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email address.",
                  },
                })}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  {...register("password", {
                    required: "Password is required.",
                  })}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-4 text-sm text-muted-foreground">
            Need an account?{" "}
            <Link to="/register" className="text-primary underline-offset-4 hover:underline">
              Create one
            </Link>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Forgot password?{" "}
            <button
              type="button"
              onClick={() => setIsResetOpen(true)}
              className="text-primary underline-offset-4 hover:underline"
            >
              Reset it
            </button>
          </p>
        </CardContent>
      </Card>

      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleResetSubmit(onResetSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                aria-invalid={!!resetErrors.email}
                {...registerReset("email", {
                  required: "Email is required.",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email address.",
                  },
                })}
              />
              {resetErrors.email && (
                <p className="text-xs text-destructive">
                  {resetErrors.email.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isResetSubmitting}
            >
              {isResetSubmitting ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
