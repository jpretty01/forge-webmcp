import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ForgeProvider } from '@/components/providers/forge-provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  title: 'FORGE — Human-Agent World Laboratory',
  description:
    'Build, test, repair, and evolve interactive worlds together through WebMCP.',
  openGraph: {
    title: 'FORGE — Human-Agent World Laboratory',
    description: 'Build worlds together through WebMCP.',
    type: 'website',
    images: process.env.NEXT_PUBLIC_SITE_URL
      ? [{ url: '/og.png', width: 1200, height: 630, alt: 'FORGE Human-Agent World Laboratory' }]
      : undefined,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FORGE — Human-Agent World Laboratory',
    description: 'Build worlds together through WebMCP.',
    images: process.env.NEXT_PUBLIC_SITE_URL ? ['/og.png'] : undefined,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ForgeProvider>{children}</ForgeProvider>
      </body>
    </html>
  );
}
