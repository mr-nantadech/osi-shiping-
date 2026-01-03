'use client';

import { transportByApi } from '@/lib/api/transport-by';
import { ITransportBy } from '@/types/backend/transport-by';
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

export default function Transporter() {
  const [rows, setRows] = useState<ITransportBy[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [currentTransporter, setCurrentTransporter] =
    useState<ITransportBy | null>(null);
  const [formData, setFormData] = useState<Partial<ITransportBy>>({});

  // Validation state
  const [errors, setErrors] = useState<{
    transport_code?: boolean;
    transport_name?: boolean;
  }>({});

  // Delete Dialog State
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState<boolean>(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await transportByApi.getAll();
      if (res.data_model) {
        setRows(res.data_model);
      }
    } catch (error) {
      console.error('Failed to fetch transporters', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpen = (transporter?: ITransportBy) => {
    if (transporter) {
      setCurrentTransporter(transporter);
      setFormData(transporter);
    } else {
      setCurrentTransporter(null);
      setFormData({ transport_code: '', transport_name: '' });
    }
    setErrors({}); // Reset errors on open
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCurrentTransporter(null);
    setFormData({});
    setErrors({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors({ ...errors, [name]: false });
    }
  };

  const handleSave = async () => {
    // Validate
    const newErrors = {
      transport_code: !formData.transport_code,
      transport_name: !formData.transport_name,
    };

    if (newErrors.transport_code || newErrors.transport_name) {
      setErrors(newErrors);
      return;
    }

    try {
      if (currentTransporter) {
        // Update
        await transportByApi.update({
          ...currentTransporter,
          ...formData,
        } as ITransportBy);
      } else {
        // Create
        await transportByApi.create({
          id: 0,
          ...formData,
        } as ITransportBy);
      }
      fetchData();
      handleClose();
    } catch (error) {
      console.error('Failed to save transporter', error);
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
        await transportByApi.remove(deleteId);
        fetchData();
      } catch (error) {
        console.error('Failed to delete transporter', error);
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
      field: 'transport_code',
      headerName: 'Code',
      flex: 1,
      minWidth: 150,
      align: 'center',
      headerAlign: 'center',
    },
    { field: 'transport_name', headerName: 'Name', flex: 2, minWidth: 250 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <>
          <IconButton
            color="primary"
            onClick={() => handleOpen(params.row as ITransportBy)}
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
          Manage Transporters
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
            Add Transporter
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

      {/* Edit/Create Dialog */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>
          {currentTransporter ? 'Edit Transporter' : 'Add Transporter'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="transport_code"
            label="Transport Code"
            type="text"
            fullWidth
            required
            error={errors.transport_code}
            helperText={errors.transport_code ? 'Code is required' : ''}
            variant="outlined"
            value={formData.transport_code || ''}
            onChange={handleChange}
          />
          <TextField
            margin="dense"
            name="transport_name"
            label="Transport Name"
            type="text"
            fullWidth
            required
            error={errors.transport_name}
            helperText={errors.transport_name ? 'Name is required' : ''}
            variant="outlined"
            value={formData.transport_name || ''}
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteConfirm}
        onClose={handleCloseDeleteConfirm}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{'Confirm Delete'}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this transporter? This action cannot
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
