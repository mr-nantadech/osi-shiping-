// Permission IDs that match the backend permission system
export const PERMISSIONS = {
  ACCESS_SHIPPING_PAGE: 'AccessShippingPage',
  ACCESS_COLLECTOR_PAGE: 'AccessCollectorPage',
  ACCESS_MASTER_DATA_PAGE: 'AccessMasterPage',
} as const;

export type PermissionId = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
