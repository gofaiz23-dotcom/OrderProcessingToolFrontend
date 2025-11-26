'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AttachmentPreviewModal, EmailFilters, ReadingPane, ResizableSplitView } from '@/app/email/_components/shared';
import { SentEmailList } from '@/app/email/_components/sent';
import { EmailAttachment } from '@/app/types/email';
import { loadSentEmails, SentEmail, enrichSentEmail } from '@/app/utils/Emails/Sent';
import { extractErrorInfo } from '@/app/utils/Errors/ApiError';
import { useDebounce } from '@/app/utils/hooks/useDebounce';

type DateFilterOption = 'all' | 'today' | 'thisWeek' | 'specificDate' | 'custom';

export const SentEmailsView = () => {
  const router = useRouter();
  const pathname = usePathname();
  
  // Get page number from URL pathname - supports /email/sent/page2 format
  const currentPage = useMemo(() => {
    // Check if pathname matches /email/sent/page{NUMBER}
    // This handles both /email/sent/page2 and /email/sent/page/2 formats
    const pageMatch = pathname.match(/\/email\/sent\/page(\d+)$/);
    if (pageMatch) {
      const pageNum = parseInt(pageMatch[1], 10);
      return isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;
    }
    // Also check for /email/sent/page/{number} format
    const pageMatch2 = pathname.match(/\/email\/sent\/page\/(\d+)$/);
    if (pageMatch2) {
      const pageNum = parseInt(pageMatch2[1], 10);
      return isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;
    }
    // Default to page 1 for /email/sent
    return 1;
  }, [pathname]);
  
  // Start with smaller limit for faster initial load - backend is slow (2s per email)
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [attachmentsOnly, setAttachmentsOnly] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Debounce search and date inputs to avoid excessive refetching
  const debouncedSearch = useDebounce(search, 500);
  const debouncedStartDate = useDebounce(startDate, 500);
  const debouncedEndDate = useDebounce(endDate, 500);

  // Store all fetched emails (across all pages)
  const [allEmails, setAllEmails] = useState<SentEmail[]>([]);
  const [enrichedEmails, setEnrichedEmails] = useState<Map<string, SentEmail>>(new Map());
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  
  // Track fetch requests to cancel stale ones
  const fetchControllerRef = useRef<AbortController | null>(null);

  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  
  // Calculate which emails to show for current page
  const emails = useMemo(() => {
    const startIndex = (currentPage - 1) * limit;
    const endIndex = startIndex + limit;
    return allEmails.slice(startIndex, endIndex);
  }, [allEmails, currentPage, limit]);
  
  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(allEmails.length / limit) || 1;
  }, [allEmails.length, limit]);
  
  // Get selected email - use enriched version if available, otherwise use lightweight
  const selectedEmail = useMemo(() => {
    if (!selectedEmailId) {
      return emails[0] ?? null;
    }
    
    // Check if we have an enriched version
    const enriched = enrichedEmails.get(selectedEmailId);
    if (enriched) {
      return enriched;
    }
    
    // Find lightweight version
    const lightweight = emails.find((e) => e.id === selectedEmailId);
    if (!lightweight) {
      return emails[0] ?? null;
    }
    
    // Enrich it (this is fast - just retrieves from memory store)
    const enrichedEmail = enrichSentEmail(lightweight);
    if (enrichedEmail !== lightweight) {
      // Store enriched version for next time
      setEnrichedEmails(prev => new Map(prev).set(selectedEmailId, enrichedEmail));
      return enrichedEmail;
    }
    
    return lightweight;
  }, [emails, selectedEmailId, enrichedEmails]);

  const [previewAttachment, setPreviewAttachment] = useState<EmailAttachment | null>(null);

  const getDateRange = useCallback((filter: DateFilterOption, customStart?: string, customEnd?: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filter) {
      case 'today': {
        const start = new Date(today);
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      case 'thisWeek': {
        const start = new Date(today);
        const dayOfWeek = start.getDay();
        const diff = start.getDate() - dayOfWeek;
        start.setDate(diff);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      case 'specificDate': {
        if (customStart) {
          const start = new Date(customStart);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customStart);
          end.setHours(23, 59, 59, 999);
          return { start, end };
        }
        return undefined;
      }
      case 'custom': {
        if (customStart && customEnd) {
          const start = new Date(customStart);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customEnd);
          end.setHours(23, 59, 59, 999);
          return { start, end };
        }
        return undefined;
      }
      default:
        return undefined;
    }
  }, []);

  // Use debounced values for filters to reduce refetching
  const filters = useMemo(() => {
    const dateRange = getDateRange(dateFilter, debouncedStartDate, debouncedEndDate);
    return {
      limit,
      search: debouncedSearch.trim() || undefined,
      hasAttachments: attachmentsOnly ? true : undefined,
      dateRange: dateRange
        ? {
            start: dateRange.start,
            end: dateRange.end,
          }
        : undefined,
    };
  }, [attachmentsOnly, limit, debouncedSearch, dateFilter, debouncedStartDate, debouncedEndDate, getDateRange]);

  const fetchSentEmailsData = useCallback(async (isInitialLoad: boolean = true) => {
    // Cancel any previous request
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    const controller = new AbortController();
    fetchControllerRef.current = controller;
    
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    
    try {
      // PROGRESSIVE LOADING STRATEGY:
      // Calculate how many emails we need to cover the current page
      // For page 1: need 10 emails (limit)
      // For page 2: need 20 emails (currentPage * limit)
      // For page 3: need 30 emails (currentPage * limit)
      const requiredCount = currentPage * limit;
      
      // Fetch emails with smart caching:
      // - Checks emailStorageCache first
      // - Only fetches missing emails from API
      // - Stores all emails in cache for future use
      const fetchFilters = { ...filters, limit: requiredCount };
      const data = await loadSentEmails(fetchFilters, true, true, requiredCount);
      
      // Check if request was cancelled
      if (controller.signal.aborted) {
        return;
      }
      
      // Store all fetched emails
      setAllEmails(data);
      
      // Clear enriched emails when list refreshes (they'll be re-enriched on selection)
      if (isInitialLoad) {
        setEnrichedEmails(new Map());
      }
      
      // Select first email of current page if no selection
      const currentPageEmails = data.slice((currentPage - 1) * limit, currentPage * limit);
      if (currentPageEmails.length > 0 && !selectedEmailId) {
        setSelectedEmailId(currentPageEmails[0].id);
      } else if (selectedEmailId) {
        const stillExists = data.find((d) => d.id === selectedEmailId);
        if (!stillExists && currentPageEmails.length > 0) {
          setSelectedEmailId(currentPageEmails[0].id);
        }
      }
      setLastRefreshed(new Date());
    } catch (err) {
      // Don't set error if request was cancelled
      if (!controller.signal.aborted) {
        setError(err);
      }
    } finally {
      if (!controller.signal.aborted) {
        if (isInitialLoad) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
      fetchControllerRef.current = null;
    }
  }, [filters, currentPage, limit, selectedEmailId]);

  useEffect(() => {
    // Fetch emails - cache is checked FIRST inside loadSentEmails
    // So if emails are cached, no API call will be made
    fetchSentEmailsData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchSentEmailsData]);
  
  // BACKGROUND PREFETCHING: Load next page's emails in background
  // This makes navigation instant - emails are already cached
  useEffect(() => {
    // Only prefetch if we don't have enough emails for next page
    const requiredForNextPage = (currentPage + 1) * limit;
    if (allEmails.length < requiredForNextPage && !loading && !loadingMore) {
      // Prefetch in background (don't show loading state)
      // Uses emailStorageCache - if emails already cached, no API call needed
      const fetchFilters = { ...filters, limit: requiredForNextPage };
      loadSentEmails(fetchFilters, true, true, requiredForNextPage)
        .then((data) => {
          // Only update if we got more emails
          if (data.length > allEmails.length) {
            setAllEmails(data);
          }
        })
        .catch(() => {
          // Silently fail - user can still navigate and it will load then
        });
    }
  }, [currentPage, limit, allEmails.length, filters, loading, loadingMore]);

  const handleClear = useCallback(() => {
    setSearch('');
    setLimit(10);
    setAttachmentsOnly(false);
    setDateFilter('all');
    setStartDate('');
    setEndDate('');
    setSelectedEmailId(null);
  }, []);

  const handleDateFilterChange = useCallback((option: DateFilterOption) => {
    setDateFilter(option);
    if (option !== 'custom' && option !== 'specificDate') {
      setStartDate('');
      setEndDate('');
    } else if (option === 'specificDate') {
      setEndDate('');
    }
  }, []);

  const handleEmailSelect = useCallback((email: SentEmail) => {
    setSelectedEmailId(email.id);
    // Enrich the email when selected (lazy load full content)
    const enriched = enrichSentEmail(email);
    if (enriched !== email) {
      setEnrichedEmails(prev => new Map(prev).set(email.id, enriched));
    }
  }, []);

  // Navigation functions - navigate between pages
  const canNavigatePrevious = currentPage > 1;
  // Can navigate next if:
  // 1. We have more pages, OR
  // 2. We have enough emails to show current page (might have more)
  const canNavigateNext = currentPage < totalPages || allEmails.length >= currentPage * limit;

  const handleNavigatePrevious = useCallback(() => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      if (newPage === 1) {
        router.push('/email/sent');
      } else {
        router.push(`/email/sent/page${newPage}`);
      }
    }
  }, [currentPage, router]);

  const handleNavigateNext = useCallback(async () => {
    const nextPage = currentPage + 1;
    
    // Check if we need to fetch more emails
    const requiredCount = nextPage * limit;
    if (allEmails.length < requiredCount) {
      setLoadingMore(true);
      try {
        // Fetch more emails (use cache for faster loading)
        const fetchFilters = { ...filters, limit: requiredCount };
        const data = await loadSentEmails(fetchFilters, true, true, requiredCount);
        setAllEmails(data);
      } catch (err) {
        setError(err);
        setLoadingMore(false);
        return;
      } finally {
        setLoadingMore(false);
      }
    }
    
    // Navigate to next page (this will trigger useEffect which will fetch if needed)
    router.push(`/email/sent/page${nextPage}`);
  }, [currentPage, limit, allEmails.length, filters, router]);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Filters in single line at top */}
      <EmailFilters
        search={search}
        limit={limit}
        attachmentsOnly={attachmentsOnly}
        dateFilter={dateFilter}
        startDate={startDate}
        endDate={endDate}
        loading={loading}
        onSearchChange={setSearch}
        onLimitChange={setLimit}
        onAttachmentsOnlyToggle={setAttachmentsOnly}
        onDateFilterChange={handleDateFilterChange}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onClear={handleClear}
      />

      {/* Main content area - resizable split view */}
      <div className="flex-1 overflow-hidden">
        <ResizableSplitView
          defaultLeftWidth={40}
          minLeftWidth={20}
          maxLeftWidth={80}
          left={
            <div className="h-full border-r border-slate-200 flex flex-col overflow-hidden">
              <SentEmailList
                emails={emails}
                selectedEmailId={selectedEmail?.id ?? null}
                loading={loading}
                loadingMore={loadingMore}
                error={error}
                onEmailSelect={handleEmailSelect}
                onNavigateNext={handleNavigateNext}
                onNavigatePrevious={handleNavigatePrevious}
                canNavigateNext={canNavigateNext}
                canNavigatePrevious={canNavigatePrevious}
                currentPage={currentPage}
                totalPages={totalPages}
              />
            </div>
          }
          right={
            <div className="h-full bg-white overflow-hidden flex flex-col">
              <ReadingPane email={selectedEmail ?? null} loading={loading} onAttachmentPreview={setPreviewAttachment} />
            </div>
          }
        />
      </div>

      {/* Attachment preview modal */}
      {previewAttachment && (
        <AttachmentPreviewModal attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} />
      )}
    </div>
  );
};

export default function SentEmailsPage() {
  return <SentEmailsView />;
}
