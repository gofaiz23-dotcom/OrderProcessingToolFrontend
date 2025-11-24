'use client';

import { FormEvent, useState } from 'react';
import {
  ComposeFormState,
  defaultComposeState,
  MAX_ATTACHMENTS,
  MAX_RECIPIENTS,
  submitComposeForm,
  updateAttachments,
} from '@/app/utils/Emails/Compose';

const helperText = `Up to ${MAX_RECIPIENTS} recipients and ${MAX_ATTACHMENTS} attachments per email.`;

const ComposeEmailForm = () => {
  const [form, setForm] = useState<ComposeFormState>(defaultComposeState);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const result = await submitComposeForm(form);
      setStatus({
        type: 'success',
        message: `${result.message}. Delivered to ${result.deliveredTo} recipient(s).`,
      });
      setForm(defaultComposeState);
      formElement.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send email';
      setStatus({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ComposeFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    setForm((prev) => updateAttachments(prev, files));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          To
          <input
            type="text"
            placeholder="recipient@example.com, second@example.com"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={form.to}
            onChange={handleInputChange('to')}
          />
        </label>
        <p className="mt-1 text-xs text-slate-500">{helperText}</p>
      </div>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
        Subject
        <input
          type="text"
          placeholder="Project update"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          value={form.subject}
          onChange={handleInputChange('subject')}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
        Text body
        <textarea
          rows={4}
          placeholder="Plain text body..."
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          value={form.text}
          onChange={handleInputChange('text')}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
        HTML body
        <textarea
          rows={4}
          placeholder="<p>Optional HTML body</p>"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 font-mono"
          value={form.html}
          onChange={handleInputChange('html')}
        />
      </label>

      <div className="flex flex-col gap-2 text-sm font-medium text-slate-700">
        Attachments
        <input
          type="file"
          multiple
          onChange={handleAttachmentChange}
          className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 file:hidden"
        />
        {form.attachments.length ? (
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
            {form.attachments.map((file) => (
              <li key={file.name}>
                {file.name} ({Math.round(file.size / 1024)} KB)
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400">No files selected</p>
        )}
      </div>

      {status.message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            status.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {status.message}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        {loading ? 'Sending…' : 'Send email'}
      </button>
    </form>
  );
};

export const ComposeEmailView = () => (
  <section className="rounded-2xl bg-white p-8 shadow-sm">
    <header className="mb-6 space-y-1">
      <p className="text-sm font-semibold uppercase text-blue-600">Email</p>
      <h1 className="text-3xl font-bold text-slate-900">Compose</h1>
      <p className="text-sm text-slate-600">
        Draft a new email, attach files, and send through the connected Gmail account.
      </p>
    </header>
    <ComposeEmailForm />
  </section>
);

const ComposeEmailPage = () => <ComposeEmailView />;

export default ComposeEmailPage;

