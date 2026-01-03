'use client';

import { useState } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import { TabPanelProps } from '@/interface/component';
import Paper from '@mui/material/Paper';
import PrintLabelTab from './tab/PrintLabelTab';
import ReceiveStatusTab from './tab/ReceiveStatusTab';
import ReportStatusTab from './tab/ReportStatusTab';
import ShipDailyTab from './tab/ShipDailyTab';
import UpdateStatusTab from './tab/UpdateStatusTab';
import ProtectedRoute from '@/components/ProtectedRoute';
import { PERMISSIONS } from '@/constants/permissions';

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 1, pt: 3, pb: 3, overflowY: 'auto' }}>{children}</Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

function ShippingContent() {
  const [value, setValue] = useState(0);

  const tabPage = [
    { tap: <PrintLabelTab />, label: 'Print Shipping Label' },
    { tap: <ShipDailyTab />, label: 'Report Shipping Daily' },
    { tap: <UpdateStatusTab />, label: 'Update Status Shipping' },
    { tap: <ReportStatusTab />, label: 'Report Status Shipping' },
    { tap: <ReceiveStatusTab />, label: 'บันทึกรับใบเซ็นต์รับสินค้า' },
  ];

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          {tabPage.map((tab, idx) => (
            <Tab
              key={tab.label}
              label={tab.label}
              {...a11yProps(idx)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'rgba(20, 34, 116, 0.08)',
                  fontWeight: 'bold',
                },
              }}
            />
          ))}
        </Tabs>
      </Box>
      {tabPage.map((tab, idx) => (
        <CustomTabPanel key={tab.label} value={value} index={idx}>
          <Paper
            elevation={0}
            sx={{
              backgroundImage: 'none',
              backgroundColor: 'transparent',
              width: '100%',
            }}
          >
            {tab.tap}
          </Paper>
        </CustomTabPanel>
      ))}
    </Box>
  );
}

export default function Shipping() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.ACCESS_SHIPPING_PAGE}>
      <ShippingContent />
    </ProtectedRoute>
  );
}
