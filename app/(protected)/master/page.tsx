'use client';

import { useState } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import { TabPanelProps } from '@/interface/component';
import Paper from '@mui/material/Paper';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Transporter from './tab/Transporter';
import Collector from './tab/Collector';
import DataFromSap from './tab/DataFromSap';
import DataFromSapIncoming from './tab/DataFromSapIncoming';
import ProtectedRoute from '@/components/ProtectedRoute';
import { PERMISSIONS } from '@/constants/permissions';

// TODO: Create ReportCollectorTab component for the third tab

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
        <Box sx={{ p: 1, pt: 3, pb: 3, overflow: 'auto' }}>{children}</Box>
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

function MasterContent() {
  const [value, setValue] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const tabPage = [
    { tap: <Transporter />, label: 'Transporter', key: 'transporter' },
    { tap: <Collector />, label: 'Collector', key: 'collector' },
    { tap: <DataFromSap />, label: 'Data From SAP', key: 'data-from-sap' },
    {
      tap: <DataFromSapIncoming />,
      label: (
        <>
          Data From SAP
          <br />
          (Incoming Payment)
        </>
      ),
      key: 'data-from-sap-incoming',
    },
  ];

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Paper
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        backgroundImage: 'none',
        backgroundColor: 'white',
        flex: '1 1 auto',
      }}
      elevation={1}
    >
      <Box
        sx={{
          borderRight: isMobile ? 0 : 1,
          borderBottom: isMobile ? 1 : 0,
          borderColor: 'divider',
        }}
      >
        <Tabs
          orientation={isMobile ? 'horizontal' : 'vertical'}
          value={value}
          onChange={handleChange}
          aria-label="tabs example"
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons={isMobile ? 'auto' : false}
          allowScrollButtonsMobile={isMobile}
          sx={{
            minWidth: isMobile ? '100%' : 200,
          }}
        >
          {tabPage.map((tab, idx) => (
            <Tab
              key={tab.key}
              label={tab.label}
              {...a11yProps(idx)}
              sx={{
                alignItems: isMobile ? 'center' : 'flex-start',
                textAlign: isMobile ? 'center' : 'left',
                whiteSpace: 'normal',
                wordWrap: 'break-word',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(20, 34, 116, 0.08)',
                  fontWeight: 'bold',
                },
              }}
            />
          ))}
        </Tabs>
      </Box>
      <Box sx={{ flex: '1 1 auto', overflow: 'hidden' }}>
        {tabPage.map((tab, idx) => (
          <CustomTabPanel key={tab.key} value={value} index={idx}>
            <Box sx={{ padding: 2, height: '100%', width: '100%' }}>
              {tab.tap}
            </Box>
          </CustomTabPanel>
        ))}
      </Box>
    </Paper>
  );
}

export default function Master() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.ACCESS_MASTER_DATA_PAGE}>
      <MasterContent />
    </ProtectedRoute>
  );
}
