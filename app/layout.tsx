import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Thai_Looped, Sanchez } from 'next/font/google';
import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';
import Paper from '@mui/material/Paper';
const sanchez = Sanchez({
  variable: '--font-sanchez',
  subsets: ['latin'],
  weight: ['400'],
});

const notoSansThaiLooped = Noto_Sans_Thai_Looped({
  variable: '--font-noto-sans-thai-looped',
  subsets: ['latin', 'thai'],
  weight: ['500'],
});

export const metadata: Metadata = {
  title: 'OSI Shipping',
  description:
    'Modern shipping management application,Streamline your shipping operations with OSI Shipping.',
  keywords: [
    'shipping management',
    'logistics',
    'OSI Shipping',
    'shipping software',
    'cargo tracking',
    'freight management',
  ],
  authors: [{ name: 'OSI Shipping Team' }],
  creator: 'OSI Shipping Team',
  publisher: 'OSI Shipping',
  metadataBase: new URL('https://osi-shipping.osilab.co.th'),

  // Open Graph metadata for social media previews
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://osi-shipping.osilab.co.th',
    title: 'OSI Shipping - Modern Shipping Management',
    description:
      'Modern shipping management application. Streamline your shipping operations with OSI Shipping.',
    siteName: 'OSI Shipping',
    images: [
      {
        url: '/logo/osi_logo.png',
        width: 1200,
        height: 630,
        alt: 'OSI Shipping Logo',
      },
    ],
  },

  // Twitter Card metadata
  twitter: {
    card: 'summary_large_image',
    title: 'OSI Shipping - Modern Shipping Management',
    description:
      'Modern shipping management application. Streamline your shipping operations with OSI Shipping.',
    images: ['/logo/osi_logo.png'],
    creator: '@OSIShipping',
  },

  // Icons configuration
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/logo/osi_logo.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/logo/osi_logo.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico'],
  },

  // App manifest
  manifest: '/manifest.json',

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Verification (add your verification codes when available)
  // verification: {
  //   google: 'your-google-verification-code',
  //   yandex: 'your-yandex-verification-code',
  // },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#1F2175',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${notoSansThaiLooped.variable} ${sanchez.variable} antialiased`}
      >
        <ThemeProvider>
          <Paper
            elevation={0}
            sx={{
              backgroundImage: 'none',
              backgroundColor: 'transparent',
              width: '100%',
            }}
          >
            {children}
          </Paper>
        </ThemeProvider>
      </body>
    </html>
  );
}
