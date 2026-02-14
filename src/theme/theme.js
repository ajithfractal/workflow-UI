import { createTheme } from '@mui/material/styles'

// Function to get the initial color mode based on system preference
const getInitialColorMode = () => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

// Create theme function that accepts mode
export const createAppTheme = (mode = getInitialColorMode()) => {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#3b82f6',
        light: '#60a5fa',
        dark: '#2563eb',
      },
      secondary: {
        main: '#64748b',
        light: '#94a3b8',
        dark: '#475569',
      },
      success: {
        main: '#10b981',
        light: '#34d399',
        dark: '#059669',
      },
      error: {
        main: '#ef4444',
        light: '#f87171',
        dark: '#dc2626',
      },
      warning: {
        main: '#f59e0b',
        light: '#fbbf24',
        dark: '#d97706',
      },
      info: {
        main: '#3b82f6',
        light: '#60a5fa',
        dark: '#2563eb',
      },
      background: {
        default: mode === 'dark' ? '#0f172a' : '#f8fafc',
        paper: mode === 'dark' ? '#1e293b' : '#ffffff',
      },
      text: {
        primary: mode === 'dark' ? '#f1f5f9' : '#1e293b',
        secondary: mode === 'dark' ? '#cbd5e1' : '#64748b',
      },
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
      h1: {
        fontSize: '2rem',
        fontWeight: 600,
      },
      h2: {
        fontSize: '1.5rem',
        fontWeight: 600,
      },
      h3: {
        fontSize: '1.25rem',
        fontWeight: 600,
      },
      h4: {
        fontSize: '1.125rem',
        fontWeight: 600,
      },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: '#1e293b',
            color: '#ffffff',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
            boxShadow: mode === 'dark' 
              ? '0 1px 3px 0 rgba(0, 0, 0, 0.3)' 
              : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: '4px',
          },
        },
      },
    },
  })
}

export default createAppTheme
