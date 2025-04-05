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
  CircularProgress,
  useTheme,
  IconButton,
  Tooltip,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as ChartTooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        setDashboardData(response.data);
      } catch (error) {
        setError('Error fetching dashboard data');
        if (error.response?.status === 401) {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const getSeverityColor = (volume) => {
    if (volume > 5000) return '#f44336';
    if (volume > 2000) return '#ff9800';
    return '#4caf50';
  };

  const getPieChartData = () => {
    if (!dashboardData?.recent_analyses) return [];
    
    const severityCounts = {
      high: 0,
      medium: 0,
      low: 0
    };

    dashboardData.recent_analyses.forEach(analysis => {
      if (analysis.total_volume > 5000) severityCounts.high++;
      else if (analysis.total_volume > 2000) severityCounts.medium++;
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
        Pothole Analysis Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Statistics Cards */}
        <Grid item xs={12} md={3}>
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
                  Total Analyses
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {dashboardData.total_analyses}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
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
                  Total Potholes
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {dashboardData.total_potholes}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
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
                  Total Volume
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {dashboardData.total_volume.toFixed(2)} cm³
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
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
                  Average Potholes
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {dashboardData.average_potholes.toFixed(1)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={6}>
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
        </Grid>

        <Grid item xs={12} md={6}>
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
              Recent Analysis Volume
            </Typography>
            <Box flex={1}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.recent_analyses}>
                  <XAxis dataKey="filename" />
                  <YAxis />
                  <ChartTooltip />
                  <Bar dataKey="total_volume" fill="#1a237e" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Recent Analyses Table */}
        <Grid item xs={12}>
          <Paper 
            elevation={3}
            sx={{ 
              p: 3,
              borderRadius: 2
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" color="primary">
                Recent Analyses
              </Typography>
              <Chip 
                label={`Last ${dashboardData.recent_analyses.length} Analyses`}
                color="primary"
                variant="outlined"
              />
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>File Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Potholes</TableCell>
                    <TableCell>Volume (cm³)</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboardData.recent_analyses.map((analysis, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          {analysis.type === 'image' ? <ImageIcon sx={{ mr: 1 }} /> : <VideoIcon sx={{ mr: 1 }} />}
                          {analysis.filename}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={analysis.type}
                          color={analysis.type === 'image' ? 'primary' : 'secondary'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(analysis.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>{analysis.total_potholes}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Typography variant="body2" sx={{ mr: 1 }}>
                            {analysis.total_volume.toFixed(2)}
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={Math.min((analysis.total_volume / 5000) * 100, 100)}
                            sx={{ 
                              width: 50,
                              height: 6,
                              borderRadius: 3,
                              bgcolor: '#e3f2fd',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: getSeverityColor(analysis.total_volume)
                              }
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={analysis.total_volume > 5000 ? 'High' : analysis.total_volume > 2000 ? 'Medium' : 'Low'}
                          color={analysis.total_volume > 5000 ? 'error' : analysis.total_volume > 2000 ? 'warning' : 'success'}
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
        </Grid>
      </Grid>
    </Container>
  );
}

export default Dashboard; 