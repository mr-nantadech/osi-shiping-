'use client';

import { dataTableForSapApi } from '@/lib/api/data-table-form-sap';
import type { IDataTableFormSap } from '@/types/backend/data-table-form-sap';
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
import { DataGrid, GridColDef, GridRowId, GridRowSelectionModel } from '@mui/x-data-grid';
import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

// Helper function to format date from ISO to DD.MM.YYYY
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return '';
  }
};

// Helper function to format date for Excel import
const formatExcelDate = (dateValue?: string | number | null, fieldName?: string): string | null => {
  if (!dateValue) {
    console.log(`formatExcelDate: ${fieldName} is empty/null/undefined:`, dateValue);
    return null;
  }

  // If it's a number, convert from Excel serial date
  if (typeof dateValue === 'number') {
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 86400000);
    const result = dayjs(date).format('YYYY-MM-DDTHH:mm:ss');
    console.log(`formatExcelDate: ${fieldName} number ${dateValue} → ${result}`);
    return result;
  }

  // Convert to string and trim
  const dateStr = String(dateValue).trim();
  if (!dateStr) {
    console.log(`formatExcelDate: ${fieldName} is empty string after trim`);
    return null;
  }

  // If it's a string, try multiple formats
  const formats = [
    'DD.MM.YYYY',
    'DD/MM/YYYY',
    'YYYY-MM-DD',
    'YYYY-MM-DDTHH:mm:ss',
    'MM/DD/YYYY',
    'DD-MM-YYYY',
  ];

  for (const format of formats) {
    const parsed = dayjs(dateStr, format, true);
    if (parsed.isValid()) {
      const result = parsed.format('YYYY-MM-DDTHH:mm:ss');
      console.log(`formatExcelDate: ${fieldName} "${dateStr}" matched format "${format}" → ${result}`);
      return result;
    }
  }

  // Try automatic parsing
  const parsed = dayjs(dateStr);
  if (parsed.isValid()) {
    const result = parsed.format('YYYY-MM-DDTHH:mm:ss');
    console.log(`formatExcelDate: ${fieldName} "${dateStr}" auto-parsed → ${result}`);
    return result;
  }

  console.log(`formatExcelDate: ${fieldName} "${dateStr}" could not be parsed`);
  return null;
};

interface ExcelRowSap {
  'Billing Type': string;
  'Billing Document': string;
  'Billing Date': string | number;
  'Sales Order': string;
  'Sales Organization': string;
  'Distribution Channel': string;
  'Sales office': string;
  'Sales office Desc': string;
  'Sold To Code': string;
  'Sold To Name': string;
  'Ship To Code': string;
  'Ship To Name': string;
  'Ship To Address': string;
  'Tambon': string;
  'District': string;
  'Postal Code': string;
  'City': string;
  'Telephone': string;
  'Sales District': string;
  'Sales District Description': string;
  'Sales Employee Code': string;
  'Sales Employee Name': string;
  'Item No.': string;
  'Material Code': string;
  'Material Description': string;
  'Material Group': string;
  'Plant': string;
  'Storage Location': string;
  'Batch': string;
  'Delivery Qty': number;
  'Sales Unit': string;
  'Manufacture Date': string | number;
  'SLED/BBD': string | number;
}

export default function DataFromSap() {
  const [rows, setRows] = useState<IDataTableFormSap[]>([]);
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
      'Billing Date',
      'Sales Order',
      'Sales Organization',
      'Distribution Channel',
      'Sales office',
      'Sales office Desc',
      'Sold To Code',
      'Sold To Name',
      'Ship To Code',
      'Ship To Name',
      'Ship To Address',
      'Tambon',
      'District',
      'Postal Code',
      'City',
      'Telephone',
      'Sales District',
      'Sales District Description',
      'Sales Employee Code',
      'Sales Employee Name',
      'Item No.',
      'Material Code',
      'Material Description',
      'Material Group',
      'Plant',
      'Storage Location',
      'Batch',
      'Delivery Qty',
      'Sales Unit',
      'Manufacture Date',
      'SLED/BBD',
    ],
    [],
  );

  const fetchData = async () => {
    console.log('fetchData: Starting to fetch data...');
    setLoading(true);
    try {
      const res = await dataTableForSapApi.getAll();
      console.log('fetchData: Full response:', res);
      console.log('fetchData: Response keys:', Object.keys(res));
      console.log('fetchData: data_model length:', res.data_model?.length);

      if (res.data_model) {
        setRows(res.data_model);
        console.log('fetchData: Updated rows state with', res.data_model.length, 'records');
      } else if (Array.isArray(res)) {
        // Maybe the response is directly an array
        console.log('fetchData: Response is array, length:', res.length);
        setRows(res as any);
      } else {
        console.log('fetchData: No data_model in response, setting empty array');
        setRows([]);
      }
    } catch (error) {
      console.error('Failed to fetch data from SAP', error);
    } finally {
      setLoading(false);
      console.log('fetchData: Completed');
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
    XLSX.utils.book_append_sheet(wb, ws, 'Data From SAP Template');

    // Generate filename with current date
    const filename = `DataFromSAP_Template_${dayjs().format('YYYYMMDD')}.xlsx`;

    // Download the file
    XLSX.writeFile(wb, filename);

    setSnackbar({
      open: true,
      message: 'Template downloaded successfully.',
      severity: 'success',
    });
  };

  const handleImportExcel = async (excelData: ExcelRowSap[]) => {
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
      // Map Excel data to IDataTableFormSap[]
      const payload: IDataTableFormSap[] = excelData.map((row, index) => ({
        id: 0, // Auto-generated by backend
        billing_type: row['Billing Type'] ? String(row['Billing Type']).trim() : null,
        billing_document: row['Billing Document'] ? String(row['Billing Document']).trim() : null,
        billing_date: formatExcelDate(row['Billing Date'], `Row ${index + 1} Billing Date`),
        sales_order: row['Sales Order'] ? String(row['Sales Order']).trim() : null,
        sales_organization: row['Sales Organization'] ? String(row['Sales Organization']).trim() : null,
        distribution_channel: row['Distribution Channel'] ? String(row['Distribution Channel']).trim() : null,
        sold_to_code: row['Sold To Code'] ? String(row['Sold To Code']).trim() : null,
        sold_to_name: row['Sold To Name'] ? String(row['Sold To Name']).trim() : null,
        ship_to_code: row['Ship To Code'] ? String(row['Ship To Code']).trim() : null,
        ship_to_name: row['Ship To Name'] ? String(row['Ship To Name']).trim() : null,
        ship_to_address: row['Ship To Address'] ? String(row['Ship To Address']).trim() : null,
        tambon: row['Tambon'] ? String(row['Tambon']).trim() : null,
        district: row['District'] ? String(row['District']).trim() : null,
        postal_code: row['Postal Code'] ? String(row['Postal Code']).trim() : null,
        city: row['City'] ? String(row['City']).trim() : null,
        telephone: row['Telephone'] ? String(row['Telephone']).trim() : null,
        sales_district: row['Sales District'] ? String(row['Sales District']).trim() : null,
        sales_district_description: row['Sales District Description'] ? String(row['Sales District Description']).trim() : null,
        sales_employee_code: row['Sales Employee Code'] ? String(row['Sales Employee Code']).trim() : null,
        sales_employee_name: row['Sales Employee Name'] ? String(row['Sales Employee Name']).trim() : null,
        sales_employee_team: row['Sales office'] ? String(row['Sales office']).trim() : null,
        sales_employee_team_code: row['Sales office Desc'] ? String(row['Sales office Desc']).trim() : null,
        item_no: row['Item No.'] ? String(row['Item No.']).trim() : null,
        material_code: row['Material Code'] ? String(row['Material Code']).trim() : null,
        material_description: row['Material Description'] ? String(row['Material Description']).trim() : null,
        material_group: row['Material Group'] ? String(row['Material Group']).trim() : null,
        plant: row['Plant'] ? String(row['Plant']).trim() : null,
        storage_location: row['Storage Location'] ? String(row['Storage Location']).trim() : null,
        batch: row['Batch'] ? String(row['Batch']).trim() : null,
        delivery_qty: row['Delivery Qty'] || null,
        sales_unit: row['Sales Unit'] ? String(row['Sales Unit']).trim() : null,
        manufacture_date: formatExcelDate(row['Manufacture Date'], `Row ${index + 1} Manufacture Date`),
        sled_or_bbd: formatExcelDate(row['SLED/BBD'], `Row ${index + 1} SLED/BBD`),
        update_at: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
      }));

      console.log('Payload to send:', JSON.stringify(payload.slice(0, 2), null, 2));
      const result = await dataTableForSapApi.createList(payload);

      if (result.is_completed) {
        setSnackbar({
          open: true,
          message: result.message?.[0] || `Successfully imported ${payload.length} records.`,
          severity: 'success',
        });
        // Refresh data
        await fetchData(); // fetchData handles loading state
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
      console.log('Deleting IDs:', idsToDelete);

      const result = await dataTableForSapApi.deleteList(idsToDelete);
      console.log('Delete result:', result);

      if (result.is_completed) {
        // Refresh data first
        console.log('Refreshing data after delete...');
        await fetchData(); // fetchData handles loading state
        console.log('Data refreshed, current rows count:', rows.length);

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
      field: 'billing_date',
      headerName: 'Billing Date',
      width: 130,
      align: 'center',
      headerAlign: 'center',
      valueFormatter: (value) => formatDate(value),
    },
    {
      field: 'sales_order',
      headerName: 'Sales Order',
      width: 130,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'sales_organization',
      headerName: 'Sales Organization',
      width: 150,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'distribution_channel',
      headerName: 'Distribution Channel',
      width: 160,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'sales_employee_team',
      headerName: 'Sales office',
      width: 130,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'sales_employee_team_code',
      headerName: 'Sales office Desc',
      width: 160,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'sold_to_code',
      headerName: 'Sold To Code',
      width: 130,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'sold_to_name',
      headerName: 'Sold To Name',
      minWidth: 250,
      flex: 1,
    },
    {
      field: 'ship_to_code',
      headerName: 'Ship To Code',
      width: 130,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'ship_to_name',
      headerName: 'Ship To Name',
      minWidth: 250,
      flex: 1,
    },
    {
      field: 'ship_to_address',
      headerName: 'Ship To Address',
      minWidth: 250,
      flex: 1,
    },
    {
      field: 'tambon',
      headerName: 'Tambon',
      width: 130,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'district',
      headerName: 'District',
      width: 130,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'postal_code',
      headerName: 'Postal Code',
      width: 120,
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
      field: 'telephone',
      headerName: 'Telephone',
      width: 130,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'sales_district',
      headerName: 'Sales District',
      width: 130,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'sales_district_description',
      headerName: 'Sales District Description',
      minWidth: 180,
      flex: 1,
    },
    {
      field: 'sales_employee_code',
      headerName: 'Sales Employee Code',
      width: 160,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'sales_employee_name',
      headerName: 'Sales Employee Name',
      minWidth: 160,
      flex: 1,
    },
    {
      field: 'item_no',
      headerName: 'Item No.',
      width: 100,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'material_code',
      headerName: 'Material Code',
      width: 130,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'material_description',
      headerName: 'Material Description',
      minWidth: 300,
      flex: 1,
    },
    {
      field: 'material_group',
      headerName: 'Material Group',
      width: 130,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'plant',
      headerName: 'Plant',
      width: 100,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'storage_location',
      headerName: 'Storage Location',
      width: 140,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'batch',
      headerName: 'Batch',
      width: 120,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'delivery_qty',
      headerName: 'Delivery Qty',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      type: 'number',
    },
    {
      field: 'sales_unit',
      headerName: 'Sales Unit',
      width: 100,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'manufacture_date',
      headerName: 'Manufacture Date',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      valueFormatter: (value) => formatDate(value),
    },
    {
      field: 'sled_or_bbd',
      headerName: 'SLED/BBD',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      valueFormatter: (value) => formatDate(value),
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
            Data From SAP
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

                    const headers = firstRow.map((cell) => String(cell ?? '').trim());
                    const isValidHeader =
                      headers.length === expectedHeaders.length &&
                      headers.every((header, idx) => header === expectedHeaders[idx]);

                    if (!isValidHeader) {
                      setSnackbar({
                        open: true,
                        message:
                          'Invalid column headers. Please ensure the Excel file has the correct format with 33 columns.',
                        severity: 'error',
                      });
                      e.target.value = '';
                      return;
                    }

                    const dataRows = XLSX.utils.sheet_to_json(sheet, {
                      header: expectedHeaders as string[],
                      range: 1,
                      defval: '',
                      raw: false, // Get formatted strings instead of raw values
                    }) as ExcelRowSap[];

                    if (dataRows.length === 0) {
                      setSnackbar({
                        open: true,
                        message: 'No row data found in the file.',
                        severity: 'error',
                      });
                      e.target.value = '';
                      return;
                    }

                    // Debug: Log first row to see date formats
                    console.log('First Excel row:', dataRows[0]);
                    console.log('Billing Date:', dataRows[0]['Billing Date']);
                    console.log('Manufacture Date:', dataRows[0]['Manufacture Date']);
                    console.log('SLED/BBD:', dataRows[0]['SLED/BBD']);

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
              rowSelectionModel={{
                type: 'include',
                ids: new Set(selectionModel),
              } as GridRowSelectionModel}
              initialState={{
                pagination: {
                  paginationModel: { page: 0, pageSize: 10 },
                },
              }}
              pageSizeOptions={[5, 10, 25, 50]}
              disableRowSelectionOnClick
              autoHeight
              sx={{
                width: '100%',
                height: '100%',
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
            Data From SAP
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
              rowSelectionModel={{
                type: 'include',
                ids: new Set(selectionModel),
              } as GridRowSelectionModel}
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
