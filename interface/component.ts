import { GridColDef } from '@mui/x-data-grid';

export const billingColumns: GridColDef[] = [
  {
    field: 'billingDocument',
    headerName: 'Billing Document',
    width: 160,
    headerAlign: 'center',
  },
  {
    field: 'billingDate',
    headerName: 'Billing Date',
    width: 140,
    headerAlign: 'center',
  },
  { field: 'shipTo', headerName: 'ShipTo', width: 120, headerAlign: 'center' },
  {
    field: 'shipToDescription',
    headerName: 'Ship to Description',
    width: 250,
    headerAlign: 'center',
  },
  {
    field: 'deliveryQty',
    headerName: 'Delivery Qty',
    type: 'number',
    width: 120,
    headerAlign: 'center',
  },
  {
    field: 'salesUnit',
    headerName: 'Sales Unit',
    width: 120,
    headerAlign: 'center',
  },
  {
    field: 'salesDistrict',
    headerName: 'Sales District',
    width: 140,
    headerAlign: 'center',
  },
  {
    field: 'salesDistrictDescription',
    headerName: 'Sales District Description',
    width: 220,
    headerAlign: 'center',
  },
  {
    field: 'transportBy',
    headerName: 'Transport by',
    width: 140,
    headerAlign: 'center',
  },
  {
    field: 'box',
    headerName: 'BOX',
    type: 'number',
    width: 100,
    headerAlign: 'center',
  },
];

export const transportColumns: GridColDef[] = [
  {
    field: 'transportNo',
    headerName: 'Transport No.',
    width: 160,
    headerAlign: 'center',
  },
  {
    field: 'transportDate',
    headerName: 'Transport Date',
    width: 140,
    headerAlign: 'center',
  },

  ...billingColumns,

  {
    field: 'receivedDate',
    headerName: 'วันที่รับสินค้า',
    width: 160,
    headerAlign: 'center',
  },
  {
    field: 'trackingNo',
    headerName: 'เลขพัสดุ',
    width: 180,
    headerAlign: 'center',
  },
  {
    field: 'signedDate',
    headerName: 'วันที่เซ็นต์รับ',
    width: 160,
    headerAlign: 'center',
  },
  {
    field: 'signedBy',
    headerName: 'ผู้เซ็นต์รับ',
    width: 200,
    headerAlign: 'center',
  },
  {
    field: 'status',
    headerName: 'สถานะ',
    width: 250,
    headerAlign: 'center',
  },
];

export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
