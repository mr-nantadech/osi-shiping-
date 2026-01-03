# Permission System Documentation

ระบบ Permission Management สำหรับการควบคุมการเข้าถึงหน้าต่างๆ ในแอพพลิเคชัน

## โครงสร้างของระบบ

### 1. Permission Context (`contexts/PermissionContext.tsx`)
Context สำหรับจัดการ permission ทั้งหมด โดยจะ:
- Fetch permissions จาก API เมื่อ component mount
- เก็บ permissions ใน state
- ให้ `hasPermission()` function สำหรับเช็ค permission
- ให้ `refreshPermissions()` function สำหรับ refresh permissions

### 2. Permission Constants (`constants/permissions.ts`)
กำหนด Permission IDs ที่ใช้ในระบบ:
```typescript
export const PERMISSIONS = {
  ACCESS_SHIPPING_PAGE: 'AccessShippingPage',
  ACCESS_COLLECTOR_PAGE: 'AccessCollectorPage',
  ACCESS_MASTER_DATA_PAGE: 'AccessMasterDataPage',
} as const;
```

### 3. ProtectedRoute Component (`components/ProtectedRoute.tsx`)
Component สำหรับป้องกันการเข้าถึงหน้าที่ไม่มีสิทธิ์ โดยจะ:
- เช็ค permission ก่อนแสดงผล children
- Redirect ไป home หากไม่มีสิทธิ์
- แสดง loading spinner ขณะกำลังโหลด permissions

## วิธีการใช้งาน

### 1. Protected Route (ป้องกัน URL Bypass)

ในไฟล์ page.tsx ให้ wrap ด้วย ProtectedRoute:

```typescript
// app/(protected)/shipping/page.tsx
'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { PERMISSIONS } from '@/constants/permissions';

export default function ShippingPage() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.ACCESS_SHIPPING_PAGE}>
      {/* Your page content here */}
      <div>Shipping Page Content</div>
    </ProtectedRoute>
  );
}
```

### 2. Conditional Rendering (แสดง/ซ่อน Component)

ใช้ `usePermission` hook เพื่อเช็ค permission:

```typescript
'use client';

import { usePermission } from '@/contexts/PermissionContext';
import { PERMISSIONS } from '@/constants/permissions';

export default function MyComponent() {
  const { hasPermission, isLoading } = usePermission();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {hasPermission(PERMISSIONS.ACCESS_SHIPPING_PAGE) && (
        <button>Go to Shipping Page</button>
      )}

      {!hasPermission(PERMISSIONS.ACCESS_COLLECTOR_PAGE) && (
        <p>You don't have access to Collector page</p>
      )}
    </div>
  );
}
```

### 3. Refresh Permissions

หากต้องการ refresh permissions (เช่น หลังจาก user ได้รับสิทธิ์เพิ่ม):

```typescript
'use client';

import { usePermission } from '@/contexts/PermissionContext';

export default function MyComponent() {
  const { refreshPermissions } = usePermission();

  const handleRefresh = async () => {
    await refreshPermissions();
    console.log('Permissions refreshed!');
  };

  return (
    <button onClick={handleRefresh}>Refresh Permissions</button>
  );
}
```

## ตัวอย่างการใช้งานแบบเต็ม

### Example: Protected Shipping Page

```typescript
// app/(protected)/shipping/page.tsx
'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { PERMISSIONS } from '@/constants/permissions';
import { usePermission } from '@/contexts/PermissionContext';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';

function ShippingContent() {
  const { hasPermission } = usePermission();
  const [value, setValue] = useState(0);

  const tabs = [
    { label: 'Print Label', permission: null }, // ไม่ต้องเช็ค permission
    { label: 'Ship Daily', permission: 'AccessShipDailyTab' },
    { label: 'Update Status', permission: 'AccessUpdateStatusTab' },
  ];

  // Filter tabs ตาม permission
  const visibleTabs = tabs.filter(
    (tab) => !tab.permission || hasPermission(tab.permission)
  );

  return (
    <Box sx={{ width: '100%' }}>
      <Tabs value={value} onChange={(e, newValue) => setValue(newValue)}>
        {visibleTabs.map((tab, idx) => (
          <Tab key={tab.label} label={tab.label} />
        ))}
      </Tabs>
      {/* Tab content here */}
    </Box>
  );
}

export default function ShippingPage() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.ACCESS_SHIPPING_PAGE}>
      <ShippingContent />
    </ProtectedRoute>
  );
}
```

## การเพิ่ม Permission ID ใหม่

1. เพิ่ม permission ใน `constants/permissions.ts`:
```typescript
export const PERMISSIONS = {
  ACCESS_SHIPPING_PAGE: 'AccessShippingPage',
  ACCESS_COLLECTOR_PAGE: 'AccessCollectorPage',
  ACCESS_MASTER_DATA_PAGE: 'AccessMasterDataPage',
  ACCESS_NEW_PAGE: 'AccessNewPage', // เพิ่มใหม่
} as const;
```

2. เพิ่มใน navbar (`components/ResponsiveAppBar.tsx`):
```typescript
const pages = [
  { label: 'Home', path: '/', permission: null },
  { label: 'Shipping', path: '/shipping', permission: PERMISSIONS.ACCESS_SHIPPING_PAGE },
  { label: 'New Page', path: '/new-page', permission: PERMISSIONS.ACCESS_NEW_PAGE }, // เพิ่มใหม่
];
```

3. ใช้ใน page component:
```typescript
<ProtectedRoute requiredPermission={PERMISSIONS.ACCESS_NEW_PAGE}>
  {/* Page content */}
</ProtectedRoute>
```

## API Reference

### usePermission Hook

```typescript
const {
  permissions,      // Permission[] - รายการ permissions ทั้งหมด
  isLoading,        // boolean - กำลังโหลด permissions หรือไม่
  hasPermission,    // (permissionId: string) => boolean - เช็คว่ามี permission หรือไม่
  refreshPermissions // () => Promise<void> - refresh permissions จาก API
} = usePermission();
```

### ProtectedRoute Props

```typescript
<ProtectedRoute
  requiredPermission="AccessShippingPage"  // Required - Permission ID ที่ต้องการ
  redirectTo="/"                           // Optional - หน้าที่จะ redirect ถ้าไม่มีสิทธิ์ (default: '/')
>
  {children}
</ProtectedRoute>
```

## Flow การทำงาน

1. User เข้าสู่ระบบ → ได้ employeeId จาก session
2. PermissionProvider fetch permissions จาก API `/Permission/clientidempid/{appID}/{emp_id}`
3. Permissions ถูกเก็บใน Context
4. ResponsiveAppBar filter เมนูที่แสดงตาม permissions
5. ProtectedRoute เช็คว่า user มีสิทธิ์เข้าถึงหน้านั้นหรือไม่
6. หากไม่มีสิทธิ์ → redirect ไป home
7. หากมีสิทธิ์ → แสดง page content

## หมายเหตุ

- ResponsiveAppBar จะซ่อนเมนูที่ user ไม่มีสิทธิ์อัตโนมัติ
- ProtectedRoute จะป้องกันการ bypass URL โดยการพิมพ์ URL โดยตรง
- Permissions จะถูก fetch ครั้งเดียวเมื่อ component mount หากต้องการ refresh ให้เรียก `refreshPermissions()`
- Permission checking ทำงานแบบ client-side เท่านั้น สำหรับ server-side ควรเพิ่ม middleware เพิ่มเติม
