'use client';

import { FormEvent, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Paperclip, X, Loader2, Send, FileText, Bold, Italic, List, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
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

const helperText = `Up to ${MAX_RECIPIENTS} recipients and ${MAX_ATTACHMENTS} attachments per email.`;

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
  const Icon = isImage ? ImageIcon : FileText;

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
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>
      ) : (
        <div className="aspect-video bg-slate-50 flex flex-col items-center justify-center p-4">
          <Icon className="h-12 w-12 text-slate-400 mb-2" />
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

const ComposeEmailForm = () => {
  const searchParams = useSearchParams();
  const [form, setForm] = useState<ComposeFormState>(defaultComposeState);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });
  const [error, setError] = useState<unknown>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);
  const [allEmailSuggestions, setAllEmailSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const replyDataProcessedRef = useRef(false);
  
  // CC and BCC states
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  
  // Domain suggestions states
  const [showDomainSuggestions, setShowDomainSuggestions] = useState(false);
  const [domainSuggestions, setDomainSuggestions] = useState<string[]>([]);
  const [selectedDomainIndex, setSelectedDomainIndex] = useState(-1);
  const [domainInputPrefix, setDomainInputPrefix] = useState('');
  const domainSuggestionsRef = useRef<HTMLDivElement>(null);
  
  // Common email domains
  const commonDomains = [
    'gmail.com',
    'yahoo.com',
    'outlook.com',
    'hotmail.com',
    'icloud.com',
    'protonmail.com',
    'aol.com',
    'mail.com',
    'live.com',
    'msn.com',
    'yandex.com',
    'zoho.com',
    'gmx.com',
  ];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setLoading(true);
    setStatus({ type: null, message: '' });
    setError(null);

    try {
      const result = await submitComposeForm(form);
      setStatus({
        type: 'success',
        message: `${result.message}. Delivered to ${result.deliveredTo} recipient(s).`,
      });
      setForm(defaultComposeState);
      setEmailInput('');
      setCcInput('');
      setBccInput('');
      formElement.reset();
      if (editor) {
        editor.commands.clearContent();
      }
    } catch (err) {
      setError(err);
      const { message } = extractErrorInfo(err);
      setStatus({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ComposeFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Email validation helper
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Check if string looks like it ends with a domain (e.g., "gmail.com")
  const endsWithDomain = (str: string): boolean => {
    const domainRegex = /@[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/;
    return domainRegex.test(str.trim());
  };
  
  // Get domain suggestions based on input after @
  const getDomainSuggestions = (input: string): { prefix: string; suggestions: string[] } => {
    const atIndex = input.lastIndexOf('@');
    if (atIndex === -1 || atIndex === input.length - 1) {
      return { prefix: '', suggestions: [] };
    }
    
    const prefix = input.substring(0, atIndex + 1); // Include "@"
    const domainPart = input.substring(atIndex + 1).toLowerCase();
    
    // Don't show suggestions if there's already a dot and it looks like a complete domain
    if (domainPart.includes('.') && domainPart.split('.').length > 1) {
      const parts = domainPart.split('.');
      const lastPart = parts[parts.length - 1];
      // If last part is 2+ characters, probably complete domain
      if (lastPart.length >= 2) {
        return { prefix: '', suggestions: [] };
      }
    }
    
    const filtered = commonDomains.filter(domain => 
      domain.startsWith(domainPart)
    );
    
    return { prefix, suggestions: filtered };
  };
  
  // Handle domain suggestion selection
  const selectDomainSuggestion = (prefix: string, domain: string, field: 'to' | 'cc' | 'bcc') => {
    const completeEmail = prefix + domain;
    
    if (field === 'to') {
      setEmailInput(completeEmail);
      emailInputRef.current?.focus();
      // Move cursor to end
      setTimeout(() => {
        if (emailInputRef.current) {
          emailInputRef.current.setSelectionRange(completeEmail.length, completeEmail.length);
        }
      }, 0);
    } else if (field === 'cc') {
      setCcInput(completeEmail);
    } else if (field === 'bcc') {
      setBccInput(completeEmail);
    }
    
    setShowDomainSuggestions(false);
    setDomainSuggestions([]);
    setSelectedDomainIndex(-1);
    setDomainInputPrefix('');
  };

  // Helper function to add email to a specific field (to, cc, bcc)
  const addEmailToField = (field: 'to' | 'cc' | 'bcc', email: string) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return false;

    // Validate email format
    if (!isValidEmail(trimmedEmail)) {
      setStatus({
        type: 'error',
        message: `"${trimmedEmail}" is not a valid email address.`,
      });
      return false;
    }

    const currentList = form[field];
    
    // Check if email already exists in any recipient field
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

    // Check max recipients limit
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

  // Add email to the list (for "To" field)
  const addEmail = (email: string) => {
    if (addEmailToField('to', email)) {
      setEmailInput('');
    }
  };

  // Add email to CC
  const addCc = (email: string) => {
    if (addEmailToField('cc', email)) {
      setCcInput('');
    }
  };

  // Add email to BCC
  const addBcc = (email: string) => {
    if (addEmailToField('bcc', email)) {
      setBccInput('');
    }
  };

  // Remove email from the list
  const removeEmail = (field: 'to' | 'cc' | 'bcc', index: number) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  // Handle selecting a suggestion
  const selectSuggestion = (email: string) => {
    addEmail(email);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    emailInputRef.current?.focus();
  };

  // Handle email input key events
  const handleEmailInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (showDomainSuggestions && selectedDomainIndex >= 0 && domainSuggestions[selectedDomainIndex]) {
        // Select highlighted domain suggestion
        selectDomainSuggestion(domainInputPrefix, domainSuggestions[selectedDomainIndex], 'to');
      } else if (showSuggestions && selectedSuggestionIndex >= 0 && emailSuggestions[selectedSuggestionIndex]) {
        // Select highlighted suggestion
        selectSuggestion(emailSuggestions[selectedSuggestionIndex]);
      } else if (emailInput.trim()) {
        // Add the typed email
        addEmail(emailInput);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (showDomainSuggestions && domainSuggestions.length > 0) {
        setSelectedDomainIndex(prev => 
          prev < domainSuggestions.length - 1 ? prev + 1 : 0
        );
      } else if (showSuggestions && emailSuggestions.length > 0) {
        setSelectedSuggestionIndex(prev => 
          prev < emailSuggestions.length - 1 ? prev + 1 : prev
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (showDomainSuggestions) {
        setSelectedDomainIndex(prev => prev > 0 ? prev - 1 : domainSuggestions.length - 1);
      } else if (showSuggestions) {
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setShowDomainSuggestions(false);
      setSelectedSuggestionIndex(-1);
      setSelectedDomainIndex(-1);
    } else if (e.key === 'Backspace' && !emailInput && form.to.length > 0) {
      // Put last email back into input for editing instead of removing
      e.preventDefault();
      const lastEmail = form.to[form.to.length - 1];
      setEmailInput(lastEmail);
      removeEmail('to', form.to.length - 1);
    }
  };

  // Load email suggestions on mount - using cached version
  useEffect(() => {
    fetchEmailSuggestions().then(setAllEmailSuggestions);
    // Note: fetchEmailSuggestions now uses caching, so it won't refetch unnecessarily
  }, []);

  // Update suggestions when email input changes
  useEffect(() => {
    // Check for domain suggestions first (after @)
    const domainData = getDomainSuggestions(emailInput);
    if (domainData.suggestions.length > 0 && emailInput.includes('@') && !emailInput.includes(' ')) {
      setDomainSuggestions(domainData.suggestions);
      setDomainInputPrefix(domainData.prefix);
      setShowDomainSuggestions(true);
      setShowSuggestions(false);
      setSelectedDomainIndex(-1);
      setSelectedSuggestionIndex(-1);
    } else if (emailInput.trim() && !emailInput.includes('@')) {
      // Only show email suggestions if there's no @
      setShowDomainSuggestions(false);
      const filtered = filterEmailSuggestions(allEmailSuggestions, emailInput, form.to);
      setEmailSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedSuggestionIndex(-1);
      setSelectedDomainIndex(-1);
    } else {
      setEmailSuggestions([]);
      setShowSuggestions(false);
      setShowDomainSuggestions(false);
      setDomainSuggestions([]);
    }
  }, [emailInput, allEmailSuggestions, form.to]);

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        domainSuggestionsRef.current &&
        !domainSuggestionsRef.current.contains(event.target as Node) &&
        emailInputRef.current &&
        !emailInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setShowDomainSuggestions(false);
      }
    };

    if (showSuggestions || showDomainSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions, showDomainSuggestions]);

  // Handle email input change
  const handleEmailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmailInput(value);

    // Clear error status when user starts typing
    if (status.type === 'error') {
      setStatus({ type: null, message: '' });
    }

    // Check for comma separator
    if (value.includes(',')) {
      const parts = value.split(',');
      const emailToAdd = parts[0].trim();
      if (emailToAdd) {
        addEmail(emailToAdd);
        // Set remaining text after comma as new input value
        const remaining = parts.slice(1).join(',').trim();
        setEmailInput(remaining);
      } else {
        // Just remove the comma if there's no email before it
        setEmailInput(parts.slice(1).join(',').trim());
      }
    }
    // Check for space after domain (e.g., "user@gmail.com ")
    else if (value.endsWith(' ') && endsWithDomain(value.slice(0, -1))) {
      const emailToAdd = value.slice(0, -1).trim();
      if (emailToAdd) {
        addEmail(emailToAdd);
      }
    }
  };

  // Handle paste event to support pasting multiple emails
  const handleEmailInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Split by comma, semicolon, or newline
    const emails = pastedText
      .split(/[,;\n]/)
      .map(email => email.trim())
      .filter(email => email.length > 0);

    if (emails.length > 0) {
      // Add all valid emails
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
    content: form.html,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Extract plain text from HTML for the text field
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
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3 text-slate-900',
        'data-placeholder': 'Compose your email...',
      },
    },
  });

  // Update editor content when form.html changes externally
  useEffect(() => {
    if (editor && form.html !== editor.getHTML()) {
      // For reply action, ensure editor is cleared even if form.html is empty
      const action = searchParams.get('action');
      if (action === 'reply' && !form.html) {
        editor.commands.clearContent();
      } else {
        editor.commands.setContent(form.html);
      }
    }
  }, [form.html, editor, searchParams]);

  // Handle URL search params for Reply and Forward
  useEffect(() => {
    const action = searchParams.get('action');
    
    // Only process reply/forward data once per action change
    if (!action || replyDataProcessedRef.current) {
      return;
    }
    
    const to = searchParams.get('to');
    const subject = searchParams.get('subject');
    
    // Get body from sessionStorage (stored to avoid URL length issues)
    const body = sessionStorage.getItem('compose_body');
    
    // Get reply data from sessionStorage
    const replyDataStr = sessionStorage.getItem('compose_reply_data');

    if (action === 'reply' || action === 'forward') {
      // Mark as processed
      replyDataProcessedRef.current = true;
      
      // Pre-fill form with reply/forward data
      const newForm: ComposeFormState = {
        ...defaultComposeState,
        subject: subject || '',
      };

      if (action === 'reply') {
        // Handle reply - get data from sessionStorage
        if (replyDataStr) {
          try {
            const replyData = JSON.parse(replyDataStr);
            
            // Debug: Log the reply data being read
            console.log('Reply data being read from sessionStorage:', replyData);
            
            // Ensure arrays are valid
            newForm.to = Array.isArray(replyData.to) && replyData.to.length > 0 ? replyData.to : [];
            newForm.cc = Array.isArray(replyData.cc) ? replyData.cc : [];
            newForm.bcc = Array.isArray(replyData.bcc) ? replyData.bcc : [];
            newForm.subject = replyData.subject || subject || '';
            
            // Validate that we have at least a "to" email
            if (newForm.to.length === 0) {
              console.error('No recipient email found in reply data');
              // Try fallback
              if (to) {
                newForm.to = [to];
              }
            }
            
            // Validate subject
            if (!newForm.subject) {
              console.error('No subject found in reply data');
            }
            
            // Show CC/BCC fields if they have values
            if (newForm.cc.length > 0) {
              setShowCc(true);
            }
            if (newForm.bcc.length > 0) {
              setShowBcc(true);
            }
            
            // Clear sessionStorage after reading
            sessionStorage.removeItem('compose_reply_data');
          } catch (e) {
            console.error('Error parsing reply data:', e);
            // Fallback to URL params if parsing fails
            if (to) {
              newForm.to = [to];
              newForm.subject = subject || '';
            }
          }
        } else if (to) {
          // Fallback to old method if replyData not found
          newForm.to = [to];
          newForm.subject = subject || '';
        }
        
        // For reply, ensure body is always empty (user types fresh reply)
        newForm.html = '';
        newForm.text = '';
      } else if (action === 'forward') {
        // For forward, add the body content from sessionStorage
        if (body) {
          newForm.html = body;
          // Extract plain text from HTML
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = body;
          newForm.text = tempDiv.textContent || tempDiv.innerText || '';
          
          // Clear sessionStorage after reading
          sessionStorage.removeItem('compose_body');
        }
        
        // Load and convert attachments from sessionStorage
        const attachmentsDataStr = sessionStorage.getItem('compose_forward_attachments');
        if (attachmentsDataStr) {
          try {
            const attachmentsData = JSON.parse(attachmentsDataStr);
            
            // Helper function to convert base64 to File object
            const base64ToFile = (base64: string, filename: string, mimeType: string): File => {
              // Normalize base64 (handle URL-safe base64)
              const normalizedBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');
              
              // Convert base64 to binary
              const byteCharacters = atob(normalizedBase64);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: mimeType });
              
              return new File([blob], filename, { type: mimeType });
            };
            
            // Convert all attachments to File objects
            const attachmentFiles: File[] = [];
            for (const att of attachmentsData) {
              if (att.contentBase64) {
                try {
                  const file = base64ToFile(att.contentBase64, att.filename, att.mimeType);
                  attachmentFiles.push(file);
                } catch (e) {
                  console.error(`Error converting attachment ${att.filename}:`, e);
                }
              }
            }
            
            // Add attachments to form (respecting MAX_ATTACHMENTS limit)
            newForm.attachments = attachmentFiles.slice(0, MAX_ATTACHMENTS);
            
            // Clear sessionStorage after reading
            sessionStorage.removeItem('compose_forward_attachments');
          } catch (e) {
            console.error('Error parsing forward attachments data:', e);
            sessionStorage.removeItem('compose_forward_attachments');
          }
        }
      }

      // Update form state
      setForm(newForm);
      
      // Update editor if it exists
      if (editor) {
        if (action === 'forward' && body) {
          editor.commands.setContent(body);
        } else if (action === 'reply') {
          // For reply, always clear the editor (empty body)
          editor.commands.clearContent();
        }
      }
    }
  }, [searchParams, editor]);
  
  // Reset the processed flag when action changes
  useEffect(() => {
    const action = searchParams.get('action');
    if (!action) {
      replyDataProcessedRef.current = false;
    }
  }, [searchParams]);

  // Handle Escape key to close link dialog
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showLinkDialog) {
        setShowLinkDialog(false);
        setLinkUrl('');
      }
    };

    if (showLinkDialog) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showLinkDialog]);

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

  const handleAddLink = () => {
    // Get current selected text or use empty string
    const selectedText = editor?.state.selection.empty 
      ? '' 
      : editor?.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to);
    
    // If there's a link already, get its URL
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
      // Ensure URL has protocol
      let url = linkUrl.trim();
      if (!url.match(/^https?:\/\//i)) {
        url = 'https://' + url;
      }
      
      editor.chain().focus().setLink({ href: url }).run();
      setShowLinkDialog(false);
      setLinkUrl('');
    }
  };

  const handleLinkKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLinkSubmit();
    }
  };

  const handleRemoveLink = () => {
    if (editor) {
      editor.chain().focus().unsetLink().run();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-6 px-6 pb-4">
        {/* Recipients Field (To, Cc, Bcc) */}
        <div className="relative">
          <label className="mb-2 block text-sm font-medium text-slate-900">
            To
          </label>
          
          <div className="w-full rounded-md border border-slate-300 bg-white overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
            {/* To Field */}
            <div className="px-3 py-2 text-sm text-slate-900 min-h-[42px] flex flex-wrap gap-2 items-center border-b border-slate-200">
              <span className="text-xs font-medium text-slate-500 min-w-[40px]">To:</span>
              <div className="flex-1 flex flex-wrap gap-2 items-center">
                {form.to.map((email, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 px-2.5 py-1 text-xs font-medium border border-blue-200"
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
                  className="flex-1 min-w-[200px] outline-none bg-transparent placeholder:text-slate-400"
                  value={emailInput}
                  onChange={handleEmailInputChange}
                  onKeyDown={handleEmailInputKeyDown}
                  onPaste={handleEmailInputPaste}
                  onFocus={() => {
                    if (emailInput.trim() && emailSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  required={form.to.length === 0}
                />
              </div>
              <div className="flex items-center gap-3 ml-2">
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
              <div className="px-3 py-2 text-sm text-slate-900 min-h-[42px] flex flex-wrap gap-2 items-center border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2 min-w-[40px]">
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
                      aria-label="Hide Cc"
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
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 text-xs font-medium border border-slate-200"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => removeEmail('cc', index)}
                      className="hover:bg-slate-200 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${email}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder={form.cc.length === 0 ? "cc@example.com" : ""}
                  className="flex-1 min-w-[200px] outline-none bg-transparent placeholder:text-slate-400"
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
                    } else if (value.endsWith(' ') && endsWithDomain(value.slice(0, -1))) {
                      addCc(value.slice(0, -1).trim());
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
                  onPaste={(e) => {
                    e.preventDefault();
                    const pastedText = e.clipboardData.getData('text');
                    const emails = pastedText.split(/[,;\n]/).map(email => email.trim()).filter(email => email.length > 0);
                    emails.forEach(email => {
                      if (isValidEmail(email) && !form.cc.includes(email) && !form.to.includes(email) && !form.bcc.includes(email) && form.cc.length < MAX_RECIPIENTS) {
                        addEmailToField('cc', email);
                      }
                    });
                    setCcInput('');
                  }}
                />
              </div>
              </div>
            )}

            {/* BCC Field */}
            {(showBcc || form.bcc.length > 0) && (
              <div className="px-3 py-2 text-sm text-slate-900 min-h-[42px] flex flex-wrap gap-2 items-center bg-slate-50/50">
                <div className="flex items-center gap-2 min-w-[40px]">
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
                      aria-label="Hide Bcc"
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
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 text-xs font-medium border border-slate-200"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => removeEmail('bcc', index)}
                      className="hover:bg-slate-200 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${email}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder={form.bcc.length === 0 ? "bcc@example.com" : ""}
                  className="flex-1 min-w-[200px] outline-none bg-transparent placeholder:text-slate-400"
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
                    } else if (value.endsWith(' ') && endsWithDomain(value.slice(0, -1))) {
                      addBcc(value.slice(0, -1).trim());
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
                  onPaste={(e) => {
                    e.preventDefault();
                    const pastedText = e.clipboardData.getData('text');
                    const emails = pastedText.split(/[,;\n]/).map(email => email.trim()).filter(email => email.length > 0);
                    emails.forEach(email => {
                      if (isValidEmail(email) && !form.bcc.includes(email) && !form.to.includes(email) && !form.cc.includes(email) && form.bcc.length < MAX_RECIPIENTS) {
                        addEmailToField('bcc', email);
                      }
                    });
                    setBccInput('');
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
          
          {/* Domain Suggestions Dropdown */}
          {showDomainSuggestions && domainSuggestions.length > 0 && (
            <div
              ref={domainSuggestionsRef}
              className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg max-h-60 overflow-auto"
            >
              {domainSuggestions.map((domain, index) => (
                <button
                  key={domain}
                  type="button"
                  onClick={() => selectDomainSuggestion(domainInputPrefix, domain, 'to')}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${
                    index === selectedDomainIndex ? 'bg-blue-50 text-blue-700' : 'text-slate-900'
                  }`}
                >
                  {domainInputPrefix}{domain}
                </button>
              ))}
            </div>
          )}
          <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
        </div>

        {/* Subject Field */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">
            Subject
          </label>
          <input
            type="text"
            placeholder="Project update"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={form.subject}
            onChange={handleInputChange('subject')}
            required
          />
        </div>

        {/* Rich Text Editor */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">
            Body
          </label>
          <div className="rounded-md border border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 overflow-hidden">
            {/* Toolbar */}
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
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  disabled={!editor.can().chain().focus().toggleStrike().run()}
                  className={`px-2 py-1.5 rounded hover:bg-slate-200 transition-colors text-sm font-semibold ${
                    editor.isActive('strike') ? 'bg-blue-100 text-blue-700' : 'text-slate-600'
                  }`}
                  title="Strikethrough"
                >
                  S̶
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
          </div>
        </div>

        {/* Attachments */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">
            Attachments
          </label>
          <div className="space-y-3">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 transition-colors hover:border-blue-400 hover:bg-blue-50/50">
              <input
                type="file"
                multiple
                onChange={handleAttachmentChange}
                className="hidden"
                accept="*/*"
              />
              <Paperclip className="mb-2 h-8 w-8 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">
                Click to attach files
              </span>
              <span className="mt-1 text-xs text-slate-500">
                Maximum {MAX_ATTACHMENTS} files
              </span>
            </label>

            {form.attachments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {form.attachments.map((file, index) => (
                  <AttachmentPreview
                    key={index}
                    file={file}
                    onRemove={() => removeAttachment(index)}
                    formatFileSize={formatFileSize}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status Message */}
        {status.type === 'success' && status.message && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {status.message}
          </div>
        )}
        
        {/* Error Display */}
        {error !== null && <ErrorDisplay error={error} className="mt-2" />}

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
                    onKeyDown={handleLinkKeyDown}
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
      </div>

      {/* Action Buttons - Fixed at bottom */}
      <div className="flex-shrink-0 flex items-center justify-end gap-3 border-t border-slate-200 bg-white pt-4 pb-4 mt-auto px-6">
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
              <span>Send Email</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export const ComposeEmailView = () => (
  <div className="flex h-full flex-col bg-white overflow-hidden">
    {/* Header */}
    <header className="flex-shrink-0 border-b border-slate-200 bg-white px-6 py-4">
      <h1 className="text-xl font-semibold text-slate-900">Compose Email</h1>
      <p className="mt-1 text-sm text-slate-600">
        Draft a new email, attach files, and send through the connected Gmail account.
      </p>
    </header>

    {/* Form Content - Scrollable Area */}
    <div className="flex-1 min-h-0 overflow-hidden">
      <ComposeEmailForm />
    </div>
  </div>
);

const ComposeEmailPage = () => <ComposeEmailView />;

export default ComposeEmailPage;

