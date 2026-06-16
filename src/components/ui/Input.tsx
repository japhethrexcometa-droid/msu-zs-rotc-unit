import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  icon,
  iconPosition = 'left',
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-rotc-textMuted">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && iconPosition === 'left' && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-rotc-textMuted pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full rounded-lg bg-rotc-card border text-rotc-text placeholder-rotc-textMuted/60',
            'px-3 py-2.5 text-sm',
            'transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-rotc-accent/50 focus:border-rotc-accent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            icon && iconPosition === 'left' ? 'pl-10' : '',
            icon && iconPosition === 'right' ? 'pr-10' : '',
            error ? 'border-rotc-danger ring-1 ring-rotc-danger/30' : 'border-rotc-border',
            className
          ].join(' ')}
          {...props}
        />
        {icon && iconPosition === 'right' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-rotc-textMuted">
            {icon}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-rotc-danger mt-0.5">{error}</p>}
      {!error && hint && <p className="text-xs text-rotc-textMuted mt-0.5">{hint}</p>}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
