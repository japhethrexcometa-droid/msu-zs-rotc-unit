import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, Shield } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

const enrollSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  id_number: z.string().min(3, 'StudentID number is required (e.g. 1008353)'),
  platoon: z.string().optional(),
  contact_number: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

type EnrollForm = z.infer<typeof enrollSchema>;

const platoons = [
  "Alpha",
  "Bravo",
  "Charlie",
  "Delta",
  "Echo",
  "To be assigned",
];

export default function EnrollPage() {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validRole = role === "officer" || role === "cadet" ? role : "cadet";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EnrollForm>({
    resolver: zodResolver(enrollSchema),
    defaultValues: {
      full_name: "",
      id_number: "",
      platoon: "To be assigned",
      contact_number: "",
      email: "",
    },
  });

  const onSubmit = async (data: EnrollForm) => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("enrollment_requests").insert({
        full_name: data.full_name.trim(),
        id_number: data.id_number.trim().toUpperCase(),
        role: validRole,
        platoon: data.platoon === "To be assigned" ? null : data.platoon,
        contact_number: data.contact_number?.trim() || null,
        email: data.email?.trim() || null,
        status: "pending",
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error(
            "An enrollment request with this ID number already exists.",
          );
        }
        throw new Error("Failed to submit enrollment. Please try again.");
      }

      navigate("/enroll/success", { replace: true });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-rotc-bg relative overflow-hidden">
      {/* Background decorative */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-rotc-accent/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-rotc-accent/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-rotc-textMuted hover:text-rotc-text transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-rotc-accent/20 to-rotc-accent/5 border border-rotc-accent/20 flex items-center justify-center">
            <Shield className="h-8 w-8 text-rotc-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-rotc-text">
              {validRole === "officer" ? "Officer" : "Cadet"} Enrollment
            </h1>
            <p className="text-sm text-rotc-textMuted mt-1">
              Submit your enrollment request for review
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-rotc-card/80 backdrop-blur-sm border border-rotc-border rounded-2xl p-6 shadow-xl shadow-black/20">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Error */}
            {submitError && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-rotc-danger/10 border border-rotc-danger/20 text-sm text-rotc-danger animate-fade-in">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Role badge (readonly) */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rotc-accent/10 border border-rotc-accent/20">
              <span className="w-2 h-2 rounded-full bg-rotc-accent" />
              <span className="text-sm font-medium text-rotc-accent capitalize">
                Enrolling as {validRole}
              </span>
            </div>

            <Input
              label="Full Name"
              placeholder="Juan Dela Cruz"
              error={errors.full_name?.message}
              {...register("full_name")}
            />

            <Input
              label="Student ID Number"
              placeholder="1008353"
              error={errors.id_number?.message}
              {...register("id_number")}
            />

            {/* Platoon select */}
            <div className="space-y-1.5">
              <label
                htmlFor="platoon"
                className="text-sm font-medium text-rotc-textMuted"
              >
                Platoon
              </label>
              <select
                {...register("platoon")}
                id="platoon"
                className="w-full rounded-lg bg-rotc-bg/60 border border-rotc-border text-rotc-text px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rotc-accent/50 focus:border-rotc-accent transition-all"
              >
                {platoons.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Contact Number"
              placeholder="+63 912 345 6789"
              error={errors.contact_number?.message}
              {...register("contact_number")}
            />

            <Input
              label="Email (optional)"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register("email")}
            />

            <Button
              type="submit"
              loading={isSubmitting}
              className="w-full py-3 text-base font-semibold rounded-xl mt-2"
              size="lg"
            >
              Submit Enrollment
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-rotc-textMuted/60">
          Your request will be reviewed by an administrator.
        </p>
      </div>
    </div>
  );
}
