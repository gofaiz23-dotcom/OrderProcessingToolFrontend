'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { ReactNode, useState, useEffect, useRef } from 'react';
import { Inbox, Send, PencilLine, RefreshCcw, Mail, ChevronDown, ChevronRight, ShoppingCart, Truck, PackageSearch, Users, LogOut, User, Menu, X, FileSpreadsheet, BarChart3, Folder, Package } from 'lucide-react';
import API_BASE_URL from '../../../../BaseUrl';
import { MARKETPLACES, LOGISTICS_CARRIERS } from '@/Shared/constant';
import { LogisticsAuthModal } from './LogisticsAuthModal';
import { useLogisticsStore } from '@/store/logisticsStore';
import { useAuthStore } from '@/app/UserAuthentication/store/authStore';
import { useWalmartTokenRefresh } from '@/app/hooks/useWalmartTokenRefresh';

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
    const router = useRouter();
    const { getToken } = useLogisticsStore();
    const { user, logout } = useAuthStore();
    
    // Auto-refresh Walmart token every 10 minutes
    useWalmartTokenRefresh();
    
    const [isEmailExpanded, setIsEmailExpanded] = useState(true);
    const [isOrdersExpanded, setIsOrdersExpanded] = useState(false);
    const [isLogisticsExpanded, setIsLogisticsExpanded] = useState(false);
    const [isProcessedOrdersExpanded, setIsProcessedOrdersExpanded] = useState(false);
    const [is3plGlobalExpanded, setIs3plGlobalExpanded] = useState(false);
    const [selectedCarrier, setSelectedCarrier] = useState<string | null>(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const ordersDropdownRef = useRef<HTMLDivElement>(null);
    const logisticsDropdownRef = useRef<HTMLDivElement>(null);
    const processedOrdersDropdownRef = useRef<HTMLDivElement>(null);
    const threePlGlobalDropdownRef = useRef<HTMLDivElement>(null);

    const handleLogout = () => {
        logout();
        router.push('/UserAuthentication/dashboard');
        router.refresh();
    };

    // Scroll to top on pathname change
    useEffect(() => {
        if (pathname) {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
    }, [pathname]);

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

    // Auto-expand Logistics section if on logistics page
    useEffect(() => {
        if (pathname?.startsWith('/logistics')) {
            setIsLogisticsExpanded(true);
        }
    }, [pathname]);

    // Auto-expand Processed Orders section if on processed orders page
    useEffect(() => {
        if (pathname?.startsWith('/ProcessedOrders')) {
            setIsProcessedOrdersExpanded(true);
        }
    }, [pathname]);

    // Auto-expand 3plGlobal section if on 3plGigaFedex page
    useEffect(() => {
        if (pathname?.startsWith('/3plGigaFedex')) {
            setIs3plGlobalExpanded(true);
        }
    }, [pathname]);

    // Close orders dropdown when clicking outside or when navigating
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            // Check if click is on a link or inside a link
            const isLink = target.closest('a[href]');
            
            // If clicking on a link, allow navigation to proceed but close dropdowns
            if (isLink) {
                if (isOrdersExpanded) setIsOrdersExpanded(false);
                if (isLogisticsExpanded) setIsLogisticsExpanded(false);
                if (isProcessedOrdersExpanded) setIsProcessedOrdersExpanded(false);
                return; // Don't prevent link navigation
            }
            
            // For non-link clicks, close dropdowns if clicking outside
            if (ordersDropdownRef.current && !ordersDropdownRef.current.contains(target)) {
                setIsOrdersExpanded(false);
            }
            if (logisticsDropdownRef.current && !logisticsDropdownRef.current.contains(target)) {
                setIsLogisticsExpanded(false);
            }
            if (processedOrdersDropdownRef.current && !processedOrdersDropdownRef.current.contains(target)) {
                setIsProcessedOrdersExpanded(false);
            }
            if (threePlGlobalDropdownRef.current && !threePlGlobalDropdownRef.current.contains(target)) {
                setIs3plGlobalExpanded(false);
            }
        };

        if (isOrdersExpanded || isLogisticsExpanded || isProcessedOrdersExpanded || is3plGlobalExpanded) {
            document.addEventListener('click', handleClickOutside);
            return () => {
                document.removeEventListener('click', handleClickOutside);
            };
        }
    }, [isOrdersExpanded, isLogisticsExpanded, isProcessedOrdersExpanded, is3plGlobalExpanded]);

    const hasActiveEmailItem = emailSubItems.some(item => isActivePath(pathname, item.href));
    const hasActiveOrdersItem = pathname?.startsWith('/orders');
    const hasActiveLogisticsItem = pathname?.startsWith('/logistics');
    const hasActiveProcessedOrdersItem = pathname?.startsWith('/ProcessedOrders');
    const hasActiveCustomerDetailsItem = pathname?.startsWith('/CustomerDetails');
    const hasActiveEstesPickupItem = pathname === '/3plGigaFedex/estes-pickup' || pathname?.startsWith('/3plGigaFedex/estes-pickup');
    const hasActive3plGlobalItem = pathname?.startsWith('/3plGigaFedex') && !hasActiveEstesPickupItem;

    return (
        <div className="flex h-screen w-full bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden">
            {/* Mobile Overlay - Behind sidebar but in front of content */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/40 z-35"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* LEFT FIXED SIDEBAR */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-40
                w-56 sm:w-64 h-full bg-white border-r border-slate-200 flex flex-col shadow-2xl lg:shadow-none
                transform transition-transform duration-300 ease-in-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                lg:translate-x-0
            `}>
                <div className="flex-1 overflow-y-auto">
                    <div className="p-3 sm:p-6">
                        {/* Header */}
                        <div className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-slate-200">
                            <div className="flex justify-center mb-3 sm:mb-4">
                                <Image
                                    src="/logo.png"
                                    alt="Order Processing Tool"
                                    width={100}
                                    height={25}
                                    className="h-auto w-auto object-contain sm:w-[120px] sm:h-[30px]"
                                    priority
                                />
                            </div>
                            
                            {/* User Info */}
                            {user && (
                                <div className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                                    <div className="bg-blue-100 rounded-full p-1.5 flex-shrink-0">
                                        <User size={14} className="text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs sm:text-sm font-medium text-slate-800 truncate">{user.name}</p>
                                        <p className="text-[10px] sm:text-xs text-slate-500 truncate">{user.email}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* OVERVIEW Section */}
                        <div className="mb-6 sm:mb-8">
                            <nav className="space-y-1">
                                {/* Email Section - Collapsible */}
                                <div>
                                    <button
                                        onClick={() => setIsEmailExpanded(!isEmailExpanded)}
                                        className={`w-full flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2.5 rounded-lg transition-colors ${
                                            hasActiveEmailItem
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Mail
                                            size={18}
                                            className={`flex-shrink-0 ${hasActiveEmailItem ? 'text-blue-600' : 'text-slate-400'}`}
                                        />
                                        <span className="text-xs sm:text-sm font-medium flex-1 text-left">Email</span>
                                        {isEmailExpanded ? (
                                            <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
                                        ) : (
                                            <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
                                        )}
                                    </button>

                                    {/* Email Sub-items */}
                                    {isEmailExpanded && (
                                        <div className="ml-4 sm:ml-6 mt-1 space-y-0.5">
                                            {emailSubItems.map((item) => {
                                                const Icon = item.icon;
                                                const isActive = isActivePath(pathname, item.href);

                                                return (
                                                    <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                                                        <div
                                                            className={`flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg transition-colors ${
                                                                isActive
                                                                    ? 'bg-blue-50 text-blue-700'
                                                                    : 'text-slate-600 hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <Icon
                                                                size={16}
                                                                className={`flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                                                            />
                                                            <span className="text-xs sm:text-sm font-medium">{item.label}</span>
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
                                        className={`w-full flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2.5 rounded-lg transition-colors ${
                                            hasActiveOrdersItem
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : 'text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                        <ShoppingCart
                                                    size={18}
                                            className={`flex-shrink-0 ${hasActiveOrdersItem ? 'text-blue-600' : 'text-slate-400'}`}
                                                />
                                        <span className="text-xs sm:text-sm font-medium flex-1 text-left">Orders</span>
                                        {isOrdersExpanded ? (
                                            <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
                                        ) : (
                                            <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
                                        )}
                                    </button>

                                    {/* Marketplace Sub-items */}
                                    {isOrdersExpanded && (
                                        <div className="ml-4 sm:ml-6 mt-1 space-y-0.5">
                                            {/* All Orders option */}
                                            <Link href="/orders/all" onClick={() => setIsMobileMenuOpen(false)}>
                                                <div
                                                    className={`flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg transition-colors ${
                                                        hasActiveOrdersItem && !searchParams?.get('marketplace')
                                                            ? 'bg-blue-50 text-blue-700'
                                                            : 'text-slate-600 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <span className="text-xs sm:text-sm font-medium">All Orders</span>
                                                </div>
                                            </Link>
                                            
                                            {/* Marketplace options */}
                                            {MARKETPLACES.map((marketplace) => {
                                                const isActive = hasActiveOrdersItem && searchParams?.get('marketplace') === marketplace;
                                                
                                                return (
                                                    <Link 
                                                        key={marketplace} 
                                                        href={`/orders/all?marketplace=${encodeURIComponent(marketplace)}`}
                                                        onClick={() => setIsMobileMenuOpen(false)}
                                                    >
                                                        <div
                                                            className={`flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg transition-colors ${
                                                                isActive
                                                                    ? 'bg-blue-50 text-blue-700'
                                                                    : 'text-slate-600 hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <span className="text-xs sm:text-sm font-medium">{marketplace}</span>
                                            </div>
                                        </Link>
                                    );
                                })}
                                            
                                            {/* Walmart Orders option */}
                                            <Link 
                                                href="/orders/walmart"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                            >
                                                <div
                                                    className={`flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg transition-colors ${
                                                        pathname === '/orders/walmart'
                                                            ? 'bg-blue-50 text-blue-700'
                                                            : 'text-slate-600 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <span className="text-xs sm:text-sm font-medium">Walmart Orders</span>
                                                </div>
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Logistics Section - Collapsible with Carrier Dropdown */}
                                <div ref={logisticsDropdownRef}>
                                    <button
                                        onClick={() => setIsLogisticsExpanded(!isLogisticsExpanded)}
                                        className={`w-full flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2.5 rounded-lg transition-colors ${
                                            hasActiveLogisticsItem
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Truck
                                            size={18}
                                            className={`flex-shrink-0 ${hasActiveLogisticsItem ? 'text-blue-600' : 'text-slate-400'}`}
                                        />
                                        <span className="text-xs sm:text-sm font-medium flex-1 text-left">Logistics</span>
                                        {isLogisticsExpanded ? (
                                            <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
                                        ) : (
                                            <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
                                        )}
                                    </button>

                                    {/* Carrier Sub-items */}
                                    {isLogisticsExpanded && (
                                        <div className="ml-4 sm:ml-6 mt-1 space-y-0.5">
                                            {LOGISTICS_CARRIERS.map((carrier) => {
                                                const isActive = hasActiveLogisticsItem && searchParams?.get('carrier') === carrier;
                                                
                                                return (
                                                    <div
                                                        key={carrier}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setIsMobileMenuOpen(false);
                                                            // Check if token exists in Zustand store
                                                            const existingToken = getToken(carrier);
                                                            
                                                            if (existingToken) {
                                                                // Token exists, redirect directly to rate quote page
                                                                // Map carrier to correct route
                                                                const normalizedCarrier = carrier.toLowerCase();
                                                                const carrierRoute = normalizedCarrier === 'xpo' || normalizedCarrier === 'expo' 
                                                                    ? '/logistics/xpo' 
                                                                    : '/logistics/estes';
                                                                const rateQuoteUrl = `${carrierRoute}?carrier=${encodeURIComponent(carrier)}`;
                                                                router.push(rateQuoteUrl);
                                                            } else {
                                                                // Token doesn't exist, show login modal
                                                                const logisticsUrl = `/logistics?carrier=${encodeURIComponent(carrier)}`;
                                                                router.push(logisticsUrl);
                                                                setSelectedCarrier(carrier);
                                                                setIsAuthModalOpen(true);
                                                            }
                                                        }}
                                                        className={`flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                                                            isActive
                                                                ? 'bg-blue-50 text-blue-700'
                                                                : 'text-slate-600 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <span className="text-xs sm:text-sm font-medium">{carrier}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Processed Orders Section */}
                                <div ref={processedOrdersDropdownRef}>
                                    <Link 
                                        href="/ProcessedOrders"
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                            // Close all dropdowns when navigating
                                            setIsOrdersExpanded(false);
                                            setIsLogisticsExpanded(false);
                                            setIsProcessedOrdersExpanded(false);
                                        }}
                                    >
                                        <div
                                            className={`w-full flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2.5 rounded-lg transition-colors ${
                                                hasActiveProcessedOrdersItem
                                                    ? 'bg-blue-50 text-blue-700'
                                                    : 'text-slate-700 hover:bg-slate-50'
                                            }`}
                                        >
                                            <PackageSearch
                                                size={18}
                                                className={`flex-shrink-0 ${hasActiveProcessedOrdersItem ? 'text-blue-600' : 'text-slate-400'}`}
                                            />
                                            <span className="text-xs sm:text-sm font-medium flex-1 text-left">Processed Orders</span>
                                        </div>
                                    </Link>
                                </div>

                                {/* Customer Details Section */}
                                <div>
                                    <Link 
                                        href="/CustomerDetails"
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                            // Close all dropdowns when navigating
                                            setIsOrdersExpanded(false);
                                            setIsLogisticsExpanded(false);
                                            setIsProcessedOrdersExpanded(false);
                                            setIs3plGlobalExpanded(false);
                                        }}
                                    >
                                        <div
                                            className={`w-full flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2.5 rounded-lg transition-colors ${
                                                hasActiveCustomerDetailsItem
                                                    ? 'bg-blue-50 text-blue-700'
                                                    : 'text-slate-700 hover:bg-slate-50'
                                            }`}
                                        >
                                            <Users
                                                size={18}
                                                className={`flex-shrink-0 ${hasActiveCustomerDetailsItem ? 'text-blue-600' : 'text-slate-400'}`}
                                            />
                                            <span className="text-xs sm:text-sm font-medium flex-1 text-left">Customer Details</span>
                                        </div>
                                    </Link>
                                </div>

                                {/* Estes Pickup Section - Separate */}
                                <div>
                                    <Link 
                                        href="/3plGigaFedex/estes-pickup"
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                            setIsOrdersExpanded(false);
                                            setIsLogisticsExpanded(false);
                                            setIsProcessedOrdersExpanded(false);
                                            setIs3plGlobalExpanded(false);
                                        }}
                                    >
                                        <div
                                            className={`w-full flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2.5 rounded-lg transition-colors ${
                                                hasActiveEstesPickupItem
                                                    ? 'bg-blue-50 text-blue-700'
                                                    : 'text-slate-700 hover:bg-slate-50'
                                            }`}
                                        >
                                            <Package
                                                size={18}
                                                className={`flex-shrink-0 ${hasActiveEstesPickupItem ? 'text-blue-600' : 'text-slate-400'}`}
                                            />
                                            <span className="text-xs sm:text-sm font-medium flex-1 text-left">Estes Pickup</span>
                                        </div>
                                    </Link>
                                </div>

                                {/* 3plGlobal Section - Collapsible with Dropdown */}
                                <div ref={threePlGlobalDropdownRef}>
                                    <button
                                        onClick={() => setIs3plGlobalExpanded(!is3plGlobalExpanded)}
                                        className={`w-full flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2.5 rounded-lg transition-colors ${
                                            hasActive3plGlobalItem
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <FileSpreadsheet
                                            size={18}
                                            className={`flex-shrink-0 ${hasActive3plGlobalItem ? 'text-blue-600' : 'text-slate-400'}`}
                                        />
                                        <span className="text-xs sm:text-sm font-medium flex-1 text-left">3-PL-Global</span>
                                        {is3plGlobalExpanded ? (
                                            <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
                                        ) : (
                                            <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
                                        )}
                                    </button>

                                    {/* 3plGlobal Sub-items */}
                                    {is3plGlobalExpanded && (
                                        <div className="ml-4 sm:ml-6 mt-1 space-y-0.5">
                                            <Link 
                                                href="/3plGigaFedex/import-excel"
                                            >
                                                <div
                                                    className={`flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg transition-colors ${
                                                        pathname === '/3plGigaFedex/import-excel'
                                                            ? 'bg-blue-50 text-blue-700'
                                                            : 'text-slate-600 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <FileSpreadsheet
                                                        size={16}
                                                        className={`flex-shrink-0 ${pathname === '/3plGigaFedex/import-excel' ? 'text-blue-600' : 'text-slate-400'}`}
                                                    />
                                                    <span className="text-xs sm:text-sm font-medium">Import Excel</span>
                                                </div>
                                            </Link>
                                            <Link 
                                                href="/3plGigaFedex/scrap-bol"
                                            >
                                                <div
                                                    className={`flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg transition-colors ${
                                                        pathname === '/3plGigaFedex/scrap-bol'
                                                            ? 'bg-blue-50 text-blue-700'
                                                            : 'text-slate-600 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <BarChart3
                                                        size={16}
                                                        className={`flex-shrink-0 ${pathname === '/3plGigaFedex/scrap-bol' ? 'text-blue-600' : 'text-slate-400'}`}
                                                    />
                                                    <span className="text-xs sm:text-sm font-medium">Scrap-Bol</span>
                                                </div>
                                            </Link>
                                            <Link 
                                                href="/3plGigaFedex/status"
                                            >
                                                <div
                                                    className={`flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg transition-colors ${
                                                        pathname === '/3plGigaFedex/status'
                                                            ? 'bg-blue-50 text-blue-700'
                                                            : 'text-slate-600 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <BarChart3
                                                        size={16}
                                                        className={`flex-shrink-0 ${pathname === '/3plGigaFedex/status' ? 'text-blue-600' : 'text-slate-400'}`}
                                                    />
                                                    <span className="text-xs sm:text-sm font-medium">Status</span>
                                                </div>
                                            </Link>
                                            <Link 
                                                href="/3plGigaFedex/shipping-docs"
                                            >
                                                <div
                                                    className={`flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg transition-colors ${
                                                        pathname === '/3plGigaFedex/shipping-docs'
                                                            ? 'bg-blue-50 text-blue-700'
                                                            : 'text-slate-600 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <Folder
                                                        size={16}
                                                        className={`flex-shrink-0 ${pathname === '/3plGigaFedex/shipping-docs' ? 'text-blue-600' : 'text-slate-400'}`}
                                                    />
                                                    <span className="text-xs sm:text-sm font-medium">Shipping Docs</span>
                                                </div>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </nav>
                        </div>
                    </div>
                </div>

                {/* Actions at Bottom */}
                <div className="border-t border-slate-200 p-3 sm:p-6 space-y-2 sm:space-y-3">
                    {/* Refresh Token Button */}
                    <div className="relative group">
                        <a
                            href={refreshItem.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <RefreshCcw size={16} className="text-slate-400 group-hover:text-slate-600 flex-shrink-0" />
                            <span className="text-xs sm:text-sm font-medium">{refreshItem.label}</span>
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

                    {/* Logout Button */}
                    <button
                        onClick={() => {
                            handleLogout();
                            setIsMobileMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 rounded-lg text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                        <LogOut size={16} className="text-slate-400 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* RIGHT MAIN CONTENT */}
            <main className="flex-1 p-0 sm:p-6 lg:p-10 overflow-hidden flex flex-col pt-12 sm:pt-6 lg:pt-10 relative z-10">
                {/* Mobile Menu Toggle - In Content Area */}
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="lg:hidden fixed top-3 left-3 z-50 p-2.5 bg-white rounded-lg shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    aria-label="Toggle menu"
                >
                    <Menu size={22} className="text-slate-700" />
                </button>
                <div className="bg-white rounded-none sm:rounded-2xl lg:rounded-3xl shadow-none sm:shadow-xl p-0 sm:p-6 lg:p-8 border-0 sm:border border-white/50 flex-1 min-h-0 overflow-hidden flex flex-col">
                    {children}
                </div>
            </main>

            {/* Logistics Authentication Modal */}
            {selectedCarrier && (
                <LogisticsAuthModal
                    isOpen={isAuthModalOpen}
                    onClose={() => {
                        setIsAuthModalOpen(false);
                        setSelectedCarrier(null);
                    }}
                    carrier={selectedCarrier}
                />
            )}
        </div>
    );
};

export default AppLayout;

