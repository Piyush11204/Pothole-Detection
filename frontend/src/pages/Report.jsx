import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  useTheme,
  IconButton,
  Tooltip,
  Chip,
  LinearProgress,
  Fade,
  Zoom,
  Divider
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  LocationOn as LocationIcon,
  Speed as SpeedIcon,
  Height as HeightIcon,
  Straight as WidthIcon,
  Height as DepthIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as ChartTooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

function Report() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    const data = localStorage.getItem('analysisResults');
    if (data) {
      setReportData(JSON.parse(data));
    } else {
      navigate('/detect');
    }
    setLoading(false);
  }, [navigate]);

  const getSeverityColor = (volume) => {
    if (volume > 5000) return '#f44336';
    if (volume > 2000) return '#ff9800';
    return '#4caf50';
  };

  const getPieChartData = () => {
    if (!reportData?.potholes) return [];
    
    const severityCounts = {
      high: 0,
      medium: 0,
      low: 0
    };

    reportData.potholes.forEach(pothole => {
      if (pothole.volume > 5000) severityCounts.high++;
      else if (pothole.volume > 2000) severityCounts.medium++;
      else severityCounts.low++;
    });

    return [
      { name: 'High Severity', value: severityCounts.high, color: '#f44336' },
      { name: 'Medium Severity', value: severityCounts.medium, color: '#ff9800' },
      { name: 'Low Severity', value: severityCounts.low, color: '#4caf50' }
    ];
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Box mt={4}>
          <Typography color="error" variant="h6" align="center">
            {error}
          </Typography>
        </Box>
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
        Pothole Analysis Report
      </Typography>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={3}>
          <Fade in={true} timeout={500}>
            <Card 
              elevation={3}
              sx={{
                height: '100%',
                background: 'linear-gradient(45deg, #1a237e 30%, #283593 90%)',
                color: 'white'
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <AssessmentIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Total Potholes
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {reportData.total_potholes}
                </Typography>
              </CardContent>
            </Card>
          </Fade>
        </Grid>
        <Grid item xs={12} md={3}>
          <Fade in={true} timeout={600}>
            <Card 
              elevation={3}
              sx={{
                height: '100%',
                background: 'linear-gradient(45deg, #d32f2f 30%, #f44336 90%)',
                color: 'white'
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <WarningIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Total Volume
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {reportData.total_volume.toFixed(2)} cm³
                </Typography>
              </CardContent>
            </Card>
          </Fade>
        </Grid>
        <Grid item xs={12} md={3}>
          <Fade in={true} timeout={700}>
            <Card 
              elevation={3}
              sx={{
                height: '100%',
                background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
                color: 'white'
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <TimelineIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Average Volume
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {(reportData.total_volume / reportData.total_potholes).toFixed(2)} cm³
                </Typography>
              </CardContent>
            </Card>
          </Fade>
        </Grid>
        <Grid item xs={12} md={3}>
          <Fade in={true} timeout={800}>
            <Card 
              elevation={3}
              sx={{
                height: '100%',
                background: 'linear-gradient(45deg, #388e3c 30%, #4caf50 90%)',
                color: 'white'
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <TrendingUpIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Severity Level
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {reportData.total_volume > 5000 ? 'High' : reportData.total_volume > 2000 ? 'Medium' : 'Low'}
                </Typography>
              </CardContent>
            </Card>
          </Fade>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Zoom in={true} timeout={900}>
            <Paper 
              elevation={3}
              sx={{ 
                p: 3, 
                height: '400px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <Typography variant="h6" gutterBottom color="primary">
                Severity Distribution
              </Typography>
              <Box flex={1}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getPieChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getPieChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Zoom>
        </Grid>

        <Grid item xs={12} md={6}>
          <Zoom in={true} timeout={1000}>
            <Paper 
              elevation={3}
              sx={{ 
                p: 3, 
                height: '400px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <Typography variant="h6" gutterBottom color="primary">
                Volume Distribution
              </Typography>
              <Box flex={1}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.potholes}>
                    <XAxis dataKey="id" />
                    <YAxis />
                    <ChartTooltip />
                    <Bar dataKey="volume" fill="#1a237e" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Zoom>
        </Grid>

        {/* Detailed Analysis Table */}
        <Grid item xs={12}>
          <Zoom in={true} timeout={1100}>
            <Paper 
              elevation={3}
              sx={{ 
                p: 3,
                borderRadius: 2
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" color="primary">
                  Detailed Analysis
                </Typography>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Dimensions</TableCell>
                      <TableCell>Volume</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.potholes.map((pothole) => (
                      <TableRow key={pothole.id} hover>
                        <TableCell>{pothole.id}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <LocationIcon sx={{ mr: 1, color: 'primary.main' }} />
                            <Typography variant="body2">
                              {pothole.location}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Tooltip title="Width">
                              <Box display="flex" alignItems="center">
                                <WidthIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                <Typography variant="body2" sx={{ ml: 0.5 }}>
                                  {pothole.width.toFixed(2)}m
                                </Typography>
                              </Box>
                            </Tooltip>
                            <Tooltip title="Length">
                              <Box display="flex" alignItems="center">
                                <HeightIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                <Typography variant="body2" sx={{ ml: 0.5 }}>
                                  {pothole.length.toFixed(2)}m
                                </Typography>
                              </Box>
                            </Tooltip>
                            <Tooltip title="Depth">
                              <Box display="flex" alignItems="center">
                                <DepthIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                <Typography variant="body2" sx={{ ml: 0.5 }}>
                                  {pothole.depth.toFixed(2)}m
                                </Typography>
                              </Box>
                            </Tooltip>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Typography variant="body2" sx={{ mr: 1 }}>
                              {pothole.volume.toFixed(2)} cm³
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.min((pothole.volume / 5000) * 100, 100)}
                              sx={{ 
                                width: 50,
                                height: 6,
                                borderRadius: 3,
                                bgcolor: '#e3f2fd',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: getSeverityColor(pothole.volume)
                                }
                              }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={pothole.volume > 5000 ? 'High' : pothole.volume > 2000 ? 'Medium' : 'Low'}
                            color={pothole.volume > 5000 ? 'error' : pothole.volume > 2000 ? 'warning' : 'success'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton size="small" color="primary">
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Zoom>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Report; 