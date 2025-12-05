'use client';

import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type BOLFooterActionsProps = {
  loading?: boolean;
  onCancel?: () => void;
  onCreateBOL?: () => void;
  onCreateBOLTemplate?: () => void;
  saveAsTemplate?: boolean;
  onSaveAsTemplateChange?: (value: boolean) => void;
  signBOLWithRequester?: boolean;
  onSignBOLWithRequesterChange?: (value: boolean) => void;
  agreeToTerms?: boolean;
  onAgreeToTermsChange?: (value: boolean) => void;
  onBack?: () => void;
};

export const BOLFooterActions = ({
  loading = false,
  onCancel,
  onCreateBOL,
  onCreateBOLTemplate,
  saveAsTemplate = false,
  onSaveAsTemplateChange,
  signBOLWithRequester = false,
  onSignBOLWithRequesterChange,
  agreeToTerms = false,
  onAgreeToTermsChange,
  onBack,
}: BOLFooterActionsProps) => {
  return (
    <div className="space-y-6 pt-6 border-t border-slate-200">
      {/* Checkboxes */}
      <div className="space-y-4">
        {onSaveAsTemplateChange && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={saveAsTemplate}
              onChange={(e) => onSaveAsTemplateChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">Save as a new BOL Template</span>
          </label>
        )}

        {onSignBOLWithRequesterChange && (
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={signBOLWithRequester}
                onChange={(e) => onSignBOLWithRequesterChange(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">Sign BOL with Requester Name</span>
            </label>
            <p className="text-xs text-slate-500 mt-1 ml-6">
              If you check this box, we will automatically pre-print the name of the requester in the &quot;Authorized Signature&quot; field of the BOL
            </p>
          </div>
        )}

        {onAgreeToTermsChange && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreeToTerms}
              onChange={(e) => onAgreeToTermsChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              required
            />
            <span className="text-sm text-slate-700">
              I agree to{' '}
              <Link href="#" className="text-blue-600 underline">
                Terms of Service
              </Link>
              {' '}({' '}
              <Link href="#" className="text-blue-600 underline">
                View tariff rules and regulations
              </Link>
              {' '})
            </span>
          </label>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-700"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
        )}

        <div className="flex items-center gap-4 ml-auto">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
            >
              Cancel
            </button>
          )}

          {onCreateBOLTemplate && (
            <button
              type="button"
              onClick={onCreateBOLTemplate}
              className="px-6 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
            >
              Create BOL Template
            </button>
          )}

          {onCreateBOL && (
            <button
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                onCreateBOL();
              }}
              disabled={loading || (onAgreeToTermsChange && !agreeToTerms)}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating BOL...
                </>
              ) : (
                'Create BOL'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

