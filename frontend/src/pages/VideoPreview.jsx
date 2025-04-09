// VideoPreview.jsx
import { useState, useEffect, useRef } from 'react';

function VideoPreview() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [potholeData, setPotholeData] = useState({});
  const [globalData, setGlobalData] = useState({ potholes: {}, total: { count: 0, length: 0, breadth: 0, depth: 0 } });
  const [videoPath, setVideoPath] = useState('input/final4.mp4');
  const videoStreamRef = useRef(null);
  
  // Poll for updates and handle video stream
  useEffect(() => {
    let interval;
    
    if (isProcessing) {
      // Update pothole data more frequently during processing
      interval = setInterval(() => {
        fetchPotholeData();
        fetchGlobalData();
        fetchStatus();
      }, 500);
      
      // Refresh the video stream
      if (videoStreamRef.current) {
        videoStreamRef.current.src = `http://localhost:5001/video_feed?timestamp=${new Date().getTime()}`;
      }
    } else {
      // Check status less frequently when not processing
      interval = setInterval(() => {
        fetchStatus();
      }, 2000);
    }
    
    return () => clearInterval(interval);
  }, [isProcessing]);
  
  // Add additional effect to refresh the video stream periodically during processing
  useEffect(() => {
    let videoRefreshInterval;
    
    if (isProcessing) {
      videoRefreshInterval = setInterval(() => {
        if (videoStreamRef.current) {
          // Force reload the stream every 5 seconds to prevent freezing
          videoStreamRef.current.src = `http://localhost:5001/video_feed?timestamp=${new Date().getTime()}`;
        }
      }, 5001);
    }
    
    return () => {
      if (videoRefreshInterval) {
        clearInterval(videoRefreshInterval);
      }
    };
  }, [isProcessing]);
  
  const fetchStatus = async () => {
    try {
      const response = await fetch('http://localhost:5001/status');
      const data = await response.json();
      setIsProcessing(data.processing);
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };
  
  const fetchPotholeData = async () => {
    try {
      const response = await fetch('http://localhost:5001/pothole_data');
      const data = await response.json();
      setPotholeData(data);
    } catch (error) {
      console.error('Error fetching pothole data:', error);
    }
  };
  
  const fetchGlobalData = async () => {
    try {
      const response = await fetch('http://localhost:5001/global_pothole_data');
      const data = await response.json();
      setGlobalData(data);
    } catch (error) {
      console.error('Error fetching global pothole data:', error);
    }
  };
  
  const startProcessing = async () => {
    try {
      const response = await fetch(`http://localhost:5001/start_processing/${encodeURIComponent(videoPath)}`);
      const data = await response.json();
      if (data.status === 'started') {
        setIsProcessing(true);
        // Reset the video stream
        if (videoStreamRef.current) {
          videoStreamRef.current.src = `http://localhost:5001/video_feed?t=${new Date().getTime()}`;
        }
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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Pothole Detection System</h1>
      
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <label className="font-semibold">Video Path:</label>
          <input 
            type="text" 
            value={videoPath} 
            onChange={(e) => setVideoPath(e.target.value)}
            className="border rounded px-2 py-1 flex-grow"
            disabled={isProcessing}
          />
          {isProcessing ? (
            <button 
              onClick={stopProcessing}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              Stop Processing
            </button>
          ) : (
            <button 
              onClick={startProcessing}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              Start Processing
            </button>
          )}
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Status</h2>
          <p>Processing: <span className={isProcessing ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
            {isProcessing ? "Active" : "Inactive"}
          </span></p>
        
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-2">Live Detection</h2>
          <div className="relative bg-black rounded overflow-hidden" style={{ minHeight: '400px' }}>
            {isProcessing ? (
              <div className="video-wrapper">
                <img 
                  ref={videoStreamRef}
                  src={`http://localhost:5001/video_feed?timestamp=${new Date().getTime()}`}
                  alt="Pothole Detection Stream"
                  className="w-full h-auto"
                  style={{ display: 'block' }}
                  onError={(e) => {
                    console.error("Video stream error:", e);
                    // Retry loading the image after a short delay
                    setTimeout(() => {
                      if (videoStreamRef.current) {
                        videoStreamRef.current.src = `http://localhost:5001/video_feed?timestamp=${new Date().getTime()}`;
                      }
                    }, 1000);
                  }}
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-70">
                <p className="text-xl">Start processing to view pothole detection</p>
              </div>
            )}
          </div>
        </div>
        
        <div>
          
          
          <div className="mt-4">
            <h2 className="text-xl font-semibold mb-2">Current Frame Details</h2>
            <div className="bg-white shadow rounded p-4 max-h-[300px] overflow-y-auto">
              {Object.keys(potholeData).length > 0 ? (
                Object.entries(potholeData).map(([id, data]) => (
                  <div key={id} className="mb-3 p-2 border rounded hover:bg-gray-50">
                    <p className="font-semibold">Pothole ID: {id}</p>
                    <p>Length: {data.measurements.length} cm</p>
                    <p>Breadth: {data.measurements.breadth} cm</p>
                    <p>Depth: {data.measurements.depth} cm</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">
                  No potholes in current frame
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoPreview;