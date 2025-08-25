import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
} from '@mui/material';
import { useLocation } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import Papa from 'papaparse'; // Install PapaParse: npm install papaparse

function ResultsTable({ user }) {
  const location = useLocation();
  // Get initial data passed from FileUpload component via router state
  const initialData = location.state?.processedData || [];

  const [tableData, setTableData] = useState(initialData); // Initialize with passed data
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentRowToEdit, setCurrentRowToEdit] = useState(null); // Stores the original row object
  const [currentEditedRow, setCurrentEditedRow] = useState({}); // Stores the mutable copy for dialog editing
  const [rowToDeleteId, setRowToDeleteId] = useState(null); // Stores the ID of the row to be deleted

  // Effect to handle component mounting or initial data changes.
  // In this stateless setup, if no initialData is provided (e.g., direct navigation to /results),
  // the table should be empty, as there's no backend to fetch data from.
  useEffect(() => {
    // If we have initial data from a successful upload, update the table.
    // Otherwise, ensure the table is cleared if the component is somehow accessed without new data.
    if (initialData.length > 0) {
      setTableData(initialData);
    } else if (tableData.length > 0) {
      // This case might happen if a user manually navigates here without a fresh upload
      // or after a refresh. We clear the table because it's stateless.
      setTableData([]);
    }
  }, [initialData]); // Depend on initialData to re-run when new data is uploaded and passed

  const handleEditClick = (row) => {
    setCurrentRowToEdit(row);
    setCurrentEditedRow({ ...row }); // Create a mutable copy for editing in the dialog
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (rowId) => {
    setRowToDeleteId(rowId);
    setDeleteDialogOpen(true);
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setCurrentEditedRow((prev) => ({ ...prev, [name]: value }));
  };

  // --- LOCAL EDIT (NO BACKEND INTERACTION) ---
  const handleSaveEdit = () => {
    // Update the local state (tableData) by mapping over it
    // and replacing the row with the matching 'id' with the edited version.
    setTableData((prevData) =>
      prevData.map((row) =>
        row.id === currentEditedRow.id ? { ...currentEditedRow } : row
      )
    );
    setEditDialogOpen(false); // Close the dialog
    setCurrentRowToEdit(null); // Clear editing state
    setCurrentEditedRow({}); // Clear editing state
    console.log(`Row with ID ${currentEditedRow.id} edited locally.`);
  };

  // --- LOCAL DELETE (NO BACKEND INTERACTION) ---
  const handleConfirmDelete = () => {
    // Update the local state (tableData) by filtering out the row
    // with the matching 'id' to be deleted.
    setTableData((prevData) =>
      prevData.filter((row) => row.id !== rowToDeleteId)
    );
    setDeleteDialogOpen(false); // Close the dialog
    setRowToDeleteId(null); // Clear deletion state
    console.log(`Row with ID ${rowToDeleteId} deleted locally.`);
  };

  // --- LOCAL "TABLE-WISE" DELETE (NO BACKEND INTERACTION) ---
  const handleTableWiseDelete = () => {
      const confirmDeleteAll = window.confirm(
        "Are you sure you want to delete ALL processed results currently displayed? " +
        "This action will only affect the current session in your browser and will not be saved. " +
        "This cannot be undone once you navigate away or refresh."
      );
      if (!confirmDeleteAll) return;

      setTableData([]); // Clear all local data
      console.log('All displayed results cleared locally.');
  }

  const handleDownloadCSV = () => {
    if (tableData.length === 0) {
      alert('No data to download.');
      return;
    }
    // Convert current tableData to CSV format using PapaParse
    const csv = Papa.unparse(tableData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadJSON = () => {
    if (tableData.length === 0) {
      alert('No data to download.');
      return;
    }
    // Convert current tableData to JSON string
    const json = JSON.stringify(tableData, null, 2); // Pretty-print JSON
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'results.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dynamically determine column headers from the keys of the first data row.
  // We filter out 'id' as it's typically an internal key and not for display.
  const columns = tableData.length > 0
    ? Object.keys(tableData[0]).filter(key => key !== 'id')
    : [];

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Processed Document Results
      </Typography>
      {/* Display logged-in user email for UI consistency, even if backend is stateless */}
      <Typography variant="body1" color="textSecondary" align="center" sx={{ mb: 4 }}>
        Logged in as: {user?.email}
      </Typography>

      {/* Since this is stateless, there's no backend loading or error for data retrieval here.
          Errors would come from the FileUpload component during submission. */}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleDownloadCSV}
          disabled={tableData.length === 0}
        >
          Download CSV
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleDownloadJSON}
          disabled={tableData.length === 0}
        >
          Download JSON
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleTableWiseDelete}
          disabled={tableData.length === 0}
        >
          Clear All Displayed Results
        </Button>
      </Box>

      {/* Conditional rendering: show info message if no data, else show table */}
      {tableData.length === 0 ? (
        <Alert severity="info" sx={{ mt: 8 }}>
          No processed data available. Please upload documents from the "Upload" tab to generate results.
          <br />
          <span style={{ fontWeight: 'bold' }}>Important:</span> In this simplified setup, results are not saved to a database and will clear if you navigate away or refresh the page.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table stickyHeader aria-label="results table">
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column} sx={{ fontWeight: 'bold' }}>
                    {/* Basic conversion from camelCase to Title Case for display */}
                    {column.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableData.map((row) => (
                <TableRow key={row.id} hover> {/* Ensure each row object has a unique 'id' */}
                  {columns.map((column) => (
                    <TableCell key={`${row.id}-${column}`}>{row[column]}</TableCell>
                  ))}
                  <TableCell align="right">
                    <Button
                      sx={{ minWidth: 0, p: 0.5, mr: 1 }}
                      onClick={() => handleEditClick(row)}
                    >
                      <EditIcon fontSize="small" />
                    </Button>
                    <Button
                      sx={{ minWidth: 0, p: 0.5 }}
                      onClick={() => handleDeleteClick(row.id)} // Pass the row's unique ID for deletion
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Dialog - for local editing */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Row (Local Only)</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Make changes to the fields below. These changes will only affect the currently displayed table and will not be saved to a backend database.
          </DialogContentText>
          {currentRowToEdit && columns.map((key) => (
            <TextField
              key={key}
              margin="dense"
              name={key}
              label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
              type="text"
              fullWidth
              variant="outlined"
              value={currentEditedRow[key] || ''}
              onChange={handleFieldChange}
              sx={{ mb: 2 }}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog - for local deletion */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete (Local Only)</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this row of data? This action will only affect the currently displayed table and will not be saved to a backend database.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ResultsTable;