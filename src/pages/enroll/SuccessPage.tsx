import { Link } from 'react-router-dom'
import { CheckCircle, ArrowRight } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-rotc-bg relative overflow-hidden">
      {/* Background decorative */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-rotc-success/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-rotc-accent/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="bg-rotc-card/80 backdrop-blur-sm border border-rotc-border rounded-2xl p-8 shadow-xl shadow-black/20 text-center space-y-5">
          {/* Success icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-rotc-success/15 flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-rotc-success" />
          </div>

          {/* Text */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-rotc-text">Enrollment Submitted!</h1>
            <p className="text-sm text-rotc-textMuted leading-relaxed">
              Your request has been submitted successfully. The admin will review and process your enrollment.
              You will receive an <strong>email notification</strong> once it is approved or rejected.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-rotc-border" />

          {/* Info box */}
          <div className="px-4 py-3 rounded-lg bg-rotc-accent/10 border border-rotc-accent/20 text-sm text-rotc-textMuted">
            <p>
              <strong className="text-rotc-text">What's next?</strong><br />
              Once approved, use your ID number and default password to sign in.
            </p>
          </div>

          {/* Go to login */}
          <Link to="/">
            <Button
              size="lg"
              className="w-full py-3 text-base font-semibold rounded-xl"
              icon={<ArrowRight className="h-4 w-4" />}
              iconPosition="right"
            >
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
