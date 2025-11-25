'use client';

import { FormEvent, useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { X, Loader2, Send, Bold, Italic, List, Link as LinkIcon } from 'lucide-react';
import {
  ComposeFormState,
  defaultComposeState,
  MAX_RECIPIENTS,
  submitComposeForm,
} from '@/app/utils/Emails/Compose';

type InlineReplyComposerProps = {
  to: string[];
  subject: string;
  initialBody?: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export const InlineReplyComposer = ({
  to,
  subject,
  initialBody = '',
  onClose,
  onSuccess,
}: InlineReplyComposerProps) => {
  const [form, setForm] = useState<ComposeFormState>({
    ...defaultComposeState,
    to,
    subject,
    html: initialBody,
    text: initialBody ? (() => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = initialBody;
      return tempDiv.textContent || tempDiv.innerText || '';
    })() : '',
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const result = await submitComposeForm(form);
      setStatus({
        type: 'success',
        message: `${result.message}. Delivered to ${result.deliveredTo} recipient(s).`,
      });
      
      // Call onSuccess callback after a short delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      }, 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send email';
      setStatus({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: form.html,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';
      
      setForm((prev) => ({
        ...prev,
        html: html,
        text: plainText,
      }));
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] px-4 py-3 text-slate-900',
        'data-placeholder': 'Type your reply...',
      },
    },
  });

  // Focus the editor when component mounts
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      setTimeout(() => {
        editor.commands.focus();
      }, 100);
    }
  }, [editor]);

  useEffect(() => {
    if (editor && form.html !== editor.getHTML()) {
      editor.commands.setContent(form.html);
    }
  }, [form.html, editor]);

  const handleAddLink = () => {
    if (editor?.isActive('link')) {
      const attrs = editor.getAttributes('link');
      setLinkUrl(attrs.href || '');
    } else {
      setLinkUrl('');
    }
    setShowLinkDialog(true);
  };

  const handleLinkSubmit = () => {
    if (editor && linkUrl.trim()) {
      let url = linkUrl.trim();
      if (!url.match(/^https?:\/\//i)) {
        url = 'https://' + url;
      }
      editor.chain().focus().setLink({ href: url }).run();
      setShowLinkDialog(false);
      setLinkUrl('');
    }
  };

  const handleRemoveLink = () => {
    if (editor) {
      editor.chain().focus().unsetLink().run();
    }
  };

  return (
    <div ref={containerRef} className="border-t border-slate-200 bg-white">
      <form onSubmit={handleSubmit} className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-700">To:</span>
            <span className="text-slate-600">{to.join(', ')}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Subject */}
        <div className="border-b border-slate-200 px-4 py-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-700">Subject:</span>
            <span className="text-slate-600">{subject}</span>
          </div>
        </div>

        {/* Editor Toolbar */}
        {editor && (
          <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
                editor.isActive('bold') ? 'bg-blue-100 text-blue-700' : 'text-slate-600'
              }`}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
                editor.isActive('italic') ? 'bg-blue-100 text-blue-700' : 'text-slate-600'
              }`}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </button>
            <div className="w-px h-6 bg-slate-300 mx-1" />
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
                editor.isActive('bulletList') ? 'bg-blue-100 text-blue-700' : 'text-slate-600'
              }`}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
                editor.isActive('orderedList') ? 'bg-blue-100 text-blue-700' : 'text-slate-600'
              }`}
              title="Numbered List"
            >
              <List className="h-4 w-4" />
            </button>
            <div className="w-px h-6 bg-slate-300 mx-1" />
            <button
              type="button"
              onClick={handleAddLink}
              className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
                editor?.isActive('link') ? 'bg-blue-100 text-blue-700' : 'text-slate-600'
              }`}
              title="Add Link"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleRemoveLink}
              disabled={!editor?.isActive('link')}
              className="p-1.5 rounded hover:bg-slate-200 transition-colors text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Remove Link"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Editor Content */}
        <div className="bg-white">
          <EditorContent editor={editor} />
        </div>

        {/* Status Message */}
        {status.message && (
          <div
            className={`mx-4 mt-2 rounded-md border px-3 py-2 text-xs ${
              status.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {status.message}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sending…</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Send</span>
              </>
            )}
          </button>
        </div>

        {/* Link Dialog Modal */}
        {showLinkDialog && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowLinkDialog(false)}
          >
            <div 
              className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h3 className="text-lg font-semibold text-slate-900">Add Link</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkDialog(false);
                    setLinkUrl('');
                  }}
                  className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    URL
                  </label>
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleLinkSubmit();
                      }
                    }}
                    placeholder="https://example.com"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    autoFocus
                  />
                </div>
                
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLinkDialog(false);
                      setLinkUrl('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleLinkSubmit}
                    disabled={!linkUrl.trim()}
                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

