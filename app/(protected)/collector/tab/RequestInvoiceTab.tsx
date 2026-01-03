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
import { useCallback, useMemo, useState } from 'react';
import { collectorApi } from '@/lib/api/collector';
import { masCollectorApi } from '@/lib/api/mas-collector';
import { printLabelTransportApi } from '@/lib/api/print-label-transport';
import type { ICollector } from '@/types/backend/collector';
import type { IMasCollector } from '@/types/backend/mas-collector';
import type { IPrintLabelTransport } from '@/types/backend/print-label-transport';

type RequestRow = Pick<
  IPrintLabelTransport,
  | 'id'
  | 'billing_document'
  | 'billing_date'
  | 'ship_to'
  | 'ship_to_description'
  | 'sales_district'
  | 'sales_district_description'
  | 'sales_employee_code'
  | 'sales_employee_name'
  | 'transport_by'
  | 'bill_required_by_collector_code'
> & {
  requestBill: boolean;
  isDisabled: boolean;
};

function RequestInvoiceTab() {
  const titleText = 'Billing Clerk';
  const [collector, setCollector] = useState('');
  const [billingDoc, setBillingDoc] = useState('');
  const [tableData, setTableData] = useState<RequestRow[]>([]);
  const [collectorError, setCollectorError] = useState(false);
  const [billingDocError, setBillingDocError] = useState(false);
  const [collectorData, setCollectorData] = useState<IMasCollector | null>(null);
  const [printLabelData, setPrintLabelData] = useState<IPrintLabelTransport[]>(
    [],
  );
  const [executeLoading, setExecuteLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
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

  const handleToggleRequest = useCallback(
    (billingDocument: string, checked: boolean) => {
      setTableData((prev) =>
        prev.map((row) =>
          row.billing_document === billingDocument
            ? { ...row, requestBill: checked }
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
        valueFormatter: (value: string) => {
          if (!value) return '';
          try {
            const date = new Date(value);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}.${month}.${year}`;
          } catch {
            return value;
          }
        },
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
        field: 'requestBill',
        headerName: 'Request Bill',
        width: 160,
        headerAlign: 'center',
        align: 'center',
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <Checkbox
            checked={Boolean(params.value)}
            disabled={params.row.isDisabled}
            onChange={(event) =>
              handleToggleRequest(
                params.row.billing_document,
                event.target.checked,
              )
            }
            onClick={(event) => event.stopPropagation()}
          />
        ),
      },
    ],
    [handleToggleRequest],
  );

  const handleSave = async () => {
    if (!collectorData) {
      showSnackbar('Please execute first', 'warning');
      return;
    }

    setSaveLoading(true);
    try {
      // Update PrintLabelTransport records
      const updatePrintLabelPromises = tableData.map(async (row) => {
        const originalData = printLabelData.find(
          (d) => d.billing_document === row.billing_document,
        );
        if (originalData) {
          const updatedData: IPrintLabelTransport = {
            ...originalData,
            bill_required_by_collector_code: row.requestBill
              ? (collectorData.collector_code ?? null)
              : null,
            bill_required_by_collector_name: row.requestBill
              ? (collectorData.collector_name ?? null)
              : null,
          };
          return printLabelTransportApi.update(updatedData);
        }
      });

      await Promise.all(updatePrintLabelPromises);

      // Upsert Collector records
      for (const row of tableData) {
        if (!row.requestBill) continue;

        const originalPrintLabel = printLabelData.find(
          (d) => d.billing_document === row.billing_document,
        );
        if (!originalPrintLabel) continue;

        // Check if collector record exists
        const existingCollector = await collectorApi.getByBillDoc(
          row.billing_document ?? '',
        );

        if (!existingCollector.is_completed || !existingCollector.data_model) {
          // Create new collector record
          const newCollector: ICollector = {
            id: 0,
            billing_document: originalPrintLabel.billing_document,
            billing_date: originalPrintLabel.billing_date,
            ship_to: originalPrintLabel.ship_to,
            ship_to_description: originalPrintLabel.ship_to_description,
            transport_by: originalPrintLabel.transport_by,
            sales_district: originalPrintLabel.sales_district,
            sales_district_description:
              originalPrintLabel.sales_district_description,
            sales_employee_code: originalPrintLabel.sales_employee_code,
            sales_employee_name: originalPrintLabel.sales_employee_name,
            collector_code: collectorData.collector_code,
            collector_name: collectorData.collector_name,
            request_bill_status: null,
            return_bill_status: null,
            update_by: null,
            update_at: null,
          };
          await collectorApi.create(newCollector);
        } else {
          // Update existing collector record
          const updatedCollector: ICollector = {
            ...existingCollector.data_model,
            collector_code: collectorData.collector_code,
            collector_name: collectorData.collector_name,
          };
          await collectorApi.update(updatedCollector);
        }
      }

      showSnackbar('Data saved successfully', 'success');
      // Refresh data
      await handleExecute();
    } catch (error) {
      console.error('Error saving data:', error);
      showSnackbar('Error saving data', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleExecute = async () => {
    // Validate both fields
    if (!collector.trim()) {
      setCollectorError(true);
      showSnackbar('Please enter Collector', 'warning');
      return;
    }
    if (!billingDoc.trim()) {
      setBillingDocError(true);
      showSnackbar('Please enter Billing Document', 'warning');
      return;
    }

    // Clear errors
    setCollectorError(false);
    setBillingDocError(false);
    setExecuteLoading(true);

    try {
      // Fetch collector data
      const collectorRes = await masCollectorApi.getByCode(collector.trim());
      if (!collectorRes.is_completed || !collectorRes.data_model) {
        showSnackbar('Collector not found', 'info');
        setExecuteLoading(false);
        return;
      }

      // Fetch billing document data
      const billDocRes = await printLabelTransportApi.getByBillDoc(
        billingDoc.trim(),
      );
      if (!billDocRes.is_completed || !billDocRes.data_model) {
        showSnackbar('Billing Document not found', 'info');
        setExecuteLoading(false);
        return;
      }

      setCollectorData(collectorRes.data_model);

      // Convert to array if single object
      const dataArray = Array.isArray(billDocRes.data_model)
        ? billDocRes.data_model
        : [billDocRes.data_model];

      setPrintLabelData(dataArray);

      // Map to table rows
      const rows: RequestRow[] = dataArray.map((item) => {
        const billRequiredCode = item.bill_required_by_collector_code;
        const collectorCode = collectorRes.data_model?.collector_code;

        // Determine checkbox state
        let requestBill = false;
        let isDisabled = false;

        if (billRequiredCode && billRequiredCode !== collectorCode) {
          // Already assigned to different collector
          requestBill = true;
          isDisabled = true;
        } else if (billRequiredCode === collectorCode) {
          // Assigned to current collector
          requestBill = true;
          isDisabled = false;
        } else {
          // Not assigned
          requestBill = false;
          isDisabled = false;
        }

        return {
          id: item.id,
          billing_document: item.billing_document,
          billing_date: item.billing_date,
          ship_to: item.ship_to,
          ship_to_description: item.ship_to_description,
          sales_district: item.sales_district,
          sales_district_description: item.sales_district_description,
          sales_employee_code: item.sales_employee_code,
          sales_employee_name: item.sales_employee_name,
          transport_by: item.transport_by,
          bill_required_by_collector_code: billRequiredCode,
          requestBill,
          isDisabled,
        };
      });

      setTableData(rows);
      showSnackbar('Data retrieved successfully', 'success');
    } catch (error) {
      console.error('Error fetching data:', error);
      showSnackbar('Error fetching data', 'error');
    } finally {
      setExecuteLoading(false);
    }
  };

  return (
    <>
      <Card sx={{ maxWidth: '100%' }}>
        <Box sx={{ bgcolor: '#1F2175', px: 2, py: 1.5 }}>
          <Typography variant="h6" component="div" sx={{ color: 'white' }}>
            Billing Clerk
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
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '140px 200px' },
                rowGap: 2,
                columnGap: 2,
                justifyContent: 'center',
                alignItems: 'center',
                mt: 3,
              }}
            >
              <Typography sx={{ width: 140, textAlign: 'right', whiteSpace: 'nowrap' }}>
                Collector
              </Typography>

              <TextField
                label="Collector"
                value={collector}
                onChange={(event) => {
                  setCollector(event.target.value);
                  setCollectorError(false);
                  setTableData([]);
                }}
                size="small"
                error={collectorError}
                helperText={collectorError ? 'Required' : undefined}
                sx={{ width: { xs: '100%', sm: 200 }, bgcolor: 'white' }}
                InputLabelProps={{
                  shrink: false,
                  sx: { display: 'none' },
                }}
              />

              <Typography
                sx={{ width: 140, textAlign: 'right', whiteSpace: 'nowrap' }}
              >
                Billing Document
              </Typography>

              <TextField
                label="Billing Document"
                value={billingDoc}
                onChange={(event) => {
                  setBillingDoc(event.target.value);
                  setBillingDocError(false);
                  setTableData([]);
                }}
                size="small"
                error={billingDocError}
                helperText={billingDocError ? 'Required' : undefined}
                sx={{ width: { xs: '100%', sm: 200 }, bgcolor: 'white' }}
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
                disabled={executeLoading}
                sx={{
                  px: 6,
                }}
              >
                {executeLoading ? 'Loading...' : 'Execute'}
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
                disabled={
                  saveLoading || tableData.every((row) => row.isDisabled)
                }
                sx={{
                  px: 6,
                }}
              >
                {saveLoading ? 'Saving...' : 'Save'}
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

export default RequestInvoiceTab;
