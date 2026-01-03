'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { IPermission } from '@/types/backend/auth';

interface PermissionContextValue {
  permissions: IPermission[];
  isLoading: boolean;
  hasPermission: (permissionId: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextValue | undefined>(
  undefined,
);

export function PermissionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [permissions, setPermissions] = useState<IPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = async () => {
    try {
      setIsLoading(true);

      // Get employeeId from session
      const sessionRes = await fetch('/api/session', { cache: 'no-store' });
      if (!sessionRes.ok) {
        console.error('Failed to fetch session');
        setPermissions([]);
        return;
      }

      const sessionData = await sessionRes.json();
      const employeeId = sessionData?.user?.employeeId;

      if (!employeeId) {
        console.error('No employeeId found in session');
        setPermissions([]);
        return;
      }

      // Fetch permissions by employeeId
      const res = await authApi.getPermissionByEmpId(String(employeeId));
      if (res.data_model) {
        setPermissions(res.data_model);
      } else {
        setPermissions([]);
      }
    } catch (error) {
      console.error('Failed to fetch permissions', error);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch permissions on mount and whenever pathname changes
  useEffect(() => {
    fetchPermissions();
  }, [pathname]);

  const hasPermission = (permissionId: string): boolean => {
    return permissions.some((p) => p.id === permissionId);
  };

  const refreshPermissions = async () => {
    await fetchPermissions();
  };

  return (
    <PermissionContext.Provider
      value={{ permissions, isLoading, hasPermission, refreshPermissions }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermission must be used within a PermissionProvider');
  }
  return context;
}
