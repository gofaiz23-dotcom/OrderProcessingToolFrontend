'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

const sidebarItems = [
  { href: '/email/inbox', label: 'Inbox' },
  { href: '/email/sent', label: 'Sent' },
  { href: '/email/compose', label: 'Compose Email' },
];

const isActivePath = (pathname: string | null, href: string) => {
  if (!pathname) return false;
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
};

const EmailWorkspace = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-10">
        <aside className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase text-blue-600">Email</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Workspace</h2>
          <nav className="mt-8 space-y-1">
            {sidebarItems.map((item) => {
              const isActive = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-blue-600' : 'bg-slate-200'}`} />
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};

export default EmailWorkspace;

