import ResponsiveAppBar from '@/components/ResponsiveAppBar';
import { PermissionProvider } from '@/contexts/PermissionContext';

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PermissionProvider>
      <div className="min-h-screen font-sans flex flex-col">
        <ResponsiveAppBar />
        <main className="flex w-full max-w-7xl flex-col items-center justify-between flex-1 self-center pt-24 pb-12">
          {children}
        </main>
      </div>
    </PermissionProvider>
  );
}
