'use client';

import { useState } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import { TabPanelProps } from '@/interface/component';
import Paper from '@mui/material/Paper';
import RequestInvoiceTab from '@/app/(protected)/collector/tab/RequestInvoiceTab';
import ProtectedRoute from '@/components/ProtectedRoute';
import { PERMISSIONS } from '@/constants/permissions';
import IncomingPaymentReportTab from './tab/IncomingPaymentReportTab';

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

function CollectorContent() {
  const [value, setValue] = useState(0);

  const tabPage = [
    { tap: <RequestInvoiceTab />, label: 'Request Invoice' },
    { tap: <IncomingPaymentReportTab />, label: 'Incoming Payment Report' },
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

export default function CollectorPage() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.ACCESS_COLLECTOR_PAGE}>
      <CollectorContent />
    </ProtectedRoute>
  );
}
