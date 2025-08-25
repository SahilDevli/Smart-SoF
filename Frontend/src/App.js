import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import FileUpload from './components/FileUpload';
import ResultsTable from './components/ResultsTable';
import { Box } from '@mui/material';

function App() {
  // We'll manage a mock user state just for frontend UI and route protection.
  // The backend doesn't care about this user.
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // On initial load, try to restore a mock user if one was "logged in"
  useEffect(() => {
    const storedUser = localStorage.getItem('mockUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('mockUser', JSON.stringify(userData)); // Store mock user
    navigate('/upload');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('mockUser'); // Clear mock user
    navigate('/');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar user={user} onLogout={handleLogout} />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Routes>
          <Route path="/" element={<Login onLoginSuccess={handleLoginSuccess} />} />
          {/* Protected Routes: Only render if user is "logged in" (mock user exists) */}
          <Route
            path="/upload"
            element={user ? <FileUpload user={user} /> : <Login onLoginSuccess={handleLoginSuccess} />}
          />
          <Route
            path="/results"
            element={user ? <ResultsTable user={user} /> : <Login onLoginSuccess={handleLoginSuccess} />}
          />
          <Route path="*" element={<div>Page Not Found</div>} />
        </Routes>
      </Box>
    </Box>
  );
}

export default App;
