'use client';

import { InboxEmailsView } from '../page';

interface PageProps {
  params: {
    slug: string[];
  };
}

export default function InboxEmailsSlug({ params }: PageProps) {
  return <InboxEmailsView />;
}

