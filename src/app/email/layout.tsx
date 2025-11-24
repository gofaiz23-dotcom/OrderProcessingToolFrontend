'use client';

import { ReactNode } from 'react';
import EmailWorkspace from './Email';

const EmailLayout = ({ children }: { children: ReactNode }) => (
  <EmailWorkspace>{children}</EmailWorkspace>
);

export default EmailLayout;

