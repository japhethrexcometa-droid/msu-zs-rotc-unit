import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
}

const variants = {
  primary:   'bg-rotc-accent hover:bg-rotc-accentHover text-white shadow-lg shadow-rotc-accent/20',
  secondary: 'bg-rotc-card hover:bg-rotc-cardHover text-rotc-text border border-rotc-border',
  danger:    'bg-rotc-danger hover:bg-red-600 text-white shadow-lg shadow-rotc-danger/20',
  ghost:     'bg-transparent hover:bg-rotc-card text-rotc-textMuted hover:text-rotc-text',
}

const sizes = {
  sm:  'px-3 py-1.5 text-sm gap-1.5',
  md:  'px-4 py-2   text-sm gap-2',
  lg:  'px-6 py-3   text-base gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  children,
  className = '',
  disabled,
  ...props
}, ref) => {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center font-medium rounded-lg',
        'transition-all duration-150 active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rotc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-rotc-bg',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className
      ].join(' ')}
      {...props}
    >
      {loading
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : iconPosition === 'left' && icon}
      {children && <span>{children}</span>}
      {!loading && iconPosition === 'right' && icon}
    </button>
  )
})

Button.displayName = 'Button'
export default Button
