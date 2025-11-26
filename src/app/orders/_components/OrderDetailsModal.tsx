'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { X, GripVertical } from 'lucide-react';
import type { Order } from '@/app/types/order';
import { formatJsonb, parseJsonSafely } from '@/app/utils/Orders';

type KeyValuePair = {
  key: string;
  value: string;
};

type OrderDetailsModalProps = {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
};

export const OrderDetailsModal = ({
  isOpen,
  order,
  onClose,
}: OrderDetailsModalProps) => {
  const [previewHeight, setPreviewHeight] = useState(192); // Default 192px (12rem)
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(192);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const deltaY = e.clientY - startYRef.current;
      const newHeight = Math.max(100, Math.min(600, startHeightRef.current + deltaY));
      setPreviewHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = previewHeight;
  };

  // Convert JSONB to key-value pairs
  const keyValuePairs = useMemo((): KeyValuePair[] => {
    if (!order) return [];
    
    const jsonObj = typeof order.jsonb === 'string' 
      ? parseJsonSafely(order.jsonb) as Record<string, unknown>
      : (order.jsonb as Record<string, unknown>);
    
    if (!jsonObj || typeof jsonObj !== 'object' || Array.isArray(jsonObj)) {
      return [];
    }
    
    return Object.entries(jsonObj).map(([key, value]) => {
      let stringValue = '';
      
      if (value === null) {
        stringValue = 'null';
      } else if (typeof value === 'boolean') {
        stringValue = value.toString();
      } else if (typeof value === 'number') {
        stringValue = value.toString();
      } else {
        stringValue = String(value);
      }
      
      return {
        key,
        value: stringValue,
      };
    });
  }, [order]);

  if (!isOpen || !order) return null;

  const jsonbString = formatJsonb(order.jsonb);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col animate-slide-up-and-scale"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Order Details #{order.id}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Order ID */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-900">
              Order ID
            </label>
            <div className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900">
              #{order.id}
            </div>
          </div>

          {/* Order on Marketplace */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-900">
              Marketplace
            </label>
            <div className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900">
              {order.orderOnMarketPlace}
            </div>
          </div>

          {/* Key-Value Pairs */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-900">
              Key-Value Pairs
            </label>
            
            {keyValuePairs.length === 0 ? (
              <div className="text-sm text-slate-500 italic">No key-value pairs</div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {keyValuePairs.map((pair, index) => (
                  <div
                    key={`${pair.key}-${index}`}
                    className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg bg-slate-50/50"
                  >
                    <div className="flex-1 grid grid-cols-12 gap-2">
                      {/* Key Display */}
                      <div className="col-span-4">
                        <div className="px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-900">
                          {pair.key}
                        </div>
                      </div>

                      {/* Value Display */}
                      <div className="col-span-8">
                        <div className="px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 break-words">
                          {pair.value}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* JSONB Data Preview at Bottom - Resizable */}
          <div className="space-y-2 border-t border-slate-200 pt-4">
            <label className="block text-sm font-semibold text-slate-900">
              JSONB Data
            </label>
            <div className="relative">
              <div
                ref={resizeRef}
                className="w-full border border-slate-300 rounded-lg bg-slate-50 font-mono text-xs text-slate-700 overflow-auto"
                style={{ height: `${previewHeight}px`, minHeight: '100px', maxHeight: '600px' }}
              >
                <div className="px-4 py-3">
                  <pre className="whitespace-pre-wrap break-words">{jsonbString}</pre>
                </div>
              </div>
              <div
                onMouseDown={handleResizeStart}
                className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-200 transition-colors rounded-b-lg flex items-center justify-center group"
              >
                <GripVertical className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

