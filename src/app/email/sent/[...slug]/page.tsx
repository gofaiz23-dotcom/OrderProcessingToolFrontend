'use client';

import { SentEmailsView } from '../page';

interface PageProps {
  params: {
    slug: string[];
  };
}

export default function SentEmailsSlug({ params }: PageProps) {
  return <SentEmailsView />;
}

