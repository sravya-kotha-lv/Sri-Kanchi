/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: '#f7efe5',
        rose: '#d77a61',
        wine: '#69203a',
        gold: '#c9a34e',
        ink: '#2b1d1c',
        teal: '#2f6f6d'
      },
      boxShadow: {
        skeuo: '18px 18px 40px rgba(97, 65, 52, 0.18), -18px -18px 36px rgba(255, 248, 240, 0.82)',
        insetSoft: 'inset 8px 8px 16px rgba(182, 120, 90, 0.18), inset -8px -8px 14px rgba(255, 255, 255, 0.9)',
        floaty: '0 30px 60px rgba(74, 33, 44, 0.18)'
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'serif'],
        body: ['"Manrope"', 'sans-serif']
      },
      backgroundImage: {
        'silk-radial': 'radial-gradient(circle at top, rgba(255,255,255,0.92), rgba(245,232,223,0.94) 40%, rgba(234,212,196,0.98))'
      },
      keyframes: {
        drift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) rotateX(0deg)' },
          '50%': { transform: 'translate3d(0, -12px, 0) rotateX(6deg)' }
        },
        spinSlow: {
          '0%': { transform: 'rotateY(0deg) rotateX(16deg)' },
          '100%': { transform: 'rotateY(360deg) rotateX(16deg)' }
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 rgba(201, 163, 78, 0.25)' },
          '50%': { boxShadow: '0 0 35px rgba(201, 163, 78, 0.45)' }
        }
      },
      animation: {
        drift: 'drift 7s ease-in-out infinite',
        spinSlow: 'spinSlow 18s linear infinite',
        pulseGlow: 'pulseGlow 5s ease-in-out infinite'
      }
    }
  },
  plugins: []
};

