'use client';

import { useMemo, useState } from 'react';
import { Box, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import ShippingLabelTemplate from '@/components/ShippingLabelTemplate';
import type { ShippingLabelData } from '@/types/shippingLabel';

const initialAddressLines = [
  '123/4 Moo 5, Sukhumvit Rd.',
  'Bangkok, Thailand 10110',
];

export default function LabelPreviewPage() {
  const [form, setForm] = useState({
    companyName: 'OSI ส่งทันเด้อ EXPRESS',
    customerName: 'สมชาย ใจดี',
    tel: '091-234-5678',
    orderNo: 'ORD-123456',
    waybillNo: 'WB-987654',
    shippingType: 'Inter Express',
    route: 'สาย A',
    customerCode: 'CUST-001',
    printedAt: new Date().toLocaleString('en-GB', { hour12: false }),
    stampText: '',
  });
  const [addressText, setAddressText] = useState(
    initialAddressLines.join('\n'),
  );
  const [copies, setCopies] = useState(2);

  const labels: ShippingLabelData[] = useMemo(() => {
    const addressLines = addressText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const totalSheets = Math.max(1, copies || 1);

    return Array.from({ length: totalSheets }, (_, idx) => ({
      ...form,
      addressLines,
      totalSheets,
      sheetNo: idx + 1,
    }));
  }, [addressText, copies, form]);

  const handleChange =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: 'auto',
        p: { xs: 2, md: 3 },
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Typography variant="h5" fontWeight={700}>
        Shipping Label Preview (10cm x 10cm)
      </Typography>

      <Card>
        <CardContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2,
            }}
          >
            <Stack spacing={2}>
              <TextField
                label="Company Name"
                value={form.companyName}
                onChange={handleChange('companyName')}
                fullWidth
                size="small"
              />
              <TextField
                label="Customer Name"
                value={form.customerName}
                onChange={handleChange('customerName')}
                fullWidth
                size="small"
              />
              <TextField
                label="Tel"
                value={form.tel}
                onChange={handleChange('tel')}
                fullWidth
                size="small"
              />
              <TextField
                label="Order No"
                value={form.orderNo}
                onChange={handleChange('orderNo')}
                fullWidth
                size="small"
              />
              <TextField
                label="Waybill No"
                value={form.waybillNo}
                onChange={handleChange('waybillNo')}
                fullWidth
                size="small"
              />
              <TextField
                label="Shipping Type"
                value={form.shippingType}
                onChange={handleChange('shippingType')}
                fullWidth
                size="small"
              />
            </Stack>
            <Stack spacing={2}>
              <TextField
                label="Route"
                value={form.route}
                onChange={handleChange('route')}
                fullWidth
                size="small"
              />
              <TextField
                label="Customer Code"
                value={form.customerCode}
                onChange={handleChange('customerCode')}
                fullWidth
                size="small"
              />
              <TextField
                label="Printed At"
                value={form.printedAt}
                onChange={handleChange('printedAt')}
                fullWidth
                size="small"
              />
              <TextField
                label="Stamp Text (optional)"
                value={form.stampText}
                onChange={handleChange('stampText')}
                fullWidth
                size="small"
              />
              <TextField
                label="Copies (sheets)"
                type="number"
                inputProps={{ min: 1 }}
                value={copies}
                onChange={(e) => setCopies(Number(e.target.value) || 1)}
                fullWidth
                size="small"
              />
              <TextField
                label="Address Lines (one per line)"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                fullWidth
                multiline
                minRows={4}
                size="small"
              />
            </Stack>
          </Box>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        {labels.map((label, idx) => (
          <ShippingLabelTemplate key={idx} data={label} />
        ))}
      </Box>
    </Box>
  );
}
