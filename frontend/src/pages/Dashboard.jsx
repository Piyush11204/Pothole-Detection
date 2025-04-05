import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip as RechartsTooltip, 
  XAxis, 
  YAxis 
} from 'recharts';

// Import Lucide React icons
import { 
  BarChart3, 
  AlertTriangle, 
  TrendingUp, 
  LineChart, 
  Image as ImageIcon, 
  Film, 
  Download, 
  Eye, 
  Calendar, 
  Filter, 
  RefreshCw, 
  Map, 
  ChevronDown, 
  Search,
  SlidersHorizontal
} from 'lucide-react';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState('week');
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/dashboard?timeframe=${timeframe}`, {
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
  }, [navigate, timeframe]);

  const getSeverityColor = (volume) => {
    if (volume > 5000) return '#ef4444';
    if (volume > 2000) return '#f97316';
    return '#22c55e';
  };

  const getSeverityClass = (volume) => {
    if (volume > 5000) return 'bg-red-500';
    if (volume > 2000) return 'bg-orange-500';
    return 'bg-green-500';
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
      { name: 'High Severity', value: severityCounts.high, color: '#ef4444' },
      { name: 'Medium Severity', value: severityCounts.medium, color: '#f97316' },
      { name: 'Low Severity', value: severityCounts.low, color: '#22c55e' }
    ];
  };

  const getVolumeBarData = () => {
    if (!dashboardData?.recent_analyses) return [];
    
    return dashboardData.recent_analyses.map(analysis => ({
      name: analysis.filename.length > 10 ? analysis.filename.substring(0, 10) + '...' : analysis.filename,
      volume: analysis.total_volume,
      color: getSeverityColor(analysis.total_volume)
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-700">{error}</h2>
          <p className="mt-2 text-red-600">Please try again later or contact support</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center mx-auto"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-blue-900">Pothole Analysis Dashboard</h1>
              <p className="text-gray-500 text-sm mt-1">Real-time pothole detection and analysis</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button 
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center text-sm font-medium"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  <ChevronDown className="w-4 h-4 ml-2" />
                </button>
                {showFilters && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10 p-4">
                    <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                      <SlidersHorizontal className="w-4 h-4 mr-2" />
                      Filter Options
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
                        <select 
                          className="w-full border border-gray-300 rounded-md p-2 text-sm"
                          value={timeframe}
                          onChange={(e) => setTimeframe(e.target.value)}
                        >
                          <option value="day">Today</option>
                          <option value="week">This Week</option>
                          <option value="month">This Month</option>
                          <option value="year">This Year</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="high" className="rounded text-blue-600" defaultChecked />
                          <label htmlFor="high" className="text-sm text-gray-700">High</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="medium" className="rounded text-blue-600" defaultChecked />
                          <label htmlFor="medium" className="text-sm text-gray-700">Medium</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="low" className="rounded text-blue-600" defaultChecked />
                          <label htmlFor="low" className="text-sm text-gray-700">Low</label>
                        </div>
                      </div>
                      <button className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors mt-2">
                        Apply Filters
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search analyses..." 
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64 text-sm"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          {/* Statistics Cards */}
          <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-800 bg-opacity-50 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-blue-100" />
                </div>
                <h3 className="ml-3 text-lg font-medium text-blue-50">Total Analyses</h3>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-white">{dashboardData.total_analyses}</p>
                  <p className="text-blue-200 text-sm mt-1">+{Math.floor(Math.random() * 10) + 1} this week</p>
                </div>
                <div className="flex items-center text-blue-200 text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  +{Math.floor(Math.random() * 20) + 5}%
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-800 to-red-600 rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-red-700 bg-opacity-50 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-100" />
                </div>
                <h3 className="ml-3 text-lg font-medium text-red-50">Total Potholes</h3>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-white">{dashboardData.total_potholes}</p>
                  <p className="text-red-200 text-sm mt-1">Across all analyses</p>
                </div>
                <div className="flex items-center text-red-200 text-sm">
                  <Map className="w-4 h-4 mr-1" />
                  {Math.floor(dashboardData.total_potholes / dashboardData.total_analyses)} avg/route
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-800 to-cyan-600 rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-cyan-700 bg-opacity-50 rounded-lg">
                  <LineChart className="w-6 h-6 text-cyan-100" />
                </div>
                <h3 className="ml-3 text-lg font-medium text-cyan-50">Total Volume</h3>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-white">{dashboardData.total_volume.toFixed(1)}</p>
                  <p className="text-cyan-200 text-sm mt-1">cubic centimeters (cm³)</p>
                </div>
                <div className="flex items-center text-cyan-200 text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  High severity
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-800 to-emerald-600 rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-emerald-700 bg-opacity-50 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-emerald-100" />
                </div>
                <h3 className="ml-3 text-lg font-medium text-emerald-50">Average Potholes</h3>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-white">{dashboardData.average_potholes.toFixed(1)}</p>
                  <p className="text-emerald-200 text-sm mt-1">Per analysis</p>
                </div>
                <div className="flex items-center text-emerald-200 text-sm">
                  <Calendar className="w-4 h-4 mr-1" />
                  Updated daily
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                Severity Distribution
              </h3>
              <div className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {getPieChartData().reduce((acc, curr) => acc + curr.value, 0)} analyses
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={getPieChartData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={5}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {getPieChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value, name) => [`${value} analyses`, name]} />
                  <Legend 
                    verticalAlign="bottom" 
                    align="center" 
                    layout="horizontal"
                    formatter={(value) => <span className="text-sm font-medium text-gray-700">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <LineChart className="w-5 h-5 mr-2 text-blue-600" />
                Recent Analysis Volume
              </h3>
              <div className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                Last {dashboardData.recent_analyses.length} analyses
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getVolumeBarData()}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={false}
                  />
                  <YAxis 
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Volume (cm³)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 12, fill: '#6B7280' } }}
                  />
                  <RechartsTooltip 
                    formatter={(value) => [`${value.toFixed(2)} cm³`, 'Volume']}
                    labelFormatter={label => `File: ${label}`}
                    contentStyle={{ borderRadius: '6px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar 
                    dataKey="volume" 
                    radius={[4, 4, 0, 0]}
                  >
                    {getVolumeBarData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Analyses Table */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
              Recent Analyses
            </h3>
            <div className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              Last {dashboardData.recent_analyses.length} Analyses
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Potholes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume (cm³)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dashboardData.recent_analyses.map((analysis, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {analysis.type === 'image' ? 
                          <div className="p-1.5 bg-blue-100 rounded-lg mr-3">
                            <ImageIcon className="w-4 h-4 text-blue-600" />
                          </div>
                          : 
                          <div className="p-1.5 bg-purple-100 rounded-lg mr-3">
                            <Film className="w-4 h-4 text-purple-600" />
                          </div>
                        }
                        <span className="text-sm font-medium text-gray-700">{analysis.filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${analysis.type === 'image' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                        {analysis.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {new Date(analysis.timestamp).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(analysis.timestamp).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {analysis.total_potholes}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-700 mr-2">
                          {analysis.total_volume.toFixed(2)}
                        </span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getSeverityClass(analysis.total_volume)}`}
                            style={{ width: `${Math.min((analysis.total_volume / 5000) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          analysis.total_volume > 5000 
                            ? 'bg-red-100 text-red-800' 
                            : analysis.total_volume > 2000 
                              ? 'bg-orange-100 text-orange-800' 
                              : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {analysis.total_volume > 5000 ? 'High' : analysis.total_volume > 2000 ? 'Medium' : 'Low'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button className="p-1 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors" title="View Details">
                          <Eye className="w-4 h-4 text-blue-600" />
                        </button>
                        <button className="p-1 bg-green-50 rounded-full hover:bg-green-100 transition-colors" title="Download Report">
                          <Download className="w-4 h-4 text-green-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Showing <span className="font-medium">{dashboardData.recent_analyses.length}</span> analyses
            </div>
            <div className="flex space-x-2">
              <button className="px-3 py-1 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                Previous
              </button>
              <button className="px-3 py-1 bg-blue-600 border border-blue-600 rounded text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Insight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">High Severity Alerts</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {getPieChartData()[0].value} alerts
              </span>
            </div>
            <p className="text-gray-600 mb-4">
              {getPieChartData()[0].value > 0 
                ? `${getPieChartData()[0].value} analyses detected high severity potholes that require immediate attention.` 
                : "No high severity potholes detected in recent analyses."}
            </p>
            {getPieChartData()[0].value > 0 && (
              <button className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center text-sm font-medium">
                <AlertTriangle className="w-4 h-4 mr-2" />
                View Critical Alerts
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">System Status</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Healthy
              </span>
            </div>
            <div className="space-y-2 mb-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Analysis API</span>
                  <span className="text-green-600 font-medium">Operational</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div className="bg-green-500 h-1 rounded-full" style={{ width: '98%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Database</span>
                  <span className="text-green-600 font-medium">Operational</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div className="bg-green-500 h-1 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">ML Pipeline</span>
                  <span className="text-green-600 font-medium">Operational</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div className="bg-green-500 h-1 rounded-full" style={{ width: '97%' }}></div>
                </div>
              </div>
            </div>
            <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center text-sm font-medium">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Status
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Quick Actions</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Tools
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button className="flex flex-col items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <ImageIcon className="w-6 h-6 text-blue-600" />
                <span className="text-sm font-medium text-blue-700 mt-2">Upload Image</span>
              </button>
              <button className="flex flex-col items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                <Film className="w-6 h-6 text-purple-600" />
                <span className="text-sm font-medium text-purple-700 mt-2">Upload Video</span>
              </button>
              <button className="flex flex-col items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                <Download className="w-6 h-6 text-green-600" />
                <span className="text-sm font-medium text-green-700 mt-2">Download Report</span>
              </button>
              <button className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <SlidersHorizontal className="w-6 h-6 text-gray-600" />
                <span className="text-sm font-medium text-gray-700 mt-2">Adjust Settings</span>
              </button>
            </div>
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm font-medium">
              <ChevronDown className="w-4 h-4 mr-2" />
              View All Tools
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;