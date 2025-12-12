'use client';

import { ChevronDown, ChevronUp, Info } from 'lucide-react';

type NotificationSendTo = {
  billOfLading: { shipper: boolean; consignee: boolean; thirdParty: boolean };
  shippingLabels: { shipper: boolean; consignee: boolean; thirdParty: boolean };
  trackingUpdates: { shipper: boolean; consignee: boolean; thirdParty: boolean };
};

type ESTESNotificationsProps = {
  billOfLadingNotification: boolean;
  shippingLabelsNotification: boolean;
  trackingUpdatesNotification: boolean;
  shippingLabelFormat: string;
  shippingLabelQuantity: number;
  shippingLabelPosition: number;
  billOfLadingEmails: string[];
  trackingUpdatesEmails: string[];
  notificationSendTo: NotificationSendTo;
  onBillOfLadingNotificationChange: (checked: boolean) => void;
  onShippingLabelsNotificationChange: (checked: boolean) => void;
  onTrackingUpdatesNotificationChange: (checked: boolean) => void;
  onShippingLabelFormatChange: (format: string) => void;
  onShippingLabelQuantityChange: (quantity: number) => void;
  onShippingLabelPositionChange: (position: number) => void;
  onBillOfLadingEmailsChange: (emails: string[]) => void;
  onTrackingUpdatesEmailsChange: (emails: string[]) => void;
  onNotificationSendToChange: (sendTo: NotificationSendTo) => void;
  isExpanded: boolean;
  onToggle: () => void;
};

export const ESTESNotifications = ({
  billOfLadingNotification,
  shippingLabelsNotification,
  trackingUpdatesNotification,
  shippingLabelFormat,
  shippingLabelQuantity,
  shippingLabelPosition,
  billOfLadingEmails,
  trackingUpdatesEmails,
  notificationSendTo,
  onBillOfLadingNotificationChange,
  onShippingLabelsNotificationChange,
  onTrackingUpdatesNotificationChange,
  onShippingLabelFormatChange,
  onShippingLabelQuantityChange,
  onShippingLabelPositionChange,
  onBillOfLadingEmailsChange,
  onTrackingUpdatesEmailsChange,
  onNotificationSendToChange,
  isExpanded,
  onToggle,
}: ESTESNotificationsProps) => {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <h3 className="text-lg font-bold text-slate-900">Notifications</h3>
        {isExpanded ? (
          <ChevronUp className="text-slate-600" size={20} />
        ) : (
          <ChevronDown className="text-slate-600" size={20} />
        )}
      </button>
      {isExpanded && (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bill of Lading & Shipping Labels */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={billOfLadingNotification}
                    onChange={(e) => onBillOfLadingNotificationChange(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-semibold text-slate-900">Bill of Lading</span>
                </label>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={shippingLabelsNotification}
                    onChange={(e) => onShippingLabelsNotificationChange(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-semibold text-slate-900">Shipping Labels</span>
                </label>
                {shippingLabelsNotification && (
                  <div className="ml-6 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-700">Format: {shippingLabelFormat}</span>
                      <button type="button" className="text-blue-600 hover:underline text-sm">Edit</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-700">Quantity: {shippingLabelQuantity}</span>
                      <Info className="text-blue-500" size={14} />
                    </div>
                    <div className="text-sm text-slate-700">Position: {shippingLabelPosition}</div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Send to:</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={notificationSendTo.billOfLading.shipper}
                      onChange={(e) =>
                        onNotificationSendToChange({
                          ...notificationSendTo,
                          billOfLading: { ...notificationSendTo.billOfLading, shipper: e.target.checked },
                        })
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-slate-700">Shipper</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={notificationSendTo.billOfLading.consignee}
                      onChange={(e) =>
                        onNotificationSendToChange({
                          ...notificationSendTo,
                          billOfLading: { ...notificationSendTo.billOfLading, consignee: e.target.checked },
                        })
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-slate-700">Consignee</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={notificationSendTo.billOfLading.thirdParty}
                      onChange={(e) =>
                        onNotificationSendToChange({
                          ...notificationSendTo,
                          billOfLading: { ...notificationSendTo.billOfLading, thirdParty: e.target.checked },
                        })
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-slate-700">Third Party</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">
                  Email Addresses (One per line)
                </label>
                <textarea
                  value={billOfLadingEmails.join('\n')}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n');
                    onBillOfLadingEmailsChange(lines.length > 0 ? lines : ['']);
                  }}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Enter email addresses, one per line"
                />
              </div>
            </div>

            {/* Tracking Updates */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={trackingUpdatesNotification}
                    onChange={(e) => onTrackingUpdatesNotificationChange(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-semibold text-slate-900">Tracking Updates</span>
                </label>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Send to:</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={notificationSendTo.trackingUpdates.shipper}
                      onChange={(e) =>
                        onNotificationSendToChange({
                          ...notificationSendTo,
                          trackingUpdates: { ...notificationSendTo.trackingUpdates, shipper: e.target.checked },
                        })
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-slate-700">Shipper</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={notificationSendTo.trackingUpdates.consignee}
                      onChange={(e) =>
                        onNotificationSendToChange({
                          ...notificationSendTo,
                          trackingUpdates: { ...notificationSendTo.trackingUpdates, consignee: e.target.checked },
                        })
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-slate-700">Consignee</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={notificationSendTo.trackingUpdates.thirdParty}
                      onChange={(e) =>
                        onNotificationSendToChange({
                          ...notificationSendTo,
                          trackingUpdates: { ...notificationSendTo.trackingUpdates, thirdParty: e.target.checked },
                        })
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-slate-700">Third Party</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">
                  Email Addresses (One per line)
                </label>
                <textarea
                  value={trackingUpdatesEmails.join('\n')}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n');
                    onTrackingUpdatesEmailsChange(lines.length > 0 ? lines : ['']);
                  }}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Enter email addresses, one per line"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

