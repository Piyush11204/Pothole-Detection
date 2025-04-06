import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const VideoPreview = ({ file }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const processingCanvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [detectedPotholes, setDetectedPotholes] = useState([]);
  const detectionInterval = useRef(null);
  const [detectionEnabled, setDetectionEnabled] = useState(true);
  const [sensitivity, setSensitivity] = useState(30); // Default sensitivity value
  const [minArea, setMinArea] = useState(300); // Minimum area for blob detection
  
  // Create object URL for the video file
  useEffect(() => {
    if (file) {
      const videoUrl = URL.createObjectURL(file);
      if (videoRef.current) {
        videoRef.current.src = videoUrl;
      }
      
      // Clean up object URL on unmount
      return () => {
        URL.revokeObjectURL(videoUrl);
      };
    }
  }, [file]);
  
  // Set video dimensions when metadata is loaded
  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;
      
      // Calculate dimensions to maintain aspect ratio and fit within container
      const containerWidth = 800; // Maximum width
      const containerHeight = 450; // Maximum height
      
      let width = videoWidth;
      let height = videoHeight;
      
      if (width > containerWidth) {
        width = containerWidth;
        height = (videoHeight / videoWidth) * containerWidth;
      }
      
      if (height > containerHeight) {
        height = containerHeight;
        width = (videoWidth / videoHeight) * containerHeight;
      }
      
      setVideoDimensions({ width, height });
    }
  };
  
  // Handle video playback and pothole detection
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        if (detectionInterval.current) {
          clearInterval(detectionInterval.current);
          detectionInterval.current = null;
        }
      } else {
        videoRef.current.play();
        // Set up pothole detection at regular intervals
        if (detectionEnabled && !detectionInterval.current) {
          detectPotholes();
          detectionInterval.current = setInterval(detectPotholes, 500); // Check every 500ms
        }
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  // Alternative pothole detection using basic image processing
  const detectPotholes = () => {
    if (!videoRef.current || videoRef.current.paused || !detectionEnabled) return;
    
    try {
      // Create a hidden canvas for processing
      if (!processingCanvasRef.current) {
        processingCanvasRef.current = document.createElement('canvas');
      }
      
      const procCanvas = processingCanvasRef.current;
      procCanvas.width = videoDimensions.width;
      procCanvas.height = videoDimensions.height;
      const procCtx = procCanvas.getContext('2d');
      
      // Draw current video frame
      procCtx.drawImage(videoRef.current, 0, 0, procCanvas.width, procCanvas.height);
      
      // Get image data for processing
      const imageData = procCtx.getImageData(0, 0, procCanvas.width, procCanvas.height);
      const data = imageData.data;
      
      // Create binary representation for edge detection
      const width = procCanvas.width;
      const height = procCanvas.height;
      const binaryData = new Uint8Array(width * height);
      
      // Apply simple edge detection and look for dark spots in road regions
      // This is a simple approach - real pothole detection would be more sophisticated
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          
          // Convert to grayscale
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          
          // Simple thresholding - dark areas with high contrast might be potholes
          // Focus more on the lower part of the image (road region)
          const roadRegionFactor = y > height * 0.5 ? 1.5 : 0.5; // Weight lower part of image more
          
          // Set binary value based on threshold and position
          binaryData[y * width + x] = gray < (255 - sensitivity) * roadRegionFactor ? 1 : 0;
        }
      }
      
      // Connected component labeling - find blobs that might be potholes
      const labels = new Int32Array(width * height);
      let nextLabel = 1;
      const equivalences = {};
      
      // First pass: assign labels
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          
          if (binaryData[idx] === 1) {
            // Check west and north neighbors
            const westIdx = idx - 1;
            const northIdx = idx - width;
            
            const westLabel = x > 0 ? labels[westIdx] : 0;
            const northLabel = y > 0 ? labels[northIdx] : 0;
            
            if (westLabel === 0 && northLabel === 0) {
              // New label
              labels[idx] = nextLabel;
              equivalences[nextLabel] = nextLabel;
              nextLabel++;
            } else if (westLabel !== 0 && northLabel === 0) {
              // Use west label
              labels[idx] = westLabel;
            } else if (westLabel === 0 && northLabel !== 0) {
              // Use north label
              labels[idx] = northLabel;
            } else {
              // Both west and north have labels - use smallest and note equivalence
              const minLabel = Math.min(westLabel, northLabel);
              labels[idx] = minLabel;
              
              // Record label equivalence
              const westRoot = equivalences[westLabel];
              const northRoot = equivalences[northLabel];
              
              if (westRoot !== northRoot) {
                equivalences[Math.max(westRoot, northRoot)] = Math.min(westRoot, northRoot);
              }
            }
          }
        }
      }
      
      // Resolve equivalences
      for (let i = 1; i < nextLabel; i++) {
        let root = i;
        while (equivalences[root] !== root) {
          root = equivalences[root];
        }
        equivalences[i] = root;
      }
      
      // Count blob sizes and find centroids
      const blobs = {};
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const label = labels[idx];
          
          if (label > 0) {
            const root = equivalences[label];
            
            if (!blobs[root]) {
              blobs[root] = {
                count: 0,
                sumX: 0,
                sumY: 0,
                minX: width,
                minY: height,
                maxX: 0,
                maxY: 0
              };
            }
            
            blobs[root].count++;
            blobs[root].sumX += x;
            blobs[root].sumY += y;
            blobs[root].minX = Math.min(blobs[root].minX, x);
            blobs[root].minY = Math.min(blobs[root].minY, y);
            blobs[root].maxX = Math.max(blobs[root].maxX, x);
            blobs[root].maxY = Math.max(blobs[root].maxY, y);
          }
        }
      }
      
      // Convert blobs to pothole detections, filtering by size
      const potholesDetected = [];
      
      Object.keys(blobs).forEach(labelKey => {
        const blob = blobs[labelKey];
        const blobWidth = blob.maxX - blob.minX;
        const blobHeight = blob.maxY - blob.minY;
        const area = blobWidth * blobHeight;
        
        // Filter out very small or very large blobs
        if (area > minArea && area < (width * height) / 4) {
          // Estimate confidence based on size and density
          const density = blob.count / area;
          const confidence = Math.min(0.95, Math.max(0.5, density * 5));
          
          potholesDetected.push({
            x: blob.minX,
            y: blob.minY,
            width: blobWidth,
            height: blobHeight,
            confidence: confidence
          });
        }
      });
      
      // Limit to top 5 most confident detections to avoid too many false positives
      potholesDetected.sort((a, b) => b.confidence - a.confidence);
      setDetectedPotholes(potholesDetected.slice(0, 5));
      
    } catch (error) {
      console.error('Error during pothole detection:', error);
    }
  };
  
  // Draw pothole detection results on canvas
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current || !isPlaying) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Function to draw frame with potholes
    const drawFrame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw the current video frame
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Draw bounding boxes for potholes
      detectedPotholes.forEach((pothole, index) => {
        ctx.beginPath();
        ctx.rect(pothole.x, pothole.y, pothole.width, pothole.height);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'red';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.stroke();
        ctx.fill();
        
        // Add "POTHOLE" label with confidence score
        ctx.font = '14px Arial';
        ctx.fillStyle = 'red';
        const confidenceText = `POTHOLE: ${(pothole.confidence * 100).toFixed(0)}%`;
        ctx.fillText(confidenceText, pothole.x, pothole.y - 5);
      });
      
      // Request next animation frame
      if (isPlaying && !videoRef.current.paused) {
        requestAnimationFrame(drawFrame);
      }
    };
    
    // Start animation
    const animationFrame = requestAnimationFrame(drawFrame);
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying, videoDimensions, detectedPotholes]);
  
  if (!file) return null;
  
  return (
    <motion.div
      className="mt-8 bg-gray-50 p-4 rounded-lg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-lg font-medium text-gray-800 mb-3">
        Alternative Pothole Detection
      </h3>
      
      <div className="relative mx-auto" style={{ width: videoDimensions.width, height: videoDimensions.height }}>
        {/* Hidden video element for reference */}
        <video 
          ref={videoRef}
          className="hidden"
          onLoadedMetadata={handleMetadataLoaded}
          onEnded={() => setIsPlaying(false)}
        />
        
        {/* Canvas for rendering video with detection overlay */}
        <canvas 
          ref={canvasRef}
          width={videoDimensions.width}
          height={videoDimensions.height}
          className="bg-black rounded-lg shadow-md"
        />
        
        {/* Play/pause button */}
        <motion.button
          className="absolute bottom-4 right-4 bg-red-600 text-white p-2 rounded-full shadow-lg"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={togglePlayPause}
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          )}
        </motion.button>
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <div className="flex items-center">
          <label className="mr-2 text-sm text-gray-700">Detection:</label>
          <button 
            className={`px-3 py-1 text-xs rounded-full ${detectionEnabled ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700'}`}
            onClick={() => setDetectionEnabled(!detectionEnabled)}
          >
            {detectionEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
        
        <div className="flex items-center">
          <label className="mr-2 text-sm text-gray-700">Sensitivity:</label>
          <input 
            type="range" 
            min="10" 
            max="80" 
            value={sensitivity} 
            onChange={(e) => setSensitivity(parseInt(e.target.value))} 
            className="w-24"
          />
          <span className="ml-2 text-xs text-gray-600">{sensitivity}</span>
        </div>
        
        <div className="flex items-center">
          <label className="mr-2 text-sm text-gray-700">Min Size:</label>
          <input 
            type="range" 
            min="100" 
            max="1000" 
            value={minArea} 
            onChange={(e) => setMinArea(parseInt(e.target.value))} 
            className="w-24"
          />
          <span className="ml-2 text-xs text-gray-600">{minArea}px</span>
        </div>
      </div>
      
      <div className="text-center mt-3 text-sm text-gray-600">
        {isPlaying ? `Playing video with pothole detection (${detectedPotholes.length} potholes detected)` : 
                   'Click play to start video with pothole detection'}
      </div>
      
      {detectedPotholes.length > 0 && (
        <div className="mt-4">
          <h4 className="text-md font-medium text-gray-700">Pothole Detection Results:</h4>
          <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="py-1">ID</th>
                  <th className="py-1">Confidence</th>
                  <th className="py-1">Position (x, y)</th>
                  <th className="py-1">Size (w × h)</th>
                </tr>
              </thead>
              <tbody>
                {detectedPotholes.map((pothole, index) => (
                  <tr key={index} className="border-t border-gray-200">
                    <td className="py-1">#{index + 1}</td>
                    <td className="py-1">{(pothole.confidence * 100).toFixed(1)}%</td>
                    <td className="py-1">({Math.round(pothole.x)}, {Math.round(pothole.y)})</td>
                    <td className="py-1">{Math.round(pothole.width)} × {Math.round(pothole.height)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-gray-700">
        <p><strong>Note:</strong> This is a simplified algorithm that pothole areas and contrast changes that might indicate potholes. 
        It works best with videos that have good lighting and clear contrast between the road and potholes. 
        Adjust the sensitivity slider to fine-tune detection based on your video conditions.</p>
      </div>
    </motion.div>
  );
};

export default VideoPreview;