import AppLayout from '@/app/components/shared/AppLayout';

export default function CustomerDetailsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}

