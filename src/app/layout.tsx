import type { Metadata, Viewport } from 'next';
// Self-hosted fonts (bundled — no runtime CDN, so they always render).
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './globals.css';

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%2314f1c8'/%3E%3Cstop offset='1' stop-color='%239b5cff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='32' height='32' rx='7' fill='%2302030A'/%3E%3Cg fill='url(%23g)'%3E%3Cpath d='M9 10.5l1.8-1.8h12.2l-1.8 1.8z'/%3E%3Cpath d='M9 16l1.8-1.8h12.2l-1.8 1.8z'/%3E%3Cpath d='M9 21.5l1.8-1.8h12.2l-1.8 1.8z'/%3E%3C/g%3E%3C/svg%3E";

export const metadata: Metadata = {
  title: 'Solana Studio — AI Engineering Workspace for Solana',
  description:
    'Build, modify, and ship Solana projects with an AI-powered GitHub engineering workspace that runs directly in your browser. No installation, no backend — your code stays yours.',
  icons: { icon: FAVICON },
  openGraph: {
    type: 'website',
    siteName: 'Solana Studio',
    title: 'Solana Studio — AI Engineering Workspace for Solana',
    description:
      'An AI-powered GitHub engineering workspace that understands your repository, plans the implementation, and helps you ship — directly from your browser.',
  },
  twitter: {
    card: 'summary',
    title: 'Solana Studio — AI Engineering Workspace for Solana',
    description:
      'Turn ideas into Solana reality. AI-assisted engineering, GitHub-native, browser-based. Your code stays yours.',
  },
};

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#02030A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
