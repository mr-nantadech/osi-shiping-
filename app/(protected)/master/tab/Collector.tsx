'use client';

import { masCollectorApi } from '@/lib/api/mas-collector';
import type { IMasCollector } from '@/types/backend/mas-collector';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import React, { useEffect, useState } from 'react';

export default function Collector() {
  const [rows, setRows] = useState<IMasCollector[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [currentCollector, setCurrentCollector] =
    useState<IMasCollector | null>(null);
  const [formData, setFormData] = useState<Partial<IMasCollector>>({});

  const [errors, setErrors] = useState<{
    sales_employee_code?: boolean;
    sales_employee_name?: boolean;
    collector_code?: boolean;
    collector_name?: boolean;
  }>({});

  const [openDeleteConfirm, setOpenDeleteConfirm] = useState<boolean>(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await masCollectorApi.getAll();
      if (res.data_model) {
        setRows(res.data_model);
      }
    } catch (error) {
      console.error('Failed to fetch collectors', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpen = (collector?: IMasCollector) => {
    if (collector) {
      setCurrentCollector(collector);
      setFormData(collector);
    } else {
      setCurrentCollector(null);
      setFormData({
        sales_employee_code: '',
        sales_employee_name: '',
        collector_code: '',
        collector_name: '',
      });
    }
    setErrors({});
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCurrentCollector(null);
    setFormData({});
    setErrors({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name as keyof typeof errors]) {
      setErrors({ ...errors, [name]: false });
    }
  };

  const handleSave = async () => {
    const newErrors = {
      sales_employee_code: !formData.sales_employee_code,
      sales_employee_name: !formData.sales_employee_name,
      collector_code: !formData.collector_code,
      collector_name: !formData.collector_name,
    };

    if (
      newErrors.sales_employee_code ||
      newErrors.sales_employee_name ||
      newErrors.collector_code ||
      newErrors.collector_name
    ) {
      setErrors(newErrors);
      return;
    }

    try {
      if (currentCollector) {
        await masCollectorApi.update({
          ...currentCollector,
          ...formData,
        } as IMasCollector);
      } else {
        await masCollectorApi.create({
          id: 0,
          sales_employee_code: formData.sales_employee_code || '',
          sales_employee_name: formData.sales_employee_name || '',
          collector_code: formData.collector_code || '',
          collector_name: formData.collector_name || '',
        } as IMasCollector);
      }
      fetchData();
      handleClose();
    } catch (error) {
      console.error('Failed to save collector', error);
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
    setOpenDeleteConfirm(true);
  };

  const handleCloseDeleteConfirm = () => {
    setOpenDeleteConfirm(false);
    setDeleteId(null);
  };

  const handleConfirmDelete = async () => {
    if (deleteId !== null) {
      try {
        await masCollectorApi.remove(deleteId);
        fetchData();
      } catch (error) {
        console.error('Failed to delete collector', error);
      } finally {
        handleCloseDeleteConfirm();
      }
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'no',
      headerName: 'No.',
      width: 70,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (value, row) => {
        const index = rows.findIndex((r) => r.id === row.id);
        return index + 1;
      },
    },
    {
      field: 'sales_employee_code',
      headerName: 'Sales Emp. Code',
      flex: 1,
      minWidth: 160,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'sales_employee_name',
      headerName: 'Sales Emp. Name',
      flex: 1,
      minWidth: 180,
    },
    {
      field: 'collector_code',
      headerName: 'Collector Code',
      flex: 1,
      minWidth: 150,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'collector_name',
      headerName: 'Collector Name',
      flex: 1,
      minWidth: 180,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <>
          <IconButton
            color="primary"
            onClick={() => handleOpen(params.row as IMasCollector)}
          >
            <EditIcon />
          </IconButton>
          <IconButton
            color="error"
            onClick={() => handleDeleteClick(params.row.id)}
          >
            <DeleteIcon />
          </IconButton>
        </>
      ),
    },
  ];

  return (
    <Card sx={{ maxWidth: '100%' }}>
      <Box sx={{ bgcolor: '#1F2175', px: 2, py: 1.5 }}>
        <Typography variant="h6" component="div" sx={{ color: 'white' }}>
          Manage Collectors
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
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
          >
            Add Collector
          </Button>
        </Box>
        <Box sx={{ width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 10 },
              },
            }}
            pageSizeOptions={[5, 10]}
            checkboxSelection={false}
            disableRowSelectionOnClick
            autoHeight
          />
        </Box>
      </CardContent>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>
          {currentCollector ? 'Edit Collector' : 'Add Collector'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="sales_employee_code"
            label="Sales Employee Code"
            type="text"
            fullWidth
            required
            error={errors.sales_employee_code}
            helperText={
              errors.sales_employee_code ? 'Sales employee code is required' : ''
            }
            variant="outlined"
            value={formData.sales_employee_code || ''}
            onChange={handleChange}
          />
          <TextField
            margin="dense"
            name="sales_employee_name"
            label="Sales Employee Name"
            type="text"
            fullWidth
            required
            error={errors.sales_employee_name}
            helperText={
              errors.sales_employee_name ? 'Sales employee name is required' : ''
            }
            variant="outlined"
            value={formData.sales_employee_name || ''}
            onChange={handleChange}
          />
          <TextField
            margin="dense"
            name="collector_code"
            label="Collector Code"
            type="text"
            fullWidth
            required
            error={errors.collector_code}
            helperText={
              errors.collector_code ? 'Collector code is required' : ''
            }
            variant="outlined"
            value={formData.collector_code || ''}
            onChange={handleChange}
          />
          <TextField
            margin="dense"
            name="collector_name"
            label="Collector Name"
            type="text"
            fullWidth
            required
            error={errors.collector_name}
            helperText={
              errors.collector_name ? 'Collector name is required' : ''
            }
            variant="outlined"
            value={formData.collector_name || ''}
            onChange={handleChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDeleteConfirm}
        onClose={handleCloseDeleteConfirm}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{'Confirm Delete'}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this collector? This action cannot
            be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
