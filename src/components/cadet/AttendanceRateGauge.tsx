import { useEffect, useState } from 'react'

interface AttendanceRateGaugeProps {
  rate: number // 0 to 100
  size?: number
  strokeWidth?: number
}

export function AttendanceRateGauge({ rate, size = 120, strokeWidth = 10 }: AttendanceRateGaugeProps) {
  const [offset, setOffset] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI

  useEffect(() => {
    // Animate to the correct offset after mount
    const progressOffset = circumference - (rate / 100) * circumference
    // Small delay to ensure CSS transition triggers
    const timeout = setTimeout(() => setOffset(progressOffset), 100)
    return () => clearTimeout(timeout)
  }, [rate, circumference])

  // Initial offset is full circumference (0%)
  const initialOffset = circumference

  let colorClass = 'text-rotc-success'
  if (rate < 60) colorClass = 'text-rotc-danger'
  else if (rate < 80) colorClass = 'text-rotc-warning'

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-rotc-border fill-none"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`${colorClass} fill-none transition-all duration-1000 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset || initialOffset}
          strokeLinecap="round"
          stroke="currentColor"
        />
      </svg>
      {/* Percentage text */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${colorClass}`}>{Math.round(rate)}%</span>
      </div>
      <p className="text-xs text-rotc-textMuted mt-2 uppercase tracking-wider font-medium">Attendance Rate</p>
    </div>
  )
}

export default AttendanceRateGauge
