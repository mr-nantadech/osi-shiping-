'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

import type { TransportRow } from '@/types/transport';
import { transportColumns } from '@/interface/component';
import { printLabelTransportApi } from '@/lib/api/print-label-transport';
import type { IPrintLabelTransport } from '@/types/backend/print-label-transport';

interface ExcelRow {
  Invoice: string;
  วันที่: string | number;
  เลขพัสดุ: string;
  วันที่เซ็นต์รับ: string | number;
  ผู้เซ็นต์รับ: string;
  สถานะ: string;
}

function UpdateStatusTab() {
  const [fileName, setFileName] = useState('');
  const [tableData, setTableData] = useState<TransportRow[]>([]);
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [apiData, setApiData] = useState<IPrintLabelTransport[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
    () => ['Invoice', 'วันที่', 'เลขพัสดุ', 'วันที่เซ็นต์รับ', 'ผู้เซ็นต์รับ', 'สถานะ'],
    [],
  );
  const columns: GridColDef[] = useMemo(
    () =>
      transportColumns.map((col) => ({
        ...col,
        headerAlign: col.headerAlign ?? 'center',
        align: col.align ?? 'center',
      })),
    [],
  );

  const formatDate = (dateValue?: string | number | null) => {
    if (!dateValue) return '';

    // ถ้าเป็นตัวเลข แปลงจาก Excel serial date
    if (typeof dateValue === 'number') {
      // Excel serial date: จำนวนวันนับจาก 1 January 1900
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 86400000);
      return dayjs(date).format('DD.MM.YYYY');
    }

    // ถ้าเป็น string ลองแปลงหลายรูปแบบ
    const formats = ['DD/MM/YYYY', 'DD.MM.YYYY', 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ss'];
    for (const format of formats) {
      const parsed = dayjs(dateValue, format, true);
      if (parsed.isValid()) {
        return parsed.format('DD.MM.YYYY');
      }
    }

    // ลองแปลงแบบอัตโนมัติ
    const parsed = dayjs(dateValue);
    return parsed.isValid() ? parsed.format('DD.MM.YYYY') : '';
  };

  const handleExecute = async () => {
    if (excelData.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please select an Excel file first.',
        severity: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await printLabelTransportApi.getAll();

      if (!res.data_model || res.data_model.length === 0) {
        setSnackbar({
          open: true,
          message: 'No transport data found.',
          severity: 'info',
        });
        setTableData([]);
        setLoading(false);
        return;
      }

      // Map API data กับ Excel data
      const mappedData: TransportRow[] = res.data_model
        .map((apiRow) => {
          // หา Excel row ที่ตรงกับ billing_document
          // แปลงเป็น string และ trim เพื่อให้ match ได้แม้คนละ type
          const billingDoc = String(apiRow.billing_document ?? '').trim();
          const excelRow = excelData.find(
            (excel) => String(excel.Invoice ?? '').trim() === billingDoc,
          );

          // ถ้าไม่มีใน Excel ก็ไม่เอามาแสดง
          if (!excelRow) {
            console.log(
              `No match found for billing_document: ${billingDoc}`,
            );
            return null;
          }

          console.log(
            `Match found: ${billingDoc} ←→ ${excelRow.Invoice}`,
          );
          console.log('Excel row data:', {
            วันที่: excelRow.วันที่,
            เลขพัสดุ: excelRow.เลขพัสดุ,
            วันที่เซ็นต์รับ: excelRow.วันที่เซ็นต์รับ,
            ผู้เซ็นต์รับ: excelRow.ผู้เซ็นต์รับ,
            สถานะ: excelRow.สถานะ,
          });

          const mappedRow = {
            id: apiRow.id ?? 0,
            transportNo: apiRow.transport_no ?? '',
            transportDate: formatDate(apiRow.transport_date),
            billingDocument: apiRow.billing_document ?? '',
            billingDate: formatDate(apiRow.billing_date),
            shipTo: apiRow.ship_to ?? '',
            shipToDescription: apiRow.ship_to_description ?? '',
            deliveryQty: Number(apiRow.delivery_qty ?? 0),
            salesUnit: apiRow.sales_unit ?? '',
            salesDistrict: apiRow.sales_district ?? '',
            salesDistrictDescription: apiRow.sales_district_description ?? '',
            transportBy: apiRow.transport_by ?? '',
            transportByFullname: apiRow.transport_by_fullname ?? '',
            box: apiRow.box ?? 0,
            // ข้อมูลจาก Excel
            receivedDate: excelRow.วันที่ ? formatDate(excelRow.วันที่) : null,
            trackingNo: excelRow.เลขพัสดุ ?? '',
            signedDate: excelRow.วันที่เซ็นต์รับ
              ? formatDate(excelRow.วันที่เซ็นต์รับ)
              : null,
            signedBy: excelRow.ผู้เซ็นต์รับ ?? '',
            status: excelRow.สถานะ ?? '',
          } as TransportRow;

          console.log('Mapped row signedDate:', mappedRow.signedDate);

          return mappedRow;
        })
        .filter((row): row is TransportRow => row !== null);

      console.log('API data:', res.data_model);
      console.log('Mapped data:', mappedData);
      setApiData(res.data_model);
      setTableData(mappedData);
      setSnackbar({
        open: true,
        message: `Loaded ${mappedData.length} matching records.`,
        severity: 'success',
      });
    } catch (error) {
      console.error('Failed to fetch data', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch data. Please try again.',
        severity: 'error',
      });
      setTableData([]);
    }
    setLoading(false);
  };

  const toApiDateTime = (value?: string | null, fallbackNow = false) => {
    const formats = ['DD.MM.YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ss'] as const;
    const parsed = value && (formats.reduce<dayjs.Dayjs | null>((acc, fmt) => {
      if (acc) return acc;
      const d = dayjs(value, fmt, true);
      return d.isValid() ? d : null;
    }, null) || dayjs(value));
    if (parsed && parsed.isValid()) return parsed.format('YYYY-MM-DDTHH:mm:ss');
    if (fallbackNow) return dayjs().format('YYYY-MM-DDTHH:mm:ss');
    return null;
  };

  const handleSave = async () => {
    if (tableData.length === 0) {
      setSnackbar({
        open: true,
        message: 'No data to save.',
        severity: 'warning',
      });
      return;
    }

    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const row of tableData) {
        // หา original API row ที่ตรงกัน
        const originalApiRow = apiData.find(
          (api) => api.billing_document === row.billingDocument,
        );

        if (!originalApiRow || !originalApiRow.id) {
          console.warn(`No API data found for ${row.billingDocument}`);
          errorCount++;
          continue;
        }

        // สร้าง payload โดยใช้ข้อมูลเดิมจาก API และ update fields จาก Excel
        const payload: IPrintLabelTransport = {
          ...originalApiRow,
          tracking_number: row.trackingNo || undefined,
          received_date: toApiDateTime(row.receivedDate),
          signed_date: toApiDateTime(row.signedDate),
          signed_by: row.signedBy || undefined,
          status: row.status || undefined,
          update_at: toApiDateTime(null, true),
        };

        console.log('Payload to update:', payload);

        try {
          await printLabelTransportApi.update(payload);
          console.log(`Successfully updated ${row.billingDocument}`);
          successCount++;
        } catch (err) {
          console.error(`Failed to update ${row.billingDocument}:`, err);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        setSnackbar({
          open: true,
          message: `Successfully updated ${successCount} records.`,
          severity: 'success',
        });
      } else {
        setSnackbar({
          open: true,
          message: `Updated ${successCount} records, ${errorCount} failed.`,
          severity: 'warning',
        });
      }
    } catch (error) {
      console.error('Save failed:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save. Please try again.',
        severity: 'error',
      });
    }

    setSaving(false);
  };

  return (
    <>
      <Card sx={{ maxWidth: '100%' }}>
        <Box sx={{ bgcolor: '#1F2175', px: 2, py: 1.5 }}>
          <Typography variant="h6" component="div" sx={{ color: 'white' }}>
            Update Status Shipping
          </Typography>
        </Box>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              mt: 3,
            }}
          >
            <TextField
              label="File name"
              value={fileName}
              size="small"
              InputProps={{ readOnly: true }}
              sx={{ width: 260, bgcolor: 'white' }}
            />

            <Button variant="outlined" component="label" sx={{ width: 140 }}>
              Browse
              <input
                hidden
                type="file"
                accept=".xlsx,.xls"
                onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (!file) {
                    setFileName('');
                    setExcelData([]);
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
                          'Invalid column headers. Please use the standard Update Status template.',
                        severity: 'error',
                      });
                      setFileName('');
                      setExcelData([]);
                      e.target.value = '';
                      return;
                    }

                    const dataRows = XLSX.utils.sheet_to_json(sheet, {
                      header: expectedHeaders as string[],
                      range: 1,
                      defval: '',
                    }) as ExcelRow[];

                    if (dataRows.length === 0) {
                      setSnackbar({
                        open: true,
                        message: 'No row data found in the file.',
                        severity: 'error',
                      });
                      setFileName('');
                      setExcelData([]);
                      e.target.value = '';
                      return;
                    }

                    console.log('Excel data loaded:', dataRows);
                    setFileName(file.name);
                    setExcelData(dataRows);
                    setSnackbar({
                      open: true,
                      message: `File loaded successfully. ${dataRows.length} rows found.`,
                      severity: 'success',
                    });
                  } catch (err) {
                    console.error(err);
                    setSnackbar({
                      open: true,
                      message: 'Could not read the file. Please try again.',
                      severity: 'error',
                    });
                    setFileName('');
                    setExcelData([]);
                    e.target.value = '';
                  }
                }}
              />
            </Button>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              mt: 3,
            }}
          >
            <Button
              variant="contained"
              onClick={handleExecute}
              disabled={loading || excelData.length === 0}
              sx={{
                px: 6,
              }}
            >
              {loading ? 'Loading...' : 'Execute'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {tableData.length > 0 && (
        <Card sx={{ maxWidth: '100%', mt: 3 }}>
          <Box sx={{ bgcolor: '#1F2175', px: 2, py: 1.5 }}>
            <Typography variant="h6" component="div" sx={{ color: 'white' }}>
              Update Status Shipping
            </Typography>
          </Box>
          <CardContent>
            <Box sx={{ height: '100%', width: '100%', gap: 2 }}>
              <DataGrid
                rows={tableData}
                columns={columns}
                getRowId={(row) => row.billingDocument}
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
                disabled={saving || tableData.length === 0}
                sx={{
                  px: 6,
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
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

export default UpdateStatusTab;
