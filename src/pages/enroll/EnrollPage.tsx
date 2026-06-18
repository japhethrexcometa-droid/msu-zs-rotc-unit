import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import { AlertCircle, ArrowLeft, ArrowRight, Shield, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

// Form State Types
interface EnrollmentState {
  // Step 1
  id_number: string;
  school: string;
  last_name: string;
  first_name: string;
  middle_initial: string;
  suffix: string;
  gender: string;
  date_of_birth: string;
  course_year: string;
  // Step 2
  contact_number: string;
  home_address: string;
  religion: string;
  blood_type: string;
  height_feet: string;
  email: string;
  beneficiary_name: string;
  beneficiary_relationship: string;
  // Step 3
  emergency_name: string;
  emergency_relationship: string;
  emergency_contact: string;
}

const initialFormState: EnrollmentState = {
  id_number: "", school: "", last_name: "", first_name: "", middle_initial: "", suffix: "N/A", gender: "Male", date_of_birth: "", course_year: "",
  contact_number: "", home_address: "", religion: "", blood_type: "Unknown", height_feet: "", email: "", beneficiary_name: "", beneficiary_relationship: "",
  emergency_name: "", emergency_relationship: "", emergency_contact: ""
};

export default function EnrollPage() {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<EnrollmentState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const validRole = role === "officer" || role === "cadet" ? role : "cadet";

  useEffect(() => {
    // Check if enrollment is open
    const checkSettings = async () => {
      const { data } = await supabase.from('system_settings').select('value').eq('id', 'enrollment_open').single();
      if (data && data.value === false) setIsOpen(false);
      setIsLoadingSettings(false);
    };
    checkSettings();

    // Load from offline storage
    const saved = localStorage.getItem('enrollment_draft');
    if (saved) {
      try { setFormData(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const updateForm = (updates: Partial<EnrollmentState>) => {
    const updated = { ...formData, ...updates };
    setFormData(updated);
    localStorage.setItem('enrollment_draft', JSON.stringify(updated));
  };

  // Validation Logic
  const isStep1Valid = () => {
    return !!(formData.id_number.trim() && formData.school.trim() && formData.last_name.trim() && formData.first_name.trim() && formData.date_of_birth && formData.course_year.trim());
  };
  
  const isStep2Valid = () => {
    return !!(formData.contact_number.trim() && formData.home_address.trim() && formData.email.trim().includes('@') && formData.beneficiary_name.trim() && formData.beneficiary_relationship.trim());
  };
  
  const isStep3Valid = () => {
    return !!(formData.emergency_name.trim() && formData.emergency_relationship.trim() && formData.emergency_contact.trim());
  };

  const nextStep = () => {
    if (step === 1 && !isStep1Valid()) { setSubmitError("Please fill in all required fields."); return; }
    if (step === 2 && !isStep2Valid()) { setSubmitError("Please fill in all required fields and provide a valid email."); return; }
    setSubmitError(null);
    setStep(s => Math.min(s + 1, 3));
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setSubmitError(null);
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo(0, 0);
  };

  const onSubmit = async () => {
    if (!isStep3Valid()) { setSubmitError("Please fill in emergency contact details."); return; }
    
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("enrollment_requests").insert({
        ...formData,
        role: validRole,
        status: "pending",
        ms_subject: "MS1",
        ms_title: "Military Science 1",
        semester: "1st Semester"
      });

      if (error) {
        if (error.code === "23505") throw new Error("An enrollment request with this ID number already exists.");
        throw new Error(error.message || "Failed to submit enrollment. Please try again.");
      }

      localStorage.removeItem('enrollment_draft');
      navigate("/enroll/success", { replace: true });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingSettings) return <div className="min-h-screen bg-rotc-bg flex items-center justify-center text-rotc-textMuted">Loading...</div>;

  if (!isOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-rotc-bg">
        <div className="max-w-md w-full text-center space-y-4 p-8 bg-rotc-card border border-rotc-border rounded-2xl shadow-xl">
          <div className="w-16 h-16 bg-rotc-danger/10 text-rotc-danger rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-rotc-text">Enrollment Closed</h1>
          <p className="text-rotc-textMuted">Online enrollment is currently closed. Please contact the ROTC office for more information.</p>
          <Link to="/" className="inline-block mt-4 text-rotc-accent hover:underline">Return to Login</Link>
        </div>
      </div>
    );
  }

  const InputField = ({ label, field, placeholder, type = "text", required = true }: any) => (
    <Input
      label={`${label} ${required ? '*' : ''}`}
      type={type}
      placeholder={placeholder}
      value={(formData as any)[field]}
      onChange={e => updateForm({ [field]: e.target.value })}
      className={required && !(formData as any)[field].trim() ? "border-rotc-danger/30" : ""}
    />
  );

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4 bg-rotc-bg relative overflow-x-hidden">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-rotc-accent/5 to-transparent pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl space-y-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-rotc-textMuted hover:text-rotc-text transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>

        {/* Header & Progress */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rotc-accent/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-rotc-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-rotc-text">{validRole === "officer" ? "Officer" : "Cadet"} Enrollment</h1>
              <p className="text-sm text-rotc-textMuted">Please complete all steps to submit your request.</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-1 flex flex-col gap-2">
                <div className={`h-2 rounded-full transition-colors ${step >= i ? 'bg-rotc-accent' : 'bg-rotc-border'}`} />
                <span className={`text-xs font-medium px-1 ${step >= i ? 'text-rotc-text' : 'text-rotc-textMuted/50'}`}>
                  Step {i}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-rotc-card border border-rotc-border rounded-2xl shadow-xl p-5 sm:p-8">
          {submitError && (
            <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded-lg bg-rotc-danger/10 border border-rotc-danger/20 text-sm text-rotc-danger animate-fade-in">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* STEP 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-lg font-semibold text-rotc-text border-b border-rotc-border pb-2">Personal Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Student ID Number" field="id_number" placeholder="e.g. 1008352" />
                <InputField label="School" field="school" placeholder="e.g. MSU Buug" />
                <InputField label="First Name" field="first_name" placeholder="Juan" />
                <InputField label="Last Name" field="last_name" placeholder="Dela Cruz" />
                <InputField label="Middle Initial" field="middle_initial" placeholder="A" required={false} />
                <InputField label="Suffix" field="suffix" placeholder="Jr, N/A" required={false} />
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-rotc-textMuted">Gender *</label>
                  <select 
                    value={formData.gender} onChange={e => updateForm({ gender: e.target.value })}
                    className="w-full rounded-lg bg-rotc-bg border border-rotc-border text-rotc-text px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rotc-accent/50 focus:border-rotc-accent"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                
                <InputField label="Date of Birth" field="date_of_birth" type="date" />
                <InputField label="Course & Year" field="course_year" placeholder="e.g. BSIT 1" />
              </div>
            </div>
          )}

          {/* STEP 2: Other Details & Beneficiary */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-lg font-semibold text-rotc-text border-b border-rotc-border pb-2">Contact & Other Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Contact Number" field="contact_number" placeholder="09123456789" />
                <InputField label="Email Address (Gmail req)" field="email" type="email" placeholder="you@gmail.com" />
                <div className="sm:col-span-2">
                  <InputField label="Home Address" field="home_address" placeholder="Poblacion, Buug, ZSP" />
                </div>
                <InputField label="Religion" field="religion" placeholder="e.g. Roman Catholic" required={false} />
                <InputField label="Height (Feet)" field="height_feet" placeholder="e.g. 5'7" required={false} />
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-rotc-textMuted">Blood Type</label>
                  <select 
                    value={formData.blood_type} onChange={e => updateForm({ blood_type: e.target.value })}
                    className="w-full rounded-lg bg-rotc-bg border border-rotc-border text-rotc-text px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rotc-accent/50 focus:border-rotc-accent"
                  >
                    {['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
                      <option key={bt} value={bt}>{bt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <h2 className="text-lg font-semibold text-rotc-text border-b border-rotc-border pb-2 mt-8">Beneficiary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Beneficiary Name" field="beneficiary_name" placeholder="Full Name" />
                <InputField label="Relationship" field="beneficiary_relationship" placeholder="Mother, Uncle, etc." />
              </div>
            </div>
          )}

          {/* STEP 3: Emergency & Summary */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold text-rotc-text border-b border-rotc-border pb-2 mb-4 text-rotc-danger">Emergency Contact</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-rotc-danger/5 p-4 rounded-xl border border-rotc-danger/10">
                  <div className="sm:col-span-2"><InputField label="Contact Name" field="emergency_name" placeholder="Full Name" /></div>
                  <InputField label="Relationship" field="emergency_relationship" placeholder="Mother, Father, etc." />
                  <InputField label="Contact Number" field="emergency_contact" placeholder="09123456789" />
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-rotc-text border-b border-rotc-border pb-2 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-rotc-success" /> Review Your Details
                </h2>
                <div className="text-sm space-y-3 bg-rotc-bg rounded-xl p-4 border border-rotc-border">
                  <div className="grid grid-cols-2 gap-y-2">
                    <span className="text-rotc-textMuted">ID Number:</span><span className="text-rotc-text font-medium">{formData.id_number}</span>
                    <span className="text-rotc-textMuted">Name:</span><span className="text-rotc-text font-medium">{formData.first_name} {formData.last_name}</span>
                    <span className="text-rotc-textMuted">School:</span><span className="text-rotc-text font-medium">{formData.school}</span>
                    <span className="text-rotc-textMuted">Course & Year:</span><span className="text-rotc-text font-medium">{formData.course_year}</span>
                    <span className="text-rotc-textMuted">Email:</span><span className="text-rotc-text font-medium">{formData.email}</span>
                  </div>
                  <p className="text-xs text-rotc-textMuted/70 italic mt-2 border-t border-rotc-border pt-2">By submitting this form, you verify that all information provided is accurate and true.</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-rotc-border">
            {step > 1 ? (
              <Button variant="outline" onClick={prevStep} type="button">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
            ) : <div />}

            {step < 3 ? (
              <Button onClick={nextStep} type="button">
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={onSubmit} loading={isSubmitting} type="button">
                <Shield className="h-4 w-4 mr-2" /> Submit Enrollment
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
