import React, { useState, useEffect } from 'react';
import { AlertTriangle, BarChart3, MapPin, Ruler, Layers, Calendar,  Clock, ArrowUp } from 'lucide-react';

function CardPage() {
  const [potholes, setPotholes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortOption, setSortOption] = useState('volume');
  const [sortDirection, setSortDirection] = useState('desc');

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
    if (volume > 5000) return { label: 'High Priority', color: 'bg-red-500', textColor: 'text-red-600', bgLight: 'bg-red-50' };
    if (volume > 2000) return { label: 'Medium Priority', color: 'bg-amber-500', textColor: 'text-amber-600', bgLight: 'bg-amber-50' };
    return { label: 'Low Priority', color: 'bg-green-500', textColor: 'text-green-600', bgLight: 'bg-green-50' };
  };

  const getFixTime = (volume) => {
    if (volume > 5000) return '2-3 hours';
    if (volume > 2000) return '1-2 hours';
    return '30-60 mins';
  };

  const getMaterialNeeded = (volume) => {
    // Convert to kg assuming asphalt density of ~2.4 g/cm³
    const materialWeight = (volume * 0.0024).toFixed(2);
    return `${materialWeight} kg`;
  };

  const sortPotholes = (potholes) => {
    return [...potholes].sort((a, b) => {
      let comparison = 0;
      
      switch (sortOption) {
        case 'volume':
          comparison = a.volume - b.volume;
          break;
        case 'depth':
          comparison = a.depth - b.depth;
          break;
        case 'id':
          comparison = parseInt(a.id) - parseInt(b.id);
          break;
        default:
          comparison = a.volume - b.volume;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const toggleSort = (option) => {
    if (sortOption === option) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOption(option);
      setSortDirection('desc');
    }
  };

  // Calculate summary statistics
  const getTotalVolume = () => {
    return potholes.reduce((sum, pothole) => sum + pothole.volume, 0).toFixed(2);
  };

  const getHighPriorityCount = () => {
    return potholes.filter(pothole => pothole.volume > 5000).length;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-red-50 rounded-lg shadow">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center text-blue-900 mb-2">
        Pothole Assessment Dashboard
      </h1>
      <p className="text-center text-gray-600 mb-8">
        Interactive view of detected potholes with repair estimations
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Layers className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-gray-700">Total Potholes</h3>
          </div>
          <p className="text-2xl font-bold text-blue-600">{potholes.length}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-gray-700">Total Volume</h3>
          </div>
          <p className="text-2xl font-bold text-blue-600">{getTotalVolume()} cm³</p>
          <p className="text-sm text-gray-500">Material: {(getTotalVolume() * 0.0024).toFixed(2)} kg</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="font-semibold text-gray-700">High Priority</h3>
          </div>
          <p className="text-2xl font-bold text-red-600">{getHighPriorityCount()}</p>
          <p className="text-sm text-gray-500">{Math.round(getHighPriorityCount() / potholes.length * 100)}% of total</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-gray-700">Est. Total Time</h3>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {potholes.length > 0 ? `${Math.ceil(potholes.length * 1.5)} hours` : '0 hours'}
          </p>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-medium text-gray-800">Sort Potholes By:</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => toggleSort('id')}
              className={`px-3 py-1 rounded-md flex items-center space-x-1 ${
                sortOption === 'id' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <span>ID</span>
              {sortOption === 'id' && (
                <ArrowUp className={`h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
              )}
            </button>
            
            <button
              onClick={() => toggleSort('volume')}
              className={`px-3 py-1 rounded-md flex items-center space-x-1 ${
                sortOption === 'volume' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <span>Volume</span>
              {sortOption === 'volume' && (
                <ArrowUp className={`h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
              )}
            </button>
            
            <button
              onClick={() => toggleSort('depth')}
              className={`px-3 py-1 rounded-md flex items-center space-x-1 ${
                sortOption === 'depth' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <span>Depth</span>
              {sortOption === 'depth' && (
                <ArrowUp className={`h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Pothole Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortPotholes(potholes).map((pothole) => {
          const severity = getSeverity(pothole.volume);
          return (
            <div 
              key={pothole.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-300"
            >
              <div className={`${severity.bgLight} ${severity.textColor} rounded-t-lg p-3 flex justify-between items-center`}>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <h3 className="font-semibold">Pothole #{pothole.id}</h3>
                </div>
                <span className={`${severity.color} text-white text-xs font-medium px-2.5 py-1 rounded-full`}>
                  {severity.label}
                </span>
              </div>
              
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="flex items-center space-x-1 text-gray-600 mb-1">
                      <Ruler className="h-4 w-4" />
                      <span className="text-xs">Dimensions</span>
                    </div>
                    <ul className="text-sm space-y-1">
                      <li>Length: <span className="font-medium">{pothole.length.toFixed(2)} cm</span></li>
                      <li>Width: <span className="font-medium">{pothole.breadth.toFixed(2)} cm</span></li>
                      <li>Depth: <span className="font-medium">{pothole.depth.toFixed(2)} cm</span></li>
                    </ul>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-1 text-gray-600 mb-1">
                      <Layers className="h-4 w-4" />
                      <span className="text-xs">Volume</span>
                    </div>
                    <p className="text-lg font-semibold text-blue-700">{pothole.volume.toFixed(2)} cm³</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-100 pt-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center space-x-1 text-gray-600 mb-1">
                        <Calendar className="h-4 w-4" />
                        <span className="text-xs">Material Needed</span>
                      </div>
                      <p className="font-medium">{getMaterialNeeded(pothole.volume)}</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-1 text-gray-600 mb-1">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs">Est. Fix Time</span>
                      </div>
                      <p className="font-medium">{getFixTime(pothole.volume)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {potholes.length === 0 && (
        <div className="bg-blue-50 rounded-lg p-6 text-center">
          <p className="text-blue-600">No pothole data available</p>
        </div>
      )}
    </div>
  );
}

export default CardPage;