'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';
import React, { useMemo, useState } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { transportColumns } from '@/interface/component';
import type { TransportRow } from '@/types/transport';
import { printLabelTransportApi } from '@/lib/api/print-label-transport';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import * as XLSX from 'xlsx';

type TableRow = TransportRow & { rowId: string; duration: number | string };

function ReportStatusTab() {
  const [from, setFrom] = useState<Dayjs | null>(null);
  const [to, setTo] = useState<Dayjs | null>(null);
  const [transportNoFrom, setTransportNoFrom] = useState<string>('');
  const [transportNoTo, setTransportNoTo] = useState<string>('');
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [fromError, setFromError] = useState(false);
  const [transportNoFromError, setTransportNoFromError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const columns: GridColDef[] = useMemo(
    () => [
      ...transportColumns.map((col) => ({
        ...col,
        headerAlign: col.headerAlign ?? 'center',
        align: col.align ?? 'center',
      })),
      {
        field: 'duration',
        headerName: 'ระยะเวลา (วัน)',
        width: 120,
        headerAlign: 'center',
        align: 'center',
      } as GridColDef,
    ],
    [],
  );

  const formatShippingDateParam = (date: Dayjs | null) => {
    if (!date || !date.isValid()) return undefined;
    return `${date.format('YYYY-MM-DD')}`;
  };

  const formatDateDisplay = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const parsed = dayjs(dateStr);
    return parsed.isValid() ? parsed.format('DD.MM.YYYY') : '';
  };

  const handleExportExcel = () => {
    if (tableData.length === 0) {
      setSnackbar({
        open: true,
        message: 'No data to export.',
        severity: 'warning',
      });
      return;
    }

    // Prepare data for Excel export
    const exportData = tableData.map((row) => ({
      'Transport No.': row.transportNo,
      'Transport Date': row.transportDate,
      'Billing Document': row.billingDocument,
      'Billing Date': row.billingDate,
      'Ship To': row.shipTo,
      'Ship To Description': row.shipToDescription,
      'Delivery Qty': row.deliveryQty,
      'Sales Unit': row.salesUnit,
      'Sales District': row.salesDistrict,
      'Sales District Description': row.salesDistrictDescription,
      'Transport By': row.transportBy,
      'Transport By Fullname': row.transportByFullname,
      Box: row.box,
      'Received Date': row.receivedDate || '',
      'Tracking No.': row.trackingNo,
      'Signed Date': row.signedDate || '',
      'Signed By': row.signedBy || '',
      Status: row.status,
      'ระยะเวลา (วัน)': row.duration,
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report Status');

    // Generate filename with current date
    const filename = `Report_Status_Shipping_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;

    // Export file
    XLSX.writeFile(wb, filename);

    setSnackbar({
      open: true,
      message: 'Excel file exported successfully.',
      severity: 'success',
    });
  };

  const handleExecute = async () => {
    if (!transportNoFrom.trim() && !from) {
      setTransportNoFromError(true);
      setFromError(true);
      setSnackbar({
        open: true,
        message: 'Please select either Transport No. or Transport Date.',
        severity: 'warning',
      });
      return;
    }

    setTransportNoFromError(false);
    setFromError(false);

    const start = formatShippingDateParam(from);
    const end = formatShippingDateParam(to);
    const tranNoStart = transportNoFrom.trim();
    const tranNoEnd = transportNoTo.trim();

    setLoading(true);
    try {
      const res = await printLabelTransportApi.searchReportStatusShipping(
        start,
        end,
        tranNoStart,
        tranNoEnd,
      );

      if (!res.is_completed || !res.data_model || res.data_model.length === 0) {
        setSnackbar({
          open: true,
          message: 'Data not found.',
          severity: 'info',
        });
        setTableData([]);
        setLoading(false);
        return;
      }

      const mappedData: TableRow[] = res.data_model.map((item, index) => {
        const transportNo = item.transport_no ?? '';
        const billingDocument = item.billing_document ?? '';

        // Calculate duration in days (signed_date - transport_date) only for successful delivery
        let duration: number | null = null;
        if (
          item.status === 'พัสดุจัดส่งสำเร็จ' &&
          item.signed_date &&
          item.transport_date
        ) {
          const signedDate = dayjs(item.signed_date);
          const transportDate = dayjs(item.transport_date);
          if (signedDate.isValid() && transportDate.isValid()) {
            duration = signedDate.diff(transportDate, 'day');
          }
        }

        return {
          rowId:
            item.id != null
              ? String(item.id)
              : `${transportNo}-${billingDocument}-${index}`,
          transportNo,
          transportDate: formatDateDisplay(item.transport_date),
          billingDocument,
          billingDate: formatDateDisplay(item.billing_date),
          shipTo: item.ship_to ?? '',
          shipToDescription: item.ship_to_description ?? '',
          deliveryQty: Number(item.delivery_qty ?? 0),
          salesUnit: item.sales_unit ?? '',
          salesDistrict: item.sales_district ?? '',
          salesDistrictDescription: item.sales_district_description ?? '',
          transportBy: item.transport_by ?? '',
          transportByFullname: item.transport_by_fullname ?? '',
          box: item.box ?? 0,
          receivedDate: item.received_date
            ? formatDateDisplay(item.received_date)
            : null,
          trackingNo: item.tracking_number ?? '',
          signedDate: item.signed_date
            ? formatDateDisplay(item.signed_date)
            : null,
          signedBy: item.signed_by ?? null,
          status: item.status ?? '',
          duration: duration !== null ? duration : '',
        };
      });

      setTableData(mappedData);
    } catch (error) {
      console.error('Failed to fetch report status', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch data. Please try again.',
        severity: 'error',
      });
      setTableData([]);
    }
    setLoading(false);
  };

  return (
    <>
      <Card sx={{ maxWidth: '100%' }}>
        <Box sx={{ bgcolor: '#1F2175', px: 2, py: 1.5 }}>
          <Typography variant="h6" component="div" sx={{ color: 'white' }}>
            Report Status Shipping
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
                gap: 2,
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
                <Typography sx={{ width: 120, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  Transport No.
                </Typography>

                <TextField
                  type="text"
                  label="From"
                  value={transportNoFrom}
                  onChange={(e) => {
                    setTransportNoFrom(e.target.value);
                    setTransportNoTo(e.target.value);
                    setTransportNoFromError(false);
                  }}
                  size="small"
                  sx={{ width: 180, bgcolor: 'white' }}
                  error={transportNoFromError}
                  helperText={transportNoFromError ? 'Required' : undefined}
                />

                <Typography textAlign="center">To</Typography>

                <TextField
                  type="text"
                  label="To"
                  value={transportNoTo}
                  onChange={(e) => setTransportNoTo(e.target.value)}
                  size="small"
                  sx={{ width: 180, bgcolor: 'white' }}
                />
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                <Typography sx={{ width: 120, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  Transport Date
                </Typography>

                <DatePicker
                  label="From"
                  format="DD/MM/YYYY"
                  value={from}
                  onChange={(date) => {
                    setFrom(date);
                    setTo(date);
                    setFromError(false);
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
                  disabled={loading}
                  sx={{
                    px: 6,
                  }}
                >
                  {loading ? 'Loading...' : 'Execute'}
                </Button>
              </Box>
            </Box>
          </LocalizationProvider>
        </CardContent>
      </Card>

      {tableData.length > 0 && (
        <Card sx={{ maxWidth: '100%', mt: 3 }}>
          <Box sx={{ bgcolor: '#1F2175', px: 2, py: 1.5 }}>
            <Typography variant="h6" component="div" sx={{ color: 'white' }}>
              Report Status Shipping
            </Typography>
          </Box>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Button
                variant="contained"
                color="success"
                startIcon={<FileDownloadIcon />}
                onClick={handleExportExcel}
                sx={{ px: 3 }}
              >
                Export Excel
              </Button>
            </Box>
            <Box sx={{ width: '100%' }}>
              <DataGrid
                rows={tableData}
                columns={columns}
                getRowId={(row) => row.rowId}
                disableRowSelectionOnClick
                initialState={{
                  columns: {
                    columnVisibilityModel: {
                      transportBy: false,
                      box: false,
                    },
                  },
                }}
                autoHeight
                sx={{
                  '& .MuiDataGrid-columnHeaderTitleContainer': {
                    justifyContent: 'center',
                  },
                  '& .MuiDataGrid-cell': {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'normal',
                    wordWrap: 'break-word',
                    lineHeight: 'normal',
                  },
                }}
              />
            </Box>
          </CardContent>
        </Card>
      )}

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

export default ReportStatusTab;
