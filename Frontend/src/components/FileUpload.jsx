import React, { useState } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { styled } from '@mui/system';
import { useNavigate } from 'react-router-dom';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

function FileUpload({ user }) {
  const navigate = useNavigate();
  const [sofFile, setSofFile] = useState(null);
  const [cpFile, setCpFile] = useState(null);
  const [additionalFile, setAdditionalFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (setter, allowedTypes, file) => {
    setError('');
    if (file) {
      const fileNameParts = file.name.split('.');
      const fileExtension = fileNameParts[fileNameParts.length - 1].toLowerCase();
      if (!allowedTypes.includes(fileExtension)) {
        setError(`Invalid file type for this slot. Allowed: ${allowedTypes.join(', ')}`);
        setter(null);
        return;
      }
      setter(file);
    } else {
      setter(null);
    }
  };

  const handleSubmit = async () => {
    // --- UPDATED MANDATORY CHECK ---
    if (!sofFile) {
      setError('Please upload the Statement of Facts document (SOF).');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('sof_file', sofFile);
    // Append optional files only if they exist
    if (cpFile) {
      formData.append('cp_file', cpFile);
    }
    if (additionalFile) {
      formData.append('additional_file', additionalFile);
    }

    try {
      const response = await fetch('http://localhost:8000/process-documents/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Server error: ${response.status} - ${errorData.detail || response.statusText}`);
      }

      const result = await response.json();
      console.log('Upload successful:', result);

      navigate('/results', { state: { processedData: result.processed_data } });

    } catch (err) {
      console.error('Upload failed:', err);
      setError(`Failed to process documents: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Upload Your Documents
      </Typography>
      <Typography variant="body1" color="textSecondary" align="center" sx={{ mb: 4 }}>
        Logged in as: {user?.email}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>Processing documents...</Typography>
        </Box>
      )}

      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <Typography variant="h6" gutterBottom>Statement of Facts (SOF) <span style={{ color: 'red' }}>*</span></Typography> {/* Added mandatory indicator */}
            <Typography variant="body2" color="textSecondary" mb={2}>PDF only</Typography>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
            >
              {sofFile ? sofFile.name : 'Upload SOF'}
              <VisuallyHiddenInput
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => handleFileChange(setSofFile, ['pdf', 'docx'], e.target.files[0])}
              />
            </Button>
            {sofFile && <Button size="small" color="error" onClick={() => setSofFile(null)}>Remove</Button>}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <Typography variant="h6" gutterBottom>Charter Party (CP)</Typography>
            <Typography variant="body2" color="textSecondary" mb={2}>PDF only</Typography>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
            >
              {cpFile ? cpFile.name : 'Upload CP'}
              <VisuallyHiddenInput
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => handleFileChange(setCpFile, ['pdf', 'docx'], e.target.files[0])}
              />
            </Button>
            {cpFile && <Button size="small" color="error" onClick={() => setCpFile(null)}>Remove</Button>}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <Typography variant="h6" gutterBottom>Additional Document</Typography>
            <Typography variant="body2" color="textSecondary" mb={2}>TXT, PDF</Typography>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
            >
              {additionalFile ? additionalFile.name : 'Upload Additional'}
              <VisuallyHiddenInput
                type="file"
                accept=".docx,.txt,.pdf"
                onChange={(e) => handleFileChange(setAdditionalFile, ['docx', 'txt', 'pdf'], e.target.files[0])}
              />
            </Button>
            {additionalFile && <Button size="small" color="error" onClick={() => setAdditionalFile(null)}>Remove</Button>}
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleSubmit}
          disabled={loading || !sofFile}
        >
          Submit Documents
        </Button>
      </Box>
    </Container>
  );
}

export default FileUpload;