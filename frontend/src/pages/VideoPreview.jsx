// VideoPreview.jsx
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { XCircleIcon, PlayIcon  } from 'lucide-react';

function VideoPreview() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [potholeData, setPotholeData] = useState({});
  const [globalData, setGlobalData] = useState({ 
    potholes: {}, 
    total: { count: 0, length: 0, breadth: 0, depth: 0 } 
  });
  const [videoPath, setVideoPath] = useState('input/final4.mp4');
  const [streamError, setStreamError] = useState(false);
  const videoStreamRef = useRef(null);
  const lastFetchTime = useRef(Date.now());
  
  // Memoize the stream URL to prevent unnecessary re-renders
  const streamUrl = useMemo(() => {
    return `http://localhost:5001/video_feed?timestamp=${Date.now()}`;
  }, [isProcessing]);

  // Optimize data fetching with a single fetch function
  const fetchData = useCallback(async () => {
    // Throttle fetches to prevent overloading
    const now = Date.now();
    if (now - lastFetchTime.current < 300) return;
    lastFetchTime.current = now;

    try {
      // Use Promise.all to parallelize requests
      const [statusRes, potholeRes, globalRes] = await Promise.all([
        fetch('http://localhost:5001/status'),
        isProcessing ? fetch('http://localhost:5001/pothole_data') : Promise.resolve(null),
        isProcessing ? fetch('http://localhost:5001/global_pothole_data') : Promise.resolve(null)
      ]);

      const statusData = await statusRes.json();
      setIsProcessing(statusData.processing);

      if (isProcessing) {
        if (potholeRes) {
          const potholeData = await potholeRes.json();
          setPotholeData(potholeData);
        }
        
        if (globalRes) {
          const globalData = await globalRes.json();
          setGlobalData(globalData);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [isProcessing]);

  // Refresh stream only when necessary
  const refreshStream = useCallback(() => {
    if (!videoStreamRef.current || !isProcessing) return;
    
    const newSrc = `http://localhost:5001/video_feed?timestamp=${Date.now()}`;
    videoStreamRef.current.src = newSrc;
    setStreamError(false);
  }, [isProcessing]);

  // Unified polling effect with optimized intervals
  useEffect(() => {
    let dataInterval;
    let streamInterval;
    
    if (isProcessing) {
      // Data polling - more efficient interval
      dataInterval = setInterval(fetchData, 1000);
      
      // Stream refresh - only refresh every 5 seconds unless there's an error
      streamInterval = setInterval(refreshStream, 5000);
    } else {
      // When not processing, check status less frequently
      dataInterval = setInterval(fetchData, 3000);
    }
    
    // Initial fetch
    fetchData();
    
    return () => {
      clearInterval(dataInterval);
      clearInterval(streamInterval);
    };
  }, [isProcessing, fetchData, refreshStream]);

  // Process control functions
  const startProcessing = async () => {
    try {
      const response = await fetch(`http://localhost:5001/start_processing/${encodeURIComponent(videoPath)}`);
      const data = await response.json();
      if (data.status === 'started') {
        setIsProcessing(true);
        refreshStream();
      }
    } catch (error) {
      console.error('Error starting processing:', error);
    }
  };
  
  const stopProcessing = async () => {
    try {
      const response = await fetch('http://localhost:5001/stop_processing');
      const data = await response.json();
      if (data.status === 'stopped') {
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error stopping processing:', error);
    }
  };

  // Format values for display
  const formatMeasurement = (value) => {
    return value ? `${value.toFixed(1)} cm` : 'N/A';
  };

  // Calculate severity of pothole based on measurements
  const getSeverity = (measurements) => {
    if (!measurements) return 'unknown';
    
    const score = (measurements.length || 0) * (measurements.breadth || 0) * (measurements.depth || 0);
    
    if (score > 5000) return 'severe';
    if (score > 2000) return 'moderate';
    return 'minor';
  };

  // Get color class based on severity
  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'severe': return 'bg-red-100 border-red-300';
      case 'moderate': return 'bg-yellow-100 border-yellow-300';
      case 'minor': return 'bg-green-100 border-green-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  return (
    <div className="container mx-auto p-4 bg-gray-50 min-h-screen">
      <header className="bg-blue-600 text-white p-4 rounded-lg shadow-md mb-6">
        <h1 className="text-3xl font-bold">Pothole Detection System</h1>
        <p className="text-blue-100">Real-time analysis and measurement</p>
      </header>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
          <div className="flex-grow">
            <label className="block text-sm font-medium text-gray-700 mb-1">Video Source:</label>
            <input 
              type="text" 
              value={videoPath} 
              onChange={(e) => setVideoPath(e.target.value)}
              className="border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isProcessing}
              placeholder="Enter video path or URL"
            />
          </div>
          
          {isProcessing ? (
            <button 
              onClick={stopProcessing}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-md shadow transition duration-150 ease-in-out"
            >
      
              Stop Processing
            </button>
          ) : (
            <button 
              onClick={startProcessing}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-md shadow transition duration-150 ease-in-out"
            >
              <PlayIcon size={18} />
              Start Processing
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-100 p-3 rounded-md">
            <h2 className="font-semibold text-gray-800 mb-1">Status</h2>
            <div className={`py-1 px-3 rounded-full inline-flex items-center ${isProcessing ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isProcessing ? "bg-green-500" : "bg-red-500"}`}></span>
              {isProcessing ? "Processing Active" : "Inactive"}
            </div>
          </div>
          
          {globalData.total && (
            <>
              <div className="bg-blue-50 p-3 rounded-md">
                <h2 className="font-semibold text-gray-800 mb-1">Total Potholes</h2>
                <p className="text-2xl font-bold text-blue-600">{globalData.total.count || 0}</p>
              </div>
              
              <div className="bg-purple-50 p-3 rounded-md">
                <h2 className="font-semibold text-gray-800 mb-1">Avg. Size</h2>
                <p className="text-lg text-purple-600">
                  {globalData.total.count ? 
                    `${((globalData.total.length + globalData.total.breadth) / 2 / globalData.total.count).toFixed(1)} cm` : 
                    'N/A'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 bg-gray-800 text-white flex justify-between items-center">
              <h2 className="text-xl font-semibold">Live Detection</h2>
              {isProcessing && (
                <button 
                  onClick={refreshStream} 
                  className="text-white hover:text-blue-300 flex items-center gap-1"
                >
                
                  <span className="text-sm">Refresh</span>
                </button>
              )}
            </div>
            
            <div className="relative bg-black" style={{ minHeight: '400px', maxHeight: '600px' }}>
              {isProcessing ? (
                <>
                  <img 
                    ref={videoStreamRef}
                    src={streamUrl}
                    alt="Pothole Detection Stream"
                    className="w-full h-auto object-contain"
                    style={{ display: 'block', maxHeight: '600px', margin: '0 auto' }}
                    onError={(e) => {
                      console.error("Video stream error:", e);
                      setStreamError(true);
                      // Retry loading after a short delay
                      setTimeout(refreshStream, 2000);
                    }}
                  />
                  
                  {streamError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
                      <div className="text-center text-white">
                        <XCircleIcon size={48} className="mx-auto mb-2 text-red-500" />
                        <p className="text-lg mb-2">Stream connection error</p>
                        <button 
                          onClick={refreshStream}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm"
                        >
                          Retry Connection
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-70">
                  <div className="text-center">
                    <PlayIcon size={48} className="mx-auto mb-3 text-green-400" />
                    <p className="text-xl">Start processing to view detection</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 bg-gray-800 text-white">
              <h2 className="text-xl font-semibold">Current Frame Analysis</h2>
              <p className="text-sm text-gray-300">Detected potholes and measurements</p>
            </div>
            
            <div className="max-h-[500px] overflow-y-auto p-4">
              {Object.keys(potholeData).length > 0 ? (
                Object.entries(potholeData).map(([id, data]) => {
                  const severity = getSeverity(data.measurements);
                  const cardClass = getSeverityClass(severity);
                  
                  return (
                    <div key={id} className={`mb-3 p-3 border rounded-md ${cardClass} transition-all duration-200 hover:shadow-md`}>
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-gray-800">Pothole #{id}</p>
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                          severity === 'severe' ? 'bg-red-500 text-white' : 
                          severity === 'moderate' ? 'bg-yellow-500 text-white' : 
                          'bg-green-500 text-white'
                        }`}>
                          {severity}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="text-center p-1 bg-white bg-opacity-50 rounded">
                          <p className="text-xs text-gray-600">Length</p>
                          <p className="font-medium">{formatMeasurement(data.measurements.length)}</p>
                        </div>
                        <div className="text-center p-1 bg-white bg-opacity-50 rounded">
                          <p className="text-xs text-gray-600">Width</p>
                          <p className="font-medium">{formatMeasurement(data.measurements.breadth)}</p>
                        </div>
                        <div className="text-center p-1 bg-white bg-opacity-50 rounded">
                          <p className="text-xs text-gray-600">Depth</p>
                          <p className="font-medium">{formatMeasurement(data.measurements.depth)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-gray-500">
                  <p className="mb-2">No potholes detected in current frame</p>
                  <p className="text-sm">Potholes will be displayed here as they are detected</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Summary Statistics Section */}
          {isProcessing && globalData.total && globalData.total.count > 0 && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
              <div className="p-4 bg-gray-800 text-white">
                <h2 className="text-xl font-semibold">Analysis Summary</h2>
              </div>
              
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-md text-center">
                    <p className="text-sm text-gray-600">Avg. Length</p>
                    <p className="text-lg font-medium text-blue-700">
                      {formatMeasurement(globalData.total.length / globalData.total.count)}
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-md text-center">
                    <p className="text-sm text-gray-600">Avg. Width</p>
                    <p className="text-lg font-medium text-blue-700">
                      {formatMeasurement(globalData.total.breadth / globalData.total.count)}
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-md text-center col-span-2">
                    <p className="text-sm text-gray-600">Avg. Depth</p>
                    <p className="text-lg font-medium text-blue-700">
                      {formatMeasurement(globalData.total.depth / globalData.total.count)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoPreview;