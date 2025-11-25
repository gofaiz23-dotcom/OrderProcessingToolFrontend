'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState, useEffect } from 'react';
import { Inbox, Send, PencilLine, RefreshCcw, Mail, ChevronDown, ChevronRight } from 'lucide-react';
import API_BASE_URL from '../../../BaseUrl';

const emailSubItems = [
    { href: '/email/inbox', label: 'Inbox', icon: Inbox },
    { href: '/email/sent', label: 'Sent', icon: Send },
];

const otherItems = [
    { href: '/email/compose', label: 'Compose Email', icon: PencilLine },
];

// Refresh Token button at bottom
const refreshItem = {
    href: `${API_BASE_URL}/auth/google/start`,
    label: 'Refresh Token',
};

const isActivePath = (pathname: string | null, href: string) => {
    if (!pathname) return false;
    if (pathname === href) return true;
    return pathname.startsWith(`${href}/`);
};

const EmailWorkspace = ({ children }: { children: ReactNode }) => {
    const pathname = usePathname();
    const [isEmailExpanded, setIsEmailExpanded] = useState(true);

    // Auto-expand Email section if on inbox or sent page
    useEffect(() => {
        if (pathname?.startsWith('/email/inbox') || pathname?.startsWith('/email/sent')) {
            setIsEmailExpanded(true);
        }
    }, [pathname]);

    const hasActiveEmailItem = emailSubItems.some(item => isActivePath(pathname, item.href));

    return (
        <div className="flex h-screen w-full bg-gradient-to-br from-slate-100 to-slate-200">

            {/* LEFT FIXED SIDEBAR */}
            <aside className="w-72 h-full bg-white/80 backdrop-blur-xl border-r border-white/50 shadow-xl p-6 flex flex-col">

                {/* Header */}
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Order Processing Tool</h2>
                </div>

                {/* TOP NAVIGATION */}
                <nav className="mt-10 space-y-2 flex-1">
                    {/* Email Section */}
                    <div>
                        <button
                            onClick={() => setIsEmailExpanded(!isEmailExpanded)}
                            className={`group relative flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-[15px] font-medium transition-all ${
                                hasActiveEmailItem
                                    ? 'bg-blue-100 text-blue-700 shadow-sm scale-[1.02]'
                                    : 'bg-white/60 text-slate-700 hover:bg-slate-50 hover:shadow-md hover:scale-[1.01]'
                            }`}
                        >
                            <Mail
                                size={20}
                                className={hasActiveEmailItem ? 'text-blue-600' : 'text-slate-500 group-hover:text-blue-500'}
                            />
                            <span>Email</span>
                            {isEmailExpanded ? (
                                <ChevronDown
                                    size={16}
                                    className={`ml-auto ${hasActiveEmailItem ? 'text-blue-500' : 'text-slate-400'}`}
                                />
                            ) : (
                                <ChevronRight
                                    size={16}
                                    className={`ml-auto ${hasActiveEmailItem ? 'text-blue-500' : 'text-slate-400'}`}
                                />
                            )}
                        </button>

                        {/* Email Sub-items */}
                        {isEmailExpanded && (
                            <div className="ml-4 mt-2 space-y-1">
                                {emailSubItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = isActivePath(pathname, item.href);

                                    return (
                                        <Link key={item.href} href={item.href}>
                                            <div
                                                className={`group relative flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium transition-all ${
                                                    isActive
                                                        ? 'bg-blue-50 text-blue-700 shadow-sm'
                                                        : 'bg-white/40 text-slate-700 hover:bg-slate-50 hover:shadow-sm'
                                                }`}
                                            >
                                                <Icon
                                                    size={18}
                                                    className={isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-blue-500'}
                                                />
                                                <span>{item.label}</span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Other Items */}
                    {otherItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = isActivePath(pathname, item.href);

                        const classes = `group relative flex items-center gap-3 rounded-2xl px-5 py-4 text-[15px] font-medium transition-all ${isActive
                                ? 'bg-blue-100 text-blue-700 shadow-sm scale-[1.02]'
                                : 'bg-white/60 text-slate-700 hover:bg-slate-50 hover:shadow-md hover:scale-[1.01]'
                            }`;

                        return (
                            <Link key={item.href} href={item.href} className={classes}>
                                <Icon
                                    size={20}
                                    className={isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-blue-500'}
                                />
                                <span>{item.label}</span>
                            </Link>
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
                bg-white/60 text-slate-700 hover:bg-slate-50 hover:shadow-md hover:scale-[1.01]
                border border-slate-300
              "
                        >
                            <RefreshCcw size={20} className="text-slate-500 group-hover:text-blue-500" />
                            <span>{refreshItem.label}</span>
                        </a>

                        {/* Tooltip */}
                        <span
                            className="
    absolute bottom-full left-1/2 -translate-x-1/2 mb-2
    px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white shadow-lg
    opacity-0 pointer-events-none
    group-hover:opacity-100 group-hover:-translate-y-1
    transition-all duration-200 whitespace-nowrap
    flex items-center gap-2 z-[9999]
    before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2
    before:border-4 before:border-transparent before:border-t-red-600
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
