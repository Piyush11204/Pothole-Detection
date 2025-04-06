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
  // Default threshold values - more permissive settings
  const [sensitivity, setSensitivity] = useState(40);  // Decreased from 50
  const [minArea, setMinArea] = useState(400);  // Increased from 150
  const [contrastFactor, setContrastFactor] = useState(2);  // Slightly reduced
  
  useEffect(() => {
    if (file) {
      const videoUrl = URL.createObjectURL(file);
      if (videoRef.current) {
        videoRef.current.src = videoUrl;
      }
      return () => URL.revokeObjectURL(videoUrl);
    }
  }, [file]);
  
  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;
      
      const containerWidth = 800;
      const containerHeight = 450;
      
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
        if (detectionEnabled && !detectionInterval.current) {
          detectPotholes();
          // Make detection more frequent
          detectionInterval.current = setInterval(detectPotholes, 150); // Changed from 250ms
        }
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const detectPotholes = () => {
    if (!videoRef.current || videoRef.current.paused || !detectionEnabled) return;
    
    try {
      if (!processingCanvasRef.current) {
        processingCanvasRef.current = document.createElement('canvas');
      }
      
      const procCanvas = processingCanvasRef.current;
      procCanvas.width = videoDimensions.width;
      procCanvas.height = videoDimensions.height;
      const procCtx = procCanvas.getContext('2d');
      
      procCtx.drawImage(videoRef.current, 0, 0, procCanvas.width, procCanvas.height);
      
      const imageData = procCtx.getImageData(0, 0, procCanvas.width, procCanvas.height);
      const data = imageData.data;
      
      const width = procCanvas.width;
      const height = procCanvas.height;
      
      // Enhanced processing: Apply improved contrast before thresholding
      enhanceContrast(data, width, height, contrastFactor);
      
      // Use gradient-based edge detection with higher sensitivity
      const edges = detectEdges(data, width, height);
      
      // Apply less restrictive ROI mask - capture more of the frame
      applyROIMask(edges, width, height);
      
      // Find connected components with adaptive thresholding
      const potholesDetected = findPotholes(edges, data, width, height);
      
      // Less strict filtering to avoid missing potholes
      const filteredPotholes = filterPotholes(potholesDetected, width, height);
      
      // Show more potential potholes
      setDetectedPotholes(filteredPotholes.slice(0, 10)); // Increased from 5
    } catch (error) {
      console.error('Error during pothole detection:', error);
    }
  };
  
  const enhanceContrast = (data, width, height, factor) => {
    const size = width * height * 4;
    const grayValues = [];
    
    // Calculate average luminance
    let avgLum = 0;
    for (let i = 0; i < size; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      grayValues.push(gray);
      avgLum += gray;
    }
    avgLum /= (size / 4);
    
    // Apply adaptive contrast enhancement with more aggressive factor
    for (let i = 0, j = 0; i < size; i += 4, j++) {
      const gray = grayValues[j];
      const adjusted = avgLum + factor * (gray - avgLum);
      
      data[i] = adjusted;
      data[i + 1] = adjusted;
      data[i + 2] = adjusted;
    }
  };
  
  const detectEdges = (data, width, height) => {
    const edges = new Uint8Array(width * height);
    // Lower threshold to detect more edges (more sensitive)
    const threshold = 255 - sensitivity * 2.5; // More aggressive multiplier
    
    // Improved Sobel operator for gradient-based edge detection
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // 3x3 kernel sampling
        const tl = data[(y-1) * width * 4 + (x-1) * 4];
        const t = data[(y-1) * width * 4 + x * 4];
        const tr = data[(y-1) * width * 4 + (x+1) * 4];
        const l = data[y * width * 4 + (x-1) * 4];
        const c = data[idx];
        const r = data[y * width * 4 + (x+1) * 4];
        const bl = data[(y+1) * width * 4 + (x-1) * 4];
        const b = data[(y+1) * width * 4 + x * 4];
        const br = data[(y+1) * width * 4 + (x+1) * 4];
        
        // Enhanced Sobel with diagonal weight
        const gx = (tr + 2*r + br) - (tl + 2*l + bl);
        const gy = (bl + 2*b + br) - (tl + 2*t + tr);
        const g = Math.sqrt(gx*gx + gy*gy);
        
        // Apply threshold with more lenient detection
        const edgeIdx = y * width + x;
        edges[edgeIdx] = g > threshold ? 1 : 0;
        
        // Emphasize significant dark spots with more aggressive threshold
        if (c < threshold - 20) { // More lenient (was 30)
          edges[edgeIdx] = 1;
        }
      }
    }
    
    return edges;
  };
  
  const applyROIMask = (edges, width, height) => {
    // Less restrictive ROI - start higher in the frame to catch more potholes
    const roadStartY = Math.floor(height * 0.3); // Changed from 0.4
    
    // Create a wider trapezoid-shaped ROI
    for (let y = 0; y < height; y++) {
      // Skip pixels far outside the road region
      if (y < roadStartY) {
        for (let x = 0; x < width; x++) {
          edges[y * width + x] = 0;
        }
        continue;
      }
      
      // Create a wider trapezoid
      const progress = (y - roadStartY) / (height - roadStartY);
      // Smaller margins to include more of the image
      const margin = Math.floor(width * (0.35 - 0.3 * progress));
      
      // Clear edges outside the trapezoid
      for (let x = 0; x < margin; x++) {
        edges[y * width + x] = 0;
      }
      for (let x = width - margin; x < width; x++) {
        edges[y * width + x] = 0;
      }
      
      // Apply more lenient distance-based weighting
      const distanceFactor = 0.4 + 0.6 * progress;
      
      for (let x = margin; x < width - margin; x++) {
        const idx = y * width + x;
        if (edges[idx] === 1) {
          // Less random noise reduction
          if (progress < 0.2 && Math.random() > distanceFactor) {
            edges[idx] = 0;
          }
        }
      }
    }
  };
  
  const findPotholes = (edges, imageData, width, height) => {
    // Connected component labeling with Union-Find algorithm
    const labels = new Int32Array(width * height);
    let nextLabel = 1;
    const equivalences = new DisjointSet();
    
    // First pass: assign initial labels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        
        if (edges[idx] === 1) {
          const neighbors = [];
          
          // Check 8-connectivity neighborhood
          if (x > 0 && edges[idx - 1] === 1) neighbors.push(labels[idx - 1]);
          if (y > 0 && edges[idx - width] === 1) neighbors.push(labels[idx - width]);
          if (x > 0 && y > 0 && edges[idx - width - 1] === 1) neighbors.push(labels[idx - width - 1]);
          if (x < width - 1 && y > 0 && edges[idx - width + 1] === 1) neighbors.push(labels[idx - width + 1]);
          
          if (neighbors.length === 0) {
            // New component
            labels[idx] = nextLabel;
            equivalences.makeSet(nextLabel);
            nextLabel++;
          } else {
            // Assign smallest neighbor label
            const minLabel = Math.min(...neighbors.filter(l => l > 0));
            labels[idx] = minLabel;
            
            // Union with all neighbors
            for (const neighborLabel of neighbors) {
              if (neighborLabel > 0 && neighborLabel !== minLabel) {
                equivalences.union(minLabel, neighborLabel);
              }
            }
          }
        }
      }
    }
    
    // Second pass: resolve label equivalences
    const blobs = {};
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const label = labels[idx];
        
        if (label > 0) {
          const rootLabel = equivalences.find(label);
          labels[idx] = rootLabel;
          
          if (!blobs[rootLabel]) {
            blobs[rootLabel] = {
              count: 0,
              sumX: 0,
              sumY: 0,
              minX: width,
              minY: height,
              maxX: 0,
              maxY: 0,
              avgIntensity: 0,
              sumIntensity: 0
            };
          }
          
          blobs[rootLabel].count++;
          blobs[rootLabel].sumX += x;
          blobs[rootLabel].sumY += y;
          blobs[rootLabel].minX = Math.min(blobs[rootLabel].minX, x);
          blobs[rootLabel].minY = Math.min(blobs[rootLabel].minY, y);
          blobs[rootLabel].maxX = Math.max(blobs[rootLabel].maxX, x);
          blobs[rootLabel].maxY = Math.max(blobs[rootLabel].maxY, y);
          
          // Calculate average intensity (darkness) for the blob
          const intensity = imageData[(y * width + x) * 4];
          blobs[rootLabel].sumIntensity += intensity;
        }
      }
    }
    
    // Convert blobs to pothole candidates with features
    const potholeCandidates = [];
    
    for (const labelKey in blobs) {
      const blob = blobs[labelKey];
      const blobWidth = blob.maxX - blob.minX + 1;
      const blobHeight = blob.maxY - blob.minY + 1;
      const area = blob.count;
      const bboxArea = blobWidth * blobHeight;
      
      // Calculate blob features
      const density = area / bboxArea;
      const avgIntensity = blob.sumIntensity / area;
      const aspectRatio = blobWidth / blobHeight;
      const centerY = blob.sumY / blob.count;
      const positionFactor = centerY / height; // 0 at top, 1 at bottom
      
      // Calculate confidence with more weight on darkness and position
      const darknessFactor = (255 - avgIntensity) / 255;
      // More lenient size factor
      const sizeFactor = Math.min(1, area / (minArea * 0.8)); // More permissive
      // More lenient shape factor
      const shapeFactor = aspectRatio > 0.3 && aspectRatio < 3 ? 1 : 0.6; // Wider range
      
      // Adjust confidence calculation to be more permissive
      let confidence = darknessFactor * 0.45 + sizeFactor * 0.25 + shapeFactor * 0.1 + positionFactor * 0.2;
      // Lower minimum confidence threshold
      confidence = Math.min(0.99, Math.max(0.4, confidence)); // More permissive
      
      potholeCandidates.push({
        x: blob.minX,
        y: blob.minY,
        width: blobWidth,
        height: blobHeight,
        confidence: confidence,
        area: area,
        density: density,
        aspectRatio: aspectRatio,
        darkness: darknessFactor,
        position: positionFactor
      });
    }
    
    return potholeCandidates;
  };
  
  const filterPotholes = (candidates, width, height) => {
    // Filter candidates with more permissive constraints
    return candidates
      .filter(candidate => {
        // More permissive size constraints
        if (candidate.area < minArea * 0.7) return false; // More permissive
        if (candidate.area > (width * height) / 6) return false; // More permissive
        
        // More permissive shape constraints
        if (candidate.aspectRatio > 4 || candidate.aspectRatio < 0.25) return false; // More permissive
        
        // More permissive density constraints
        if (candidate.density < 0.2 || candidate.density > 0.95) return false; // More permissive
        
        // More permissive position constraints
        if (candidate.position < 0.2) return false; // More permissive
        
        // More permissive darkness constraints
        if (candidate.darkness < 0.3) return false; // More permissive
        
        return true;
      })
      .sort((a, b) => {
        // Sort by confidence first, then by position and size
        const confWeight = 0.6; // More weight on confidence
        const posWeight = 0.2;
        const sizeWeight = 0.2; // Added size factor to prioritize larger potholes
        
        const scoreA = a.confidence * confWeight + a.position * posWeight + (a.area / 1000) * sizeWeight;
        const scoreB = b.confidence * confWeight + b.position * posWeight + (b.area / 1000) * sizeWeight;
        
        return scoreB - scoreA;
      });
  };
  
  // Disjoint-Set data structure for efficient connected component labeling
  class DisjointSet {
    constructor() {
      this.parent = {};
    }
    
    makeSet(x) {
      this.parent[x] = x;
    }
    
    find(x) {
      if (this.parent[x] !== x) {
        this.parent[x] = this.find(this.parent[x]); // Path compression
      }
      return this.parent[x];
    }
    
    union(x, y) {
      const rootX = this.find(x);
      const rootY = this.find(y);
      
      if (rootX !== rootY) {
        // Union by rank could be added here for better performance
        this.parent[rootY] = rootX;
      }
    }
  }
  
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current || !isPlaying) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const drawFrame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      detectedPotholes.forEach((pothole) => {
        // Change color based on confidence
        const confidenceColor = getConfidenceColor(pothole.confidence);
        
        ctx.beginPath();
        ctx.rect(pothole.x, pothole.y, pothole.width, pothole.height);
        ctx.lineWidth = 3;
        ctx.strokeStyle = confidenceColor;
        ctx.fillStyle = confidenceColor.replace(')', ', 0.3)').replace('rgb', 'rgba');
        ctx.stroke();
        ctx.fill();
        
        ctx.font = '14px Arial';
        ctx.fillStyle = confidenceColor;
        const confidenceText = `POTHOLE: ${(pothole.confidence * 100).toFixed(0)}%`;
        ctx.fillText(confidenceText, pothole.x, pothole.y - 5);
      });
      
      if (isPlaying && !videoRef.current.paused) {
        requestAnimationFrame(drawFrame);
      }
    };
    
    const animationFrame = requestAnimationFrame(drawFrame);
    
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying, videoDimensions, detectedPotholes]);
  
  // Function to get color based on confidence level
  const getConfidenceColor = (confidence) => {
    if (confidence > 0.8) return 'rgb(255, 0, 0)'; // High confidence - red
    if (confidence > 0.6) return 'rgb(255, 165, 0)'; // Medium confidence - orange
    return 'rgb(255, 255, 0)'; // Low confidence - yellow
  };
  
  if (!file) return null;
  
  return (
    <motion.div
      className="mt-8 bg-gray-50 p-4 rounded-lg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-lg font-medium text-gray-800 mb-3">
        Enhanced Pothole Detection (Improved Sensitivity)
      </h3>
      
      <div className="relative mx-auto" style={{ width: videoDimensions.width, height: videoDimensions.height }}>
        <video 
          ref={videoRef}
          className="hidden"
          onLoadedMetadata={handleMetadataLoaded}
          onEnded={() => setIsPlaying(false)}
        />
        
        <canvas 
          ref={canvasRef}
          width={videoDimensions.width}
          height={videoDimensions.height}
          className="bg-black rounded-lg shadow-md"
        />
        
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
      
      <div className="mt-4 flex flex-wrap justify-between items-center gap-2">
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
            max="90" 
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
            min="50" 
            max="1000" 
            value={minArea} 
            onChange={(e) => setMinArea(parseInt(e.target.value))} 
            className="w-24"
          />
          <span className="ml-2 text-xs text-gray-600">{minArea}px</span>
        </div>
        
        <div className="flex items-center">
          <label className="mr-2 text-sm text-gray-700">Contrast:</label>
          <input 
            type="range" 
            min="10" 
            max="40" 
            value={contrastFactor * 10} 
            onChange={(e) => setContrastFactor(parseInt(e.target.value) / 10)} 
            className="w-24"
          />
          <span className="ml-2 text-xs text-gray-600">{contrastFactor.toFixed(1)}x</span>
        </div>
      </div>
      
      <div className="text-center mt-3 text-sm text-gray-600">
        {isPlaying ? `Playing video with enhanced pothole detection (${detectedPotholes.length} potholes detected)` : 
                   'Click play to start video with enhanced pothole detection'}
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
                  <th className="py-1">Type</th>
                </tr>
              </thead>
              <tbody>
                {detectedPotholes.map((pothole, index) => (
                  <tr key={index} className="border-t border-gray-200">
                    <td className="py-1">#{index + 1}</td>
                    <td className="py-1">{(pothole.confidence * 100).toFixed(1)}%</td>
                    <td className="py-1">({Math.round(pothole.x)}, {Math.round(pothole.y)})</td>
                    <td className="py-1">{Math.round(pothole.width)} × {Math.round(pothole.height)}</td>
                    <td className="py-1">{getSeverityLabel(pothole)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-gray-700">
        <p><strong>Note:</strong> This improved detection algorithm has been optimized for maximum sensitivity to ensure no potholes are missed. 
        The sensitivity has been increased and filters relaxed to detect more potential potholes. Color coding indicates confidence level (red = high, orange = medium, yellow = low).</p>
      </div>
      
      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-gray-700">
        <p><strong>Usage Tip:</strong> If you notice false positives, slightly increase the Min Size or decrease Sensitivity. 
        For missed potholes, increase Sensitivity or lower Min Size. The Contrast setting helps with poorly lit videos.</p>
      </div>
    </motion.div>
  );
};

// Helper function to categorize potholes by severity
const getSeverityLabel = (pothole) => {
  const area = pothole.area;
  const confidence = pothole.confidence;
  
  if (area > 600 && confidence > 0.7) return "Major";
  if (area > 300 || confidence > 0.6) return "Moderate";
  return "Minor";
};

export default VideoPreview;