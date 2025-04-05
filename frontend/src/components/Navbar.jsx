import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Container, Avatar } from '@mui/material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const buttonStyle = (path) => ({
    mx: 1,
    color: 'white',
    position: 'relative',
    '&:after': isActive(path) ? {
      content: '""',
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: '100%',
      height: '2px',
      backgroundColor: 'white',
    } : {}
  });

  return (
    <AppBar position="static" sx={{ backgroundColor: '#1a237e' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              color: 'white',
              fontWeight: 700,
              letterSpacing: 1
            }}
          >
            POTHOLE DETECTION
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button color="inherit" component={RouterLink} to="/" sx={buttonStyle('/')}>
              Home
            </Button>
            {user ? (
              <>
                <Button color="inherit" component={RouterLink} to="/detect" sx={buttonStyle('/detect')}>
                  Detect
                </Button>
                <Button color="inherit" component={RouterLink} to="/card" sx={buttonStyle('/card')}>
                  Cards
                </Button>
                <Button color="inherit" component={RouterLink} to="/dashboard" sx={buttonStyle('/dashboard')}>
                  Dashboard
                </Button>
                <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: '#fff', color: '#1a237e' }}>
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </Avatar>
                  <Button color="inherit" onClick={handleLogout} sx={{ ml: 1 }}>
                    Logout
                  </Button>
                </Box>
              </>
            ) : (
              <>
                <Button 
                  color="inherit" 
                  component={RouterLink} 
                  to="/login"
                  variant={isActive('/login') ? "outlined" : "text"}
                  sx={buttonStyle('/login')}
                >
                  Login
                </Button>
                <Button 
                  color="inherit" 
                  component={RouterLink} 
                  to="/register"
                  variant={isActive('/register') ? "outlined" : "text"}
                  sx={buttonStyle('/register')}
                >
                  Register
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default Navbar; 