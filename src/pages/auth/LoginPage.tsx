import Button from "@/components/ui/Button";
import { AuthError, loginUser } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth.store";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Shield,
  User,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";

const loginSchema = z.object({
  idNumber: z
    .string()
    .min(1, "ID number is required")
    .transform((v) => v.toUpperCase().trim()),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotAlert, setShowForgotAlert] = useState(false);

  const expired = searchParams.get("expired") === "1";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { idNumber: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoginError(null);
    setIsSubmitting(true);

    try {
      await loginUser(data.idNumber, data.password);
      const route = useAuthStore.getState().getRouteForRole();
      navigate(route, { replace: true });
    } catch (err) {
      if (err instanceof AuthError) {
        setLoginError(err.message);
      } else {
        setLoginError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-rotc-bg relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-rotc-accent/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-rotc-accent/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-rotc-accent/[0.02] blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm space-y-6">
        {/* Logo & Branding */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-rotc-accent/20 to-rotc-accent/5 border border-rotc-accent/20 flex items-center justify-center shadow-lg shadow-rotc-accent/10">
            <Shield className="h-10 w-10 text-rotc-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-rotc-text tracking-tight">
              MSU-ZS ROTC UNIT
            </h1>
            <p className="text-sm text-rotc-textMuted mt-1"></p>
          </div>
        </div>

        {/* Session expired banner */}
        {expired && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-rotc-warning/10 border border-rotc-warning/20 text-sm text-rotc-warning animate-fade-in">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Your session expired. Please sign in again.</span>
          </div>
        )}

        {/* Login Card */}
        <div className="bg-rotc-card/80 backdrop-blur-sm border border-rotc-border rounded-2xl p-6 shadow-xl shadow-black/20">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Error message */}
            {loginError && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-rotc-danger/10 border border-rotc-danger/20 text-sm text-rotc-danger animate-fade-in">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Forgot Password message */}
            {showForgotAlert && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-rotc-accent/10 border border-rotc-accent/20 text-sm text-rotc-text animate-fade-in">
                <Shield className="h-4 w-4 flex-shrink-0 mt-0.5 text-rotc-accent" />
                <span>To reset your password, please contact your Platoon Leader or the S1 Admin office. They can verify your identity and issue a new password.</span>
              </div>
            )}

            {/* ID Number */}
            <div className="space-y-1.5">
              <label
                htmlFor="idNumber"
                className="text-sm font-medium text-rotc-textMuted"
              >
                ID Number
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-rotc-textMuted pointer-events-none">
                  <User className="h-4 w-4" />
                </div>
                <input
                  {...register("idNumber")}
                  id="idNumber"
                  type="text"
                  placeholder="Enter your ID Number"
                  autoComplete="off"
                  autoCapitalize="characters"
                  className={[
                    "w-full pl-10 pr-4 py-3 rounded-xl bg-rotc-bg/60 border text-rotc-text text-sm",
                    "placeholder-rotc-textMuted/50 transition-all duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-rotc-accent/50 focus:border-rotc-accent",
                    errors.idNumber
                      ? "border-rotc-danger"
                      : "border-rotc-border",
                  ].join(" ")}
                />
              </div>
              {errors.idNumber && (
                <p className="text-xs text-rotc-danger">
                  {errors.idNumber.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-rotc-textMuted"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-rotc-textMuted pointer-events-none">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  {...register("password")}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  className={[
                    "w-full pl-10 pr-12 py-3 rounded-xl bg-rotc-bg/60 border text-rotc-text text-sm",
                    "placeholder-rotc-textMuted/50 transition-all duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-rotc-accent/50 focus:border-rotc-accent",
                    errors.password
                      ? "border-rotc-danger"
                      : "border-rotc-border",
                  ].join(" ")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-rotc-textMuted hover:text-rotc-text transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-rotc-danger">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              loading={isSubmitting}
              className="w-full py-3 text-base font-semibold rounded-xl"
              size="lg"
            >
              Sign In
            </Button>
          </form>
        </div>

        {/* Forgot password link */}
        <div className="text-center space-y-3">
          <p className="text-sm text-rotc-textMuted">
            <button
              type="button"
              onClick={() => setShowForgotAlert(true)}
              className="text-rotc-accent hover:text-rotc-accentHover font-medium inline-flex items-center gap-0.5 transition-colors"
            >
              Forgot Password?
            </button>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-rotc-textMuted/60 pt-2">
          MSU-Zamboanga Sibugay &middot; Reserve Officers' Training Corps
        </p>
      </div>
    </div>
  );
}
