import animate from "tailwindcss-animate";
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './entrypoints/**/*.{ts,tsx,html}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Newar Insights Brand Colors
        gray: {
          1: '#090A0C',
          2: '#111111',
          5: '#1C1D21',
          10: '#2A2B2F',
          20: '#303236',
          30: '#45464A',
          50: '#818285',
          60: '#999A9C',
          80: '#CDCFD1',
          90: '#E4E5E7',
          98: '#F6F6F6',
        },
        brand: {
          blue: '#3d7eff',
          orange: '#F58041',
          danger: '#ff4d4d',
        },
        
        // shadcn/ui compatibility
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontSize: {
        '84': ['84px', { lineHeight: '0.9', letterSpacing: '-0.02em', fontWeight: '600' }],
        '80': ['80px', { lineHeight: '0.9', letterSpacing: '-0.025em', fontWeight: '600' }],
        '36': ['36px', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '600' }],
        '32': ['32px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
        '28': ['28px', { lineHeight: '1.3', letterSpacing: '-0.02em', fontWeight: '400' }],
        '24': ['24px', { lineHeight: '1.4', letterSpacing: '-0.02em', fontWeight: '500' }],
        '18': ['18px', { lineHeight: '1.5', letterSpacing: '-0.01em', fontWeight: '400' }],
        '15': ['15px', { lineHeight: '1.5', letterSpacing: '-0.02em', fontWeight: '300' }],
        '14': ['14px', { lineHeight: '1.5', letterSpacing: '-0.02em', fontWeight: '400' }],
        '12': ['12px', { lineHeight: '1.5', letterSpacing: '-0.015em', fontWeight: '700' }],
        '11': ['11px', { lineHeight: '1.5', letterSpacing: '-0.01em', fontWeight: '700' }],
      },
      fontFamily: {
        title: ['General Sans', 'Satoshi-Bold', 'sans-serif'],
        body: ['Satoshi-Regular', 'Inter', 'sans-serif'],
      },
      letterSpacing: {
        'tighter': '-0.025em',
        'snugger': '-0.02em',
        'snug': '-0.01em',
      },
      lineHeight: {
        'dense': '1.1',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'action': '0px 4px 16px 0px rgba(0, 0, 0, 0.35)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
