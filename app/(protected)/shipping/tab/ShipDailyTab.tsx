'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';
import React from 'react';
import { printLabelTransportApi } from '@/lib/api/print-label-transport';
import type { IPrintLabelTransport } from '@/types/backend/print-label-transport';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface GroupedData {
  transport_date: string; // วันที่ส่งสินค้า (ไม่รวมเวลา)
  round: string;
  sales_district: string;
  sales_district_description: string;
  transport_no: string;
  items: IPrintLabelTransport[];
}

function ShipDailyTab() {
  const [from, setFrom] = React.useState<Dayjs | null>(null);
  const [to, setTo] = React.useState<Dayjs | null>(null);
  const [fromError, setFromError] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [groupedData, setGroupedData] = React.useState<GroupedData[]>([]);
  const [generatingPdf, setGeneratingPdf] = React.useState(false);
  const previewRef = React.useRef<HTMLDivElement | null>(null);
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: 'info' | 'warning' | 'error' | 'success';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const formatShippingDateParam = (date: Dayjs | null) => {
    if (!date || !date.isValid()) return undefined;
    return `${date.format('YYYY-MM-DD')}`;
  };

  const formatDateDisplay = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const parsed = dayjs(dateStr);
    return parsed.isValid() ? parsed.format('DD/MM/YYYY') : '';
  };

  const getNextTransportNo = (list: IPrintLabelTransport[]) => {
    const yearPrefix = dayjs().format('YY');
    const prefix = `${yearPrefix}TS`;
    const maxSeq = list.reduce((max, item) => {
      const code = item.transport_no || '';
      if (!code.startsWith(prefix)) return max;
      const numPart = code.slice(prefix.length);
      const num = Number(numPart);
      return Number.isFinite(num) ? Math.max(max, num) : max;
    }, 0);
    const next = String(maxSeq + 1).padStart(6, '0');
    return `${prefix}${next}`;
  };

  const handleExecute = async () => {
    if (!from) {
      setFromError(true);
      setSnackbar({
        open: true,
        message: 'Please select Shipping Date From.',
        severity: 'warning',
      });
      return;
    }
    setFromError(false);

    const start = formatShippingDateParam(from);
    const end = formatShippingDateParam(to);
    setLoading(true);
    try {
      const res = await printLabelTransportApi.searchByShippingDateNoTruck(
        start,
        end,
      );
      console.log('Search result:', res);

      if (!res.is_completed || !res.data_model || res.data_model.length === 0) {
        setSnackbar({
          open: true,
          message: 'Data not found.',
          severity: 'info',
        });
        setGroupedData([]);
        setLoading(false);
        return;
      }

      // Get all existing transport numbers to generate new sequential ones
      const existing = await printLabelTransportApi.getAll();
      const existingList = existing.data_model ?? [];
      const now = dayjs().format('YYYY-MM-DDTHH:mm:ss');

      console.log('=== DEBUG: Existing List ===');
      console.log('existingList:', existingList.map(e => ({
        billing_document: e.billing_document,
        transport_date: e.transport_date,
        round: e.round,
        district: e.sales_district,
        transport_no: e.transport_no,
      })));

      console.log('=== DEBUG: API Data ===');
      console.log('res.data_model:', res.data_model.map(item => ({
        billing_document: item.billing_document,
        transport_date: item.transport_date,
        round: item.round,
        district: item.sales_district,
        transport_no: item.transport_no,
      })));

      // จัดกลุ่มตาม transport_date (วันที่เดียวกัน) > round > sales_district
      const grouped = new Map<
        string,
        Map<string, Map<string, IPrintLabelTransport[]>>
      >();

      res.data_model.forEach((item) => {
        // Extract date only from transport_date (without time)
        const transportDate = item.transport_date
          ? dayjs(item.transport_date).format('YYYY-MM-DD')
          : '';
        const round = item.round || '1';
        const district = item.sales_district || '';

        if (!grouped.has(transportDate)) {
          grouped.set(transportDate, new Map());
        }

        const dateMap = grouped.get(transportDate)!;
        if (!dateMap.has(round)) {
          dateMap.set(round, new Map());
        }

        const roundMap = dateMap.get(round)!;
        if (!roundMap.has(district)) {
          roundMap.set(district, []);
        }

        roundMap.get(district)!.push(item);
      });

      // Map เก็บ transport_no สำหรับแต่ละ date + round + district combination
      const transportNoByKey = new Map<string, string>();
      let rollingList = [...existingList];

      // Process แต่ละ date > round > district
      console.log('=== DEBUG: Processing Groups ===');
      grouped.forEach((dateMap, transportDate) => {
        dateMap.forEach((roundMap, round) => {
          roundMap.forEach((items, district) => {
            const key = `${transportDate}_${round}_${district}`;

            console.log(`\n--- Group: date=${transportDate}, round=${round}, district=${district} ---`);
            console.log('Items in group:', items.map(i => ({
              billing_document: i.billing_document,
              transport_no: i.transport_no,
            })));

            // เช็คว่ากลุ่มปัจจุบัน (date + round + district) มี transport_no ในฐานข้อมูลหรือไม่
            const existingGroupTransportNo = existingList.find(
              (existing) => {
                const existingDate = existing.transport_date
                  ? dayjs(existing.transport_date).format('YYYY-MM-DD')
                  : '';
                const existingRound = existing.round || '1';
                const existingDistrict = existing.sales_district || '';
                return (
                  existingDate === transportDate &&
                  existingRound === round &&
                  existingDistrict === district &&
                  existing.transport_no &&
                  existing.transport_no.trim() !== ''
                );
              },
            )?.transport_no;

            console.log('existingGroupTransportNo:', existingGroupTransportNo);

            if (existingGroupTransportNo) {
              // เช็คว่า transport_no นี้ถูกใช้โดยกลุ่มอื่นด้วยหรือไม่ (round/district ต่างกัน)
              const isSharedTransportNo = existingList.some((existing) => {
                if (existing.transport_no !== existingGroupTransportNo) return false;

                const existingDate = existing.transport_date
                  ? dayjs(existing.transport_date).format('YYYY-MM-DD')
                  : '';
                const existingRound = existing.round || '1';
                const existingDistrict = existing.sales_district || '';

                // ถ้ามี record ที่ใช้ transport_no เดียวกัน แต่อยู่คนละกลุ่ม
                return (
                  existingDate !== transportDate ||
                  existingRound !== round ||
                  existingDistrict !== district
                );
              });

              console.log('isSharedTransportNo:', isSharedTransportNo);

              if (isSharedTransportNo) {
                // หา records ทั้งหมดที่มี transport_no เดียวกัน
                const recordsWithSameTransportNo = existingList.filter(
                  (existing) => existing.transport_no === existingGroupTransportNo,
                );

                // หา record ที่มี print_date เก่าที่สุด (origin)
                const oldestRecord = recordsWithSameTransportNo.reduce(
                  (oldest, record) => {
                    if (!oldest) return record;
                    const recordDate = record.print_date
                      ? dayjs(record.print_date)
                      : dayjs('9999-12-31');
                    const oldestDate = oldest.print_date
                      ? dayjs(oldest.print_date)
                      : dayjs('9999-12-31');
                    return recordDate.isBefore(oldestDate) ? record : oldest;
                  },
                  null as IPrintLabelTransport | null,
                );

                console.log('Oldest record (origin):', {
                  billing_document: oldestRecord?.billing_document,
                  print_date: oldestRecord?.print_date,
                  round: oldestRecord?.round,
                });

                // เช็คว่ากลุ่มปัจจุบันเป็น origin หรือไม่
                const isOriginGroup =
                  oldestRecord &&
                  (() => {
                    const oldestDate = oldestRecord.transport_date
                      ? dayjs(oldestRecord.transport_date).format('YYYY-MM-DD')
                      : '';
                    const oldestRound = oldestRecord.round || '1';
                    const oldestDistrict = oldestRecord.sales_district || '';
                    return (
                      oldestDate === transportDate &&
                      oldestRound === round &&
                      oldestDistrict === district
                    );
                  })();

                console.log('isOriginGroup:', isOriginGroup);

                if (isOriginGroup) {
                  // กลุ่มนี้เป็น origin (print_date เก่าสุด) → ใช้เลขเดิม
                  console.log(
                    '✓ Origin group (oldest print_date), using:',
                    existingGroupTransportNo,
                  );
                  transportNoByKey.set(key, existingGroupTransportNo);
                } else {
                  // กลุ่มนี้ไม่ใช่ origin (print_date ใหม่กว่า) → generate ใหม่
                  const nextNo = getNextTransportNo(rollingList);
                  console.log('✓ Not origin (newer print_date), generated new:', nextNo);
                  transportNoByKey.set(key, nextNo);
                  rollingList = [
                    ...rollingList,
                    { transport_no: nextNo } as IPrintLabelTransport,
                  ];
                }
              } else {
                // transport_no นี้ใช้แค่กลุ่มนี้เท่านั้น → ใช้เลขเดิม
                console.log('✓ Using existing transport_no:', existingGroupTransportNo);
                transportNoByKey.set(key, existingGroupTransportNo);
              }
            } else {
              // กลุ่มใหม่ หรือ เป็นกลุ่มแรก → สร้าง transport_no ใหม่
              const nextNo = getNextTransportNo(rollingList);
              console.log('✓ New group! Generated new transport_no:', nextNo);
              transportNoByKey.set(key, nextNo);
              rollingList = [
                ...rollingList,
                { transport_no: nextNo } as IPrintLabelTransport,
              ];
            }
          });
        });
      });

      // Save to database พร้อม transport_no
      console.log('\n=== DEBUG: Saving to Database ===');
      await Promise.all(
        res.data_model.map(async (item) => {
          const found = existingList.find(
            (existing) => existing.billing_document === item.billing_document,
          );

          const transportDate = item.transport_date
            ? dayjs(item.transport_date).format('YYYY-MM-DD')
            : '';
          const round = item.round || '1';
          const district = item.sales_district || '';
          const key = `${transportDate}_${round}_${district}`;
          const transportNo = transportNoByKey.get(key);

          console.log(`Saving ${item.billing_document}:`, {
            key,
            transportNo_from_map: transportNo,
            item_transport_no: item.transport_no,
            round,
            district,
            action: !found ? 'CREATE' : 'UPDATE',
          });

          const payloadBase = {
            ...item,
            transport_no: transportNo || item.transport_no || undefined,
            update_at: now,
          } as IPrintLabelTransport;

          if (!found) {
            await printLabelTransportApi.create(payloadBase);
          } else if (found.id) {
            await printLabelTransportApi.update({
              ...payloadBase,
              id: found.id,
            });
          }
        }),
      );

      // อ่านข้อมูลใหม่หลัง save เพื่อให้ได้ transport_no ที่อัพเดทแล้ว
      const updatedRes =
        await printLabelTransportApi.searchByShippingDateNoTruck(start, end);
      const updatedDataModel = updatedRes.data_model || [];

      // จัดกลุ่มข้อมูลที่ update แล้วเพื่อแสดงผล (3 ชั้น: date > round > district)
      const groupedForDisplay = new Map<
        string,
        Map<string, Map<string, IPrintLabelTransport[]>>
      >();

      updatedDataModel.forEach((item) => {
        const transportDate = item.transport_date
          ? dayjs(item.transport_date).format('YYYY-MM-DD')
          : '';
        const round = item.round || '1';
        const district = item.sales_district || '';

        if (!groupedForDisplay.has(transportDate)) {
          groupedForDisplay.set(transportDate, new Map());
        }

        const dateMap = groupedForDisplay.get(transportDate)!;
        if (!dateMap.has(round)) {
          dateMap.set(round, new Map());
        }

        const roundMap = dateMap.get(round)!;
        if (!roundMap.has(district)) {
          roundMap.set(district, []);
        }

        roundMap.get(district)!.push(item);
      });

      // แปลงเป็น array สำหรับแสดงผล (loop 3 ชั้น: date > round > district)
      const result: GroupedData[] = [];
      groupedForDisplay.forEach((dateMap, transportDate) => {
        dateMap.forEach((roundMap, round) => {
          roundMap.forEach((items, district) => {
            if (items.length > 0) {
              result.push({
                transport_date: transportDate,
                round,
                sales_district: district,
                sales_district_description:
                  items[0].sales_district_description || district,
                transport_no: items[0].transport_no || '',
                items,
              });
            }
          });
        });
      });

      // เรียงข้อมูลตาม transport_no จากน้อยไปมาก
      result.sort((a, b) => {
        const aNo = a.transport_no || '';
        const bNo = b.transport_no || '';
        return aNo.localeCompare(bNo);
      });

      setGroupedData(result);

      if (result.length > 0) {
        // Trigger PDF generation
        setTimeout(() => setGeneratingPdf(true), 100);
      }
    } catch (error) {
      console.error('Failed to fetch shipping data', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch data. Please try again.',
        severity: 'error',
      });
      setGroupedData([]);
    }
    setLoading(false);
  };

  React.useEffect(() => {
    const generatePdf = async () => {
      if (!generatingPdf || groupedData.length === 0 || !previewRef.current) {
        setGeneratingPdf(false);
        return;
      }

      const tableNodes = Array.from(
        previewRef.current.querySelectorAll('.shipping-table'),
      ) as HTMLElement[];

      if (tableNodes.length === 0) return;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      for (let i = 0; i < tableNodes.length; i += 1) {
        const node = tableNodes[i];
        const canvas = await html2canvas(node, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      const blobUrl = pdf.output('bloburl');
      const url = typeof blobUrl === 'string' ? blobUrl : String(blobUrl);
      if (typeof window !== 'undefined') {
        window.open(url, '_blank');
      }
      setGeneratingPdf(false);
    };

    generatePdf().catch((err) => {
      console.error('Failed to generate PDF', err);
      setGeneratingPdf(false);
    });
  }, [generatingPdf, groupedData]);

  return (
    <>
      <Card sx={{ maxWidth: '100%' }}>
        <Box sx={{ bgcolor: '#1F2175', px: 2, py: 1.5 }}>
          <Typography variant="h6" component="div" sx={{ color: 'white' }}>
            Shipping Daily Report
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
                  Shipping Date
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

      {/* Hidden container for PDF generation */}
      {groupedData.length > 0 && (
        <div
          ref={previewRef}
          style={{
            position: 'absolute',
            left: -99999,
            top: 0,
            opacity: 0,
            pointerEvents: 'none',
          }}
        >
          {groupedData.map((group, groupIdx) => (
            <div
              key={groupIdx}
              className="shipping-table"
              style={{
                width: '210mm',
                minHeight: '297mm',
                backgroundColor: 'white',
                padding: '10mm',
                boxSizing: 'border-box',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontFamily: 'Angsana New, Arial, sans-serif',
                  fontSize: '16px',
                }}
              >
                <tbody>
                  <tr>
                    <td
                      colSpan={2}
                      rowSpan={2}
                      style={{
                        border: '1px solid black',
                        padding: '0px 8px 10px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        fontWeight: 'bold',
                      }}
                    >
                      <div style={{ marginTop: '-7px' }}>
                        ใบกำกับรายการส่งสินค้า <br />
                        {group.transport_no} <br />
                      </div>
                    </td>
                    <td
                      style={{
                        border: '1px solid black',
                        padding: '0px 8px 10px',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                        fontWeight: 'bold',
                      }}
                    >
                      <div style={{ marginTop: '-7px' }}>อันดับที่:</div>
                    </td>
                    <td
                      rowSpan={2}
                      style={{
                        border: '1px solid black',
                        padding: '0px 8px 10px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        fontWeight: 'bold',
                      }}
                    >
                      <div style={{ marginTop: '-7px' }}>
                        อนุมัติส่งสินค้าโดย
                        <br />
                        <br />
                        <br />
                      </div>
                    </td>
                    <td
                      colSpan={5}
                      rowSpan={2}
                      style={{
                        border: '1px solid black',
                        padding: '0px 8px 10px',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                        fontWeight: 'bold',
                      }}
                    >
                      <div style={{ marginTop: '-7px' }}>
                        ผู้ส่งสินค้า
                        <br />
                        บริษัท อินเตอร์ เอ็กซ์เพรส โลจิสติกส์
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        whiteSpace: 'nowrap',
                        textAlign: 'left',
                        border: '1px solid black',
                        padding: '0px 8px 10px',
                        verticalAlign: 'middle',
                        fontWeight: 'bold',
                      }}
                    >
                      <div style={{ marginTop: '-7px' }}>
                        ขนส่งสายที่ {group.sales_district_description}
                        <br />
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td
                      rowSpan={2}
                      style={{
                        border: '1px solid black',
                        padding: '0px 8px 10px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        fontWeight: 'bold',
                      }}
                    >
                      <div style={{ marginTop: '-7px' }}>ที่</div>
                    </td>
                    <td
                      rowSpan={2}
                      style={{
                        border: '1px solid black',
                        padding: '0px 8px 10px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        fontWeight: 'bold',
                      }}
                    >
                      <div style={{ marginTop: '-7px' }}>หมายเลขกล่อง</div>
                    </td>
                    <td
                      colSpan={2}
                      style={{
                        border: '1px solid black',
                        padding: '0px 8px 10px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        fontWeight: 'bold',
                      }}
                    >
                      <div style={{ marginTop: '-7px' }}>
                        ผู้รับสินค้าปลายทาง
                      </div>
                    </td>
                    <td
                      colSpan={2}
                      style={{
                        border: '1px solid black',
                        padding: '0px 8px 10px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        fontWeight: 'bold',
                      }}
                    >
                      <div style={{ marginTop: '-7px' }}>บิลส่งของ</div>
                    </td>
                    <td
                      colSpan={2}
                      style={{
                        border: '1px solid black',
                        padding: '0px 8px 10px',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        verticalAlign: 'middle',
                        fontWeight: 'bold',
                      }}
                    >
                      <div style={{ marginTop: '-7px' }}>สินค้ามีจำนวนรวม</div>
                    </td>
                    <td
                      rowSpan={2}
                      style={{
                        border: '1px solid black',
                        padding: '0px 8px 10px',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        verticalAlign: 'middle',
                        fontWeight: 'bold',
                      }}
                    >
                      <div style={{ marginTop: '-7px' }}>ค่าขนส่ง</div>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        border: '1px solid black',
                        padding: '0px 8px 10px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        fontWeight: 'bold',
                      }}
                    >
                      <div style={{ marginTop: '-7px' }}>ชื่อลูกค้า</div>
                    </td>
                    <td
                      style={{
                        border: '1px solid black',
                        padding: '0px 8px 10px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        fontWeight: 'bold',
                      }}
                    >
                      <div style={{ marginTop: '-7px' }}>ที่อยู่จัดส่ง</div>
                    </td>
                    <td
                      style={{
                        border: '1px solid black',
                        padding: '0px 8px 10px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        fontWeight: 'bold',
                      }}
                    >
                      <div style={{ marginTop: '-7px' }}>เลขที่</div>
                    </td>
                    <td
                      style={{
                        border: '1px solid black',
                        padding: '0px 8px 10px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        fontWeight: 'bold',
                      }}
                    >
                      <div style={{ marginTop: '-7px' }}>ลงวันที่</div>
                    </td>
                    <td
                      style={{
                        border: '1px solid black',
                        padding: '0px 8px 10px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        fontWeight: 'bold',
                      }}
                    >
                      <div style={{ marginTop: '-7px' }}>กล่อง</div>
                    </td>
                    <td
                      style={{
                        border: '1px solid black',
                        padding: '0px 8px 10px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        fontWeight: 'bold',
                      }}
                    >
                      <div style={{ marginTop: '-7px' }}>กิโลกรัม</div>
                    </td>
                  </tr>

                  {group.items.map((item, itemIdx) => {
                    const addressParts = [
                      item.ship_to_address,
                      item.tambon,
                      item.district,
                      item.city,
                      item.postal_code,
                    ].filter((part) => part && String(part).trim() !== '');
                    const addressText = addressParts.join(' ');
                    const telephone = item.telephone ?? '';

                    return (
                      <tr key={itemIdx}>
                        <td
                          style={{
                            border: '1px solid black',
                            padding: '0px 8px 10px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                          }}
                        >
                          <div style={{ marginTop: '-7px' }}>{itemIdx + 1}</div>
                        </td>
                        <td
                          style={{
                            border: '1px solid black',
                            padding: '0px 8px 10px',
                            textAlign: 'left',
                            verticalAlign: 'middle',
                          }}
                        >
                          <div style={{ marginTop: '-7px' }}>
                            {item.billing_document}
                          </div>
                        </td>
                        <td
                          style={{
                            border: '1px solid black',
                            padding: '0px 8px 10px',
                            textAlign: 'left',
                            verticalAlign: 'middle',
                          }}
                        >
                          <div style={{ marginTop: '-7px' }}>
                            {item.ship_to_description}
                          </div>
                        </td>
                        <td
                          style={{
                            border: '1px solid black',
                            padding: '0px 8px 10px',
                            textAlign: 'left',
                            verticalAlign: 'middle',
                          }}
                        >
                          <div style={{ marginTop: '-7px' }}>
                            <div>{addressText}</div>
                            <div>Tel: {telephone}</div>
                          </div>
                        </td>
                        <td
                          style={{
                            border: '1px solid black',
                            padding: '0px 8px 10px',
                            textAlign: 'left',
                            verticalAlign: 'middle',
                          }}
                        >
                          <div style={{ marginTop: '-7px' }}>
                            {item.billing_document}
                          </div>
                        </td>
                        <td
                          style={{
                            border: '1px solid black',
                            padding: '0px 8px 10px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                          }}
                        >
                          <div style={{ marginTop: '-7px' }}>
                            {formatDateDisplay(item.transport_date)}
                          </div>
                        </td>
                        <td
                          style={{
                            border: '1px solid black',
                            padding: '0px 8px 10px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                          }}
                        >
                          <div style={{ marginTop: '-7px' }}>{item.box}</div>
                        </td>
                        <td
                          style={{
                            border: '1px solid black',
                            padding: '0px 8px 10px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                          }}
                        >
                          <div style={{ marginTop: '-7px' }}></div>
                        </td>
                        <td
                          style={{
                            border: '1px solid black',
                            padding: '0px 8px 10px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                          }}
                        >
                          <div style={{ marginTop: '-7px' }}></div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Summary row */}
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        border: '1px solid black',
                        padding: '0px 8px 10px',
                        textAlign: 'right',
                        verticalAlign: 'middle',
                        fontWeight: 'bold',
                      }}
                    >
                      <div style={{ marginTop: '-7px' }}>รวม</div>
                    </td>
                    <td
                      style={{
                        border: '1px solid black',
                        padding: '0px 8px 10px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        fontWeight: 'bold',
                      }}
                    >
                      <div style={{ marginTop: '-7px' }}>
                        {group.items.reduce(
                          (sum, item) => sum + (Number(item.box) || 0),
                          0,
                        )}
                      </div>
                    </td>
                    <td
                      colSpan={2}
                      style={{
                        border: '1px solid black',
                        padding: '0px 8px 10px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                      }}
                    >
                      <div style={{ marginTop: '-7px' }}></div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {generatingPdf && (
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
            Generating PDF...
          </Typography>
        </Box>
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

export default ShipDailyTab;
