import type { ReactNode } from 'react'

/* ─── Card Root ─── */
interface CardProps {
  className?: string
  children: ReactNode
  onClick?: () => void
}

export function Card({ className = '', children, onClick }: CardProps) {
  return (
    <div
      className={[
        'bg-rotc-card border border-rotc-border rounded-xl overflow-hidden',
        'transition-colors duration-150',
        onClick ? 'cursor-pointer hover:bg-rotc-cardHover hover:border-rotc-accent/30' : '',
        className
      ].join(' ')}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

/* ─── Card Header ─── */
interface CardHeaderProps {
  title?: string
  description?: string
  action?: ReactNode
  className?: string
  children?: ReactNode
}

export function CardHeader({ title, description, action, className = '', children }: CardHeaderProps) {
  // If no title/description, just render children as-is
  if (!title && !description) {
    return <div className={`px-5 pt-5 pb-2 ${className}`}>{children}</div>
  }

  return (
    <div className={`flex items-start justify-between px-5 pt-5 pb-2 ${className}`}>
      <div className="min-w-0 flex-1">
        {title && <h3 className="text-base font-semibold text-rotc-text truncate">{title}</h3>}
        {description && <p className="text-sm text-rotc-textMuted mt-0.5">{description}</p>}
      </div>
      {(action || children) && <div className="ml-3 flex-shrink-0">{action || children}</div>}
    </div>
  )
}

/* ─── Card Content ─── */
interface CardContentProps {
  className?: string
  children: ReactNode
}

export function CardContent({ className = '', children }: CardContentProps) {
  return <div className={`px-5 py-3 ${className}`}>{children}</div>
}

/* ─── Card Footer ─── */
interface CardFooterProps {
  className?: string
  children: ReactNode
}

export function CardFooter({ className = '', children }: CardFooterProps) {
  return (
    <div className={`px-5 py-3 border-t border-rotc-border ${className}`}>
      {children}
    </div>
  )
}

export default Card
