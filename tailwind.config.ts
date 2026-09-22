import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Near-black surfaces
        base: '#0b0e14',
        surface: '#0f131b',
        panel: '#11161f',
        elevated: '#151b26',
        border: '#1c2230',
        borderStrong: '#2a3446',
        // Text
        ink: '#e6ebf2',
        muted: '#8a94a6',
        faint: '#5a6474',
        // Solana accents
        sol: '#14f195',
        solPurple: '#9945ff',
        // Status
        success: '#14f195',
        error: '#ff5c6c',
        warning: '#f5a623',
        running: '#4aa8ff',
        // Landing — deep-space surfaces
        void: '#02030A',
        abyss: '#050712',
        deep: '#080B16',
        // Landing — emitted-light accents
        teal: '#14f1c8',
        aqua: '#38e0ff',
        iris: '#7c5cff',
        violet: '#9b5cff',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(20,241,149,0.25), 0 0 24px -6px rgba(20,241,149,0.35)',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        spinSlow: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.06)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.25' },
          '50%': { opacity: '1' },
        },
        blink: {
          '0%, 45%': { opacity: '1' },
          '50%, 95%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        gradientPan: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        rise: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        sheen: {
          from: { transform: 'translateX(-120%)' },
          to: { transform: 'translateX(220%)' },
        },
      },
      animation: {
        pulseSoft: 'pulseSoft 1.4s ease-in-out infinite',
        fadeIn: 'fadeIn 0.2s ease-out',
        floaty: 'floaty 7s ease-in-out infinite',
        spinSlow: 'spinSlow 40s linear infinite',
        pulseGlow: 'pulseGlow 5s ease-in-out infinite',
        twinkle: 'twinkle 4s ease-in-out infinite',
        blink: 'blink 1.1s step-end infinite',
        gradientPan: 'gradientPan 8s ease-in-out infinite',
        rise: 'rise 0.6s ease-out both',
        sheen: 'sheen 3.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
