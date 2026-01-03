'use client';

import ShippingLabelTemplate from '@/components/ShippingLabelTemplate';
import { billingColumns } from '@/interface/component';
import { dataTableForSapApi } from '@/lib/api/data-table-form-sap';
import { printLabelTransportApi } from '@/lib/api/print-label-transport';
import { transportByApi } from '@/lib/api/transport-by';
import type { IPrintLabelTransport } from '@/types/backend/print-label-transport';
import type { ITransportBy } from '@/types/backend/transport-by';
import type { ShippingLabelData } from '@/types/shippingLabel';
import type { BillingRow } from '@/types/transport';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Select from '@mui/material/Select';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRowId,
  GridRowSelectionModel,
} from '@mui/x-data-grid';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import React from 'react';

// Zebra Browser Print REST API helper (no SDK needed)
interface ZebraPrinter {
  deviceType: string;
  uid: string;
  provider: string;
  name: string;
  connection: string;
  version: number;
  manufacturer: string;
}

interface ZebraDeviceResponse {
  printer?: ZebraPrinter[];
}

// Helper function to convert cm to dots based on DPI
const cmToDots = (cm: number, dpi: number): number => {
  const inches = cm / 2.54; // Convert cm to inches
  return Math.round(inches * dpi); // Convert inches to dots
};

// Helper function to resize canvas to fit label size
const resizeCanvas = (
  sourceCanvas: HTMLCanvasElement,
  maxWidth: number,
  maxHeight: number,
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Calculate scaling to fit within max dimensions while maintaining aspect ratio
  const scale = Math.min(
    maxWidth / sourceCanvas.width,
    maxHeight / sourceCanvas.height,
  );

  canvas.width = maxWidth;
  canvas.height = maxHeight;

  // Fill with white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Disable image smoothing for sharper text
  ctx.imageSmoothingEnabled = false;

  // Calculate centered position
  const scaledWidth = sourceCanvas.width * scale;
  const scaledHeight = sourceCanvas.height * scale;
  const x = (canvas.width - scaledWidth) / 2;
  const y = (canvas.height - scaledHeight) / 2;

  // Draw scaled image
  ctx.drawImage(sourceCanvas, x, y, scaledWidth, scaledHeight);

  return canvas;
};

// Helper function to convert canvas to ZPL hex format with better quality
const canvasToZplHex = async (canvas: HTMLCanvasElement): Promise<string> => {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Step 1: Apply aggressive contrast enhancement for sharper text
  const contrastFactor = 3.5; // Maximum contrast for ultra-crisp edges
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(
      255,
      Math.max(0, contrastFactor * (data[i] - 128) + 128),
    ); // R
    data[i + 1] = Math.min(
      255,
      Math.max(0, contrastFactor * (data[i + 1] - 128) + 128),
    ); // G
    data[i + 2] = Math.min(
      255,
      Math.max(0, contrastFactor * (data[i + 2] - 128) + 128),
    ); // B
  }

  // Step 2: Apply stronger sharpening filter for crisp edges
  const sharpenedData = new Uint8ClampedArray(data);
  const kernel = [0, -1, 0, -1, 7, -1, 0, -1, 0]; // Stronger sharpening

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        // RGB channels only
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            sum += data[idx] * kernel[kernelIdx];
          }
        }
        const idx = (y * width + x) * 4 + c;
        sharpenedData[idx] = Math.min(255, Math.max(0, sum));
      }
    }
  }

  // Convert to monochrome bitmap with aggressive threshold
  const bytesPerRow = Math.ceil(width / 8);
  const hexData: string[] = [];

  for (let y = 0; y < height; y++) {
    let rowHex = '';
    for (let x = 0; x < bytesPerRow; x++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const pixelX = x * 8 + bit;
        if (pixelX < width) {
          const i = (y * width + pixelX) * 4;
          const r = sharpenedData[i];
          const g = sharpenedData[i + 1];
          const b = sharpenedData[i + 2];
          const a = sharpenedData[i + 3];

          // Use weighted brightness calculation for better text clarity
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

          // Optimized threshold for crisp, bold black text
          const threshold = 180; // Aggressive threshold for bolder text
          const isBlack = a > 128 && brightness < threshold;

          if (isBlack) {
            byte |= 1 << (7 - bit);
          }
        }
      }
      rowHex += byte.toString(16).padStart(2, '0').toUpperCase();
    }
    hexData.push(rowHex);
  }

  return hexData.join('');
};

// Helper function to create ZPL command for image
const createZplImageCommand = async (
  canvas: HTMLCanvasElement,
  x = 0,
  y = 0,
): Promise<string> => {
  const width = canvas.width;
  const height = canvas.height;
  const bytesPerRow = Math.ceil(width / 8);
  const totalBytes = bytesPerRow * height;
  const hexData = await canvasToZplHex(canvas);

  return `^GFA,${totalBytes},${totalBytes},${bytesPerRow},${hexData}`;
};

// Helper function to check if Zebra Browser Print service is running
const checkZebraBrowserPrintService = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:9100/available', {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Helper function to get Zebra printer via REST API
const getZebraPrinter = async (): Promise<ZebraPrinter> => {
  try {
    const response = await fetch('http://localhost:9100/available', {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to connect to Zebra Browser Print');
    }

    const data: ZebraDeviceResponse = await response.json();

    if (!data.printer || data.printer.length === 0) {
      throw new Error(
        'No Zebra printer found. Please check:\n' +
          '1. Zebra printer is connected and turned on\n' +
          '2. Printer is recognized in Zebra Browser Print application',
      );
    }

    return data.printer[0];
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      'Failed to connect to Zebra Browser Print. Please make sure:\n' +
        '1. Zebra Browser Print application is installed and running\n' +
        '2. Service is accessible at http://localhost:9100',
    );
  }
};

// Helper function to send ZPL to printer via REST API
const sendZplToPrinter = async (
  printer: ZebraPrinter,
  zpl: string,
): Promise<void> => {
  const response = await fetch('http://localhost:9100/write', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      device: {
        name: printer.name,
        uid: printer.uid,
        connection: printer.connection,
        deviceType: printer.deviceType,
        version: printer.version,
        provider: printer.provider,
        manufacturer: printer.manufacturer,
      },
      data: zpl,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send to printer: ${error}`);
  }
};

function PrintLabelTab() {
  const [from, setFrom] = React.useState<Dayjs | null>(null);
  const [to, setTo] = React.useState<Dayjs | null>(null);
  const [rows, setRows] = React.useState<BillingRow[]>([]);
  const [selectionModel, setSelectionModel] = React.useState<GridRowId[]>([]);
  const [labels, setLabels] = React.useState<ShippingLabelData[]>([]);
  const [generatingPdf, setGeneratingPdf] = React.useState(false);
  const [printingZpl, setPrintingZpl] = React.useState(false);
  const [loadingMessage, setLoadingMessage] = React.useState<string>('');
  const previewRef = React.useRef<HTMLDivElement | null>(null);
  const [transportOptions, setTransportOptions] = React.useState<ITransportBy[]>(
    [],
  );
  const [labelDpi, setLabelDpi] = React.useState<number>(203); // Default: 203 DPI for GC420T to ensure 10x10cm label size
  const [darkness, setDarkness] = React.useState<number>(30); // Maximum darkness for crisp black text (range 0-30)
  const [loading, setLoading] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [paginationModel, setPaginationModel] =
    React.useState<GridPaginationModel>({
      page: 0,
      pageSize: 10,
    });
  const totalBillingColumns = billingColumns.length;
  const [missingTransportIds, setMissingTransportIds] = React.useState<
    Set<GridRowId>
  >(() => new Set());
  const [missingBoxIds, setMissingBoxIds] = React.useState<Set<GridRowId>>(
    () => new Set(),
  );
  const [fromError, setFromError] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: 'info' | 'warning' | 'error' | 'success';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogTransportDate, setDialogTransportDate] =
    React.useState<Dayjs | null>(dayjs());
  const [dialogRound, setDialogRound] = React.useState<string>('1');
  const [pendingAction, setPendingAction] = React.useState<
    'pdf' | 'zebra' | null
  >(null);

  // Calculate button text based on selected rows' transport_by
  const buttonTexts = React.useMemo(() => {
    const selectedRows = rows.filter((row) => selectionModel.includes(row.id));
    const withBoxes = selectedRows.filter((row) => Number(row.box) > 0);
    const printableRows = withBoxes.filter(
      (row) => row.transportBy && String(row.transportBy).trim() !== '',
    );

    if (printableRows.length === 0) {
      return {
        pdfButton: 'Save And Print PDF',
        zebraButton: 'Save And Print To Zebra',
      };
    }

    const allTruck = printableRows.every(
      (row) => String(row.transportBy).toLowerCase() === 'truck',
    );

    return {
      pdfButton: allTruck ? 'Save' : 'Save And Print PDF',
      zebraButton: allTruck ? 'Save' : 'Save And Print To Zebra',
    };
  }, [rows, selectionModel]);

  const formatBillingDateParam = (date: Dayjs | null) => {
    if (!date || !date.isValid()) return undefined;
    return `${date.format('YYYY-MM-DD')}`;
  };

  const formatBillingDateDisplay = (value?: string | null) => {
    if (!value) return '';
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format('DD.MM.YYYY') : value;
  };

  const parseBillingDate = (value?: string | null) => {
    if (!value) return null;
    const parsed = dayjs(value, 'DD.MM.YYYY', true);
    return parsed.isValid() ? parsed.valueOf() : null;
  };

  const toApiBillingDate = (value?: string | null) => {
    if (!value) return undefined;
    const parsed = dayjs(value, 'DD.MM.YYYY');
    return parsed.isValid() ? `${parsed.format('YYYY-MM-DD')}T00:00:00` : value;
  };

  const toApiDateTime = (value?: string | null, fallbackNow = false) => {
    const formats = [
      'DD.MM.YYYY',
      'YYYY-MM-DD',
      'YYYY-MM-DDTHH:mm:ss',
    ] as const;
    const parsed =
      value &&
      (formats.reduce<dayjs.Dayjs | null>((acc, fmt) => {
        if (acc) return acc;
        const d = dayjs(value, fmt, true);
        return d.isValid() ? d : null;
      }, null) ||
        dayjs(value));

    if (parsed && parsed.isValid()) return parsed.format('YYYY-MM-DDTHH:mm:ss');
    if (fallbackNow) return dayjs().format('YYYY-MM-DDTHH:mm:ss');
    return null;
  };

  React.useEffect(() => {
    const fetchTransportOptions = async () => {
      try {
        const res = await transportByApi.getAll();
        if (res.data_model) {
          setTransportOptions(res.data_model ?? []);
        }
      } catch (error) {
        console.error('Failed to fetch transporters', error);
      }
    };
    fetchTransportOptions();
  }, []);

  const columns: GridColDef[] = React.useMemo(
    () =>
      billingColumns.map((col) => {
        const baseCol: GridColDef = {
          ...col,
          headerAlign: 'center',
          align: 'center',
          flex: 1,
          minWidth: 80,
        };
        if (col.field === 'billingDocument') {
          return {
            ...baseCol,
            colSpan: (params) =>
              params.id === 'no-data' ? totalBillingColumns : undefined,
            renderCell: (params) =>
              params.id === 'no-data'
                ? 'Billing Document not found.'
                : (params.value as string),
          };
        }
        if (col.field === 'transportBy') {
          return {
            ...baseCol,
            renderCell: (params) => (
              <Select
                size="small"
                value={params.row.transportBy ?? ''}
                onChange={(e) => {
                  const selected = transportOptions.find(
                    (opt) => opt.transport_code === e.target.value,
                  );
                  setRows((prev) =>
                    prev.map((row) =>
                      row.id === params.id
                        ? {
                            ...row,
                            transportBy: e.target.value,
                            transportByFullname: selected?.transport_name ?? '',
                          }
                        : row,
                    ),
                  );
                }}
                sx={{ width: '100%' }}
              >
                {transportOptions.map((opt) => {
                  const code = opt.transport_code || '';
                  const name = opt.transport_name || '';
                  return (
                    <MenuItem key={code} value={code} title={name || undefined}>
                      {code}
                    </MenuItem>
                  );
                })}
              </Select>
            ),
          };
        }

        if (col.field === 'box') {
          return {
            ...baseCol,
            renderCell: (params) => (
              <TextField
                type="number"
                size="small"
                value={params.row.box ?? ''}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setRows((prev) =>
                    prev.map((row) =>
                      row.id === params.id
                        ? { ...row, box: Number.isNaN(value) ? 0 : value }
                        : row,
                    ),
                  );
                }}
                inputProps={{ min: 0 }}
                sx={{
                  width: '100%',
                  '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button':
                    {
                      WebkitAppearance: 'none',
                      margin: 0,
                    },
                  '& input[type=number]': {
                    MozAppearance: 'textfield',
                  },
                }}
              />
            ),
          };
        }

        return col.field === 'billingDate'
          ? {
              ...baseCol,
              sortComparator: (a, b) => {
                const aTs = parseBillingDate(String(a ?? ''));
                const bTs = parseBillingDate(String(b ?? ''));
                if (aTs === null && bTs === null) return 0;
                if (aTs === null) return -1;
                if (bTs === null) return 1;
                return aTs - bTs;
              },
            }
          : baseCol;
      }),
    [transportOptions, setRows, totalBillingColumns],
  );

  const handleExecute = React.useCallback(async () => {
    if (!from) {
      setFromError(true);
      setSnackbar({
        open: true,
        message: 'Please select Billing Date From.',
        severity: 'warning',
      });
      return;
    }
    setFromError(false);

    const start = formatBillingDateParam(from);
    const end = formatBillingDateParam(to);
    setHasSearched(true);
    setLoading(true);
    try {
      const res = await dataTableForSapApi.searchByBillingDateJoined(
        start,
        end,
      );
      const mapped =
        res.data_model?.map((item, idx) => {
          const deliveryQty = Number(item.delivery_qty ?? 0);
          return {
            ...item,
            id: item.id ?? item.billing_document ?? idx,
            transportNo: '',
            transportDate: '',
            billingDocument: item.billing_document ?? '',
            billingDate: formatBillingDateDisplay(item.billing_date),
            shipTo: item.ship_to_code ?? '',
            shipToDescription: item.ship_to_name ?? '',
            deliveryQty: Number.isFinite(deliveryQty) ? deliveryQty : 0,
            salesUnit: item.sales_unit ?? '',
            salesDistrict: item.sales_district ?? '',
            salesDistrictDescription: item.sales_district_description ?? '',
            transportBy: item.transport_by ?? '',
            transportByFullname: item.transport_by_fullname ?? '',
            box: item.box ?? 0,
            receivedDate: null,
            trackingNo: '',
            signedDate: null,
            signedBy: '',
            status: '',
            sales_employee_team: item.sales_employee_team ?? '',
            sales_employee_team_code: item.sales_employee_team_code ?? '',
          } as unknown as BillingRow;
        }) ?? [];
      setRows(mapped);
      if (mapped.length === 0) {
        setSnackbar({
          open: true,
          message: 'Billing Document not found.',
          severity: 'info',
        });
      }
    } catch (error) {
      console.error('Failed to fetch billing data', error);
      setRows([]);
      setSnackbar({
        open: true,
        message: 'Failed to fetch billing data. Please try again.',
        severity: 'error',
      });
    }
    setSelectionModel([]);
    setLabels([]);
    setMissingTransportIds(new Set());
    setMissingBoxIds(new Set());
    setLoading(false);
  }, [from, to]);

  const handlePrint = () => {
    const selectedRows = rows.filter((row) => selectionModel.includes(row.id));
    const missingBox = selectedRows.filter((row) => Number(row.box) <= 0);
    setMissingBoxIds(new Set(missingBox.map((r) => r.id)));
    const withBoxes = selectedRows.filter((row) => Number(row.box) > 0);
    const missingTransport = withBoxes.filter(
      (row) => !row.transportBy || String(row.transportBy).trim() === '',
    );
    setMissingTransportIds(new Set(missingTransport.map((r) => r.id)));
    if (withBoxes.length === 0) {
      setSnackbar({
        open: true,
        message: 'No rows to print: BOX must be greater than 0.',
        severity: 'warning',
      });
      return;
    }
    if (missingTransport.length > 0) {
      setSnackbar({
        open: true,
        message:
          'Please select Transport by for highlighted rows before printing.',
        severity: 'warning',
      });
      return;
    }
    const printableRows = withBoxes.filter(
      (row) => row.transportBy && String(row.transportBy).trim() !== '',
    );
    if (printableRows.length === 0) {
      setSnackbar({
        open: true,
        message: 'No rows to print: Transport by is required.',
        severity: 'warning',
      });
      return;
    }

    // Check if all printable rows are Truck
    const allTruck = printableRows.every(
      (row) => String(row.transportBy).toLowerCase() === 'truck',
    );

    if (allTruck) {
      // All are Truck - skip dialog, use current date and auto-calculate round
      const now = new Date();
      const bangkokHour = (now.getUTCHours() + 7) % 24; // UTC+7
      const round = bangkokHour < 12 ? '1' : '2';

      setDialogTransportDate(dayjs());
      setDialogRound(round);
      setPendingAction('pdf');

      // Call handlePrintAfterDialog directly without opening dialog
      setTimeout(() => {
        handlePrintAfterDialog();
      }, 0);
    } else {
      // Open dialog to select transport_date and round
      setPendingAction('pdf');
      setDialogTransportDate(dayjs());
      setDialogRound('1');
      setDialogOpen(true);
    }
  };

  const handlePrintAfterDialog = async () => {
    const selectedRows = rows.filter((row) => selectionModel.includes(row.id));
    const withBoxes = selectedRows.filter((row) => Number(row.box) > 0);
    const printableRows = withBoxes.filter(
      (row) => row.transportBy && String(row.transportBy).trim() !== '',
    );

    // Check if all printable rows are Truck to determine loading message
    const allTruck = printableRows.every(
      (row) => String(row.transportBy).toLowerCase() === 'truck',
    );

    setGeneratingPdf(true);
    setLoadingMessage(allTruck ? 'Saving...' : 'Generating PDF...');

    try {
      const existing = await printLabelTransportApi.getAll();
      const existingList = existing.data_model ?? [];
      const now = dayjs().format('YYYY-MM-DDTHH:mm:ss');
      const roundValue = dialogRound; // Use round from dialog
      const transportDateValue = dialogTransportDate
        ? dialogTransportDate.format('YYYY-MM-DDTHH:mm:ss')
        : dayjs().format('YYYY-MM-DDTHH:mm:ss'); // Use transport_date from dialog

      await Promise.all(
        printableRows.map(async (row) => {
          const found = existingList.find(
            (item) => item.billing_document === row.billingDocument,
          );
          const transportDate = transportDateValue;
          const billingDate = toApiBillingDate(row.billingDate);
          const rowAny = row as any;
          const payloadBase = {
            billing_type: rowAny.billing_type || undefined,
            sales_order: rowAny.sales_order || undefined,
            transport_no:
              row.transportNo || found?.transport_no || undefined,
            transport_date: transportDate,
            billing_document: row.billingDocument || undefined,
            billing_date: billingDate || undefined,
            ship_to: row.shipTo || undefined,
            ship_to_description: row.shipToDescription || undefined,
            ship_to_code: row.shipTo || undefined,
            ship_to_name: row.shipToDescription || undefined,
            ship_to_address: rowAny.ship_to_address || undefined,
            tambon: rowAny.tambon || undefined,
            district: rowAny.district || undefined,
            postal_code: rowAny.postal_code || undefined,
            city: rowAny.city || undefined,
            telephone: rowAny.telephone || undefined,
            delivery_qty:
              row.deliveryQty !== undefined
                ? String(row.deliveryQty)
                : undefined,
            sales_unit: row.salesUnit || undefined,
            transport_by: row.transportBy || undefined,
            transport_by_fullname:
              row.transportByFullname || row.transportBy || undefined,
            sales_district: row.salesDistrict || undefined,
            sales_district_description:
              row.salesDistrictDescription || undefined,
            sales_organization:
              rowAny.sales_organization ||
              rowAny.salesOrganization ||
              undefined,
            distribution_channel:
              rowAny.distribution_channel ||
              rowAny.distributionChannel ||
              undefined,
            sold_to_code: rowAny.sold_to_code || rowAny.soldTo || undefined,
            sold_to_name: rowAny.sold_to_name || rowAny.soldToName || undefined,
            sales_employee_code:
              rowAny.sales_employee_code ||
              rowAny.salesEmployeeCode ||
              undefined,
            sales_employee_name:
              rowAny.sales_employee_name ||
              rowAny.salesEmployeeName ||
              undefined,
            sales_employee_team:
              rowAny.sales_employee_team ||
              rowAny.salesEmployeeTeam ||
              undefined,
            sales_employee_team_code:
              rowAny.sales_employee_team_code ||
              rowAny.salesEmployeeTeamCode ||
              undefined,
            item_no: rowAny.item_no || rowAny.itemNo || undefined,
            material_code:
              rowAny.material_code || rowAny.materialCode || undefined,
            material_description:
              rowAny.material_description ||
              rowAny.materialDescription ||
              undefined,
            material_group:
              rowAny.material_group || rowAny.materialGroup || undefined,
            plant: rowAny.plant || undefined,
            storage_location:
              rowAny.storage_location || rowAny.storageLocation || undefined,
            batch: rowAny.batch || undefined,
            manufacture_date: rowAny.manufacture_date || undefined,
            sled_or_bbd: rowAny.sled_or_bbd || undefined,
            round: roundValue,
            box:
              row.box !== undefined && row.box !== null
                ? Number(row.box)
                : null,
            received_date:
              toApiDateTime(row.receivedDate || undefined) || undefined,
            tracking_number: row.trackingNo || undefined,
            signed_date:
              toApiDateTime(row.signedDate || undefined) || undefined,
            signed_by: row.signedBy || undefined,
            status: row.status || undefined,
            received_confirm: rowAny.received_confirm ?? null,
            update_id: rowAny.update_id || undefined,
            print_status: true,
            print_date: now,
            update_at: now,
          } as Partial<IPrintLabelTransport>;

          if (!found) {
            await printLabelTransportApi.create(
              payloadBase as IPrintLabelTransport,
            );
          } else if (found.id) {
            await printLabelTransportApi.update({
              ...payloadBase,
              id: found.id,
              round: payloadBase.round,
              transport_date: payloadBase.transport_date,
            } as IPrintLabelTransport);
          }
        }),
      );
    } catch (error) {
      console.error('Failed to upsert print label transport', error);
      setSnackbar({
        open: true,
        message: 'Failed to save print history. Please try again.',
        severity: 'error',
      });
      setGeneratingPdf(false);
      setLoadingMessage('');
      return;
    }

    // Check if all printable rows are Truck (already checked at the beginning)
    if (allTruck) {
      // All are Truck - save only, no PDF generation
      setSnackbar({
        open: true,
        message: 'Data saved successfully (Truck transport only).',
        severity: 'success',
      });
      setGeneratingPdf(false);
      setLoadingMessage('');
      return;
    }

    // Filter out Truck rows for PDF generation
    const rowsForPdf = printableRows.filter(
      (row) => String(row.transportBy).toLowerCase() !== 'truck',
    );

    if (rowsForPdf.length === 0) {
      setSnackbar({
        open: true,
        message: 'No non-Truck rows to print.',
        severity: 'info',
      });
      setGeneratingPdf(false);
      setLoadingMessage('');
      return;
    }

    const labelPromises = rowsForPdf.map(async (row) => {
      const boxCountRaw = Number(row.box);
      const boxCount =
        Number.isFinite(boxCountRaw) && boxCountRaw > 0 ? boxCountRaw : 1;
      const totalSheets = boxCount;
      const now = new Date();
      const printedAt =
        typeof window !== 'undefined'
          ? `${String(now.getDate()).padStart(2, '0')}-${now.toLocaleDateString('en-US', { month: 'short' })}-${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
          : '';

      const rowAny = row as any;
      const shipToCode = row.shipTo || '';

      // Build address from parts
      const addressParts = [
        rowAny.ship_to_address,
        rowAny.tambon,
        rowAny.district,
        rowAny.city,
        rowAny.postal_code,
      ].filter((part) => part && String(part).trim() !== '');

      const shipToAddress = addressParts.join(' ');
      const telephone = rowAny.telephone || '';

      console.log('Address parts:', {
        ship_to_address: rowAny.ship_to_address,
        tambon: rowAny.tambon,
        district: rowAny.district,
        city: rowAny.city,
        postal_code: rowAny.postal_code,
        combined: shipToAddress,
      });

      // Generate QR Code (async)
      const qrCodeDataUrl = await QRCode.toDataURL(row.billingDocument ?? '', {
        width: 20,
        margin: 0,
      }).catch((err) => {
        console.error('Failed to generate QR code:', err);
        return '';
      });

      return Array.from({ length: boxCount }, (_, idx) => ({
        companyName: 'Osoth Inter Laboratories',
        customerName: row.shipToDescription ?? 'ลูกค้า',
        addressLines: shipToAddress ? [shipToAddress] : [],
        tel: telephone,
        orderNo: row.billingDocument ?? '',
        waybillNo: row.billingDocument ?? '',
        shippingType: row.transportByFullname || row.transportBy || '',
        route: row.salesDistrictDescription || row.salesDistrict || '',
        customerCode: shipToCode,
        printedAt,
        totalSheets,
        sheetNo: idx + 1,
        stampText: '',
        remark: idx + 1 === 1 ? 'Invoice' : '',
        qrCode: qrCodeDataUrl,
      }));
    });

    const generated = await Promise.all(labelPromises);
    const labelsData = generated.flat();
    setLabels(labelsData);

    // Wait for DOM to render labels
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Generate PDF
    if (!previewRef.current) {
      setGeneratingPdf(false);
      setLoadingMessage('');
      return;
    }

    const labelNodes = Array.from(
      previewRef.current.querySelectorAll('.shipping-label'),
    ) as HTMLElement[];

    if (labelNodes.length === 0) {
      setSnackbar({
        open: true,
        message: 'No labels found to generate PDF.',
        severity: 'warning',
      });
      setGeneratingPdf(false);
      setLoadingMessage('');
      return;
    }

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [100, 100], // 10cm x 10cm
      });

      for (let i = 0; i < labelNodes.length; i += 1) {
        const node = labelNodes[i];
        const canvas = await html2canvas(node, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        const width = 100;
        const height = (imgProps.height * width) / imgProps.width;
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      }

      const blobUrl = pdf.output('bloburl');
      const url = typeof blobUrl === 'string' ? blobUrl : String(blobUrl);
      if (typeof window !== 'undefined') {
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('Failed to generate PDF', err);
      setSnackbar({
        open: true,
        message: 'Failed to generate PDF. Please try again.',
        severity: 'error',
      });
    } finally {
      setGeneratingPdf(false);
      setLoadingMessage('');
    }
  };

  const handlePrintZPL = () => {
    const selectedRows = rows.filter((row) => selectionModel.includes(row.id));
    const missingBox = selectedRows.filter((row) => Number(row.box) <= 0);
    setMissingBoxIds(new Set(missingBox.map((r) => r.id)));
    const withBoxes = selectedRows.filter((row) => Number(row.box) > 0);
    const missingTransport = withBoxes.filter(
      (row) => !row.transportBy || String(row.transportBy).trim() === '',
    );
    setMissingTransportIds(new Set(missingTransport.map((r) => r.id)));

    if (withBoxes.length === 0) {
      setSnackbar({
        open: true,
        message: 'No rows to print: BOX must be greater than 0.',
        severity: 'warning',
      });
      return;
    }
    if (missingTransport.length > 0) {
      setSnackbar({
        open: true,
        message:
          'Please select Transport by for highlighted rows before printing.',
        severity: 'warning',
      });
      return;
    }

    const printableRows = withBoxes.filter(
      (row) => row.transportBy && String(row.transportBy).trim() !== '',
    );
    if (printableRows.length === 0) {
      setSnackbar({
        open: true,
        message: 'No rows to print: Transport by is required.',
        severity: 'warning',
      });
      return;
    }

    // Check if all printable rows are Truck
    const allTruck = printableRows.every(
      (row) => String(row.transportBy).toLowerCase() === 'truck',
    );

    if (allTruck) {
      // All are Truck - skip dialog, use current date and auto-calculate round
      const now = new Date();
      const bangkokHour = (now.getUTCHours() + 7) % 24; // UTC+7
      const round = bangkokHour < 12 ? '1' : '2';

      setDialogTransportDate(dayjs());
      setDialogRound(round);
      setPendingAction('zebra');

      // Call handlePrintZPLAfterDialog directly without opening dialog
      setTimeout(() => {
        handlePrintZPLAfterDialog();
      }, 0);
    } else {
      // Open dialog to select transport_date and round
      setPendingAction('zebra');
      setDialogTransportDate(dayjs());
      setDialogRound('1');
      setDialogOpen(true);
    }
  };

  const handlePrintZPLAfterDialog = async () => {
    const selectedRows = rows.filter((row) => selectionModel.includes(row.id));
    const withBoxes = selectedRows.filter((row) => Number(row.box) > 0);
    const printableRows = withBoxes.filter(
      (row) => row.transportBy && String(row.transportBy).trim() !== '',
    );

    // Check if all printable rows are Truck to determine loading message
    const allTruck = printableRows.every(
      (row) => String(row.transportBy).toLowerCase() === 'truck',
    );

    setPrintingZpl(true);
    setLoadingMessage(allTruck ? 'Saving...' : 'Printing to Zebra...');

    // Save to database first (same as handlePrint)
    try {
      const existing = await printLabelTransportApi.getAll();
      const existingList = existing.data_model ?? [];
      const now = dayjs().format('YYYY-MM-DDTHH:mm:ss');
      const roundValue = dialogRound; // Use round from dialog
      const transportDateValue = dialogTransportDate
        ? dialogTransportDate.format('YYYY-MM-DDTHH:mm:ss')
        : dayjs().format('YYYY-MM-DDTHH:mm:ss'); // Use transport_date from dialog

      await Promise.all(
        printableRows.map(async (row) => {
          const found = existingList.find(
            (item) => item.billing_document === row.billingDocument,
          );
          const transportDate = transportDateValue;
          const billingDate = toApiBillingDate(row.billingDate);
          const rowAny = row as any;
          const payloadBase = {
            billing_type: rowAny.billing_type || undefined,
            sales_order: rowAny.sales_order || undefined,
            transport_no:
              row.transportNo || found?.transport_no || undefined,
            transport_date: transportDate,
            billing_document: row.billingDocument || undefined,
            billing_date: billingDate || undefined,
            ship_to: row.shipTo || undefined,
            ship_to_description: row.shipToDescription || undefined,
            ship_to_code: row.shipTo || undefined,
            ship_to_name: row.shipToDescription || undefined,
            ship_to_address: rowAny.ship_to_address || undefined,
            tambon: rowAny.tambon || undefined,
            district: rowAny.district || undefined,
            postal_code: rowAny.postal_code || undefined,
            city: rowAny.city || undefined,
            telephone: rowAny.telephone || undefined,
            delivery_qty:
              row.deliveryQty !== undefined
                ? String(row.deliveryQty)
                : undefined,
            sales_unit: row.salesUnit || undefined,
            transport_by: row.transportBy || undefined,
            transport_by_fullname:
              row.transportByFullname || row.transportBy || undefined,
            sales_district: row.salesDistrict || undefined,
            sales_district_description:
              row.salesDistrictDescription || undefined,
            sales_organization:
              rowAny.sales_organization ||
              rowAny.salesOrganization ||
              undefined,
            distribution_channel:
              rowAny.distribution_channel ||
              rowAny.distributionChannel ||
              undefined,
            sold_to_code: rowAny.sold_to_code || rowAny.soldTo || undefined,
            sold_to_name: rowAny.sold_to_name || rowAny.soldToName || undefined,
            sales_employee_code:
              rowAny.sales_employee_code ||
              rowAny.salesEmployeeCode ||
              undefined,
            sales_employee_name:
              rowAny.sales_employee_name ||
              rowAny.salesEmployeeName ||
              undefined,
            sales_employee_team:
              rowAny.sales_employee_team ||
              rowAny.salesEmployeeTeam ||
              undefined,
            sales_employee_team_code:
              rowAny.sales_employee_team_code ||
              rowAny.salesEmployeeTeamCode ||
              undefined,
            item_no: rowAny.item_no || rowAny.itemNo || undefined,
            material_code:
              rowAny.material_code || rowAny.materialCode || undefined,
            material_description:
              rowAny.material_description ||
              rowAny.materialDescription ||
              undefined,
            material_group:
              rowAny.material_group || rowAny.materialGroup || undefined,
            plant: rowAny.plant || undefined,
            storage_location:
              rowAny.storage_location || rowAny.storageLocation || undefined,
            batch: rowAny.batch || undefined,
            manufacture_date: rowAny.manufacture_date || undefined,
            sled_or_bbd: rowAny.sled_or_bbd || undefined,
            round: roundValue,
            box:
              row.box !== undefined && row.box !== null
                ? Number(row.box)
                : null,
            received_date:
              toApiDateTime(row.receivedDate || undefined) || undefined,
            tracking_number: row.trackingNo || undefined,
            signed_date:
              toApiDateTime(row.signedDate || undefined) || undefined,
            signed_by: row.signedBy || undefined,
            status: row.status || undefined,
            received_confirm: rowAny.received_confirm ?? null,
            update_id: rowAny.update_id || undefined,
            print_status: true,
            print_date: now,
            update_at: now,
          } as Partial<IPrintLabelTransport>;

          if (!found) {
            await printLabelTransportApi.create(
              payloadBase as IPrintLabelTransport,
            );
          } else if (found.id) {
            await printLabelTransportApi.update({
              ...payloadBase,
              id: found.id,
              round: payloadBase.round,
              transport_date: payloadBase.transport_date,
            } as IPrintLabelTransport);
          }
        }),
      );
    } catch (error) {
      console.error('Failed to upsert print label transport', error);
      setSnackbar({
        open: true,
        message: 'Failed to save print history. Please try again.',
        severity: 'error',
      });
      setPrintingZpl(false);
      setLoadingMessage('');
      return;
    }

    // Check if all printable rows are Truck (already checked at the beginning)
    if (allTruck) {
      // All are Truck - save only, no Zebra printing
      setSnackbar({
        open: true,
        message: 'Data saved successfully (Truck transport only).',
        severity: 'success',
      });
      setPrintingZpl(false);
      setLoadingMessage('');
      return;
    }

    // Filter out Truck rows for Zebra printing
    const rowsForZebra = printableRows.filter(
      (row) => String(row.transportBy).toLowerCase() !== 'truck',
    );

    if (rowsForZebra.length === 0) {
      setSnackbar({
        open: true,
        message: 'No non-Truck rows to print.',
        severity: 'info',
      });
      setPrintingZpl(false);
      setLoadingMessage('');
      return;
    }

    // Now check Zebra service and print
    try {
      // Check if Zebra Browser Print service is running
      const serviceRunning = await checkZebraBrowserPrintService();
      if (!serviceRunning) {
        throw new Error(
          'Zebra Browser Print service is not running.\n\n' +
            'Please make sure:\n' +
            '1. Zebra Browser Print is installed\n' +
            '2. The application is running (check system tray)\n' +
            '3. Service is accessible at http://localhost:9100',
        );
      }

      // Generate labels data
      const labelPromises = rowsForZebra.map(async (row) => {
        const boxCountRaw = Number(row.box);
        const boxCount =
          Number.isFinite(boxCountRaw) && boxCountRaw > 0 ? boxCountRaw : 1;
        const totalSheets = boxCount;
        const now = new Date();
        const printedAt =
          typeof window !== 'undefined'
            ? `${String(now.getDate()).padStart(2, '0')}-${now.toLocaleDateString('en-US', { month: 'short' })}-${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
            : '';

        const rowAny = row as any;
        const shipToCode = row.shipTo || '';
        const addressParts = [
          rowAny.ship_to_address,
          rowAny.tambon,
          rowAny.district,
          rowAny.city,
          rowAny.postal_code,
        ].filter((part) => part && String(part).trim() !== '');
        const shipToAddress = addressParts.join(' ');
        const telephone = rowAny.telephone || '';
        const qrCodeDataUrl = await QRCode.toDataURL(
          row.billingDocument ?? '',
          { width: 20, margin: 0 },
        ).catch((err) => {
          console.error('Failed to generate QR code:', err);
          return '';
        });

        return Array.from({ length: boxCount }, (_, idx) => ({
          companyName: 'Osoth Inter Laboratories',
          customerName: row.shipToDescription ?? 'ลูกค้า',
          addressLines: shipToAddress ? [shipToAddress] : [],
          tel: telephone,
          orderNo: row.billingDocument ?? '',
          waybillNo: row.billingDocument ?? '',
          shippingType: row.transportByFullname || row.transportBy || '',
          route: row.salesDistrictDescription || row.salesDistrict || '',
          customerCode: shipToCode,
          printedAt,
          totalSheets,
          sheetNo: idx + 1,
          stampText: '',
          remark: idx + 1 === 1 ? 'Invoice' : '',
          qrCode: qrCodeDataUrl,
        }));
      });

      const generated = await Promise.all(labelPromises);
      const labelsData = generated.flat();
      setLabels(labelsData);

      // Wait a bit for DOM to render labels
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get Zebra printer
      const printer = await getZebraPrinter();

      // Convert each label to ZPL and send to printer
      const labelNodes = Array.from(
        previewRef.current?.querySelectorAll('.shipping-label') || [],
      ) as HTMLElement[];

      if (labelNodes.length === 0) {
        throw new Error('No labels found to print');
      }

      // Calculate label size in dots based on DPI (10cm x 10cm)
      const labelWidth = cmToDots(10, labelDpi);
      const labelHeight = cmToDots(10, labelDpi);

      for (let i = 0; i < labelNodes.length; i++) {
        const node = labelNodes[i];
        // Ultra-high scale for maximum text quality
        const sourceCanvas = await html2canvas(node, {
          scale: 8, // Increased from 5 to 8 for maximum sharpness
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          imageTimeout: 0,
          removeContainer: true,
        });

        // Resize canvas to fit label size based on DPI
        const resizedCanvas = resizeCanvas(
          sourceCanvas,
          labelWidth,
          labelHeight,
        );

        // Create ZPL command
        const imageCommand = await createZplImageCommand(resizedCanvas, 0, 0);
        // Label size: 10cm x 10cm (calculated based on DPI)
        // PR = slowest print speed for maximum quality
        // SD = darkness level (30 = maximum)
        // MN = media tracking (N = continuous)
        // PM = print mode (0 = tear-off)
        const zpl = `^XA
^PW${labelWidth}
^LL${labelHeight}
^MNN
^SD${darkness}
^PR1,1,1
^PM0
^LH0,0
^FO0,0${imageCommand}^FS
^XZ`;

        // Send to printer via REST API
        await sendZplToPrinter(printer, zpl);

        // Small delay between prints
        if (i < labelNodes.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      setSnackbar({
        open: true,
        message: `Successfully printed ${labelNodes.length} label(s) to Zebra printer`,
        severity: 'success',
      });
    } catch (error) {
      console.error('Failed to print to Zebra:', error);
      setSnackbar({
        open: true,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to print to Zebra printer. Please check Zebra Browser Print is installed and running.',
        severity: 'error',
      });
    } finally {
      setPrintingZpl(false);
      setLoadingMessage('');
    }
  };

  const handleDialogConfirm = () => {
    setDialogOpen(false);
    if (pendingAction === 'pdf') {
      handlePrintAfterDialog();
    } else if (pendingAction === 'zebra') {
      handlePrintZPLAfterDialog();
    }
  };

  const handleDialogCancel = () => {
    setDialogOpen(false);
    setPendingAction(null);
  };

  return (
    <>
      <Card sx={{ maxWidth: '100%' }}>
        <Box sx={{ bgcolor: '#1F2175', px: 2, py: 1.5 }}>
          <Typography variant="h6" component="div" sx={{ color: 'white' }}>
            Get Billing For Transport
          </Typography>
        </Box>
        <CardContent>
          <LocalizationProvider
            dateAdapter={AdapterDayjs}
            adapterLocale="en-gb"
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                mt: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  mt: 3,
                }}
              >
                <Typography sx={{ minWidth: 90, textAlign: 'center' }}>
                  Billing Date
                </Typography>

                <DatePicker
                  label="From"
                  format="DD/MM/YYYY"
                  value={from}
                  onChange={(date) => {
                    setFrom(date);
                    setFromError(false);
                    if (date) setTo(date);
                  }}
                  slotProps={{
                    textField: {
                      size: 'small',
                      error: fromError,
                      helperText: fromError ? 'Required' : undefined,
                      sx: { width: 180, bgcolor: 'white' },
                    },
                  }}
                />

                <Typography textAlign="center">To</Typography>

                <DatePicker
                  label="To"
                  format="DD/MM/YYYY"
                  value={to}
                  onChange={(date) => setTo(date)}
                  slotProps={{
                    textField: {
                      size: 'small',
                      sx: { width: 180, bgcolor: 'white' },
                    },
                  }}
                />
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  width: '100%',
                }}
              >
                <Button
                  variant="contained"
                  onClick={handleExecute}
                  sx={{
                    px: 6,
                  }}
                >
                  Execute
                </Button>
              </Box>
            </Box>
          </LocalizationProvider>
        </CardContent>
      </Card>

      {hasSearched && rows.length > 0 && (
        <Card sx={{ maxWidth: '100%', mt: 3 }}>
          <Box sx={{ bgcolor: '#1F2175', px: 2, py: 1.5 }}>
            <Typography variant="h6" component="div" sx={{ color: 'white' }}>
              Print Shipping Label
            </Typography>
          </Box>
          <CardContent>
            <DataGrid
              rows={rows}
              columns={columns}
              checkboxSelection
              disableRowSelectionOnClick
              autoHeight
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[5, 10, 25, 50, 100]}
              loading={loading}
              getRowClassName={(params) => {
                if (missingTransportIds.has(params.id))
                  return 'missing-transport';
                if (missingBoxIds.has(params.id)) return 'missing-box';
                return '';
              }}
              onRowSelectionModelChange={(newSelection) => {
                const model = newSelection as GridRowSelectionModel;
                if (model && typeof model === 'object' && 'ids' in model) {
                  if (model.type === 'exclude') {
                    const excludedIds = new Set(model.ids);
                    const selectedIds = rows
                      .map((row) => row.id)
                      .filter((id) => !excludedIds.has(id));
                    setSelectionModel(selectedIds);
                  } else {
                    setSelectionModel(Array.from(model.ids));
                  }
                } else if (Array.isArray(newSelection)) {
                  setSelectionModel(newSelection as GridRowId[]);
                }
              }}
              rowSelectionModel={
                {
                  type: 'include',
                  ids: new Set(selectionModel),
                } as GridRowSelectionModel
              }
              sx={{
                backgroundColor: 'white',
                width: '100%',
                '& .MuiDataGrid-root': {
                  overflowX: 'hidden',
                },
                '& .MuiDataGrid-columnHeader': {
                  padding: '8px 4px',
                },
                '& .MuiDataGrid-cell': {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'normal !important',
                  wordWrap: 'break-word',
                  wordBreak: 'break-word',
                  lineHeight: '1.2',
                  padding: '8px 4px',
                  overflow: 'hidden',
                  textOverflow: 'clip',
                },
                '& .MuiDataGrid-columnHeaders': {
                  textAlign: 'center',
                },
                '& .MuiDataGrid-columnHeaderTitle': {
                  whiteSpace: 'normal !important',
                  wordWrap: 'break-word',
                  wordBreak: 'break-word',
                  lineHeight: '1.2',
                  overflow: 'hidden',
                  textOverflow: 'clip',
                  fontSize: '0.875rem',
                },
                '& .MuiDataGrid-columnHeaderTitleContainer': {
                  overflow: 'hidden',
                  padding: 0,
                },
                '& .missing-transport .MuiDataGrid-cell': {
                  backgroundColor: '#ffebee',
                },
                '& .missing-box .MuiDataGrid-cell': {
                  backgroundColor: '#fff3e0',
                },
              }}
            />

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
                mt: 3,
                gap: 2,
              }}
            >
              <Button
                variant="contained"
                onClick={handlePrint}
                disabled={selectionModel.length === 0 || rows.length === 0}
                sx={{ px: 6 }}
              >
                {buttonTexts.pdfButton}
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={handlePrintZPL}
                disabled={
                  selectionModel.length === 0 ||
                  rows.length === 0 ||
                  printingZpl
                }
                sx={{ px: 6 }}
              >
                {printingZpl ? 'Printing...' : buttonTexts.zebraButton}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Hidden/offscreen container for PDF generation */}
      {labels.length > 0 && (
        <Box
          ref={previewRef}
          sx={{
            position: 'absolute',
            left: -99999,
            top: 0,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            opacity: 0,
            pointerEvents: 'none',
          }}
        >
          {labels.map((label, idx) => (
            <ShippingLabelTemplate
              key={idx}
              data={label}
              className="shipping-label"
            />
          ))}
        </Box>
      )}

      {loadingMessage && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.35)',
            zIndex: 1400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <CircularProgress color="inherit" sx={{ color: 'white' }} />
          <Typography variant="body2" sx={{ color: 'white' }}>
            {loadingMessage}
          </Typography>
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={handleDialogCancel} maxWidth="sm" fullWidth>
        <DialogTitle>เลือกวันที่และรอบการส่ง</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <LocalizationProvider
              dateAdapter={AdapterDayjs}
              adapterLocale="en-gb"
            >
              <DatePicker
                label="วันที่ส่ง (Transport Date)"
                format="DD/MM/YYYY"
                value={dialogTransportDate}
                onChange={(date) => setDialogTransportDate(date)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                  },
                }}
              />
            </LocalizationProvider>

            <FormControl component="fieldset">
              <FormLabel component="legend">รอบการส่ง (Round)</FormLabel>
              <RadioGroup
                value={dialogRound}
                onChange={(e) => setDialogRound(e.target.value)}
                sx={{ mt: 1 }}
              >
                <FormControlLabel
                  value="1"
                  control={<Radio />}
                  label="รอบที่ 1 - เช้า"
                />
                <FormControlLabel
                  value="2"
                  control={<Radio />}
                  label="รอบที่ 2 - บ่าย"
                />
              </RadioGroup>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogCancel} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleDialogConfirm}
            variant="contained"
            disabled={!dialogTransportDate}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default PrintLabelTab;
