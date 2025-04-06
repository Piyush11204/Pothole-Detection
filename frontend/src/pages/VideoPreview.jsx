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
  const [sensitivity, setSensitivity] = useState(35);
  const [minArea, setMinArea] = useState(250);
  const [contrastFactor, setContrastFactor] = useState(1.5);
  
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
          detectionInterval.current = setInterval(detectPotholes, 250);
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
      
      // Use gradient-based edge detection
      const edges = detectEdges(data, width, height);
      
      // Apply road-focused region of interest mask
      applyROIMask(edges, width, height);
      
      // Find connected components with adaptive thresholding
      const potholesDetected = findPotholes(edges, data, width, height);
      
      // Sort by confidence and filter by domain-specific rules
      const filteredPotholes = filterPotholes(potholesDetected, width, height);
      
      setDetectedPotholes(filteredPotholes.slice(0, 5));
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
    
    // Apply adaptive contrast enhancement
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
    const threshold = 255 - sensitivity * 2;
    
    // Sobel operator for gradient-based edge detection
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
        
        // Simplified Sobel
        const gx = (tr + 2*r + br) - (tl + 2*l + bl);
        const gy = (bl + 2*b + br) - (tl + 2*t + tr);
        const g = Math.sqrt(gx*gx + gy*gy);
        
        // Apply threshold
        const edgeIdx = y * width + x;
        edges[edgeIdx] = g > threshold ? 1 : 0;
        
        // Emphasize significant dark spots
        if (c < threshold - 30) {
          edges[edgeIdx] = 1;
        }
      }
    }
    
    return edges;
  };
  
  const applyROIMask = (edges, width, height) => {
    // Focus detection on road region (lower part of image)
    const roadStartY = Math.floor(height * 0.4);
    
    // Create a trapezoid-shaped ROI that resembles road perspective
    for (let y = 0; y < height; y++) {
      // Skip pixels outside the road region
      if (y < roadStartY) {
        for (let x = 0; x < width; x++) {
          edges[y * width + x] = 0;
        }
        continue;
      }
      
      // Create a trapezoid that narrows at the horizon line
      const progress = (y - roadStartY) / (height - roadStartY);
      const margin = Math.floor(width * (0.4 - 0.3 * progress));
      
      // Clear edges outside the trapezoid
      for (let x = 0; x < margin; x++) {
        edges[y * width + x] = 0;
      }
      for (let x = width - margin; x < width; x++) {
        edges[y * width + x] = 0;
      }
      
      // Apply distance-based weighting
      // Objects closer to the camera (lower in the frame) are more likely to be potholes
      const distanceFactor = 0.5 + 0.5 * progress;
      
      for (let x = margin; x < width - margin; x++) {
        const idx = y * width + x;
        if (edges[idx] === 1) {
          // Random noise reduction for distant objects
          if (progress < 0.3 && Math.random() > distanceFactor) {
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
      
      // Calculate confidence based on multiple features
      const darknessFactor = (255 - avgIntensity) / 255;
      const sizeFactor = Math.min(1, area / minArea);
      const shapeFactor = aspectRatio > 0.5 && aspectRatio < 2 ? 1 : 0.7;
      
      let confidence = darknessFactor * 0.4 + sizeFactor * 0.3 + shapeFactor * 0.1 + positionFactor * 0.2;
      confidence = Math.min(0.98, Math.max(0.5, confidence));
      
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
    // Filter candidates based on domain knowledge and statistical analysis
    return candidates
      .filter(candidate => {
        // Size constraints
        if (candidate.area < minArea) return false;
        if (candidate.area > (width * height) / 8) return false;
        
        // Shape constraints
        if (candidate.aspectRatio > 3 || candidate.aspectRatio < 0.3) return false;
        
        // Density constraints (too sparse = noise, too dense = shadow)
        if (candidate.density < 0.3 || candidate.density > 0.9) return false;
        
        // Position constraints (more likely in lower half of frame)
        if (candidate.position < 0.3) return false;
        
        // Darkness constraints (potholes usually darker than surroundings)
        if (candidate.darkness < 0.4) return false;
        
        return true;
      })
      .sort((a, b) => {
        // Sort by multiple criteria
        // Prioritize position (closer to bottom), then confidence
        const posWeight = 0.3;
        const confWeight = 0.7;
        
        const scoreA = a.position * posWeight + a.confidence * confWeight;
        const scoreB = b.position * posWeight + b.confidence * confWeight;
        
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
        ctx.beginPath();
        ctx.rect(pothole.x, pothole.y, pothole.width, pothole.height);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'red';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.stroke();
        ctx.fill();
        
        ctx.font = '14px Arial';
        ctx.fillStyle = 'red';
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
  
  if (!file) return null;
  
  return (
    <motion.div
      className="mt-8 bg-gray-50 p-4 rounded-lg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-lg font-medium text-gray-800 mb-3">
        Enhanced Pothole Detection
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
        
        <div className="flex items-center">
          <label className="mr-2 text-sm text-gray-700">Contrast:</label>
          <input 
            type="range" 
            min="10" 
            max="30" 
            value={contrastFactor * 10} 
            onChange={(e) => setContrastFactor(parseInt(e.target.value) / 10)} 
            className="w-24"
          />
          <span className="ml-2 text-xs text-gray-600">{contrastFactor.toFixed(1)}x</span>
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
        <p><strong>Note:</strong> This detection algorithm works best with videos that have good lighting and clear contrast between the road and potholes. 
        Adjust the sensitivity slider to fine-tune detection based on your video conditions.</p>
      </div>
    </motion.div>
  );
};

export default VideoPreview;