'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { ReactNode, useState, useEffect, useRef } from 'react';
import { Inbox, Send, PencilLine, RefreshCcw, Mail, ChevronDown, ChevronRight, ShoppingCart } from 'lucide-react';
import API_BASE_URL from '../../../../BaseUrl';
import { MARKETPLACES } from '@/Shared/constant';

const emailSubItems = [
    { href: '/email/inbox', label: 'Inbox', icon: Inbox },
    { href: '/email/sent', label: 'Sent', icon: Send },
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

const AppLayout = ({ children }: { children: ReactNode }) => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isEmailExpanded, setIsEmailExpanded] = useState(true);
    const [isOrdersExpanded, setIsOrdersExpanded] = useState(false);
    const ordersDropdownRef = useRef<HTMLDivElement>(null);

    // Auto-expand Email section if on inbox, sent, or compose page
    useEffect(() => {
        if (pathname?.startsWith('/email/inbox') || pathname?.startsWith('/email/sent') || pathname?.startsWith('/email/compose')) {
            setIsEmailExpanded(true);
        }
    }, [pathname]);

    // Auto-expand Orders section if on orders page
    useEffect(() => {
        if (pathname?.startsWith('/orders')) {
            setIsOrdersExpanded(true);
        }
    }, [pathname]);

    // Close orders dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ordersDropdownRef.current && !ordersDropdownRef.current.contains(event.target as Node)) {
                setIsOrdersExpanded(false);
            }
        };

        if (isOrdersExpanded) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isOrdersExpanded]);

    const hasActiveEmailItem = emailSubItems.some(item => isActivePath(pathname, item.href));
    const hasActiveOrdersItem = pathname?.startsWith('/orders');

    return (
        <div className="flex h-screen w-full bg-gradient-to-br from-slate-100 to-slate-200">

            {/* LEFT FIXED SIDEBAR */}
            <aside className="w-64 h-full bg-white border-r border-slate-200 flex flex-col">
                <div className="flex-1 overflow-y-auto">
                    <div className="p-6">
                        {/* Header */}
                        <div className="mb-8 pb-6 border-b border-slate-200 flex justify-center">
                            <Image
                                src="/logo.png"
                                alt="Order Processing Tool"
                                width={120}
                                height={30}
                                className="h-auto w-auto object-contain"
                                priority
                            />
                        </div>

                        {/* OVERVIEW Section */}
                        <div className="mb-8">
                            <nav className="space-y-1">
                                {/* Email Section - Collapsible */}
                                <div>
                                    <button
                                        onClick={() => setIsEmailExpanded(!isEmailExpanded)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                            hasActiveEmailItem
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Mail
                                            size={18}
                                            className={hasActiveEmailItem ? 'text-blue-600' : 'text-slate-400'}
                                        />
                                        <span className="text-sm font-medium flex-1 text-left">Email</span>
                                        {isEmailExpanded ? (
                                            <ChevronDown size={16} className="text-slate-400" />
                                        ) : (
                                            <ChevronRight size={16} className="text-slate-400" />
                                        )}
                                    </button>

                                    {/* Email Sub-items */}
                                    {isEmailExpanded && (
                                        <div className="ml-6 mt-1 space-y-0.5">
                                            {emailSubItems.map((item) => {
                                                const Icon = item.icon;
                                                const isActive = isActivePath(pathname, item.href);

                                                return (
                                                    <Link key={item.href} href={item.href}>
                                                        <div
                                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                                                                isActive
                                                                    ? 'bg-blue-50 text-blue-700'
                                                                    : 'text-slate-600 hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <Icon
                                                                size={16}
                                                                className={isActive ? 'text-blue-600' : 'text-slate-400'}
                                                            />
                                                            <span className="text-sm font-medium">{item.label}</span>
                                                        </div>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Orders Section - Collapsible with Marketplace Dropdown */}
                                <div ref={ordersDropdownRef}>
                                    <button
                                        onClick={() => setIsOrdersExpanded(!isOrdersExpanded)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                            hasActiveOrdersItem
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : 'text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                        <ShoppingCart
                                                    size={18}
                                            className={hasActiveOrdersItem ? 'text-blue-600' : 'text-slate-400'}
                                                />
                                        <span className="text-sm font-medium flex-1 text-left">Orders</span>
                                        {isOrdersExpanded ? (
                                            <ChevronDown size={16} className="text-slate-400" />
                                        ) : (
                                            <ChevronRight size={16} className="text-slate-400" />
                                        )}
                                    </button>

                                    {/* Marketplace Sub-items */}
                                    {isOrdersExpanded && (
                                        <div className="ml-6 mt-1 space-y-0.5">
                                            {/* All Orders option */}
                                            <Link href="/orders/all">
                                                <div
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                                                        hasActiveOrdersItem && !searchParams?.get('marketplace')
                                                            ? 'bg-blue-50 text-blue-700'
                                                            : 'text-slate-600 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <span className="text-sm font-medium">All Orders</span>
                                                </div>
                                            </Link>
                                            
                                            {/* Marketplace options */}
                                            {MARKETPLACES.map((marketplace) => {
                                                const isActive = hasActiveOrdersItem && searchParams?.get('marketplace') === marketplace;
                                                
                                                return (
                                                    <Link 
                                                        key={marketplace} 
                                                        href={`/orders/all?marketplace=${encodeURIComponent(marketplace)}`}
                                                    >
                                                        <div
                                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                                                                isActive
                                                                    ? 'bg-blue-50 text-blue-700'
                                                                    : 'text-slate-600 hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <span className="text-sm font-medium">{marketplace}</span>
                                            </div>
                                        </Link>
                                    );
                                })}
                                        </div>
                                    )}
                                </div>
                            </nav>
                        </div>
                    </div>
                </div>

                {/* Refresh Token Button at Bottom */}
                <div className="border-t border-slate-200 p-6">
                    <div className="relative group">
                        <a
                            href={refreshItem.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            <RefreshCcw size={18} className="text-slate-400 group-hover:text-slate-600" />
                            <span className="text-sm font-medium">{refreshItem.label}</span>
                        </a>

                        {/* Tooltip */}
                        <span
                            className="
                                absolute bottom-full left-4 mb-2
                                px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white shadow-lg
                                opacity-0 pointer-events-none
                                group-hover:opacity-100 group-hover:-translate-y-1
                                transition-all duration-200 whitespace-nowrap
                                flex items-center gap-2 z-[9999]
                                before:content-[''] before:absolute before:top-full before:left-4
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
            <main className="flex-1 p-10 overflow-hidden flex flex-col">
                <div className="bg-white rounded-3xl shadow-xl p-8 border border-white/50 flex-1 min-h-0 overflow-hidden flex flex-col">
                    {children}
                </div>
            </main>

        </div>
    );
};

export default AppLayout;

