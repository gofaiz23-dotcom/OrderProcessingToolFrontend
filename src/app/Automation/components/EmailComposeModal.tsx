'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Minimize2, Maximize2, Send, Paperclip, Bold, Italic, Underline, Link, Smile, Image, MoreVertical, Trash2 } from 'lucide-react';
import { getCachedOrder } from '../utils/ltlOrderCache';

type EmailComposeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  defaultTo?: string;
  defaultCc?: string | string[];
  defaultSubject?: string;
  defaultBody?: string;
};

export const EmailComposeModal = ({
  isOpen,
  onClose,
  orderId,
  defaultTo = '',
  defaultCc = '',
  defaultSubject = '',
  defaultBody = '',
}: EmailComposeModalProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Initialize CC from defaultCc prop and load saved CC emails
  useEffect(() => {
    if (isOpen) {
      // First, try to use defaultCc prop if provided
      if (defaultCc) {
        const ccValue = Array.isArray(defaultCc) ? defaultCc.join(', ') : defaultCc;
        if (ccValue.trim()) {
          setCc(ccValue);
          setShowCc(true);
          return; // Don't load from localStorage if defaultCc is provided
        }
      }
      
      // If no defaultCc, try to load saved CC emails from localStorage
      const savedCC = localStorage.getItem('email_cc_addresses');
      if (savedCC) {
        try {
          const parsedCC = JSON.parse(savedCC);
          if (Array.isArray(parsedCC) && parsedCC.length > 0) {
            setCc(parsedCC.join(', '));
            setShowCc(true);
          }
        } catch (e) {
          console.error('Error parsing saved CC emails:', e);
        }
      }
    }
  }, [isOpen, defaultCc]);

  // Save CC emails to localStorage when they change
  useEffect(() => {
    if (cc.trim()) {
      const ccEmails = cc.split(',').map(email => email.trim()).filter(email => email.length > 0);
      if (ccEmails.length > 0) {
        localStorage.setItem('email_cc_addresses', JSON.stringify(ccEmails));
      }
    }
  }, [cc]);

  // Load BOL files from cache when modal opens
  useEffect(() => {
    if (isOpen && orderId) {
      const cachedOrder = getCachedOrder(orderId);
      if (cachedOrder) {
        const bolFiles: File[] = [];
        
        // Get XPO BOL files
        if (cachedOrder.xpoBolFiles && cachedOrder.xpoBolFiles.length > 0) {
          bolFiles.push(...cachedOrder.xpoBolFiles);
        }
        
        // Get Estes BOL files
        if (cachedOrder.estesBolFiles && cachedOrder.estesBolFiles.length > 0) {
          bolFiles.push(...cachedOrder.estesBolFiles);
        }
        
        if (bolFiles.length > 0) {
          setAttachments(bolFiles);
          console.log('✅ Loaded BOL files from cache:', bolFiles.map(f => f.name));
        }
      }
    }
  }, [isOpen, orderId]);

  // Initialize editor content
  useEffect(() => {
    if (isOpen && editorRef.current) {
      if (defaultBody) {
        // Convert plain text to HTML, preserving line breaks
        const htmlBody = defaultBody.replace(/\n/g, '<br>');
        editorRef.current.innerHTML = htmlBody;
        setIsEditorEmpty(!defaultBody.trim());
      } else {
        editorRef.current.innerHTML = '';
        setIsEditorEmpty(true);
      }
    }
  }, [isOpen, defaultBody]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showEmojiPicker && !(e.target as Element).closest('.emoji-picker-container')) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

  // Formatting functions
  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleBold = (e: React.MouseEvent) => {
    e.stopPropagation();
    formatText('bold');
  };

  const handleItalic = (e: React.MouseEvent) => {
    e.stopPropagation();
    formatText('italic');
  };

  const handleUnderline = (e: React.MouseEvent) => {
    e.stopPropagation();
    formatText('underline');
  };

  const handleInsertLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';
    setLinkText(selectedText);
    setShowLinkDialog(true);
  };

  const handleInsertLinkConfirm = () => {
    if (linkUrl.trim()) {
      const text = linkText.trim() || linkUrl.trim();
      formatText('createLink', linkUrl.trim());
      setShowLinkDialog(false);
      setLinkUrl('');
      setLinkText('');
    }
  };

  const handleInsertEmoji = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEmojiPicker(!showEmojiPicker);
  };

  const handleEmojiClick = (emoji: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        selection.getRangeAt(0).deleteContents();
        selection.getRangeAt(0).insertNode(document.createTextNode(emoji));
        selection.collapseToEnd();
      } else {
        document.execCommand('insertText', false, emoji);
      }
      setShowEmojiPicker(false);
    }
  };

  const handleInsertImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    imageInputRef.current?.click();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        if (editorRef.current) {
          editorRef.current.focus();
          document.execCommand('insertImage', false, imageUrl);
        }
      };
      reader.readAsDataURL(file);
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleEditorChange = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      setBody(text);
      setIsEditorEmpty(!text.trim());
    }
  };

  // Common emojis
  const commonEmojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!to.trim()) {
      alert('Please enter a recipient email address');
      return;
    }

    setIsSending(true);
    try {
      // Get HTML content from editor
      const htmlBody = editorRef.current?.innerHTML || body;
      // Convert HTML to plain text for mailto (most email clients support HTML in body)
      const plainBody = editorRef.current?.innerText || body;
      
      // Create mailto link with subject and body
      const mailtoBody = encodeURIComponent(plainBody);
      const mailtoSubject = encodeURIComponent(subject);
      let mailtoLink = `mailto:${to}`;
      const params: string[] = [];
      
      if (cc.trim()) params.push(`cc=${encodeURIComponent(cc)}`);
      if (bcc.trim()) params.push(`bcc=${encodeURIComponent(bcc)}`);
      if (subject.trim()) params.push(`subject=${mailtoSubject}`);
      if (plainBody.trim()) params.push(`body=${mailtoBody}`);
      
      if (params.length > 0) {
        mailtoLink += `?${params.join('&')}`;
      }
      
      // Note: mailto protocol doesn't support file attachments directly
      // The files are already loaded in the attachments state
      // User will need to manually attach them in their email client
      if (attachments.length > 0) {
        const fileNames = attachments.map(f => f.name).join(', ');
        alert(`Note: ${attachments.length} file(s) (${fileNames}) are ready to attach. Please attach them manually in your email client.`);
      }
      
      // Open default email client
      window.location.href = mailtoLink;
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to open email client. Please check your email settings.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  // Stop event propagation to prevent clicks from bubbling up
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] pointer-events-none"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`absolute right-4 ${isMinimized ? 'bottom-4 w-96' : 'top-20 w-[600px]'} bg-white rounded-lg shadow-2xl border border-slate-300 flex flex-col pointer-events-auto transition-all duration-300`}
        style={{
          maxHeight: isMinimized ? '60px' : 'calc(100vh - 120px)',
        }}
        onClick={handleModalClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">New Message</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(!isMinimized);
              }}
              className="p-1.5 hover:bg-slate-200 rounded transition-colors"
              title={isMinimized ? 'Maximize' : 'Minimize'}
            >
              {isMinimized ? <Maximize2 size={16} className="text-slate-600" /> : <Minimize2 size={16} className="text-slate-600" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 hover:bg-slate-200 rounded transition-colors"
              title="Close"
            >
              <X size={16} className="text-slate-600" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* To, Cc, Bcc Fields */}
            <div className="px-4 py-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 w-12">To</span>
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  placeholder="Recipients"
                  className="flex-1 px-2 py-1 text-sm text-black border-0 outline-none focus:ring-0"
                  multiple
                />
              </div>
              {showCc && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-slate-600 w-12">Cc</span>
                  <input
                    type="email"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    placeholder="Cc"
                    className="flex-1 px-2 py-1 text-sm text-black border-0 outline-none focus:ring-0"
                  />
                </div>
              )}
              {showBcc && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-slate-600 w-12">Bcc</span>
                  <input
                    type="email"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    placeholder="Bcc"
                    className="flex-1 px-2 py-1 text-sm text-black border-0 outline-none focus:ring-0"
                  />
                </div>
              )}
              <div className="flex items-center gap-4 mt-1 text-xs text-blue-600">
                {!showCc && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCc(true);
                    }}
                    className="hover:underline"
                  >
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBcc(true);
                    }}
                    className="hover:underline"
                  >
                    Bcc
                  </button>
                )}
              </div>
            </div>

            {/* Subject */}
            <div className="px-4 py-2 border-b border-slate-200">
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                placeholder="Subject"
                className="w-full px-2 py-1 text-sm text-black border-0 outline-none focus:ring-0"
              />
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="px-4 py-2 border-b border-slate-200 bg-slate-50">
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                    >
                      <Paperclip size={12} className="text-slate-500" />
                      <span className="text-slate-700 max-w-[200px] truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAttachment(index);
                        }}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-200 bg-slate-50 relative">
                <button
                  type="button"
                  onClick={handleBold}
                  className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                  title="Bold (Ctrl+B)"
                >
                  <Bold size={14} className="text-slate-600" />
                </button>
                <button
                  type="button"
                  onClick={handleItalic}
                  className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                  title="Italic (Ctrl+I)"
                >
                  <Italic size={14} className="text-slate-600" />
                </button>
                <button
                  type="button"
                  onClick={handleUnderline}
                  className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                  title="Underline (Ctrl+U)"
                >
                  <Underline size={14} className="text-slate-600" />
                </button>
                <div className="w-px h-6 bg-slate-300 mx-1" />
                <button
                  type="button"
                  onClick={handleInsertLink}
                  className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                  title="Insert link"
                >
                  <Link size={14} className="text-slate-600" />
                </button>
                <button
                  type="button"
                  onClick={handleInsertEmoji}
                  className="p-1.5 hover:bg-slate-200 rounded transition-colors relative emoji-picker-container"
                  title="Insert emoji"
                >
                  <Smile size={14} className="text-slate-600" />
                  {showEmojiPicker && (
                    <div 
                      className="absolute bottom-full left-0 mb-2 bg-white border border-slate-300 rounded-lg shadow-xl p-3 w-64 max-h-48 overflow-y-auto z-50 grid grid-cols-8 gap-1 emoji-picker-container"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {commonEmojis.map((emoji, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEmojiClick(emoji);
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-lg"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleInsertImage}
                  className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                  title="Insert image"
                >
                  <Image size={14} className="text-slate-600" />
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                  title="More options"
                >
                  <MoreVertical size={14} className="text-slate-600" />
                </button>
              </div>
              <div className="flex-1 relative">
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleEditorChange}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => {
                    e.stopPropagation();
                  }}
                  onPaste={(e) => {
                    e.stopPropagation();
                    // Allow paste but strip formatting if needed
                    e.preventDefault();
                    const text = e.clipboardData.getData('text/plain');
                    document.execCommand('insertText', false, text);
                  }}
                  className="flex-1 w-full px-4 py-3 text-sm text-black resize-none outline-none focus:ring-0 overflow-y-auto"
                  style={{ 
                    minHeight: '300px', 
                    whiteSpace: 'pre-wrap',
                  }}
                />
                {isEditorEmpty && (
                  <div className="absolute top-3 left-4 text-sm text-slate-400 pointer-events-none">
                    Compose email
                  </div>
                )}
              </div>
            </div>

            {/* Link Insert Dialog */}
            {showLinkDialog && (
              <div 
                className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLinkDialog(false);
                }}
              >
                <div 
                  className="bg-white rounded-lg p-6 w-96 shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-lg font-semibold mb-4 text-slate-900">Insert Link</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Link Text
                      </label>
                      <input
                        type="text"
                        value={linkText}
                        onChange={(e) => setLinkText(e.target.value)}
                        placeholder="Link text"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        URL
                      </label>
                      <input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowLinkDialog(false);
                          setLinkUrl('');
                          setLinkText('');
                        }}
                        className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInsertLinkConfirm();
                        }}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Insert
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 bg-slate-50 rounded-b-lg">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="p-2 hover:bg-slate-200 rounded transition-colors"
                  title="Attach files"
                >
                  <Paperclip size={16} className="text-slate-600" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 hover:bg-slate-200 rounded transition-colors"
                  title="Delete draft"
                >
                  <Trash2 size={16} className="text-slate-600" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded transition-colors"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSend();
                  }}
                  disabled={isSending || !to.trim()}
                  className="px-6 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Send
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

