'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';

type ResizableSplitViewProps = {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultLeftWidth?: number; // percentage (0-100)
  minLeftWidth?: number; // percentage
  maxLeftWidth?: number; // percentage
};

export const ResizableSplitView = memo(
  ({ left, right, defaultLeftWidth = 40, minLeftWidth = 20, maxLeftWidth = 80 }: ResizableSplitViewProps) => {
    const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
    const [isDragging, setIsDragging] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dividerRef = useRef<HTMLDivElement>(null);

    // Check if mobile on mount and resize
    useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 1024);
      };
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleMouseDown = useCallback(() => {
      setIsDragging(true);
    }, []);

    const handleMouseMove = useCallback(
      (e: MouseEvent) => {
        if (!isDragging || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

        // Clamp between min and max
        const clampedWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, newLeftWidth));
        setLeftWidth(clampedWidth);
      },
      [isDragging, minLeftWidth, maxLeftWidth],
    );

    const handleMouseUp = useCallback(() => {
      setIsDragging(false);
    }, []);

    useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        };
      }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
      <div ref={containerRef} className="flex flex-col lg:flex-row h-full w-full relative">
        {/* Left Panel */}
        <div
          className={`flex-shrink-0 overflow-auto ${
            isMobile ? 'w-full h-1/2' : ''
          }`}
          style={
            isMobile
              ? {}
              : {
                  width: `${leftWidth}%`,
                  minWidth: `${minLeftWidth}%`,
                  maxWidth: `${maxLeftWidth}%`,
                }
          }
        >
          {left}
        </div>

        {/* Resizable Divider - Hidden on mobile */}
        {!isMobile && (
          <div
            ref={dividerRef}
            onMouseDown={handleMouseDown}
            className={`flex-shrink-0 bg-slate-300 hover:bg-blue-500 cursor-col-resize transition-colors ${
              isDragging ? 'bg-blue-500' : ''
            }`}
            style={{ width: '4px', minWidth: '4px', cursor: 'col-resize' }}
          />
        )}

        {/* Right Panel */}
        <div className={`flex-1 overflow-auto ${isMobile ? 'w-full h-1/2' : ''}`} style={{ minWidth: 0 }}>
          {right}
        </div>
      </div>
    );
  },
);

ResizableSplitView.displayName = 'ResizableSplitView';

