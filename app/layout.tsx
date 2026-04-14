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
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
