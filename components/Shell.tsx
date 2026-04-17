'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const NAV = [
  { href: '/tracker', label: 'game-test-tracker', hint: '测试记录' },
  { href: '/timeline', label: 'timeline3', hint: '费用时间轴' },
  { href: '/board', label: 'NullPage', hint: '文本板' },
  { href: '/vault', label: 'password-vault2', hint: '密码库' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const active = useMemo(() => {
    return NAV.find((item) => item.href === pathname) ?? NAV[0];
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="title">Kuma Suite</div>
            <div className="subtitle">{active.label} · {active.hint}</div>
          </div>
          <nav className="desktop-nav" aria-label="主导航">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className={`nav-link ${pathname === item.href ? 'active' : ''}`}>
                <span>{item.label}</span>
                <span className="tiny muted">{item.hint}</span>
              </Link>
            ))}
          </nav>
          <button type="button" className="menu-button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="切换功能菜单">
            ☰
          </button>
        </div>
        <div className={`mobile-menu ${open ? 'open' : ''}`}>
          <div className="mobile-menu-panel">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className={pathname === item.href ? 'active' : ''}>
                {item.label} <span className="muted tiny">· {item.hint}</span>
              </Link>
            ))}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
