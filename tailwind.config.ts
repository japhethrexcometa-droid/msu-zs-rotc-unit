import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // MSU-ZS ROTC dark green theme — exact match to current system
        rotc: {
          bg:       '#1a3a2a',  // main background
          card:     '#2d5a3d',  // card background
          cardHover:'#3a6b4a',  // card hover
          border:   '#3d6b4a',  // borders
          accent:   '#4caf50',  // primary green accent
          accentHover: '#5bc75f',
          text:     '#e8f5e9',  // primary text
          textMuted:'#a5d6a7',  // muted text
          danger:   '#ef5350',  // red for absent/error
          warning:  '#ff9800',  // amber for late/warning
          info:     '#42a5f5',  // blue for excused/info
          success:  '#66bb6a',  // green for present/success
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-soft': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'progress-fast': 'progress 1s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        progress: {
          '0%': { transform: 'translateX(-100%)', width: '30%' },
          '50%': { width: '100%' },
          '100%': { transform: 'translateX(100%)', width: '30%' }
        }
      }
    }
  },
  plugins: []
} satisfies Config
