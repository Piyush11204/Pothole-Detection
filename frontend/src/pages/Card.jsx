import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Paper
} from '@mui/material';
import axios from 'axios';

function CardPage() {
  const [potholes, setPotholes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPotholes = async () => {
      try {
        const results = JSON.parse(localStorage.getItem('analysisResults'));
        if (results && results.potholes) {
          setPotholes(results.potholes);
        } else {
          setError('No pothole data available');
        }
      } catch (err) {
        setError('Error loading pothole data');
      } finally {
        setLoading(false);
      }
    };

    fetchPotholes();
  }, []);

  const getSeverity = (volume) => {
    if (volume > 5000) return { label: 'Large', color: '#f44336' };
    if (volume > 2000) return { label: 'Medium', color: '#ff9800' };
    return { label: 'Small', color: '#4caf50' };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Paper sx={{ p: 3, mt: 4, textAlign: 'center' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography 
        variant="h4" 
        gutterBottom 
        sx={{ 
          fontWeight: 700, 
          color: '#1a237e',
          mb: 4,
          textAlign: 'center'
        }}
      >
        Pothole Details
      </Typography>

      <Grid container spacing={3}>
        {potholes.map((pothole) => {
          const severity = getSeverity(pothole.volume);
          return (
            <Grid item xs={12} sm={6} md={4} key={pothole.id}>
              <Card 
                elevation={3}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'scale(1.02)'
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" color="primary">
                      Pothole #{pothole.id}
                    </Typography>
                    <Chip 
                      label={severity.label}
                      sx={{ 
                        bgcolor: severity.color,
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Dimensions
                    </Typography>
                    <Typography variant="body1">
                      Length: {pothole.length.toFixed(2)} cm
                    </Typography>
                    <Typography variant="body1">
                      Breadth: {pothole.breadth.toFixed(2)} cm
                    </Typography>
                    <Typography variant="body1">
                      Depth: {pothole.depth.toFixed(2)} cm
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Volume Required
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {pothole.volume.toFixed(2)} cm³
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
}

export default CardPage; 