'use client';

import { ReactNode } from 'react';
import { AppLayout } from '../components/shared';

const LogisticsLayout = ({ children }: { children: ReactNode }) => (
  <AppLayout>{children}</AppLayout>
);

export default LogisticsLayout;

