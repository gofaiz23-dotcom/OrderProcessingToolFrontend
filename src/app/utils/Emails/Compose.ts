import { ComposeEmailPayload, sendEmail, SendEmailResponse } from '@/app/api/EmailApi/Compose';

export const MAX_RECIPIENTS = 500; // Gmail limit: 500 total recipients (To + CC + BCC)
// Gmail has no hard limit on attachment count, only 25MB total size limit
export const MAX_ATTACHMENTS = Infinity; // No count limit, only size limit enforced by backend

export type ComposeFormState = {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  text: string;
  html: string;
  attachments: File[];
};

export const defaultComposeState: ComposeFormState = {
  to: [],
  cc: [],
  bcc: [],
  subject: '',
  text: '',
  html: '',
  attachments: [],
};

const normalizeAttachments = (files: FileList | File[]): File[] => {
  const fileArray = Array.from(files);
  // No count limit - Gmail supports unlimited attachments (25MB total size limit)
  return fileArray;
};

const preparePayload = (state: ComposeFormState): ComposeEmailPayload => {
  // Gmail allows 500 total recipients across To, CC, and BCC
  // We'll limit each field individually, but the total should not exceed 500
  const toList = state.to
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, MAX_RECIPIENTS);
  const ccList = state.cc
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, MAX_RECIPIENTS);
  const bccList = state.bcc
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, MAX_RECIPIENTS);
  
  return {
    to: toList,
    cc: ccList.length > 0 ? ccList.join(',') : undefined,
    bcc: bccList.length > 0 ? bccList.join(',') : undefined,
    subject: state.subject.trim(),
    text: state.text.trim() || undefined,
    html: state.html.trim() || undefined,
    attachments: state.attachments, // No count limit
  };
};

export const updateAttachments = (
  current: ComposeFormState,
  files: FileList | File[],
): ComposeFormState => ({
  ...current,
  attachments: normalizeAttachments(files),
});

export const submitComposeForm = async (
  state: ComposeFormState,
): Promise<SendEmailResponse & { deliveredTo: number }> => {
  const payload = preparePayload(state);
  if (!payload.to.length) {
    throw new Error('Please provide at least one recipient.');
  }
  if (!payload.subject) {
    throw new Error('Subject is required.');
  }
  if (!payload.text && !payload.html) {
    throw new Error('Provide at least text or HTML body.');
  }

  const response = await sendEmail(payload);
  return { ...response, deliveredTo: payload.to.length };
};

