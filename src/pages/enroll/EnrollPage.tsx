import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import { AlertCircle, ArrowLeft, ArrowRight, Shield, CheckCircle2 } from "lucide-react";
import { useEnrollmentOpen } from '@/hooks/queries/useSettings';
import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

// MS Class mapping: year_class + semester → ms_subject + ms_title
const MS_MAP: Record<string, Record<string, { subject: string; title: string }>> = {
  'Basic Cadet': {
    '1st Semester': { subject: 'MS1', title: 'Military Science 1' },
    '2nd Semester': { subject: 'MS2', title: 'Military Science 2' },
  },
  '2nd Class (2CL)': {
    '1st Semester': { subject: 'MS31', title: 'Military Science 31' },
    '2nd Semester': { subject: 'MS32', title: 'Military Science 32' },
  },
  '1st Class (1CL)': {
    '1st Semester': { subject: 'MS41', title: 'Military Science 41' },
    '2nd Semester': { subject: 'MS42', title: 'Military Science 42' },
  },
};

const YEAR_CLASSES = Object.keys(MS_MAP);
const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
const SEMESTERS = ['1st Semester', '2nd Semester'];

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
  year_level: string;
  year_class: string;
  semester: string;
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
  id_number: "", school: "", last_name: "", first_name: "", middle_initial: "", suffix: "", gender: "Male", date_of_birth: "", course_year: "",
  year_level: "1st Year", year_class: "Basic Cadet", semester: "1st Semester",
  contact_number: "", home_address: "", religion: "", blood_type: "Unknown", height_feet: "", email: "", beneficiary_name: "", beneficiary_relationship: "",
  emergency_name: "", emergency_relationship: "", emergency_contact: ""
};

import { verifyAccessCode } from '@/services/accesscodes.service';

// Validation helpers
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
// Accepts: 09123456789, 0912 345 6789, 0912-345-6789, +639123456789, +63 912 345 6789
const isValidPhone = (phone: string) => {
  const cleaned = phone.replace(/[\s\-]/g, '');
  return /^09\d{9}$/.test(cleaned) || /^\+639\d{9}$/.test(cleaned);
};

export default function EnrollPage() {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // Step 0 is the Access Code gate
  const [accessCode, setAccessCode] = useState('');
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const [formData, setFormData] = useState<EnrollmentState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { data: isOpen = false, isLoading: isLoadingSettings } = useEnrollmentOpen();

  const validRole = role === "officer" || role === "cadet" ? role : "cadet";

  // Filter MS Class options per role: cadet = Basic Cadet only, officer = 2CL/1CL only
  const filteredYearClasses = validRole === 'officer'
    ? YEAR_CLASSES.filter(yc => yc.includes('2CL') || yc.includes('1CL'))
    : YEAR_CLASSES.filter(yc => yc === 'Basic Cadet');

  useEffect(() => {
    const saved = localStorage.getItem('enrollment_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Immediately correct year_class if it doesn't belong to this role
        // This prevents the race condition where an officer draft loads on cadet page
        if (filteredYearClasses.length > 0 && !filteredYearClasses.includes(parsed.year_class)) {
          parsed.year_class = filteredYearClasses[0];
        }
        setFormData(parsed);
        localStorage.setItem('enrollment_draft', JSON.stringify(parsed));
      } catch (e) {}
    }
  }, []);

  // Auto-fix year_class whenever it doesn't belong to the current role's options
  useEffect(() => {
    if (filteredYearClasses.length > 0 && !filteredYearClasses.includes(formData.year_class)) {
      updateForm({ year_class: filteredYearClasses[0] });
    }
  }, [validRole, formData.year_class]);

  const updateForm = (updates: Partial<EnrollmentState>) => {
    const updated = { ...formData, ...updates };
    setFormData(updated);
    localStorage.setItem('enrollment_draft', JSON.stringify(updated));
  };

  // Validation Logic
  const isStep1Valid = () => {
    return !!(
      formData.id_number.trim() && formData.school.trim() && 
      formData.last_name.trim() && formData.first_name.trim() && 
      formData.gender.trim() && formData.date_of_birth && 
      formData.course_year.trim() && formData.year_level.trim() && formData.year_class.trim() && formData.semester.trim()
    );
  };
  
  const isStep2Valid = () => {
    const errors: string[] = [];
    if (!formData.contact_number.trim()) errors.push("Contact Number is required");
    else if (!isValidPhone(formData.contact_number)) errors.push("Contact Number must be a valid PH mobile number");
    if (!formData.home_address.trim()) errors.push("Home Address is required");
    if (!formData.email.trim()) errors.push("Email is required");
    else if (!isValidEmail(formData.email)) errors.push("Please provide a valid email address");
    if (!formData.religion.trim()) errors.push("Religion is required");
    if (!formData.blood_type || formData.blood_type === 'Unknown') errors.push("Blood Type must be selected");
    if (!formData.height_feet.trim()) errors.push("Height is required");
    if (!formData.beneficiary_name.trim()) errors.push("Beneficiary Name is required");
    if (!formData.beneficiary_relationship.trim()) errors.push("Beneficiary Relationship is required");
    return errors;
  };
  
  const isStep3Valid = () => {
    const errors: string[] = [];
    if (!formData.emergency_name.trim()) errors.push("Emergency Contact Name is required");
    if (!formData.emergency_relationship.trim()) errors.push("Emergency Relationship is required");
    if (!formData.emergency_contact.trim()) errors.push("Emergency Contact Number is required");
    else if (!isValidPhone(formData.emergency_contact)) errors.push("Emergency Contact Number must be a valid PH mobile");
    return errors;
  };

  const nextStep = () => {
    if (step === 0) return; // Handled by handleVerifyCode
    if (step === 1 && !isStep1Valid()) { setSubmitError("Please fill in all required fields."); return; }
    const step2Errors = isStep2Valid();
    if (step === 2 && step2Errors.length > 0) { 
      setSubmitError(step2Errors.join(" • ")); 
      return; 
    }
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
    if (!accessCode) {
      setSubmitError("Access code is missing. Please reload the page.");
      return;
    }

    const step3Errors = isStep3Valid();
    if (step3Errors.length > 0) { setSubmitError(step3Errors.join(" • ")); return; }
    
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const { data: settingData, error: settingError } = await supabase.from('system_settings').select('value').eq('id', 'enrollment_open').single();
      if (settingError) throw new Error("Failed to verify enrollment status.");
      if (!settingData || (settingData.value !== true && settingData.value !== 'true')) {
        throw new Error("Enrollment is currently closed. You cannot submit an application at this time.");
      }

      const msData = MS_MAP[formData.year_class]?.[formData.semester];
      if (!msData) throw new Error("Invalid year class or semester selection.");

      const enrollmentData = {
        id_number: formData.id_number,
        school: formData.school,
        last_name: formData.last_name,
        first_name: formData.first_name,
        middle_initial: formData.middle_initial,
        suffix: formData.suffix,
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,
        course_year: formData.course_year,
        year_level: formData.year_level,
        year_class: formData.year_class,
        semester: formData.semester,
        contact_number: formData.contact_number,
        home_address: formData.home_address,
        religion: formData.religion,
        blood_type: formData.blood_type,
        height_feet: formData.height_feet,
        email: formData.email,
        beneficiary_name: formData.beneficiary_name,
        beneficiary_relationship: formData.beneficiary_relationship,
        emergency_name: formData.emergency_name,
        emergency_relationship: formData.emergency_relationship,
        emergency_contact: formData.emergency_contact,
        role: validRole,
        ms_subject: msData.subject,
        ms_title: msData.title,
      };

      const { data, error } = await supabase.rpc('submit_enrollment_with_code', {
        p_access_code: accessCode,
        p_enrollment_data: enrollmentData
      });

      if (error) {
        throw new Error(error.message || "Failed to submit enrollment. Please try again.");
      }

      if (data && !data.success) {
        throw new Error(data.error || "Failed to submit enrollment.");
      }

      localStorage.removeItem('enrollment_draft');
      navigate("/enroll/success", { replace: true });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;
    
    setIsValidatingCode(true);
    setCodeError(null);
    
    try {
      // First, check if the student ID number already has an enrollment (Duplicate Prevention)
      // Actually we don't know the ID number yet (it's asked in step 1).
      // So duplicate check happens on submit or we could do it here if we asked for ID number.
      // For now, just verify the code.
      const res = await verifyAccessCode(accessCode);
      if (res.valid) {
        setStep(1);
      } else {
        setCodeError(res.message || "Invalid code");
      }
    } catch (err) {
      setCodeError("Error verifying code. Please check your connection.");
    } finally {
      setIsValidatingCode(false);
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

  // Step 0: Access Code Gate
  if (step === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-rotc-bg">
        <div className="max-w-md w-full bg-rotc-card border border-rotc-border rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 text-center border-b border-rotc-border bg-rotc-bg">
            <div className="mx-auto w-20 h-20 mb-4 flex items-center justify-center">
              <img 
                src="/logos/rotc-logo.png" 
                alt="MSU ROTC Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-xl font-bold text-rotc-text">Access Code Required</h1>
            <p className="text-sm text-rotc-textMuted mt-1">
              Please enter the 6-digit access code provided by the ROTC Office after paying your registration fee.
            </p>
          </div>
          <div className="p-6">
            <form onSubmit={handleVerifyCode} className="space-y-4" autoComplete="off" data-lpignore="true" data-1p-ignore="true">
              <div>
                <Input
                  id="rotc-entry-token"
                  name="rotc_entry_token"
                  label="Access Code"
                  type="password"
                  placeholder="Enter access code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  inputMode="text"
                  maxLength={6}
                  required
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-form-type="other"
                  className="text-center text-2xl tracking-widest uppercase font-mono"
                />
                {codeError && (
                  <p className="text-sm text-rotc-danger mt-2 text-center flex items-center justify-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {codeError}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isValidatingCode || accessCode.length < 5}>
                {isValidatingCode ? 'Verifying...' : 'Continue'}
              </Button>
            </form>
          </div>
          <div className="p-4 bg-rotc-bg border-t border-rotc-border text-center">
            <Link to="/" className="text-sm text-rotc-textMuted hover:text-rotc-text transition-colors">
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const renderInputField = ({ label, field, placeholder, type = "text", required = true, autoComplete = "off" }: any) => (
    <Input
      key={field}
      label={`${label} ${required ? '*' : ''}`}
      type={type}
      placeholder={placeholder}
      value={(formData as any)[field]}
      onChange={e => updateForm({ [field]: e.target.value })}
      autoComplete={autoComplete}
      data-1p-ignore="true"
      data-lpignore="true"
      className={required && !(formData as any)[field].trim() ? "border-rotc-danger/30" : ""}
    />
  );

  const currentMS = MS_MAP[formData.year_class]?.[formData.semester];

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4 bg-rotc-bg relative overflow-x-hidden">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-rotc-accent/5 to-transparent pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl space-y-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-rotc-textMuted hover:text-rotc-text transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 flex items-center justify-center">
              <img 
                src="/logos/rotc-logo.png" 
                alt="MSU ROTC Logo" 
                className="w-full h-full object-contain"
              />
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

          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-lg font-semibold text-rotc-text border-b border-rotc-border pb-2">Personal Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderInputField({ label: "Student ID Number", field: "id_number", placeholder: "Enter ID number" })}
                {renderInputField({ label: "School", field: "school", placeholder: "Enter school name" })}
                {renderInputField({ label: "First Name", field: "first_name", placeholder: "First Name" })}
                {renderInputField({ label: "Last Name", field: "last_name", placeholder: "Last Name" })}
                {renderInputField({ label: "Middle Initial", field: "middle_initial", placeholder: "M.I.", required: false })}
                {renderInputField({ label: "Suffix", field: "suffix", placeholder: "Suffix (Optional)", required: false })}
                
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
                
                {renderInputField({ label: "Date of Birth", field: "date_of_birth", type: "date" })}
                {renderInputField({ label: "Course", field: "course_year", placeholder: "Enter course" })}
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-rotc-textMuted">Academic Year *</label>
                  <select 
                    value={formData.year_level} onChange={e => updateForm({ year_level: e.target.value })}
                    className="w-full rounded-lg bg-rotc-bg border border-rotc-border text-rotc-text px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rotc-accent/50 focus:border-rotc-accent"
                  >
                    {YEAR_LEVELS.map(yl => (
                      <option key={yl} value={yl}>{yl}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-rotc-textMuted">ROTC MS Class *</label>
                  <select 
                    value={formData.year_class} onChange={e => updateForm({ year_class: e.target.value })}
                    className="w-full rounded-lg bg-rotc-bg border border-rotc-border text-rotc-text px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rotc-accent/50 focus:border-rotc-accent"
                  >
                    {filteredYearClasses.map(yc => (
                      <option key={yc} value={yc}>{yc}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-rotc-textMuted">Semester *</label>
                  <select 
                    value={formData.semester} onChange={e => updateForm({ semester: e.target.value })}
                    className="w-full rounded-lg bg-rotc-bg border border-rotc-border text-rotc-text px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rotc-accent/50 focus:border-rotc-accent"
                  >
                    {SEMESTERS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                
                {currentMS && (
                  <div className="sm:col-span-2 px-4 py-3 rounded-lg bg-rotc-accent/10 border border-rotc-accent/20 text-sm">
                    <span className="text-rotc-textMuted">Enrolling for: </span>
                    <span className="font-semibold text-rotc-accent">{currentMS.title} ({currentMS.subject})</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-lg font-semibold text-rotc-text border-b border-rotc-border pb-2">Contact & Other Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderInputField({ label: "Contact Number", field: "contact_number", placeholder: "09XXXXXXXXX", type: "tel" })}
                {renderInputField({ label: "Email Address (Gmail required)", field: "email", type: "email", placeholder: "you@gmail.com" })}
                <div className="sm:col-span-2">
                  {renderInputField({ label: "Home Address", field: "home_address", placeholder: "Poblacion, Buug, ZSP" })}
                </div>
                {renderInputField({ label: "Religion", field: "religion", placeholder: "Enter religion" })}
                {renderInputField({ label: "Height (Feet)", field: "height_feet", placeholder: "Enter height" })}
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-rotc-textMuted">Blood Type *</label>
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
                {renderInputField({ label: "Beneficiary Name", field: "beneficiary_name", placeholder: "Full Name" })}
                {renderInputField({ label: "Relationship", field: "beneficiary_relationship", placeholder: "Mother, Uncle, etc." })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold text-rotc-text border-b border-rotc-border pb-2 mb-4 text-rotc-danger">Emergency Contact</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-rotc-danger/5 p-4 rounded-xl border border-rotc-danger/10">
                  <div className="sm:col-span-2">{renderInputField({ label: "Contact Name", field: "emergency_name", placeholder: "Full Name" })}</div>
                  {renderInputField({ label: "Relationship", field: "emergency_relationship", placeholder: "Mother, Father, etc." })}
                  {renderInputField({ label: "Contact Number", field: "emergency_contact", placeholder: "09XXXXXXXXX", type: "tel" })}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-rotc-text border-b border-rotc-border pb-2 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-rotc-success" /> Review Your Details
                </h2>
                <div className="text-sm space-y-3 bg-rotc-bg rounded-xl p-4 border border-rotc-border">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4">
                    <div className="flex flex-col"><span className="text-rotc-textMuted text-xs">ID Number</span><span className="text-rotc-text font-medium break-words">{formData.id_number}</span></div>
                    <div className="flex flex-col"><span className="text-rotc-textMuted text-xs">Name</span><span className="text-rotc-text font-medium break-words">{formData.first_name} {formData.middle_initial} {formData.last_name} {formData.suffix !== 'N/A' && formData.suffix !== '' ? formData.suffix : ''}</span></div>
                    <div className="flex flex-col"><span className="text-rotc-textMuted text-xs">School</span><span className="text-rotc-text font-medium break-words">{formData.school}</span></div>
                    <div className="flex flex-col"><span className="text-rotc-textMuted text-xs">Course & Year</span><span className="text-rotc-text font-medium break-words">{formData.course_year}</span></div>
                    <div className="flex flex-col"><span className="text-rotc-textMuted text-xs">Year / Class</span><span className="text-rotc-text font-medium break-words">{formData.year_class}</span></div>
                    <div className="flex flex-col"><span className="text-rotc-textMuted text-xs">Semester</span><span className="text-rotc-text font-medium break-words">{formData.semester}</span></div>
                    <div className="flex flex-col sm:col-span-2"><span className="text-rotc-textMuted text-xs">Military Science</span><span className="text-rotc-text font-medium break-words">{currentMS?.title} ({currentMS?.subject})</span></div>
                    <div className="flex flex-col"><span className="text-rotc-textMuted text-xs">Email</span><span className="text-rotc-text font-medium break-all">{formData.email}</span></div>
                    <div className="flex flex-col"><span className="text-rotc-textMuted text-xs">Contact No.</span><span className="text-rotc-text font-medium break-words">{formData.contact_number}</span></div>
                    <div className="flex flex-col sm:col-span-2"><span className="text-rotc-textMuted text-xs">Home Address</span><span className="text-rotc-text font-medium break-words">{formData.home_address}</span></div>
                    <div className="flex flex-col"><span className="text-rotc-textMuted text-xs">Religion</span><span className="text-rotc-text font-medium break-words">{formData.religion}</span></div>
                    <div className="flex flex-col"><span className="text-rotc-textMuted text-xs">Blood Type</span><span className="text-rotc-text font-medium break-words">{formData.blood_type}</span></div>
                    <div className="flex flex-col sm:col-span-2"><span className="text-rotc-textMuted text-xs">Emergency Contact</span><span className="text-rotc-text font-medium break-words">{formData.emergency_name} ({formData.emergency_relationship}) — {formData.emergency_contact}</span></div>
                  </div>
                  <p className="text-xs text-rotc-textMuted/70 italic mt-2 border-t border-rotc-border pt-2">By submitting this form, you verify that all information provided is accurate and true.</p>
                </div>
              </div>
            </div>
          )}

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
