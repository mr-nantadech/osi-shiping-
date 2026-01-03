'use client';

import Image from 'next/image';
import { Box, CircularProgress } from '@mui/material';
import { usePermission } from '@/contexts/PermissionContext';

function Page() {
  const { isLoading } = usePermission();

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

  return (
    <main className="relative min-h-screen bg-white -mt-24 -mb-12">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Image
          src="/logo/osi_logo.png"
          alt="OSI"
          priority
          width={2605}
          height={1451}
          className="h-auto w-[70vw] max-w-[700px] select-none opacity-30"
        />
      </div>
    </main>
  );
}

export default Page;
