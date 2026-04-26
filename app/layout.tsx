import './globals.css';
import type { Metadata } from 'next';
import { Shell } from '@/components/Shell';

const siteName = process.env.SITE_NAME || process.env.NEXT_PUBLIC_SITE_NAME || 'Xiler Suite';

export const metadata: Metadata = {
  title: siteName,
  description: 'Unified personal workspace',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
try {
  const stored = localStorage.getItem('kuma-theme');
  const theme = stored === 'light' || stored === 'dark'
    ? stored
    : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.dataset.theme = theme;
} catch {}
})();`,
          }}
        />
      </head>
      <body>
        <Shell siteName={siteName}>{children}</Shell>
      </body>
    </html>
  );
}
