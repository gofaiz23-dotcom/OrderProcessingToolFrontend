'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Minimize2, Maximize2, Send, Paperclip, Bold, Italic, Underline, Link, Smile, Image, MoreVertical, Trash2 } from 'lucide-react';
import { getCachedOrder } from '../utils/ltlOrderCache';
import { sendEmail } from '@/app/api/EmailApi/Compose';

type EmailComposeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  defaultTo?: string;
  defaultCc?: string | string[];
  defaultSubject?: string;
  defaultBody?: string;
  initialAttachments?: File[]; // Optional: Pass files directly to ensure they're attached
};

export const EmailComposeModal = ({
  isOpen,
  onClose,
  orderId,
  defaultTo = '',
  defaultCc = '',
  defaultSubject = '',
  defaultBody = '',
  initialAttachments = [],
}: EmailComposeModalProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [htmlContent, setHtmlContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [selectedAttachment, setSelectedAttachment] = useState<{ file: File; url: string } | null>(null);
  const [sendStatus, setSendStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });
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

  // Priority 1: Always use initialAttachments if provided (most reliable)
  // This effect watches for initialAttachments changes even after modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 Checking initialAttachments:', {
        hasInitialAttachments: !!initialAttachments,
        initialAttachmentsLength: initialAttachments?.length || 0,
        initialAttachments: initialAttachments?.map(f => ({ name: f.name, size: f.size })) || []
      });

      if (initialAttachments && initialAttachments.length > 0) {
        console.log('✅ Setting attachments from initialAttachments prop (priority):', initialAttachments.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type,
          isFile: f instanceof File
        })));
        setAttachments(initialAttachments);
        console.log('✅ Attachments state updated with', initialAttachments.length, 'file(s)');
      } else {
        console.log('⚠️ initialAttachments is empty or not provided');
      }
    }
  }, [isOpen, initialAttachments]);

  // Priority 2: Load BOL files from cache when modal opens (fallback if no initialAttachments)
  useEffect(() => {
    console.log('🔄 Cache loading effect triggered:', { isOpen, orderId, hasInitialAttachments: !!initialAttachments, initialAttachmentsLength: initialAttachments?.length || 0 });

    if (isOpen && orderId) {
      // Skip cache loading if initialAttachments are already provided
      if (initialAttachments && initialAttachments.length > 0) {
        console.log('⏭️ Skipping cache load - using initialAttachments instead');
        return;
      }

      // Try loading from cache with retries
      let retryCount = 0;
      const maxRetries = 40; // Increased retry count to allow ~20s for PDF generation
      const retryDelay = 500; // 500ms between retries
      let retryInterval: NodeJS.Timeout | null = null;

      const loadFiles = (): boolean => {
        console.log(`🔄 Loading BOL files from cache (attempt ${retryCount + 1}/${maxRetries + 1})...`);
        const cachedOrder = getCachedOrder(orderId);

        if (cachedOrder) {
          console.log('📦 Cached order found:', {
            orderId,
            hasXpoFiles: !!cachedOrder.xpoBolFiles,
            hasEstesFiles: !!cachedOrder.estesBolFiles,
            xpoFilesCount: cachedOrder.xpoBolFiles?.length || 0,
            estesFilesCount: cachedOrder.estesBolFiles?.length || 0,
          });

          const bolFiles: File[] = [];

          // Get XPO BOL files
          if (cachedOrder.xpoBolFiles && cachedOrder.xpoBolFiles.length > 0) {
            console.log('📄 Found XPO BOL files:', cachedOrder.xpoBolFiles.map(f => f.name));
            bolFiles.push(...cachedOrder.xpoBolFiles);
          }

          // Get Estes BOL files
          if (cachedOrder.estesBolFiles && cachedOrder.estesBolFiles.length > 0) {
            console.log('📄 Found Estes BOL files:', cachedOrder.estesBolFiles.map(f => f.name));
            bolFiles.push(...cachedOrder.estesBolFiles);
          }

          if (bolFiles.length > 0) {
            setAttachments(bolFiles);
            console.log('✅ Successfully loaded BOL files from cache:', bolFiles.map(f => ({
              name: f.name,
              size: f.size,
              type: f.type,
              isFile: f instanceof File
            })));
            return true; // Files loaded successfully
          } else {
            console.warn('⚠️ No BOL files found in cache for orderId:', orderId, {
              hasXpoFiles: !!cachedOrder.xpoBolFiles,
              hasEstesFiles: !!cachedOrder.estesBolFiles,
              xpoFilesCount: cachedOrder.xpoBolFiles?.length || 0,
              estesFilesCount: cachedOrder.estesBolFiles?.length || 0,
            });
            return false; // Files not found
          }
        } else {
          console.warn('⚠️ No cached order found for orderId:', orderId);
          return false; // Order not in cache
        }
      };

      // Try loading immediately
      let loaded = loadFiles();

      // If files not found, retry multiple times with delays
      if (!loaded && retryCount < maxRetries) {
        retryInterval = setInterval(() => {
          retryCount++;
          loaded = loadFiles();

          if (loaded || retryCount >= maxRetries) {
            if (retryInterval) {
              clearInterval(retryInterval);
              retryInterval = null;
            }
            if (!loaded) {
              console.error('❌ Failed to load BOL files after all retries');
            }
          }
        }, retryDelay);
      }

      return () => {
        if (retryInterval) {
          clearInterval(retryInterval);
        }
      };
    } else {
      // Reset attachments when modal closes
      if (!isOpen) {
        setAttachments([]);
      }
    }
  }, [isOpen, orderId, initialAttachments]);

  // Debug: Log attachments whenever they change
  useEffect(() => {
    console.log('📎 Attachments state changed:', {
      count: attachments.length,
      files: attachments.map(f => ({ name: f.name, size: f.size, type: f.type }))
    });
  }, [attachments]);

  // Function to attach delete buttons to existing images
  const attachDeleteButtonsToImages = () => {
    if (!editorRef.current) return;
    
    const images = editorRef.current.querySelectorAll('img:not(.inline-image-wrapper img)');
    images.forEach((img) => {
      // Skip if already wrapped
      if (img.parentElement?.classList.contains('inline-image-wrapper')) {
        return;
      }
      
      // Create wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'inline-image-wrapper';
      wrapper.style.position = 'relative';
      wrapper.style.display = 'inline-block';
      wrapper.style.width = '100%';
      wrapper.style.margin = '8px 0';
      
      // Create delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.innerHTML = '×';
      deleteBtn.className = 'inline-image-delete-btn';
      deleteBtn.style.position = 'absolute';
      deleteBtn.style.top = '4px';
      deleteBtn.style.right = '4px';
      deleteBtn.style.width = '24px';
      deleteBtn.style.height = '24px';
      deleteBtn.style.borderRadius = '50%';
      deleteBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
      deleteBtn.style.color = 'white';
      deleteBtn.style.border = 'none';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.style.display = 'flex';
      deleteBtn.style.alignItems = 'center';
      deleteBtn.style.justifyContent = 'center';
      deleteBtn.style.fontSize = '18px';
      deleteBtn.style.fontWeight = 'bold';
      deleteBtn.style.lineHeight = '1';
      deleteBtn.style.opacity = '0';
      deleteBtn.style.transition = 'opacity 0.2s';
      deleteBtn.title = 'Remove image';
      
      // Show delete button on hover
      wrapper.addEventListener('mouseenter', () => {
        deleteBtn.style.opacity = '1';
      });
      wrapper.addEventListener('mouseleave', () => {
        deleteBtn.style.opacity = '0';
      });
      
      // Handle delete button click
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (wrapper.parentNode) {
          wrapper.parentNode.removeChild(wrapper);
          handleEditorChange();
        }
      });
      
      // Wrap the image
      if (img.parentNode) {
        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);
      }
    });
  };

  // Initialize or restore editor content
  useEffect(() => {
    if (isOpen && !isMinimized && editorRef.current) {
      if (htmlContent) {
        // Restore saved content (e.g. from minimize)
        if (editorRef.current.innerHTML !== htmlContent) {
          editorRef.current.innerHTML = htmlContent;
          // Attach delete buttons to any existing images
          setTimeout(() => attachDeleteButtonsToImages(), 0);
        }
      } else if (defaultBody && isEditorEmpty) {
        // Initial load from props
        // Convert plain text to HTML, preserving line breaks
        const htmlBody = defaultBody.replace(/\n/g, '<br>');
        editorRef.current.innerHTML = htmlBody;
        setHtmlContent(htmlBody);
        setIsEditorEmpty(!defaultBody.trim());
        // Attach delete buttons to any existing images
        setTimeout(() => attachDeleteButtonsToImages(), 0);
      } else if (!htmlContent && !defaultBody) {
        // Empty state
        editorRef.current.innerHTML = '';
        setIsEditorEmpty(true);
      }
    }
  }, [isOpen, isMinimized, defaultBody]);

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

  // Add styles for inline images in editor
  useEffect(() => {
    const styleId = 'email-editor-image-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .email-editor img {
          max-width: 100% !important;
          height: auto !important;
          display: block !important;
          border-radius: 4px !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
        }
        .email-editor .inline-image-wrapper {
          position: relative;
          display: inline-block;
          width: 100%;
          margin: 8px 0;
        }
        .email-editor .inline-image-wrapper:hover img {
          box-shadow: 0 2px 6px rgba(0,0,0,0.15) !important;
        }
        .email-editor .inline-image-delete-btn {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: rgba(0, 0, 0, 0.6);
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: bold;
          line-height: 1;
          opacity: 0;
          transition: opacity 0.2s;
          z-index: 10;
        }
        .email-editor .inline-image-wrapper:hover .inline-image-delete-btn {
          opacity: 1 !important;
        }
        .email-editor .inline-image-delete-btn:hover {
          background-color: rgba(220, 38, 38, 0.8);
        }
      `;
      document.head.appendChild(style);
    }
    
    return () => {
      // Cleanup on unmount
      const style = document.getElementById(styleId);
      if (style) {
        style.remove();
      }
    };
  }, []);

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
      insertImageIntoEditor(file);
    } else if (file) {
      setSendStatus({
        type: 'error',
        message: 'Please select an image file.',
      });
    }
    // Reset input to allow selecting the same file again
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  // Insert image into editor with proper styling (like Gmail)
  const insertImageIntoEditor = (file: File) => {
    // First, add the file to attachments
    setAttachments((prev) => {
      // Check if file already exists
      const exists = prev.some(f => f.name === file.name && f.size === file.size);
      if (exists) return prev;
      return [...prev, file];
    });

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      if (editorRef.current) {
        editorRef.current.focus();
        
        // Create a wrapper div for the image with delete button
        const wrapper = document.createElement('div');
        wrapper.className = 'inline-image-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        wrapper.style.width = '100%';
        wrapper.style.margin = '8px 0';
        // Store file reference in data attribute
        wrapper.setAttribute('data-image-file', file.name);
        
        // Create an img element with inline styling (like Gmail)
        // Use base64 for display, but we'll replace it with a placeholder before sending
        const img = document.createElement('img');
        img.src = imageUrl; // base64 data URL for display
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.borderRadius = '4px';
        img.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        img.alt = file.name;
        // Store file name for reference (used when replacing before send)
        img.setAttribute('data-image-file', file.name);
        img.setAttribute('data-image-placeholder', 'true'); // Mark as placeholder candidate
        
        // Create delete button (cross icon)
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.innerHTML = '×';
        deleteBtn.className = 'inline-image-delete-btn';
        deleteBtn.style.position = 'absolute';
        deleteBtn.style.top = '4px';
        deleteBtn.style.right = '4px';
        deleteBtn.style.width = '24px';
        deleteBtn.style.height = '24px';
        deleteBtn.style.borderRadius = '50%';
        deleteBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        deleteBtn.style.color = 'white';
        deleteBtn.style.border = 'none';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.display = 'flex';
        deleteBtn.style.alignItems = 'center';
        deleteBtn.style.justifyContent = 'center';
        deleteBtn.style.fontSize = '18px';
        deleteBtn.style.fontWeight = 'bold';
        deleteBtn.style.lineHeight = '1';
        deleteBtn.style.opacity = '0';
        deleteBtn.style.transition = 'opacity 0.2s';
        deleteBtn.title = 'Remove image';
        
        // Show delete button on hover
        wrapper.addEventListener('mouseenter', () => {
          deleteBtn.style.opacity = '1';
        });
        wrapper.addEventListener('mouseleave', () => {
          deleteBtn.style.opacity = '0';
        });
        
        // Handle delete button click
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          // Remove from attachments
          setAttachments((prev) => prev.filter(f => f.name !== file.name || f.size !== file.size));
          // Remove from editor
          if (wrapper.parentNode) {
            wrapper.parentNode.removeChild(wrapper);
            handleEditorChange();
          }
        });
        
        // Append image and delete button to wrapper
        wrapper.appendChild(img);
        wrapper.appendChild(deleteBtn);
        
        // Insert the wrapper at cursor position
        const selection = window.getSelection();
        let inserted = false;
        
        if (selection && selection.rangeCount > 0) {
          try {
            const range = selection.getRangeAt(0);
            // Check if range is within editor
            if (editorRef.current.contains(range.commonAncestorContainer)) {
              range.deleteContents();
              range.insertNode(wrapper);
              
              // Move cursor after the wrapper
              range.setStartAfter(wrapper);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
              inserted = true;
            }
          } catch (error) {
            console.warn('Error inserting image at selection:', error);
          }
        }
        
        // Fallback: append to end if not inserted
        if (!inserted) {
          // If editor is empty, create a text node first to ensure proper insertion
          if (!editorRef.current.hasChildNodes() || editorRef.current.textContent === '') {
            const textNode = document.createTextNode('\u200B'); // Zero-width space
            editorRef.current.appendChild(textNode);
          }
          editorRef.current.appendChild(wrapper);
          
          // Move cursor after the wrapper
          const newRange = document.createRange();
          newRange.setStartAfter(wrapper);
          newRange.collapse(true);
          const newSelection = window.getSelection();
          if (newSelection) {
            newSelection.removeAllRanges();
            newSelection.addRange(newRange);
          }
        }
        
        // Trigger change event
        handleEditorChange();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEditorChange = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      const html = editorRef.current.innerHTML || '';
      setBody(text);
      setHtmlContent(html);
      setIsEditorEmpty(!text.trim());
      
      // Attach delete buttons to any new images that don't have them
      attachDeleteButtonsToImages();
    }
  };

  // Common emojis
  const commonEmojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + 'K';
    return Math.round(bytes / (1024 * 1024) * 10) / 10 + 'M';
  };

  // Handle attachment click to open in popup
  const handleAttachmentClick = async (file: File) => {
    const url = URL.createObjectURL(file);
    setSelectedAttachment({ file, url });
  };

  // Close attachment viewer
  const closeAttachmentViewer = () => {
    if (selectedAttachment) {
      URL.revokeObjectURL(selectedAttachment.url);
    }
    setSelectedAttachment(null);
  };

  const MAX_ATTACHMENT_COUNT = 50;
  const MAX_TOTAL_SIZE = 25 * 1024 * 1024; // 25 MB


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Calculate current total size
    const currentTotalSize = attachments.reduce((acc, file) => acc + file.size, 0);
    const newFilesTotalSize = files.reduce((acc, file) => acc + file.size, 0);

    if (currentTotalSize + newFilesTotalSize > MAX_TOTAL_SIZE) {
      setSendStatus({
        type: 'error',
        message: `Total attachment size exceeds 25MB limit. Current size: ${formatFileSize(currentTotalSize)}.`,
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (attachments.length + files.length > MAX_ATTACHMENT_COUNT) {
      setSendStatus({
        type: 'error',
        message: `Maximum ${MAX_ATTACHMENT_COUNT} files allowed. You already have ${attachments.length}.`
      });
      // specific file input value reset is done in finally or implicit
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setAttachments((prev) => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Clear any previous error
    setSendStatus({ type: null, message: '' });
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    // Validation
    if (!to.trim()) {
      setSendStatus({ type: 'error', message: 'Please enter a recipient email address' });
      return;
    }

    if (!subject.trim()) {
      setSendStatus({ type: 'error', message: 'Please enter a subject' });
      return;
    }

    setIsSending(true);
    setSendStatus({ type: null, message: '' });

    try {
      // Get HTML content from editor
      let htmlBody = editorRef.current?.innerHTML || '';
      let plainBody = editorRef.current?.innerText || body;

      // Remove ALL base64 data URLs from HTML to avoid "Field value too long" error
      // Replace them with CID references so images appear inline in the email
      if (htmlBody) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlBody;
        
        // Remove wrapper divs and delete buttons, keep only img tags
        const wrapperDivs = tempDiv.querySelectorAll('.inline-image-wrapper');
        wrapperDivs.forEach(wrapper => {
          const img = wrapper.querySelector('img');
          const deleteBtn = wrapper.querySelector('.inline-image-delete-btn');
          
          // Remove delete button
          if (deleteBtn) {
            deleteBtn.remove();
          }
          
          // If there's an img, replace the wrapper with just the img
          if (img && img.parentNode) {
            const parent = wrapper.parentNode;
            if (parent) {
              parent.insertBefore(img, wrapper);
              wrapper.remove();
            }
          }
        });
        
        // Find ALL img tags and replace base64 with CID
        const allImages = tempDiv.querySelectorAll('img');
        
        allImages.forEach((imgElement) => {
          const img = imgElement as HTMLImageElement;
          const src = img.src || '';
          
          // Check if it's a base64 data URL or blob URL
          if (src.startsWith('data:image/') || src.startsWith('blob:')) {
            // Get the filename from data attribute or alt text
            const fileName = img.getAttribute('data-image-file') || img.alt || 'image';
            
            // Find matching attachment file
            let cidName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
            
            // Try to match with actual attachment filename
            const matchingFile = attachments.find(f => 
              f.type.startsWith('image/') && 
              (f.name.toLowerCase() === fileName.toLowerCase() || 
               f.name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase() === cidName.toLowerCase())
            );
            
            if (matchingFile) {
              // Use the actual filename (sanitized) for CID
              cidName = matchingFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            }
            
            // Replace src with CID reference (Content-ID for inline images)
            img.src = `cid:${cidName}`;
            // Remove data attributes to reduce size
            img.removeAttribute('data-image-file');
            img.removeAttribute('data-image-placeholder');
            // Ensure img has proper styling for email
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
          }
        });
        
        htmlBody = tempDiv.innerHTML;
        
        // Also remove any remaining base64 data URLs using regex (as a safety measure)
        htmlBody = htmlBody.replace(/data:image\/[^;]+;base64,[^\s"']+/gi, 'cid:image');
        
        // Remove any remaining wrapper divs or delete buttons that might have been missed
        // More precise: only remove wrapper divs that contain images
        htmlBody = htmlBody.replace(/<div[^>]*class="[^"]*inline-image-wrapper[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, (match, content) => {
          // Extract just the img tag from the wrapper
          const imgMatch = content.match(/<img[^>]*>/i);
          return imgMatch ? imgMatch[0] : '';
        });
        htmlBody = htmlBody.replace(/<button[^>]*class="[^"]*inline-image-delete-btn[^"]*"[^>]*>.*?<\/button>/gi, '');
      }
      
      // Also clean plain text body of any base64 data URLs
      if (plainBody) {
        plainBody = plainBody.replace(/data:image\/[^;]+;base64,[^\s"']+/gi, '[Image removed - sent as attachment]');
      }

      // Parse recipients - handle multiple emails separated by commas
      const toList = to.split(',').map(email => email.trim()).filter(Boolean);
      const ccList = cc.trim() ? cc.split(',').map(email => email.trim()).filter(Boolean) : [];
      const bccList = bcc.trim() ? bcc.split(',').map(email => email.trim()).filter(Boolean) : [];

      // Validate at least one recipient
      if (toList.length === 0) {
        setSendStatus({ type: 'error', message: 'Please provide at least one valid recipient' });
        setIsSending(false);
        return;
      }

      // 1. Validate Max Attachments BEFORE sending
      if (attachments.length > MAX_ATTACHMENT_COUNT) {
        setSendStatus({
          type: 'error',
          message: `Too many files! Maximum ${MAX_ATTACHMENT_COUNT} allowed, but you have ${attachments.length}. Please remove some files.`
        });
        setIsSending(false);
        return;
      }

      // 2. Validate Total Size BEFORE sending
      const totalSize = attachments.reduce((acc, file) => acc + file.size, 0);
      if (totalSize > MAX_TOTAL_SIZE) {
        setSendStatus({
          type: 'error',
          message: `Total attachment size (${formatFileSize(totalSize)}) exceeds the 25MB limit. Please remove some files.`
        });
        setIsSending(false);
        return;
      }

      // Final safety check: ensure HTML doesn't contain base64
      if (htmlBody && htmlBody.includes('data:image/')) {
        console.warn('⚠️ Warning: HTML still contains base64 data URLs, replacing with CID...');
        htmlBody = htmlBody.replace(/data:image\/[^;]+;base64,[^\s"']+/gi, 'cid:image');
      }
      
      // Remove any blob: URLs as well
      if (htmlBody && htmlBody.includes('blob:')) {
        htmlBody = htmlBody.replace(/blob:[^\s"']+/gi, (match) => {
          // Try to find the filename from the image element context
          return 'cid:image';
        });
      }
      
      // If HTML is empty or only contains whitespace, don't send it
      let finalHtmlBody: string | undefined = htmlBody;
      if (htmlBody) {
        const cleanedHtml = htmlBody.replace(/<img[^>]*>/gi, '').trim();
        if (!cleanedHtml || cleanedHtml.length === 0) {
          finalHtmlBody = undefined;
        }
      }
      
      console.log('📧 Sending email via API:', {
        to: toList,
        cc: ccList,
        bcc: bccList,
        subject: subject.trim(),
        attachments: attachments.length,
        htmlBodyLength: finalHtmlBody?.length || 0,
        textBodyLength: plainBody?.length || 0,
      });

      // Send email using backend API (same as main email compose page)
      // Only send text or html, not both if one is empty
      const result = await sendEmail({
        to: toList,
        cc: ccList.length > 0 ? ccList.join(',') : undefined,
        bcc: bccList.length > 0 ? bccList.join(',') : undefined,
        subject: subject.trim(),
        text: plainBody && plainBody.trim() ? plainBody : undefined,
        html: finalHtmlBody && finalHtmlBody.trim() ? finalHtmlBody : undefined,
        attachments: attachments,
      });

      console.log('✅ Email sent successfully:', result);

      // Success
      const totalRecipients = toList.length + ccList.length + bccList.length;
      setSendStatus({
        type: 'success',
        message: `Email sent successfully to ${totalRecipients} recipient(s)!`
      });

      // Close modal logic removed as per user request
      /* 
      setTimeout(() => {
        onClose();
      }, 2000); 
      */

    } catch (error) {
      console.error('❌ Error sending email:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to send email. Please try again.';
      setSendStatus({
        type: 'error',
        message: errorMessage
      });
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
        className={`fixed ${isMinimized ? 'bottom-4 right-4 w-96' : 'bottom-4 right-4 w-[600px]'} bg-white rounded-lg shadow-2xl border border-slate-300 flex flex-col pointer-events-auto transition-all duration-300`}
        style={{
          maxHeight: isMinimized ? '64px' : 'calc(100vh - 40px)',
          height: isMinimized ? '64px' : 'auto',
        }}
        onClick={handleModalClick}
      >
        {/* Header - Always visible, even when minimized */}
        <div
          className={`flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50 rounded-t-lg ${isMinimized ? 'cursor-pointer' : ''}`}
          onClick={(e) => {
            if (isMinimized) {
              e.stopPropagation();
              setIsMinimized(false);
            }
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">New Message</span>
            {isMinimized && (
              <span className="text-xs text-slate-500">Click to expand</span>
            )}
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
              <div
                className="flex-1 relative flex flex-col min-h-0 overflow-y-auto custom-scrollbar"
                onClick={(e) => {
                  // Only handle clicks on the container itself (empty space), not on editor or its children
                  if (e.target === e.currentTarget && editorRef.current) {
                    editorRef.current.focus();
                    
                    // Place cursor at the click position, not at the top
                    const selection = window.getSelection();
                    if (selection) {
                      const range = document.caretRangeFromPoint 
                        ? document.caretRangeFromPoint(e.clientX, e.clientY)
                        : null;
                      
                      if (range) {
                        // Check if the range is within the editor
                        if (editorRef.current.contains(range.commonAncestorContainer)) {
                          selection.removeAllRanges();
                          selection.addRange(range);
                        } else {
                          // If click is outside editor content, place cursor at end
                          const endRange = document.createRange();
                          endRange.selectNodeContents(editorRef.current);
                          endRange.collapse(false);
                          selection.removeAllRanges();
                          selection.addRange(endRange);
                        }
                      } else {
                        // Fallback: place cursor at end
                        const endRange = document.createRange();
                        endRange.selectNodeContents(editorRef.current);
                        endRange.collapse(false);
                        selection.removeAllRanges();
                        selection.addRange(endRange);
                      }
                    }
                  }
                }}
                onDragEnter={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  // Prevent browser from opening the image
                }}
                onDragOver={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  // Prevent browser from opening the image
                }}
                onDrop={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  
                  // Handle dropped files here as well (in case drop happens on empty space)
                  const files = Array.from(e.dataTransfer.files);
                  const imageFiles = files.filter(file => file.type.startsWith('image/'));
                  
                  if (imageFiles.length > 0 && editorRef.current) {
                    // Insert first image inline in the editor
                    insertImageIntoEditor(imageFiles[0]);
                    
                    // Add remaining images as attachments
                    if (imageFiles.length > 1) {
                      const remainingFiles = imageFiles.slice(1);
                      setAttachments((prev) => [...prev, ...remainingFiles]);
                    }
                    
                    // Add non-image files as attachments
                    const nonImageFiles = files.filter(file => !file.type.startsWith('image/'));
                    if (nonImageFiles.length > 0) {
                      setAttachments((prev) => [...prev, ...nonImageFiles]);
                    }
                  } else if (files.length > 0) {
                    // If no images, add all files as attachments
                    setAttachments((prev) => [...prev, ...files]);
                  }
                }}
              >
                <div
                  ref={editorRef}
                  contentEditable={true}
                  suppressContentEditableWarning={true}
                  onInput={handleEditorChange}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    // Let the browser handle cursor positioning naturally
                    // Don't interfere with the browser's default click-to-position behavior
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Ensure editor has focus, but let browser handle cursor positioning
                    if (editorRef.current) {
                      editorRef.current.focus();
                      
                      // If clicking on empty space within editor, place cursor at click position
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount === 0) {
                        // No selection yet, try to place cursor at click position
                        const range = document.caretRangeFromPoint 
                          ? document.caretRangeFromPoint(e.clientX, e.clientY)
                          : null;
                        
                        if (range && editorRef.current.contains(range.commonAncestorContainer)) {
                          selection.removeAllRanges();
                          selection.addRange(range);
                        }
                      }
                    }
                  }}
                  onFocus={(e) => {
                    e.stopPropagation();
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                  }}
                  onKeyUp={(e) => {
                    e.stopPropagation();
                  }}
                  onPaste={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    // Check if pasting an image
                    const items = e.clipboardData.items;
                    let hasImage = false;
                    
                    for (let i = 0; i < items.length; i++) {
                      if (items[i].type.indexOf('image') !== -1) {
                        hasImage = true;
                        const file = items[i].getAsFile();
                        if (file) {
                          insertImageIntoEditor(file);
                          return;
                        }
                      }
                    }
                    
                    // If no image, paste as text
                    if (!hasImage) {
                      const text = e.clipboardData.getData('text/plain');
                      document.execCommand('insertText', false, text);
                    }
                  }}
                  onDragEnter={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    // Prevent browser from navigating to the image
                  }}
                  onDrop={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    // Prevent browser from opening the image in a new tab
                    e.dataTransfer.dropEffect = 'copy';
                    
                    // Handle dropped files
                    const files = Array.from(e.dataTransfer.files);
                    
                    if (files.length === 0) {
                      // Remove drag feedback
                      if (editorRef.current) {
                        editorRef.current.style.backgroundColor = '';
                      }
                      return;
                    }
                    
                    const imageFiles = files.filter(file => file.type.startsWith('image/'));
                    
                    if (imageFiles.length > 0) {
                      // Insert first image inline in the editor at drop position
                      const dropFile = imageFiles[0];
                      
                      // Try to get cursor position from drop coordinates
                      const selection = window.getSelection();
                      let range: Range | null = null;
                      
                      if (document.caretRangeFromPoint) {
                        range = document.caretRangeFromPoint(e.clientX, e.clientY);
                      }
                      
                      // If we have a valid range within the editor, use it
                      if (range && editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
                        selection?.removeAllRanges();
                        selection?.addRange(range);
                      }
                      
                      // Insert the image
                      insertImageIntoEditor(dropFile);
                      
                      // Add remaining images as attachments
                      if (imageFiles.length > 1) {
                        const remainingFiles = imageFiles.slice(1);
                        setAttachments((prev) => [...prev, ...remainingFiles]);
                      }
                      
                      // Add non-image files as attachments
                      const nonImageFiles = files.filter(file => !file.type.startsWith('image/'));
                      if (nonImageFiles.length > 0) {
                        setAttachments((prev) => [...prev, ...nonImageFiles]);
                      }
                    } else {
                      // If no images, add all files as attachments
                      setAttachments((prev) => [...prev, ...files]);
                    }
                    
                    // Remove drag feedback
                    if (editorRef.current) {
                      editorRef.current.style.backgroundColor = '';
                    }
                  }}
                  onDragOver={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    // Add visual feedback
                    if (editorRef.current) {
                      editorRef.current.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
                    }
                  }}
                  onDragLeave={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    // Remove visual feedback
                    if (editorRef.current) {
                      editorRef.current.style.backgroundColor = '';
                    }
                  }}
                  className="w-full px-4 py-3 text-sm text-black resize-none outline-none focus:ring-0 email-editor"
                  style={{
                    minHeight: '150px',
                    whiteSpace: 'pre-wrap',
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                    cursor: 'text',
                  }}
                />
                {isEditorEmpty && (
                  <div className="absolute top-3 left-4 text-sm text-slate-400 pointer-events-none">
                    Compose email
                  </div>
                )}


              </div>

              {/* Attachments - Fixed at bottom of content area */}
              {attachments.length > 0 && (
                <div className="border-t border-slate-100 bg-white" onClick={(e) => e.stopPropagation()}>
                  <div className="px-4 pt-3 pb-2">
                    <span className="text-xs font-medium text-slate-600">
                      Attachments ({attachments.length})
                    </span>
                  </div>
                  <div className="px-4 pb-3 max-h-[120px] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-2">
                      {attachments.map((file, index) => (
                        <div
                          key={index}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full hover:bg-slate-200 transition-colors cursor-pointer group w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAttachmentClick(file);
                          }}
                        >
                          <Paperclip size={14} className="text-slate-600 flex-shrink-0" />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-slate-700 text-xs font-medium truncate" title={file.name}>
                              {file.name}
                            </span>
                            <span className="text-slate-500 text-[10px] leading-tight">
                              {formatFileSize(file.size)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAttachment(index);
                            }}
                            className="p-0.5 text-slate-400 hover:text-red-600 rounded-full hover:bg-slate-300 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                            title="Remove attachment"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Attachment Viewer Popup */}
            {selectedAttachment && (
              <div
                className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100]"
                onClick={(e) => {
                  e.stopPropagation();
                  closeAttachmentViewer();
                }}
              >
                <div
                  className="bg-white rounded-lg shadow-2xl max-w-4xl max-h-[90vh] w-full m-4 flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <Paperclip size={20} className="text-slate-600" />
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {selectedAttachment.file.name}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {formatFileSize(selectedAttachment.file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeAttachmentViewer();
                      }}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                      title="Close"
                    >
                      <X size={20} className="text-slate-600" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-auto p-6 bg-slate-50">
                    {selectedAttachment.file.type.startsWith('image/') ? (
                      <div className="flex items-center justify-center">
                        <img
                          src={selectedAttachment.url}
                          alt={selectedAttachment.file.name}
                          className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                        />
                      </div>
                    ) : selectedAttachment.file.type === 'application/pdf' ? (
                      <div className="w-full h-[70vh]">
                        <iframe
                          src={selectedAttachment.url}
                          className="w-full h-full border-0 rounded-lg shadow-lg bg-white"
                          title={selectedAttachment.file.name}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[70vh] text-center">
                        <Paperclip size={64} className="text-slate-400 mb-4" />
                        <p className="text-slate-600 mb-2">
                          Preview not available for this file type
                        </p>
                        <a
                          href={selectedAttachment.url}
                          download={selectedAttachment.file.name}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Download File
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end gap-2">
                    <a
                      href={selectedAttachment.url}
                      download={selectedAttachment.file.name}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeAttachmentViewer();
                      }}
                      className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                  className="p-2 hover:bg-slate-200 rounded transition-colors relative"
                  title="Attach files"
                >
                  <Paperclip size={16} className="text-slate-600" />
                  {attachments.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {attachments.length}
                    </span>
                  )}
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

              {/* Status Message */}
              {sendStatus.type && (
                <div className={`px-4 py-2 border-t ${sendStatus.type === 'success'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
                  }`}>
                  <p className={`text-sm ${sendStatus.type === 'success'
                    ? 'text-green-700'
                    : 'text-red-700'
                    }`}>
                    {sendStatus.message}
                  </p>
                </div>
              )}

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

