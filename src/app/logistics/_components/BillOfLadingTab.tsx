'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';
import { buildApiUrl } from '../../../../BaseUrl';

type BillOfLadingTabProps = {
  carrier: string;
  token?: string;
};

export const BillOfLadingTab = ({ carrier, token }: BillOfLadingTabProps) => {
  const [requestBody, setRequestBody] = useState('{}');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [response, setResponse] = useState<any>(null);
  const [bearerToken, setBearerToken] = useState(token || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      let body;
      try {
        body = JSON.parse(requestBody);
      } catch (err) {
        throw new Error('Invalid JSON format');
      }

      const res = await fetch(buildApiUrl('/Logistics/create-bill-of-lading'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bearerToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Bill of Lading creation failed: ${res.statusText}`);
      }

      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            Bearer Token <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={bearerToken}
            onChange={(e) => setBearerToken(e.target.value)}
            disabled={loading}
            required
            className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-all"
            placeholder="Enter bearer token"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900">
            Request Body (JSON) <span className="text-red-500">*</span>
          </label>
          <textarea
            value={requestBody}
            onChange={(e) => setRequestBody(e.target.value)}
            disabled={loading}
            required
            rows={10}
            className="w-full px-4 py-3 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-all font-mono text-sm"
            placeholder='{"key": "value"}'
          />
        </div>

        <button
          type="submit"
          disabled={loading || !bearerToken || !requestBody}
          className="px-5 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all disabled:bg-blue-300 disabled:text-white disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating Bill of Lading...
            </>
          ) : (
            'Create Bill of Lading'
          )}
        </button>
      </form>

      {error && (
        <div className="max-w-2xl">
          <ErrorDisplay error={error} />
        </div>
      )}

      {response && (
        <div className="max-w-2xl">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Response:</h3>
          <pre className="p-4 bg-slate-50 border border-slate-300 rounded-lg overflow-auto text-sm">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

