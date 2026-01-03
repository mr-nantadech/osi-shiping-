'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermission } from '@/contexts/PermissionContext';
import { Box, CircularProgress } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission: string;
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  requiredPermission,
  redirectTo = '/',
}: ProtectedRouteProps) {
  const router = useRouter();
  const { hasPermission, isLoading } = usePermission();

  useEffect(() => {
    if (!isLoading && !hasPermission(requiredPermission)) {
      router.replace(redirectTo);
    }
  }, [hasPermission, isLoading, requiredPermission, redirectTo, router]);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!hasPermission(requiredPermission)) {
    return null;
  }

  return <>{children}</>;
}
