'use client';

import { incomeApi } from '@/lib/api/income';
import type { IIncome } from '@/types/backend/income';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import {
  DataGrid,
  GridColDef,
  GridRowId,
  GridRowSelectionModel,
} from '@mui/x-data-grid';
import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

// Helper function to format date from ISO to DD.MM.YYYY
const formatDate = (dateValue: Date | string | null | undefined): string => {
  if (!dateValue) return '';
  try {
    const date = new Date(dateValue);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return '';
  }
};

// Helper function to format date for Excel import
const formatExcelDate = (
  dateValue?: string | number | null,
  fieldName?: string,
): string | null => {
  if (!dateValue || dateValue === 0 || dateValue === '0') {
    console.log(
      `formatExcelDate: ${fieldName} is empty/null/undefined/zero:`,
      dateValue,
    );
    return null;
  }

  // If it's a number, convert from Excel serial date
  if (typeof dateValue === 'number') {
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 86400000);
    const result = dayjs(date).format('YYYY-MM-DDTHH:mm:ss');
    console.log(
      `formatExcelDate: ${fieldName} number ${dateValue} → ${result}`,
    );
    return result;
  }

  // Convert to string and trim
  const dateStr = String(dateValue).trim();
  if (!dateStr) {
    console.log(`formatExcelDate: ${fieldName} is empty string after trim`);
    return null;
  }

  // If it's a string, try multiple formats
  // Note: Using DD/MM/YYYY (day/month/year) format from Excel, NOT MM/DD/YYYY
  // Excel can export dates with single or double digit days/months (e.g., "22/1/2026" or "22/01/2026")
  const formats = [
    // Slash separator (/) - most common from Excel
    'D/M/YYYY',    // e.g., "1/1/2026"
    'DD/M/YYYY',   // e.g., "22/1/2026"
    'D/MM/YYYY',   // e.g., "1/01/2026"
    'DD/MM/YYYY',  // e.g., "22/01/2026"
    // Dot separator (.)
    'D.M.YYYY',    // e.g., "1.1.2026"
    'DD.M.YYYY',   // e.g., "22.1.2026"
    'D.MM.YYYY',   // e.g., "1.01.2026"
    'DD.MM.YYYY',  // e.g., "22.01.2026"
    // Dash separator (-)
    'D-M-YYYY',    // e.g., "1-1-2026"
    'DD-M-YYYY',   // e.g., "22-1-2026"
    'D-MM-YYYY',   // e.g., "1-01-2026"
    'DD-MM-YYYY',  // e.g., "22-01-2026"
    // ISO formats
    'YYYY-MM-DD',
    'YYYY-MM-DDTHH:mm:ss',
  ];

  for (const format of formats) {
    const parsed = dayjs(dateStr, format, true);
    if (parsed.isValid()) {
      const result = parsed.format('YYYY-MM-DDTHH:mm:ss');
      console.log(
        `formatExcelDate: ${fieldName} "${dateStr}" matched format "${format}" → ${result}`,
      );
      return result;
    }
  }

  // Try automatic parsing
  const parsed = dayjs(dateStr);
  if (parsed.isValid()) {
    const result = parsed.format('YYYY-MM-DDTHH:mm:ss');
    console.log(
      `formatExcelDate: ${fieldName} "${dateStr}" auto-parsed → ${result}`,
    );
    return result;
  }

  console.log(`formatExcelDate: ${fieldName} "${dateStr}" could not be parsed`);
  return null;
};

// Helper function to parse number from Excel
const parseExcelNumber = (
  value?: string | number | null,
  fieldName?: string,
): number | null => {
  if (value === null || value === undefined || value === '') {
    console.log(`parseExcelNumber: ${fieldName} is empty/null/undefined:`, value);
    return null;
  }

  // If already a number, return it
  if (typeof value === 'number') {
    console.log(`parseExcelNumber: ${fieldName} is number: ${value}`);
    return value;
  }

  // If string, clean it (remove commas, spaces, etc.)
  const cleaned = String(value)
    .trim()
    .replace(/,/g, '') // Remove commas
    .replace(/\s/g, ''); // Remove spaces

  if (!cleaned) {
    console.log(`parseExcelNumber: ${fieldName} is empty after cleaning`);
    return null;
  }

  const parsed = Number(cleaned);
  if (isNaN(parsed)) {
    console.log(`parseExcelNumber: ${fieldName} "${value}" could not be parsed to number`);
    return null;
  }

  console.log(`parseExcelNumber: ${fieldName} "${value}" → ${parsed}`);
  return parsed;
};

interface ExcelRowIncome {
  'Billing Type': string;
  'Billing Document': string;
  'Customer code': string;
  'Customer Group': string;
  City: string;
  'Customer name': string;
  'Invoice Doc.': string;
  'Invoice Date': string | number;
  'Salesman Code': string;
  'Incoming Doc.': string;
  'Incoming Date': string | number;
  Day: number;
  'Sales Employee Code (Transaction)': string;
  'Sales Employee Name (Transaction)': string;
  'Team Sales': string;
  Amount: number;
  'Manual keyin': string;
  'Payment method': string;
  'Posting date': string | number;
  'Bank key name': string;
  'Bank Branch': string;
  'Check no.': string;
  'Posting date Check': string | number;
  'Cheque Amount': number;
}

export default function DataFromSapIncoming() {
  const [rows, setRows] = useState<IIncome[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [fullscreenOpen, setFullscreenOpen] = useState<boolean>(false);
  const [selectionModel, setSelectionModel] = useState<GridRowId[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const expectedHeaders = useMemo(
    () => [
      'Billing Type',
      'Billing Document',
      'Customer code',
      'Customer Group',
      'City',
      'Customer name',
      'Invoice Doc.',
      'Invoice Date',
      'Salesman Code',
      'Incoming Doc.',
      'Incoming Date',
      'Day',
      'Sales Employee Code (Transaction)',
      'Sales Employee Name (Transaction)',
      'Team Sales',
      'Amount',
      'Manual keyin',
      'Payment method',
      'Posting date',
      'Bank key name',
      'Bank Branch',
      'Check no.',
      'Posting date Check',
      'Cheque Amount',
    ],
    [],
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await incomeApi.getAll();
      if (res.data_model) {
        setRows(res.data_model);
      } else if (Array.isArray(res)) {
        setRows(res as any);
      } else {
        setRows([]);
      }
    } catch (error) {
      console.error('Failed to fetch income data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownloadTemplate = () => {
    // Create a worksheet with headers
    const ws = XLSX.utils.aoa_to_sheet([expectedHeaders]);

    // Set column widths for better readability
    const columnWidths = expectedHeaders.map(() => ({ wch: 20 }));
    ws['!cols'] = columnWidths;

    // Create workbook and add the worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Income Template');

    // Generate filename with current date
    const filename = `Income_Template_${dayjs().format('YYYYMMDD')}.xlsx`;

    // Download the file
    XLSX.writeFile(wb, filename);

    setSnackbar({
      open: true,
      message: 'Template downloaded successfully.',
      severity: 'success',
    });
  };

  const handleImportExcel = async (excelData: ExcelRowIncome[]) => {
    if (excelData.length === 0) {
      setSnackbar({
        open: true,
        message: 'No data to import.',
        severity: 'warning',
      });
      return;
    }

    setImporting(true);
    try {
      // Map Excel data to IIncome[]
      const payload: IIncome[] = excelData.map((row, index) => ({
        id: 0, // Auto-generated by backend
        billing_type: row['Billing Type']
          ? String(row['Billing Type']).trim()
          : null,
        billing_document: row['Billing Document']
          ? String(row['Billing Document']).trim()
          : null,
        customer_code: row['Customer code']
          ? String(row['Customer code']).trim()
          : null,
        customer_group: row['Customer Group']
          ? String(row['Customer Group']).trim()
          : null,
        city: row['City'] ? String(row['City']).trim() : null,
        customer_name: row['Customer name']
          ? String(row['Customer name']).trim()
          : null,
        invoice_doc_no: row['Invoice Doc.']
          ? String(row['Invoice Doc.']).trim()
          : null,
        invoice_date: formatExcelDate(
          row['Invoice Date'],
          `Row ${index + 1} Invoice Date`,
        ) as any,
        salesman_code: row['Salesman Code']
          ? String(row['Salesman Code']).trim()
          : null,
        incoming_doc_no: row['Incoming Doc.']
          ? String(row['Incoming Doc.']).trim()
          : null,
        incoming_date: formatExcelDate(
          row['Incoming Date'],
          `Row ${index + 1} Incoming Date`,
        ) as any,
        days: parseExcelNumber(row['Day'], `Row ${index + 1} Day`),
        sales_employee_code: row['Sales Employee Code (Transaction)']
          ? String(row['Sales Employee Code (Transaction)']).trim()
          : null,
        sales_employee_name: row['Sales Employee Name (Transaction)']
          ? String(row['Sales Employee Name (Transaction)']).trim()
          : null,
        team_sales: row['Team Sales'] ? String(row['Team Sales']).trim() : null,
        amount: parseExcelNumber(row['Amount'], `Row ${index + 1} Amount`),
        manual_keyin: row['Manual keyin']
          ? String(row['Manual keyin']).trim()
          : null,
        payment_method: row['Payment method']
          ? String(row['Payment method']).trim()
          : null,
        posting_date: formatExcelDate(
          row['Posting date'],
          `Row ${index + 1} Posting date`,
        ) as any,
        bank_key_name: row['Bank key name']
          ? String(row['Bank key name']).trim()
          : null,
        bank_branch: row['Bank Branch']
          ? String(row['Bank Branch']).trim()
          : null,
        cheque_no: row['Check no.'] ? String(row['Check no.']).trim() : null,
        cheque_posting_date: formatExcelDate(
          row['Posting date Check'],
          `Row ${index + 1} Posting date Check`,
        ) as any,
        cheque_amount: parseExcelNumber(
          row['Cheque Amount'],
          `Row ${index + 1} Cheque Amount`,
        ),
      }));

      console.log(
        'Income payload to send:',
        JSON.stringify(payload.slice(0, 2), null, 2),
      );
      const result = await incomeApi.createList(payload);

      if (result.is_completed) {
        setSnackbar({
          open: true,
          message:
            result.message?.[0] ||
            `Successfully imported ${payload.length} records.`,
          severity: 'success',
        });
        // Refresh data
        await fetchData();
      } else {
        setSnackbar({
          open: true,
          message: result.message?.[0] || 'Failed to import records.',
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('Failed to import records', error);
      setSnackbar({
        open: true,
        message: 'Failed to import records. Please try again.',
        severity: 'error',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteClick = () => {
    if (selectionModel.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please select at least one record to delete.',
        severity: 'warning',
      });
      return;
    }
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    setConfirmDeleteOpen(false);
    setDeleting(true);

    try {
      const idsToDelete = selectionModel.map((id) => Number(id));
      const result = await incomeApi.deleteList(idsToDelete);

      if (result.is_completed) {
        // Refresh data first
        await fetchData();

        // Clear selection
        setSelectionModel([]);

        // Show success message
        setSnackbar({
          open: true,
          message: result.message?.[0] || 'Records deleted successfully.',
          severity: 'success',
        });
      } else {
        setSnackbar({
          open: true,
          message: result.message?.[0] || 'Failed to delete records.',
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('Failed to delete records', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete records. Please try again.',
        severity: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDeleteOpen(false);
  };

  const columns: GridColDef[] = [
    {
      field: 'no',
      headerName: 'No.',
      width: 70,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (value, row) => {
        const index = rows.findIndex((r) => r.id === row.id);
        return index + 1;
      },
    },
    {
      field: 'billing_type',
      headerName: 'Billing Type',
      width: 120,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'billing_document',
      headerName: 'Billing Document',
      width: 150,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'customer_code',
      headerName: 'Customer code',
      width: 130,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'customer_group',
      headerName: 'Customer Group',
      width: 130,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'city',
      headerName: 'City',
      width: 130,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'customer_name',
      headerName: 'Customer name',
      minWidth: 250,
      flex: 1,
    },
    {
      field: 'invoice_doc_no',
      headerName: 'Invoice Doc.',
      width: 130,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'invoice_date',
      headerName: 'Invoice Date',
      width: 130,
      align: 'center',
      headerAlign: 'center',
      valueFormatter: (value) => formatDate(value),
    },
    {
      field: 'salesman_code',
      headerName: 'Salesman Code',
      width: 130,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'incoming_doc_no',
      headerName: 'Incoming Doc.',
      width: 130,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'incoming_date',
      headerName: 'Incoming Date',
      width: 130,
      align: 'center',
      headerAlign: 'center',
      valueFormatter: (value) => formatDate(value),
    },
    {
      field: 'days',
      headerName: 'Day',
      width: 100,
      align: 'center',
      headerAlign: 'center',
      type: 'number',
      valueFormatter: (value) => (value == null ? '' : String(value)),
    },
    {
      field: 'sales_employee_code',
      headerName: 'Sales Employee Code (Transaction)',
      width: 200,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'sales_employee_name',
      headerName: 'Sales Employee Name (Transaction)',
      minWidth: 200,
      flex: 1,
    },
    {
      field: 'team_sales',
      headerName: 'Team Sales',
      width: 130,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 130,
      align: 'center',
      headerAlign: 'center',
      type: 'number',
      valueFormatter: (value) => (value == null ? '' : String(value)),
    },
    {
      field: 'manual_keyin',
      headerName: 'Manual keyin',
      width: 130,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'payment_method',
      headerName: 'Payment method',
      width: 150,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'posting_date',
      headerName: 'Posting date',
      width: 130,
      align: 'center',
      headerAlign: 'center',
      valueFormatter: (value) => formatDate(value),
    },
    {
      field: 'bank_key_name',
      headerName: 'Bank key name',
      width: 150,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'bank_branch',
      headerName: 'Bank Branch',
      width: 150,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'cheque_no',
      headerName: 'Check no.',
      width: 130,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'cheque_posting_date',
      headerName: 'Posting date Check',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      valueFormatter: (value) => formatDate(value),
    },
    {
      field: 'cheque_amount',
      headerName: 'Cheque Amount',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      type: 'number',
      valueFormatter: (value) => (value == null ? '' : String(value)),
    },
  ];

  return (
    <>
      <Card sx={{ maxWidth: '100%' }}>
        <Box
          sx={{
            bgcolor: '#1F2175',
            px: 2,
            py: 1.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6" component="div" sx={{ color: 'white' }}>
            Data From SAP (Incoming Payment)
          </Typography>
          <IconButton
            onClick={() => setFullscreenOpen(true)}
            sx={{ color: 'white' }}
          >
            <FullscreenIcon />
          </IconButton>
        </Box>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 2,
              mb: 2,
            }}
          >
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadTemplate}
              sx={{ px: 3 }}
            >
              Download Template
            </Button>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileIcon />}
              disabled={importing}
              sx={{ px: 3 }}
            >
              {importing ? 'Importing...' : 'Upload Excel'}
              <input
                hidden
                type="file"
                accept=".xlsx,.xls"
                onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (!file) {
                    return;
                  }

                  try {
                    const buffer = await file.arrayBuffer();
                    const workbook = XLSX.read(buffer, { type: 'array' });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const firstRow = (XLSX.utils.sheet_to_json(sheet, {
                      header: 1,
                      range: 0,
                      blankrows: false,
                    })[0] || []) as (string | number | null | undefined)[];

                    const headers = firstRow.map((cell) =>
                      String(cell ?? '').trim(),
                    );
                    const isValidHeader =
                      headers.length === expectedHeaders.length &&
                      headers.every(
                        (header, idx) => header === expectedHeaders[idx],
                      );

                    if (!isValidHeader) {
                      setSnackbar({
                        open: true,
                        message:
                          'Invalid column headers. Please ensure the Excel file has the correct format with 24 columns.',
                        severity: 'error',
                      });
                      e.target.value = '';
                      return;
                    }

                    const dataRows = XLSX.utils.sheet_to_json(sheet, {
                      header: expectedHeaders as string[],
                      range: 1,
                      defval: '',
                      raw: false,
                    }) as ExcelRowIncome[];

                    if (dataRows.length === 0) {
                      setSnackbar({
                        open: true,
                        message: 'No row data found in the file.',
                        severity: 'error',
                      });
                      e.target.value = '';
                      return;
                    }

                    setSnackbar({
                      open: true,
                      message: `File loaded successfully. ${dataRows.length} rows found. Importing...`,
                      severity: 'info',
                    });

                    // Import immediately
                    await handleImportExcel(dataRows);
                    e.target.value = '';
                  } catch (err) {
                    console.error(err);
                    setSnackbar({
                      open: true,
                      message: 'Could not read the file. Please try again.',
                      severity: 'error',
                    });
                    e.target.value = '';
                  }
                }}
              />
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteClick}
              disabled={selectionModel.length === 0 || deleting}
              sx={{ px: 3 }}
            >
              {deleting ? 'Deleting...' : `Delete (${selectionModel.length})`}
            </Button>
          </Box>
          <Box sx={{ width: '100%' }}>
            <DataGrid
              rows={rows}
              columns={columns}
              loading={loading}
              checkboxSelection
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
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: 25 },
                },
              }}
              pageSizeOptions={[5, 10, 25, 50]}
              disableRowSelectionOnClick
              autoHeight
              sx={{
                width: '100%',
                height: '100%',
                '& .MuiDataGrid-cell': {
                  borderRight: '1px solid rgba(224, 224, 224, 1)',
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Fullscreen Dialog */}
      <Dialog
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: {
            width: '95vw',
            height: '95vh',
            maxWidth: 'none',
            m: 2,
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: '#1F2175',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 1.5,
          }}
        >
          <Typography variant="h6" component="div">
            Data From SAP (Incoming)
          </Typography>
          <IconButton
            onClick={() => setFullscreenOpen(false)}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ height: 'calc(95vh - 80px)', width: '100%' }}>
            <DataGrid
              rows={rows}
              columns={columns}
              loading={loading}
              checkboxSelection
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
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: 25 },
                },
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              disableRowSelectionOnClick
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={handleCancelDelete}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectionModel.length} record(s)?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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
