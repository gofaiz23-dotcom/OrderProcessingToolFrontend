'use client';

import { ReactNode } from 'react';
import { AppLayout } from '../components/shared';

const ProcessedOrdersLayout = ({ children }: { children: ReactNode }) => (
  <AppLayout>{children}</AppLayout>
);

export default ProcessedOrdersLayout;

