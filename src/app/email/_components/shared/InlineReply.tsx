'use client';

import { FormEvent, useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Paperclip, X, Loader2, Send, FileText, Bold, Italic, List, Link as LinkIcon } from 'lucide-react';
import {
  ComposeFormState,
  defaultComposeState,
  MAX_ATTACHMENTS,
  MAX_RECIPIENTS,
  submitComposeForm,
  updateAttachments,
} from '@/app/utils/Emails/Compose';
import { fetchEmailSuggestions, filterEmailSuggestions } from '@/app/utils/Emails/EmailSuggestions';
import { extractErrorInfo } from '@/app/utils/Errors/ApiError';
import { ErrorDisplay } from '@/app/utils/Errors/ErrorDisplay';

type InlineReplyProps = {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  initialBody?: string; // HTML body for forward
  initialAttachments?: File[]; // Attachments for forward
  mode?: 'reply' | 'forward'; // Mode to determine header text
  onClose: () => void;
  onSent?: () => void;
};

// Attachment Preview Component
const AttachmentPreview = ({ 
  file, 
  onRemove, 
  formatFileSize 
}: { 
  file: File; 
  onRemove: () => void;
  formatFileSize: (bytes: number) => string;
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isImage = file.type.startsWith('image/');

  useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file, isImage]);

  return (
    <div className="group relative rounded-lg border border-slate-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
      {isImage && previewUrl ? (
        <div className="aspect-video bg-slate-100 relative">
          <img
            src={previewUrl}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-video bg-slate-50 flex flex-col items-center justify-center p-4">
          <FileText className="h-12 w-12 text-slate-400 mb-2" />
          <p className="text-xs text-slate-500 text-center line-clamp-2 px-2">
            {file.name}
          </p>
        </div>
      )}
      
      <div className="p-3 border-t border-slate-100">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">
              {file.name}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {formatFileSize(file.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="flex-shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            aria-label="Remove attachment"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const InlineReply = ({ 
  to, 
  cc, 
  bcc, 
  subject, 
  initialBody,
  initialAttachments = [],
  mode = 'reply',
  onClose, 
  onSent 
}: InlineReplyProps) => {
  const [form, setForm] = useState<ComposeFormState>({
    ...defaultComposeState,
    to,
    cc,
    bcc,
    subject,
    html: initialBody || '',
    attachments: initialAttachments,
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });
  const [error, setError] = useState<unknown>(null);
  const [emailInput, setEmailInput] = useState('');
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);
  const [allEmailSuggestions, setAllEmailSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // CC and BCC states
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');
  const [showCc, setShowCc] = useState(cc.length > 0);
  const [showBcc, setShowBcc] = useState(bcc.length > 0);

  // Email validation helper
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Helper function to add email to a specific field
  const addEmailToField = (field: 'to' | 'cc' | 'bcc', email: string) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return false;

    if (!isValidEmail(trimmedEmail)) {
      setStatus({
        type: 'error',
        message: `"${trimmedEmail}" is not a valid email address.`,
      });
      return false;
    }

    const currentList = form[field];
    
    const existsInAnyField = form.to.includes(trimmedEmail) || 
                            form.cc.includes(trimmedEmail) || 
                            form.bcc.includes(trimmedEmail);
    
    if (existsInAnyField) {
      setStatus({
        type: 'error',
        message: `"${trimmedEmail}" is already added.`,
      });
      return false;
    }

    if (currentList.length >= MAX_RECIPIENTS) {
      setStatus({
        type: 'error',
        message: `Maximum ${MAX_RECIPIENTS} recipients allowed.`,
      });
      return false;
    }

    setForm((prev) => ({
      ...prev,
      [field]: [...prev[field], trimmedEmail],
    }));
    setStatus({ type: null, message: '' });
    return true;
  };

  const addEmail = (email: string) => {
    if (addEmailToField('to', email)) {
      setEmailInput('');
    }
  };

  const addCc = (email: string) => {
    if (addEmailToField('cc', email)) {
      setCcInput('');
    }
  };

  const addBcc = (email: string) => {
    if (addEmailToField('bcc', email)) {
      setBccInput('');
    }
  };

  const removeEmail = (field: 'to' | 'cc' | 'bcc', index: number) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const selectSuggestion = (email: string) => {
    addEmail(email);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    emailInputRef.current?.focus();
  };

  const handleEmailInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (showSuggestions && selectedSuggestionIndex >= 0 && emailSuggestions[selectedSuggestionIndex]) {
        selectSuggestion(emailSuggestions[selectedSuggestionIndex]);
      } else if (emailInput.trim()) {
        addEmail(emailInput);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (showSuggestions && emailSuggestions.length > 0) {
        setSelectedSuggestionIndex(prev => 
          prev < emailSuggestions.length - 1 ? prev + 1 : prev
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (showSuggestions) {
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    } else if (e.key === 'Backspace' && !emailInput && form.to.length > 0) {
      e.preventDefault();
      const lastEmail = form.to[form.to.length - 1];
      setEmailInput(lastEmail);
      removeEmail('to', form.to.length - 1);
    }
  };

  useEffect(() => {
    fetchEmailSuggestions().then(setAllEmailSuggestions);
  }, []);

  useEffect(() => {
    if (emailInput.trim() && !emailInput.includes('@')) {
      const filtered = filterEmailSuggestions(allEmailSuggestions, emailInput, form.to);
      setEmailSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedSuggestionIndex(-1);
    } else {
      setEmailSuggestions([]);
      setShowSuggestions(false);
    }
  }, [emailInput, allEmailSuggestions, form.to]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        emailInputRef.current &&
        !emailInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  const handleEmailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmailInput(value);

    if (status.type === 'error') {
      setStatus({ type: null, message: '' });
    }

    if (value.includes(',')) {
      const parts = value.split(',');
      const emailToAdd = parts[0].trim();
      if (emailToAdd) {
        addEmail(emailToAdd);
        setEmailInput(parts.slice(1).join(',').trim());
      } else {
        setEmailInput(parts.slice(1).join(',').trim());
      }
    }
  };

  const handleEmailInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const emails = pastedText
      .split(/[,;\n]/)
      .map(email => email.trim())
      .filter(email => email.length > 0);

    if (emails.length > 0) {
      emails.forEach(email => {
        if (isValidEmail(email) && !form.to.includes(email) && form.to.length < MAX_RECIPIENTS) {
          setForm((prev) => ({
            ...prev,
            to: [...prev.to, email],
          }));
        }
      });
      setEmailInput('');
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
    content: initialBody || '',
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
        'data-placeholder': mode === 'forward' ? 'Add a note (optional)...' : 'Write your reply...',
      },
    },
  });

  // Update editor content when initialBody changes
  useEffect(() => {
    if (editor && initialBody && editor.getHTML() !== initialBody) {
      editor.commands.setContent(initialBody);
    }
  }, [editor, initialBody]);

  // Auto-focus: body editor for reply, "To" input for forward
  useEffect(() => {
    // Small delay to ensure the component is fully rendered
    const timer = setTimeout(() => {
      if (mode === 'reply') {
        // For reply, focus the body editor
        if (editor) {
          editor.commands.focus();
        }
      } else {
        // For forward, focus the "To" email input field
        emailInputRef.current?.focus();
      }
    }, 150);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setStatus({ type: null, message: '' });
    setError(null);

    try {
      const result = await submitComposeForm(form);
      setStatus({
        type: 'success',
        message: `${result.message}. Delivered to ${result.deliveredTo} recipient(s).`,
      });
      if (onSent) {
        setTimeout(() => {
          onSent();
        }, 1500);
      }
    } catch (err) {
      setError(err);
      const { message } = extractErrorInfo(err);
      setStatus({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    setForm((prev) => updateAttachments(prev, files));
  };

  const removeAttachment = (index: number) => {
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="border-t border-slate-200 bg-white">
      <form onSubmit={handleSubmit} className="flex flex-col">
        {/* Compact Header */}
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-700">
            {mode === 'forward' 
              ? `Forward to ${form.to.length > 0 ? form.to[0] : 'recipient'}`
              : `Reply to ${form.to[0] || 'recipient'}`}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close reply"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-3 px-4 py-3 max-h-[600px]">
          {/* Recipients - Compact */}
          <div className="relative">
            <div className="w-full rounded-md border border-slate-300 bg-white overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
              {/* To Field */}
              <div className="px-3 py-2 text-sm text-slate-900 min-h-[38px] flex flex-wrap gap-2 items-center border-b border-slate-200">
                <span className="text-xs font-medium text-slate-500 min-w-[35px]">To:</span>
                <div className="flex-1 flex flex-wrap gap-2 items-center">
                  {form.to.map((email, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium border border-blue-200"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => removeEmail('to', index)}
                        className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                        aria-label={`Remove ${email}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={emailInputRef}
                    type="text"
                    placeholder={form.to.length === 0 ? "recipient@example.com" : ""}
                    className="flex-1 min-w-[150px] outline-none bg-transparent placeholder:text-slate-400 text-sm"
                    value={emailInput}
                    onChange={handleEmailInputChange}
                    onKeyDown={handleEmailInputKeyDown}
                    onPaste={handleEmailInputPaste}
                    required={form.to.length === 0}
                  />
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {!showCc && (
                    <button
                      type="button"
                      onClick={() => setShowCc(true)}
                      className="text-xs font-medium text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button
                      type="button"
                      onClick={() => setShowBcc(true)}
                      className="text-xs font-medium text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      Bcc
                    </button>
                  )}
                </div>
              </div>

              {/* CC Field */}
              {(showCc || form.cc.length > 0) && (
                <div className="px-3 py-2 text-sm text-slate-900 min-h-[38px] flex flex-wrap gap-2 items-center border-b border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-2 min-w-[35px]">
                    <span className="text-xs font-medium text-slate-500">Cc:</span>
                    {(showCc || form.cc.length > 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (form.cc.length === 0) {
                            setShowCc(false);
                          }
                          setCcInput('');
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                        disabled={form.cc.length > 0}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 flex flex-wrap gap-2 items-center">
                    {form.cc.map((email, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs font-medium border border-slate-200"
                      >
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => removeEmail('cc', index)}
                          className="hover:bg-slate-200 rounded-full p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder={form.cc.length === 0 ? "cc@example.com" : ""}
                      className="flex-1 min-w-[150px] outline-none bg-transparent placeholder:text-slate-400 text-sm"
                      value={ccInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCcInput(value);
                        if (value.includes(',')) {
                          const parts = value.split(',');
                          const emailToAdd = parts[0].trim();
                          if (emailToAdd) {
                            addCc(emailToAdd);
                            setCcInput(parts.slice(1).join(',').trim());
                          } else {
                            setCcInput(parts.slice(1).join(',').trim());
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (ccInput.trim()) {
                            addCc(ccInput);
                          }
                        } else if (e.key === 'Backspace' && !ccInput && form.cc.length > 0) {
                          e.preventDefault();
                          const lastEmail = form.cc[form.cc.length - 1];
                          setCcInput(lastEmail);
                          removeEmail('cc', form.cc.length - 1);
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* BCC Field */}
              {(showBcc || form.bcc.length > 0) && (
                <div className="px-3 py-2 text-sm text-slate-900 min-h-[38px] flex flex-wrap gap-2 items-center bg-slate-50/50">
                  <div className="flex items-center gap-2 min-w-[35px]">
                    <span className="text-xs font-medium text-slate-500">Bcc:</span>
                    {(showBcc || form.bcc.length > 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (form.bcc.length === 0) {
                            setShowBcc(false);
                          }
                          setBccInput('');
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                        disabled={form.bcc.length > 0}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 flex flex-wrap gap-2 items-center">
                    {form.bcc.map((email, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs font-medium border border-slate-200"
                      >
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => removeEmail('bcc', index)}
                          className="hover:bg-slate-200 rounded-full p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder={form.bcc.length === 0 ? "bcc@example.com" : ""}
                      className="flex-1 min-w-[150px] outline-none bg-transparent placeholder:text-slate-400 text-sm"
                      value={bccInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        setBccInput(value);
                        if (value.includes(',')) {
                          const parts = value.split(',');
                          const emailToAdd = parts[0].trim();
                          if (emailToAdd) {
                            addBcc(emailToAdd);
                            setBccInput(parts.slice(1).join(',').trim());
                          } else {
                            setBccInput(parts.slice(1).join(',').trim());
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (bccInput.trim()) {
                            addBcc(bccInput);
                          }
                        } else if (e.key === 'Backspace' && !bccInput && form.bcc.length > 0) {
                          e.preventDefault();
                          const lastEmail = form.bcc[form.bcc.length - 1];
                          setBccInput(lastEmail);
                          removeEmail('bcc', form.bcc.length - 1);
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Email Suggestions Dropdown */}
            {showSuggestions && emailSuggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg max-h-60 overflow-auto"
              >
                {emailSuggestions.map((email, index) => (
                  <button
                    key={email}
                    type="button"
                    onClick={() => selectSuggestion(email)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${
                      index === selectedSuggestionIndex ? 'bg-blue-50 text-blue-700' : 'text-slate-900'
                    }`}
                  >
                    {email}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subject Field */}
          <div>
            <input
              type="text"
              placeholder="Subject"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={form.subject}
              onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value }))}
              required
            />
          </div>

          {/* Rich Text Editor - Compact */}
          <div>
            <div className="rounded-md border border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 overflow-hidden">
              {editor && (
                <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1">
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-1 rounded hover:bg-slate-200 transition-colors ${
                      editor.isActive('bold') ? 'bg-blue-100 text-blue-700' : 'text-slate-600'
                    }`}
                    title="Bold"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-1 rounded hover:bg-slate-200 transition-colors ${
                      editor.isActive('italic') ? 'bg-blue-100 text-blue-700' : 'text-slate-600'
                    }`}
                    title="Italic"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-1 rounded hover:bg-slate-200 transition-colors ${
                      editor.isActive('bulletList') ? 'bg-blue-100 text-blue-700' : 'text-slate-600'
                    }`}
                    title="Bullet List"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="bg-white">
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>

          {/* Attachments - Compact */}
          {form.attachments.length > 0 && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {form.attachments.map((file, index) => (
                  <AttachmentPreview
                    key={index}
                    file={file}
                    onRemove={() => removeAttachment(index)}
                    formatFileSize={formatFileSize}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Status Message */}
          {status.type === 'success' && status.message && (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {status.message}
            </div>
          )}
          
          {error !== null && <ErrorDisplay error={error} className="mt-2" />}
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            <Paperclip className="h-4 w-4" />
            <span>Attach</span>
            <input
              type="file"
              multiple
              onChange={handleAttachmentChange}
              className="hidden"
              accept="*/*"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
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
        </div>
      </form>
    </div>
  );
};

