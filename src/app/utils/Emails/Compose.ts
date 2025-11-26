import { ComposeEmailPayload, sendEmail, SendEmailResponse } from '@/app/api/EmailApi/Compose';

export const MAX_RECIPIENTS = 10;
export const MAX_ATTACHMENTS = 5;

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
  return fileArray.slice(0, MAX_ATTACHMENTS);
};

const preparePayload = (state: ComposeFormState): ComposeEmailPayload => {
  const ccList = state.cc
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, MAX_RECIPIENTS);
  const bccList = state.bcc
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, MAX_RECIPIENTS);
  
  return {
    to: state.to
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, MAX_RECIPIENTS),
    cc: ccList.length > 0 ? ccList.join(',') : undefined,
    bcc: bccList.length > 0 ? bccList.join(',') : undefined,
    subject: state.subject.trim(),
    text: state.text.trim() || undefined,
    html: state.html.trim() || undefined,
    attachments: state.attachments.slice(0, MAX_ATTACHMENTS),
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

