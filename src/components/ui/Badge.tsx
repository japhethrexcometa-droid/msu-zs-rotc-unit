interface BadgeProps {
  status: 'present' | 'late' | 'absent' | 'excused' | 'pending' | 'approved' | 'rejected' | 'default' | string
  label?: string
  size?: 'sm' | 'md'
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  present:  { bg: 'bg-green-900/40',  text: 'text-rotc-success', dot: 'bg-rotc-success' },
  late:     { bg: 'bg-amber-900/40',  text: 'text-rotc-warning', dot: 'bg-rotc-warning' },
  absent:   { bg: 'bg-red-900/40',    text: 'text-rotc-danger',  dot: 'bg-rotc-danger' },
  excused:  { bg: 'bg-blue-900/40',   text: 'text-rotc-info',    dot: 'bg-rotc-info' },
  pending:  { bg: 'bg-amber-900/40',  text: 'text-rotc-warning', dot: 'bg-rotc-warning' },
  approved: { bg: 'bg-green-900/40',  text: 'text-rotc-success', dot: 'bg-rotc-success' },
  rejected: { bg: 'bg-red-900/40',    text: 'text-rotc-danger',  dot: 'bg-rotc-danger' },
  success:  { bg: 'bg-green-900/40',  text: 'text-rotc-success', dot: 'bg-rotc-success' },
  danger:   { bg: 'bg-red-900/40',    text: 'text-rotc-danger',  dot: 'bg-rotc-danger' },
  warning:  { bg: 'bg-amber-900/40',  text: 'text-rotc-warning', dot: 'bg-rotc-warning' },
  info:     { bg: 'bg-blue-900/40',   text: 'text-rotc-info',    dot: 'bg-rotc-info' },
  default:  { bg: 'bg-rotc-card',     text: 'text-rotc-textMuted', dot: 'bg-rotc-textMuted' },
}

export function Badge({ status, label, size = 'sm' }: BadgeProps) {
  const config = statusConfig[status] ?? statusConfig.default
  const displayLabel = label ?? (status.charAt(0).toUpperCase() + status.slice(1))

  return (
    <span className={[
      'inline-flex items-center gap-1.5 font-medium rounded-full',
      config.bg, config.text,
      size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
    ].join(' ')}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {displayLabel}
    </span>
  )
}

export default Badge
