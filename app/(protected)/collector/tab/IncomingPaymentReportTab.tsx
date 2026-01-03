'use client';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CloseIcon from '@mui/icons-material/Close';
import React, { useState } from 'react';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';
import * as XLSX from 'xlsx';
import { paymentReportApi } from '@/lib/api/payment-report';
import type { IPaymentReport } from '@/types/backend/payment';

function IncomingPaymentReportTab() {
  // Customer Code states
  const [customerCodeFrom, setCustomerCodeFrom] = useState<string>('');
  const [customerCodeTo, setCustomerCodeTo] = useState<string>('');
  const [customerCodeFromError, setCustomerCodeFromError] = useState(false);

  // Posting Date states
  const [postingDateFrom, setPostingDateFrom] = useState<Dayjs | null>(null);
  const [postingDateTo, setPostingDateTo] = useState<Dayjs | null>(null);

  // Document Number states
  const [documentNumberFrom, setDocumentNumberFrom] = useState<string>('');
  const [documentNumberTo, setDocumentNumberTo] = useState<string>('');

  // Bill Collector states
  const [billCollectorFrom, setBillCollectorFrom] = useState<string>('');
  const [billCollectorTo, setBillCollectorTo] = useState<string>('');

  // Team states
  const [teamFrom, setTeamFrom] = useState<string>('');
  const [teamTo, setTeamTo] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<IPaymentReport[]>([]);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

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

    // Prepare data for Excel export (exclude summary row)
    const exportData = tableData.map((row) => ({
      'Customer Code': row.customer_code || '',
      'Customer Class': row.customer_class || '',
      'Customer Name': row.customer_name || '',
      Province: row.province || '',
      'Ref. Invoice Details': row.ref_invoice_details || '',
      'Ref. Invoice Date': formatDateDisplay(row.ref_invoice_date),
      'Salesman Code': row.salesman_code || '',
      'Received Record Number': row.received_record_no || '',
      'Received Record Date': formatDateDisplay(row.received_record_date),
      Days: row.days ?? '',
      'Bill Collector (Code & Name)': row.bill_collector || '',
      Team: row.team || '',
      'Net Received (Incl.VAT)':
        row.net_received != null ? Number(row.net_received).toFixed(2) : '',
      รายการหัก: row.deduction_description || '',
      ประเภทชำระ: row.payment_method || '',
      วันที่โอน: formatDateDisplay(row.posting_date),
      ธนาคาร: row.bank_key_name || '',
      สาขาธนาคาร: row.bank_branch || '',
      เลขที่เช็ค: row.cheque_no || '',
      วันที่เช็ค: formatDateDisplay(row.cheque_posting_date),
      มูลค่าเช็ค: row.amount != null ? Number(row.amount).toFixed(2) : '',
    }));

    // Add summary row to export
    const totalNetReceived = tableData.reduce(
      (sum, row) => sum + (row.net_received || 0),
      0,
    );

    exportData.push({
      'Customer Code': 'Total',
      'Customer Class': '',
      'Customer Name': '',
      Province: '',
      'Ref. Invoice Details': '',
      'Ref. Invoice Date': '',
      'Salesman Code': '',
      'Received Record Number': '',
      'Received Record Date': '',
      Days: '',
      'Bill Collector (Code & Name)': '',
      Team: '',
      'Net Received (Incl.VAT)': totalNetReceived.toFixed(2),
      รายการหัก: '',
      ประเภทชำระ: '',
      วันที่โอน: '',
      ธนาคาร: '',
      สาขาธนาคาร: '',
      เลขที่เช็ค: '',
      วันที่เช็ค: '',
      มูลค่าเช็ค: '',
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Incoming Payment Report');

    // Generate filename with current date
    const filename = `Incoming_Payment_Report_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;

    // Export file
    XLSX.writeFile(wb, filename);

    setSnackbar({
      open: true,
      message: 'Excel file exported successfully.',
      severity: 'success',
    });
  };

  const columns: GridColDef[] = [
    {
      field: 'customer_code',
      headerName: 'Customer Code',
      width: 140,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'customer_class',
      headerName: 'Customer Class',
      width: 140,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'customer_name',
      headerName: 'Customer Name',
      width: 280,
      headerAlign: 'center',
      align: 'left',
    },
    {
      field: 'province',
      headerName: 'Province',
      width: 140,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'ref_invoice_details',
      headerName: 'Ref. Invoice Details',
      width: 180,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'ref_invoice_date',
      headerName: 'Ref. Invoice Date',
      width: 160,
      headerAlign: 'center',
      align: 'center',
      valueFormatter: (value) => formatDateDisplay(value),
    },
    {
      field: 'salesman_code',
      headerName: 'Salesman Code',
      width: 150,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'received_record_no',
      headerName: 'Received Record Number',
      width: 220,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'received_record_date',
      headerName: 'Received Record Date',
      width: 190,
      headerAlign: 'center',
      align: 'center',
      valueFormatter: (value) => formatDateDisplay(value),
    },
    {
      field: 'days',
      headerName: 'Days',
      width: 80,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'bill_collector',
      headerName: 'Bill Collector (Code & Name)',
      width: 250,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'team',
      headerName: 'Team',
      width: 80,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'net_received',
      headerName: 'Net Received (Incl.VAT)',
      width: 200,
      headerAlign: 'center',
      align: 'right',
      valueFormatter: (value) =>
        value != null
          ? Number(value).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : '',
    },
    {
      field: 'deduction_description',
      headerName: 'รายการหัก',
      width: 180,
      headerAlign: 'center',
      align: 'left',
    },
    {
      field: 'payment_method',
      headerName: 'ประเภทชำระ',
      width: 140,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'posting_date',
      headerName: 'วันที่โอน',
      width: 130,
      headerAlign: 'center',
      align: 'center',
      valueFormatter: (value) => formatDateDisplay(value),
    },
    {
      field: 'bank_key_name',
      headerName: 'ธนาคาร',
      width: 300,
      headerAlign: 'center',
      align: 'left',
    },
    {
      field: 'bank_branch',
      headerName: 'สาขาธนาคาร',
      width: 300,
      headerAlign: 'center',
      align: 'left',
    },
    {
      field: 'cheque_no',
      headerName: 'เลขที่เช็ค',
      width: 140,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'cheque_posting_date',
      headerName: 'วันที่เช็ค',
      width: 130,
      headerAlign: 'center',
      align: 'center',
      valueFormatter: (value) => formatDateDisplay(value),
    },
    {
      field: 'amount',
      headerName: 'มูลค่าเช็ค',
      width: 140,
      headerAlign: 'center',
      align: 'right',
      valueFormatter: (value) =>
        value != null
          ? Number(value).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : '',
    },
  ];

  // Calculate total and create rows with summary
  const rowsWithSummary = React.useMemo(() => {
    if (tableData.length === 0) return [];

    const totalNetReceived = tableData.reduce(
      (sum, row) => sum + (row.net_received || 0),
      0,
    );

    const summaryRow: IPaymentReport = {
      customer_code: 'Total',
      customer_class: '',
      customer_name: '',
      province: '',
      ref_invoice_details: '',
      ref_invoice_date: null,
      salesman_code: '',
      received_record_no: '',
      received_record_date: null,
      days: null,
      bill_collector: '',
      team: '',
      net_received: totalNetReceived,
      deduction_description: '',
      payment_method: '',
      posting_date: null,
      bank_key_name: '',
      bank_branch: '',
      cheque_no: '',
      cheque_posting_date: null,
      amount: null,
    };

    return [...tableData, summaryRow];
  }, [tableData]);

  const handleExecute = async () => {
    // Validate Customer Code (required)
    if (!customerCodeFrom.trim()) {
      setCustomerCodeFromError(true);
      setSnackbar({
        open: true,
        message: 'Please enter Customer Code.',
        severity: 'warning',
      });
      return;
    }

    setCustomerCodeFromError(false);

    // Build params object - only include fields that have values
    const params: any = {};

    if (customerCodeFrom.trim())
      params.customer_code_start = customerCodeFrom.trim();
    if (customerCodeTo.trim()) params.customer_code_end = customerCodeTo.trim();
    if (postingDateFrom?.isValid())
      params.posting_date_start = postingDateFrom.format('YYYY-MM-DD');
    if (postingDateTo?.isValid())
      params.posting_date_end = postingDateTo.format('YYYY-MM-DD');
    if (documentNumberFrom.trim())
      params.document_number_start = documentNumberFrom.trim();
    if (documentNumberTo.trim())
      params.document_number_end = documentNumberTo.trim();
    if (billCollectorFrom.trim())
      params.bill_collector_start = billCollectorFrom.trim();
    if (billCollectorTo.trim())
      params.bill_collector_end = billCollectorTo.trim();
    if (teamFrom.trim()) params.team_start = teamFrom.trim();
    if (teamTo.trim()) params.team_end = teamTo.trim();

    setLoading(true);
    try {
      const res = await paymentReportApi.getPaymentReportByFilter(params);

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

      setTableData(res.data_model);
    } catch (error) {
      console.error('Failed to fetch payment report', error);
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
            Incoming Payment Report
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
              {/* Customer Code */}
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
                <Typography
                  sx={{ width: 140, textAlign: 'right', whiteSpace: 'nowrap' }}
                >
                  Customer Code
                  <Box component="span" sx={{ color: 'red' }}>
                    *
                  </Box>
                </Typography>

                <TextField
                  type="text"
                  label="From"
                  value={customerCodeFrom}
                  onChange={(e) => {
                    setCustomerCodeFrom(e.target.value);
                    setCustomerCodeTo(e.target.value);
                    setCustomerCodeFromError(false);
                  }}
                  size="small"
                  sx={{ width: 180, bgcolor: 'white' }}
                  error={customerCodeFromError}
                  helperText={customerCodeFromError ? 'Required' : undefined}
                />

                <Typography textAlign="center">To</Typography>

                <TextField
                  type="text"
                  label="To"
                  value={customerCodeTo}
                  onChange={(e) => setCustomerCodeTo(e.target.value)}
                  size="small"
                  sx={{ width: 180, bgcolor: 'white' }}
                />
              </Box>

              {/* Posting Date */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                <Typography
                  sx={{ width: 140, textAlign: 'right', whiteSpace: 'nowrap' }}
                >
                  Posting Date
                </Typography>

                <DatePicker
                  label="From"
                  format="DD/MM/YYYY"
                  value={postingDateFrom}
                  onChange={(date) => {
                    setPostingDateFrom(date);
                    setPostingDateTo(date);
                  }}
                  slotProps={{
                    textField: {
                      size: 'small',
                      sx: { width: 180, bgcolor: 'white' },
                    },
                  }}
                />

                <Typography textAlign="center">To</Typography>

                <DatePicker
                  label="To"
                  format="DD/MM/YYYY"
                  value={postingDateTo}
                  onChange={(date) => setPostingDateTo(date)}
                  slotProps={{
                    textField: {
                      size: 'small',
                      sx: { width: 180, bgcolor: 'white' },
                    },
                  }}
                />
              </Box>

              {/* Document Number */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                <Typography
                  sx={{ width: 140, textAlign: 'right', whiteSpace: 'nowrap' }}
                >
                  Document Number
                </Typography>

                <TextField
                  type="text"
                  label="From"
                  value={documentNumberFrom}
                  onChange={(e) => {
                    setDocumentNumberFrom(e.target.value);
                    setDocumentNumberTo(e.target.value);
                  }}
                  size="small"
                  sx={{ width: 180, bgcolor: 'white' }}
                />

                <Typography textAlign="center">To</Typography>

                <TextField
                  type="text"
                  label="To"
                  value={documentNumberTo}
                  onChange={(e) => setDocumentNumberTo(e.target.value)}
                  size="small"
                  sx={{ width: 180, bgcolor: 'white' }}
                />
              </Box>

              {/* Bill Collector */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                <Typography
                  sx={{ width: 140, textAlign: 'right', whiteSpace: 'nowrap' }}
                >
                  Bill Collector
                </Typography>

                <TextField
                  type="text"
                  label="From"
                  value={billCollectorFrom}
                  onChange={(e) => {
                    setBillCollectorFrom(e.target.value);
                    setBillCollectorTo(e.target.value);
                  }}
                  size="small"
                  sx={{ width: 180, bgcolor: 'white' }}
                />

                <Typography textAlign="center">To</Typography>

                <TextField
                  type="text"
                  label="To"
                  value={billCollectorTo}
                  onChange={(e) => setBillCollectorTo(e.target.value)}
                  size="small"
                  sx={{ width: 180, bgcolor: 'white' }}
                />
              </Box>

              {/* Team */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                }}
              >
                <Typography
                  sx={{ width: 140, textAlign: 'right', whiteSpace: 'nowrap' }}
                >
                  Team
                </Typography>

                <TextField
                  type="text"
                  label="From"
                  value={teamFrom}
                  onChange={(e) => {
                    setTeamFrom(e.target.value);
                    setTeamTo(e.target.value);
                  }}
                  size="small"
                  sx={{ width: 180, bgcolor: 'white' }}
                />

                <Typography textAlign="center">To</Typography>

                <TextField
                  type="text"
                  label="To"
                  value={teamTo}
                  onChange={(e) => setTeamTo(e.target.value)}
                  size="small"
                  sx={{ width: 180, bgcolor: 'white' }}
                />
              </Box>

              {/* Execute Button */}
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
              Incoming Payment Report
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
                rows={rowsWithSummary}
                columns={columns}
                getRowId={(row) =>
                  row.customer_code === 'Total'
                    ? 'summary-row'
                    : row.received_record_no ||
                      `${row.customer_code}-${row.ref_invoice_details}-${Math.random()}`
                }
                getRowClassName={(params) =>
                  params.row.customer_code === 'Total' ? 'summary-row' : ''
                }
                disableRowSelectionOnClick
                autoHeight
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 25, page: 0 },
                  },
                }}
                pageSizeOptions={[25, 50, 100]}
                sx={{
                  '& .MuiDataGrid-columnHeaderTitleContainer': {
                    justifyContent: 'center',
                  },
                  '& .MuiDataGrid-columnHeader': {
                    borderRight: '1px solid rgba(224, 224, 224, 1)',
                  },
                  '& .MuiDataGrid-cell': {
                    display: 'flex',
                    alignItems: 'center',
                    whiteSpace: 'normal',
                    wordWrap: 'break-word',
                    lineHeight: 'normal',
                    padding: '8px 4px',
                    borderRight: '1px solid rgba(224, 224, 224, 1)',
                  },
                  '& .MuiDataGrid-columnHeaderTitle': {
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2',
                  },
                  '& .summary-row': {
                    backgroundColor: '#f5f5f5',
                    fontWeight: 'bold',
                    borderTop: '2px solid rgba(224, 224, 224, 1)',
                  },
                  '& .summary-row .MuiDataGrid-cell': {
                    fontWeight: 'bold',
                  },
                }}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Fullscreen Dialog */}
      {tableData.length > 0 && (
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
              Incoming Payment Report
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
                rows={rowsWithSummary}
                columns={columns}
                getRowId={(row) =>
                  row.customer_code === 'Total'
                    ? 'summary-row'
                    : row.received_record_no ||
                      `${row.customer_code}-${row.ref_invoice_details}-${Math.random()}`
                }
                getRowClassName={(params) =>
                  params.row.customer_code === 'Total' ? 'summary-row' : ''
                }
                disableRowSelectionOnClick
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 25, page: 0 },
                  },
                }}
                pageSizeOptions={[25, 50, 100]}
                sx={{
                  '& .MuiDataGrid-columnHeaderTitleContainer': {
                    justifyContent: 'center',
                  },
                  '& .MuiDataGrid-columnHeader': {
                    borderRight: '1px solid rgba(224, 224, 224, 1)',
                  },
                  '& .MuiDataGrid-cell': {
                    display: 'flex',
                    alignItems: 'center',
                    whiteSpace: 'normal',
                    wordWrap: 'break-word',
                    lineHeight: 'normal',
                    padding: '8px 4px',
                    borderRight: '1px solid rgba(224, 224, 224, 1)',
                  },
                  '& .MuiDataGrid-columnHeaderTitle': {
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2',
                  },
                  '& .summary-row': {
                    backgroundColor: '#f5f5f5',
                    fontWeight: 'bold',
                    borderTop: '2px solid rgba(224, 224, 224, 1)',
                  },
                  '& .summary-row .MuiDataGrid-cell': {
                    fontWeight: 'bold',
                  },
                }}
              />
            </Box>
          </DialogContent>
        </Dialog>
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

export default IncomingPaymentReportTab;
