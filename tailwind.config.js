import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          primary: '#1e1e1e',
          secondary: '#252526',
          tertiary: '#2d2d2d',
          hover: '#3a3a3a',
          active: '#094771',
        },
        accent: {
          primary: '#8b5cf6',
          secondary: '#14b8a6',
          tertiary: '#f59e0b',
          success: '#22c55e',
          danger: '#ef4444',
        },
        text: {
          primary: '#ffffff',
          secondary: '#a1a1aa',
          tertiary: '#71717a',
        },
        border: {
          default: '#3f3f46',
          subtle: '#27272a',
          focus: '#8b5cf6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        h1: ['24px', { lineHeight: '1.2', fontWeight: '600' }],
        h2: ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        h3: ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        h4: ['14px', { lineHeight: '1.5', fontWeight: '500' }],
        body: ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        small: ['12px', { lineHeight: '1.5', fontWeight: '400' }],
        code: ['13px', { lineHeight: '1.5', fontWeight: '400' }],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      },
      boxShadow: {
        elevation1: '0 1px 3px rgba(0,0,0,0.3)',
        elevation2: '0 4px 12px rgba(0,0,0,0.4)',
        elevation3: '0 8px 24px rgba(0,0,0,0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
    },
  },
  plugins: [],
}

export default config
