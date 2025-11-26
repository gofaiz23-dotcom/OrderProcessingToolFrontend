'use client';

import { ReactNode } from 'react';
import { AppLayout } from '../components/shared';

const OrdersLayout = ({ children }: { children: ReactNode }) => (
  <AppLayout>{children}</AppLayout>
);

export default OrdersLayout;

