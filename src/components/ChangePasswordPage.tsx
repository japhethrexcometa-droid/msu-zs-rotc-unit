import Button from "@/components/ui/Button";
import { AuthError, changePassword } from "@/lib/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: PasswordForm) => {
    setError(null);
    setIsSubmitting(true);

    try {
      await changePassword(data.currentPassword, data.newPassword);
      setSuccess(true);
      reset();
    } catch (err: any) {
      if (err?.name === 'AuthError') {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-rotc-bg">
        <div className="w-full max-w-md">
          <div className="bg-rotc-card/80 backdrop-blur-sm border border-rotc-border rounded-2xl p-8 shadow-xl shadow-black/20 text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-rotc-success/15 flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-rotc-success" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-rotc-text">
                Password Changed Successfully
              </h1>
              <p className="text-sm text-rotc-textMuted">
                Your password has been updated. You can now sign in with your new
                password.
              </p>
            </div>
            <Button
              onClick={() => navigate(-1)}
              className="w-full py-3 text-base font-semibold rounded-xl"
              size="lg"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-rotc-bg">
      <div className="w-full max-w-md">
        <div className="bg-rotc-card/80 backdrop-blur-sm border border-rotc-border rounded-2xl p-8 shadow-xl shadow-black/20 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-rotc-accent/20 to-rotc-accent/5 border border-rotc-accent/20 flex items-center justify-center shadow-lg shadow-rotc-accent/10">
              <ShieldCheck className="h-8 w-8 text-rotc-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-rotc-text">Change Password</h1>
              <p className="text-sm text-rotc-textMuted">
                Update your password to keep your account secure
              </p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-rotc-danger/10 border border-rotc-danger/20 text-sm text-rotc-danger">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="currentPassword"
                className="text-sm font-medium text-rotc-textMuted"
              >
                Current Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-rotc-textMuted pointer-events-none">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  {...register("currentPassword")}
                  id="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter current password"
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  className={[
                    "w-full pl-10 pr-12 py-3 rounded-xl bg-rotc-bg/60 border text-rotc-text text-sm",
                    "placeholder-rotc-textMuted/50 transition-all duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-rotc-accent/50 focus:border-rotc-accent",
                    errors.currentPassword
                      ? "border-rotc-danger"
                      : "border-rotc-border",
                  ].join(" ")}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-rotc-textMuted hover:text-rotc-text transition-colors"
                  tabIndex={-1}
                >
                  {showCurrent ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-xs text-rotc-danger">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="newPassword"
                className="text-sm font-medium text-rotc-textMuted"
              >
                New Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-rotc-textMuted pointer-events-none">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  {...register("newPassword")}
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  placeholder="Enter new password"
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  className={[
                    "w-full pl-10 pr-12 py-3 rounded-xl bg-rotc-bg/60 border text-rotc-text text-sm",
                    "placeholder-rotc-textMuted/50 transition-all duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-rotc-accent/50 focus:border-rotc-accent",
                    errors.newPassword ? "border-rotc-danger" : "border-rotc-border",
                  ].join(" ")}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-rotc-textMuted hover:text-rotc-text transition-colors"
                  tabIndex={-1}
                >
                  {showNew ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-xs text-rotc-danger">
                  {errors.newPassword.message}
                </p>
              )}
              <p className="text-xs text-rotc-textMuted/60">
                Must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-rotc-textMuted"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-rotc-textMuted pointer-events-none">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  {...register("confirmPassword")}
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  className={[
                    "w-full pl-10 pr-12 py-3 rounded-xl bg-rotc-bg/60 border text-rotc-text text-sm",
                    "placeholder-rotc-textMuted/50 transition-all duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-rotc-accent/50 focus:border-rotc-accent",
                    errors.confirmPassword
                      ? "border-rotc-danger"
                      : "border-rotc-border",
                  ].join(" ")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-rotc-textMuted hover:text-rotc-text transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-rotc-danger">
                  {errors.confirmPassword.message}
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
              Change Password
            </Button>
          </form>

          {/* Cancel */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full py-3 text-sm text-rotc-textMuted hover:text-rotc-text transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
