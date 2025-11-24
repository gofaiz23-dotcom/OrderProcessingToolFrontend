'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { Inbox, Send, PencilLine, RefreshCcw } from 'lucide-react';
import API_BASE_URL from '../../../BaseUrl';

const topSidebarItems = [
    { href: '/email/inbox', label: 'Inbox', icon: Inbox },
    { href: '/email/sent', label: 'Sent', icon: Send },
    { href: '/email/compose', label: 'Compose Email', icon: PencilLine },
];

// Refresh Token button at bottom
const refreshItem = {
    href: `${API_BASE_URL}/auth/google/start`,
    label: 'Refresh Token',
    icon: RefreshCcw,
    external: true,
    tooltip: "Refresh token lasts 5 days — use only when needed",
};

const isActivePath = (pathname: string | null, href: string) => {
    if (!pathname) return false;
    if (pathname === href) return true;
    return pathname.startsWith(`${href}/`);
};

const EmailWorkspace = ({ children }: { children: ReactNode }) => {
    const pathname = usePathname();

    return (
        <div className="flex h-screen w-full bg-gradient-to-br from-slate-100 to-slate-200">

            {/* LEFT FIXED SIDEBAR */}
            <aside className="w-72 h-full bg-white/80 backdrop-blur-xl border-r border-white/50 shadow-xl p-6 flex flex-col">

                {/* Header */}
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                        Email Center
                    </p>
                    <h2 className="mt-1 text-3xl font-bold text-slate-900">Dashboard</h2>
                </div>

                {/* TOP NAVIGATION */}
                <nav className="mt-10 space-y-2 flex-1">
                    {topSidebarItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = isActivePath(pathname, item.href);

                        const classes = `
              group relative flex items-center gap-3 rounded-2xl px-5 py-4 text-[15px] font-medium transition-all
              ${isActive
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-[1.02]'
                                : 'bg-white/60 text-slate-700 hover:bg-white hover:shadow-md hover:scale-[1.01]'
                            }
            `;

                        return (
                            <div key={item.href} className="relative group">
                                <Link href={item.href} className={classes}>
                                    <Icon
                                        size={20}
                                        className={isActive ? 'text-white' : 'text-blue-600 group-hover:text-blue-600'}
                                    />
                                    <span>{item.label}</span>
                                    <span
                                        className={`ml-auto h-2 w-2 rounded-full transition
                      ${isActive ? 'bg-white' : 'bg-slate-300 group-hover:bg-blue-600'}
                    `}
                                    />
                                </Link>
                            </div>
                        );
                    })}
                </nav>

                {/* BOTTOM REFRESH TOKEN BUTTON WITH TOOLTIP */}
                <div className="mt-auto border-t border-slate-400 pt-4">
                    <div className="relative group">
                        <a
                            href={refreshItem.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="
                group flex items-center gap-3 rounded-2xl px-5 py-4 text-[15px] font-medium transition-all 
                bg-white/60 text-slate-700 hover:bg-white hover:shadow-md hover:scale-[1.01]
                border border-slate-400
              "
                        >
                            <refreshItem.icon size={20} className="text-blue-600 group-hover:text-blue-600" />
                            <span>{refreshItem.label}</span>
                            <span className="ml-auto h-2 w-2 rounded-full bg-slate-300 group-hover:bg-blue-600" />
                        </a>

                        {/* Tooltip */}
                        {/* Tooltip */}
                        <span
                            className="
    absolute left-full ml-3 top-1/2 -translate-y-1/2
    px-3 py-1 text-sm rounded-lg bg-red-600 text-white shadow-lg
    opacity-0 pointer-events-none
    group-hover:opacity-100 group-hover:translate-x-1
    transition-all duration-200 whitespace-nowrap
    flex items-center gap-2
  "
                        >
                            <svg
                                xmlns='http://www.w3.org/2000/svg'
                                className="h-4 w-4 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20 10 10 0 010-20z"
                                />
                            </svg>

                            Refresh token lasts 5 days - use only when needed
                        </span>

                    </div>
                </div>

            </aside>

            {/* RIGHT MAIN CONTENT */}
            <main className="flex-1 overflow-y-auto p-10">
                <div className="bg-white rounded-3xl shadow-xl p-8 border border-white/50 min-h-full">
                    {children}
                </div>
            </main>

        </div>
    );
};

export default EmailWorkspace;
