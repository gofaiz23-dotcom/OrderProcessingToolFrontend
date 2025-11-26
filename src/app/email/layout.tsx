'use client';

import { ReactNode } from 'react';
import { AppLayout } from '../components/shared';

const EmailLayout = ({ children }: { children: ReactNode }) => (
  <AppLayout>{children}</AppLayout>
);

export default EmailLayout;

