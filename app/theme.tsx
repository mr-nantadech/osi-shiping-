'use client';

import { Noto_Sans_Thai_Looped } from 'next/font/google';
import { createTheme } from '@mui/material/styles';

const notoSansThaiLooped = Noto_Sans_Thai_Looped({
  weight: ['500'],
  subsets: ['latin', 'thai'],
  display: 'swap',
});

const theme = createTheme({
  typography: {
    fontFamily: notoSansThaiLooped.style.fontFamily,
  },
  palette: {
    primary: {
      main: '#142274',
      dark: '#0f1d5c',
      light: '#3b4a9b',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#e57373',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

export default theme;
