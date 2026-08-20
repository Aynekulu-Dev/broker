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
    },
  },
  plugins: [],
};
