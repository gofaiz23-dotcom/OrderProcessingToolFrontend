import { buildApiUrl } from '../../../../BaseUrl';

export type ComposeEmailPayload = {
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: File[];
};

export type SendEmailResponse = {
  message: string;
  id: string;
  threadId: string;
};

const clampRecipients = (recipients: string[], limit = 10) => recipients.slice(0, limit);
const sanitizeRecipients = (input: string | string[]) => {
  const list = Array.isArray(input) ? input : input.split(',').map((value) => value.trim());
  return clampRecipients(list.filter(Boolean));
};

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
  attachments,
}: ComposeEmailPayload): Promise<SendEmailResponse> => {
  const recipients = sanitizeRecipients(to);

  if (!recipients.length) {
    throw new Error('At least one valid recipient is required.');
  }

  const formData = new FormData();
  formData.append('to', recipients.join(','));
  formData.append('subject', subject);
  if (text) formData.append('text', text);
  if (html) formData.append('html', html);

  (attachments ?? []).forEach((file) => {
    formData.append('attachments', file, file.name);
  });

  const response = await fetch(buildApiUrl('/emails/send'), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `Unable to send email (status ${response.status})`);
  }

  return response.json();
};

