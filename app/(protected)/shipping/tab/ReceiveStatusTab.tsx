'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { printLabelTransportApi } from '@/lib/api/print-label-transport';
import type { IPrintLabelTransport } from '@/types/backend/print-label-transport';
import type { SessionUser } from '@/types/auth';

type ReceiveRow = Pick<
  IPrintLabelTransport,
  | 'billing_document'
  | 'billing_date'
  | 'ship_to'
  | 'ship_to_description'
  | 'sales_district'
  | 'sales_district_description'
  | 'received_confirm'
>;

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

function ReceiveStatusTab() {
  const titleText = 'Receive Status Shipping';
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [tableData, setTableData] = useState<ReceiveRow[]>([]);
  const [originalData, setOriginalData] = useState<IPrintLabelTransport[]>([]);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const showSnackbar = useCallback(
    (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
      setSnackbar({ open: true, message, severity });
    },
    [],
  );

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  // Fetch session user on component mount
  useEffect(() => {
    async function loadSessionUser() {
      try {
        const res = await fetch('/api/session', { cache: 'no-store' });
        if (!res.ok) {
          console.error('Failed to fetch session');
          return;
        }

        const json = (await res.json()) as { user: SessionUser };
        setSessionUser(json.user);
      } catch (err) {
        console.error('Error loading session user:', err);
      }
    }

    void loadSessionUser();
  }, []);

  const handleToggleSigned = useCallback(
    (billingDocument: string, checked: boolean) => {
      setTableData((prev) =>
        prev.map((row) =>
          row.billing_document === billingDocument
            ? { ...row, received_confirm: checked }
            : row,
        ),
      );
    },
    [],
  );

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'billing_document',
        headerName: 'Billing Document',
        width: 160,
        headerAlign: 'center',
        align: 'center',
      },
      {
        field: 'billing_date',
        headerName: 'Billing Date',
        width: 140,
        headerAlign: 'center',
        align: 'center',
        valueFormatter: (value) => formatDate(value),
      },
      {
        field: 'ship_to',
        headerName: 'ShipTo',
        width: 120,
        headerAlign: 'center',
        align: 'center',
      },
      {
        field: 'ship_to_description',
        headerName: 'Ship to Description',
        width: 250,
        headerAlign: 'center',
        align: 'center',
      },
      {
        field: 'sales_district',
        headerName: 'Sales District',
        width: 140,
        headerAlign: 'center',
        align: 'center',
      },
      {
        field: 'sales_district_description',
        headerName: 'Sales District Description',
        width: 220,
        headerAlign: 'center',
        align: 'center',
      },
      {
        field: 'received_confirm',
        headerName: 'ได้รับใบเซ็นต์รับ',
        width: 160,
        headerAlign: 'center',
        align: 'center',
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <Checkbox
            checked={Boolean(params.value)}
            onChange={(event) =>
              handleToggleSigned(
                params.row.billing_document,
                event.target.checked,
              )
            }
            onClick={(event) => event.stopPropagation()}
          />
        ),
      },
    ],
    [handleToggleSigned],
  );

  const handleExecute = async () => {
    if (!from) {
      showSnackbar('Please enter Billing Document', 'warning');
      return;
    }

    try {
      const response = await printLabelTransportApi.getByBillDoc(from);

      if (response.is_completed && response.data_model) {
        // Convert single object to array if needed
        const dataArray = Array.isArray(response.data_model)
          ? response.data_model
          : [response.data_model];

        // Check if status is not "พัสดุจัดส่งสำเร็จ"
        const hasNonSuccessfulDelivery = dataArray.some(
          (row) => row.status !== 'พัสดุจัดส่งสำเร็จ',
        );

        if (hasNonSuccessfulDelivery) {
          // ถ้าอยู่ระหว่างจัดส่ง ไม่แสดงข้อมูลในตาราง
          showSnackbar('Shipment is in transit.', 'info');
          setTableData([]);
          setOriginalData([]);
        } else {
          // ถ้าจัดส่งสำเร็จแล้ว แสดงข้อมูลในตาราง
          setOriginalData(dataArray);

          const rows: ReceiveRow[] = dataArray.map((row) => ({
            billing_document: row.billing_document,
            billing_date: row.billing_date,
            ship_to: row.ship_to,
            ship_to_description: row.ship_to_description,
            sales_district: row.sales_district,
            sales_district_description: row.sales_district_description,
            received_confirm: row.received_confirm ?? false,
          }));

          setTableData(rows);
          showSnackbar('Data retrieved successfully', 'success');
        }
      } else {
        showSnackbar('Billing Document not found.', 'info');
        setTableData([]);
        setOriginalData([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showSnackbar('Error fetching data', 'error');
      setTableData([]);
      setOriginalData([]);
    }
  };

  const handleSave = async () => {
    try {
      // Format current date to ISO 8601 format for .NET DateTime
      const now = new Date();
      const formattedDate = now.toISOString();

      // Update each record with the new received_confirm value
      const updatePromises = tableData.map(async (row) => {
        const originalRow = originalData.find(
          (r) => r.billing_document === row.billing_document,
        );
        if (originalRow) {
          const updatedRow: IPrintLabelTransport = {
            ...originalRow,
            received_confirm: row.received_confirm,
            // If checkbox is checked, set session data; otherwise set to null
            received_confirm_by_id: row.received_confirm
              ? (sessionUser?.employeeId?.toString() ?? null)
              : null,
            received_confirm_by_date: row.received_confirm
              ? formattedDate
              : null,
            received_confirm_by_name: row.received_confirm
              ? sessionUser
                ? `${sessionUser.firstName_EN} ${sessionUser.lastName_EN}`
                : null
              : null,
          };
          return printLabelTransportApi.update(updatedRow);
        }
      });

      await Promise.all(updatePromises);
      showSnackbar('Data saved successfully', 'success');

      // Refresh data
      handleExecute();
    } catch (error) {
      console.error('Error saving data:', error);
      showSnackbar('Error saving data', 'error');
    }
  };

  return (
    <>
      <Card sx={{ maxWidth: '100%' }}>
        <Box sx={{ bgcolor: '#1F2175', px: 2, py: 1.5 }}>
          <Typography variant="h6" component="div" sx={{ color: 'white' }}>
            บันทึกรับใบเซ็นต์รับสินค้า
          </Typography>
        </Box>
        <CardContent>
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
                Billing Doc.
              </Typography>

              <TextField
                label="From"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                size="small"
                sx={{ width: 180, bgcolor: 'white' }}
                InputLabelProps={{
                  shrink: false,
                  sx: { display: 'none' },
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
        </CardContent>
      </Card>

      {tableData.length > 0 && (
        <Card sx={{ maxWidth: '100%', mt: 3 }}>
          <Box sx={{ bgcolor: '#1F2175', px: 2, py: 1.5 }}>
            <Typography variant="h6" component="div" sx={{ color: 'white' }}>
              {titleText}
            </Typography>
          </Box>
          <CardContent>
            <Box sx={{ width: '100%' }}>
              <DataGrid
                rows={tableData}
                columns={columns}
                getRowId={(row) => row.billing_document ?? ''}
                disableRowSelectionOnClick
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
                  '& .MuiDataGrid-columnHeader': {
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
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
                mt: 3,
              }}
            >
              <Button
                variant="contained"
                onClick={handleSave}
                sx={{
                  px: 6,
                }}
              >
                Save
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default ReceiveStatusTab;
