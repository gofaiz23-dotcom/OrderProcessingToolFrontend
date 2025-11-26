'use client';

import { ReactNode } from 'react';
import EmailWorkspace from '../email/Email';

const OrdersLayout = ({ children }: { children: ReactNode }) => (
  <EmailWorkspace>{children}</EmailWorkspace>
);

export default OrdersLayout;

