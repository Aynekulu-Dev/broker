/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Ledger-book palette: dark navy cover, cream paper pages, ochre stamp ink
        'ink-navy': { DEFAULT: '#1b2a4a', deep: '#131f38' },
        paper: { DEFAULT: '#f3eedf', raised: '#faf7ee', line: '#ddd3b3' },
        ink: { DEFAULT: '#241f16', soft: '#5c5442' },
        cream: '#f3eedf',
        ochre: { DEFAULT: '#c08a28', deep: '#9c6f1c' },
        stamp: { red: '#a23b2e', green: '#3f6b4f' },
      },
      fontFamily: {
        body: ['"Noto Sans Ethiopic"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(27, 42, 74, 0.08), 0 4px 12px rgba(27, 42, 74, 0.06)',
      },
      minHeight: {
        dvh: '100dvh',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(-12deg)' },
          '50%': { transform: 'translateY(-10px) rotate(-12deg)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(192,138,40,0.35)' },
          '100%': { boxShadow: '0 0 0 14px rgba(192,138,40,0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
        float: 'float 4s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
      },
    },
  },
  plugins: [],
};
