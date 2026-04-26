import './globals.css';
import type { Metadata } from 'next';
import { Shell } from '@/components/Shell';

export const metadata: Metadata = {
  title: 'Kuma Suite',
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
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
