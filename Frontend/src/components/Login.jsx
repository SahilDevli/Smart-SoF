import React from 'react';
import { Container, Typography, Button, Box } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import AppleIcon from '@mui/icons-material/Apple';

function Login({ onLoginSuccess }) {
  const handleMockLogin = (type) => {
    const mockUserData = {
      email: type === 'google' ? 'user@gmail.com' : 'user@apple.com',
      profilePic: type === 'google' ? 'https://via.placeholder.com/40/FF5733/FFFFFF?text=G' : 'https://via.placeholder.com/40/000000/FFFFFF?text=A',
    };
    onLoginSuccess(mockUserData);
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8, p: 3, border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Welcome! Please Log In
      </Typography>
      <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<GoogleIcon />}
          fullWidth
          onClick={() => handleMockLogin('google')}
          sx={{ py: 1.5 }}
        >
          Login with Google (Mock)
        </Button>
        <Button
          variant="contained"
          color="inherit"
          startIcon={<AppleIcon />}
          fullWidth
          onClick={() => handleMockLogin('apple')}
          sx={{ py: 1.5, bgcolor: 'black', color: 'white', '&:hover': { bgcolor: '#333' } }}
        >
          Login with Apple ID (Mock)
        </Button>
      </Box>
      <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 4 }}>
        Only Gmail ID or Apple ID are supported for login.
      </Typography>
    </Container>
  );
}

export default Login;