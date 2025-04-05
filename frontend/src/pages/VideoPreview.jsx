import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as tf from 'tensorflow';

const VideoPreview = ({ file, results }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [model, setModel] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [detectedPotholes, setDetectedPotholes] = useState([]);
  const detectionInterval = useRef(null);
  
  // Load YOLO model
  useEffect(() => {
    const loadModel = async () => {
      setIsModelLoading(true);
      try {
        // Load the YOLO model from TensorFlow.js - replace URL with actual model path
        // This is typically a path to your model.json file
        const loadedModel = await tf.loadGraphModel('path/to/your/yolov5/model/model.json');
        setModel(loadedModel);
        console.log('YOLO model loaded successfully');
      } catch (error) {
        console.error('Failed to load YOLO model:', error);
      } finally {
        setIsModelLoading(false);
      }
    };
    
    loadModel();
    
    // Clean up
    return () => {
      if (detectionInterval.current) {
        clearInterval(detectionInterval.current);
      }
    };
  }, []);
  
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
        // Set up pothole detection
        if (model && !detectionInterval.current) {
          detectPotholes();
          // Detect potholes at regular intervals (adjust as needed)
          detectionInterval.current = setInterval(detectPotholes, 1000);
        }
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  // Function to perform pothole detection using YOLO
  const detectPotholes = async () => {
    if (!model || !videoRef.current || videoRef.current.paused) return;
    
    try {
      // Convert video frame to tensor
      const videoFrame = tf.browser.fromPixels(videoRef.current);
      
      // Resize to match YOLO input dimensions (typically 416x416 or 640x640)
      const inputTensor = tf.image.resizeBilinear(videoFrame, [640, 640])
        .div(255.0)
        .expandDims(0);
      
      // Run detection
      const predictions = await model.executeAsync(inputTensor);
      
      // Process predictions
      // Note: The exact processing depends on your YOLO model's output format
      // This is a simplified example - adjust based on your specific model
      const boxes = await predictions[0].arraySync();
      const scores = await predictions[1].arraySync();
      const classes = await predictions[2].arraySync();
      
      // Filter detections with confidence greater than threshold
      const threshold = 0.5;
      const potholesDetected = [];
      
      for (let i = 0; i < scores[0].length; i++) {
        if (scores[0][i] > threshold && classes[0][i] === 0) { // Assuming class 0 is pothole
          const [y1, x1, y2, x2] = boxes[0][i];
          potholesDetected.push({
            x: x1 * videoDimensions.width,
            y: y1 * videoDimensions.height,
            width: (x2 - x1) * videoDimensions.width,
            height: (y2 - y1) * videoDimensions.height,
            confidence: scores[0][i]
          });
        }
      }
      
      setDetectedPotholes(potholesDetected);
      
      // Clean up tensors
      tf.dispose([videoFrame, inputTensor, ...predictions]);
      
    } catch (error) {
      console.error('Error during pothole detection:', error);
    }
  };
  
  // Draw pothole detection results on canvas
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current || !isPlaying) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Use actual detected potholes or fallback to mock data for development
    const potholes = detectedPotholes.length > 0 ? detectedPotholes : 
      (results && results.potholes ? 
        results.potholes.map(pothole => ({
          x: pothole.x * videoDimensions.width,
          y: pothole.y * videoDimensions.height,
          width: pothole.width * videoDimensions.width,
          height: pothole.height * videoDimensions.height,
          confidence: pothole.confidence || 0.9
        })) : 
        [
          { x: videoDimensions.width * 0.3, y: videoDimensions.height * 0.6, width: 40, height: 30, confidence: 0.85 },
          { x: videoDimensions.width * 0.7, y: videoDimensions.height * 0.7, width: 50, height: 35, confidence: 0.92 },
        ]);
    
    // Function to draw frame with potholes
    const drawFrame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw the current video frame
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Draw bounding boxes for potholes
      potholes.forEach(pothole => {
        ctx.beginPath();
        ctx.rect(pothole.x, pothole.y, pothole.width, pothole.height);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'yellow';
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.stroke();
        ctx.fill();
        
        // Add "POTHOLE" label with confidence score
        ctx.font = '14px Arial';
        ctx.fillStyle = 'yellow';
        const confidenceText = pothole.confidence ? 
          `POTHOLE: ${(pothole.confidence * 100).toFixed(0)}%` : 
          'POTHOLE';
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
  }, [isPlaying, videoDimensions, results, detectedPotholes]);
  
  if (!file) return null;
  
  return (
    <motion.div
      className="mt-8 bg-gray-50 p-4 rounded-lg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-lg font-medium text-gray-800 mb-3">
        YOLO Pothole Detection
        {isModelLoading && <span className="ml-2 text-sm text-indigo-600">(Loading model...)</span>}
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
          className="absolute bottom-4 right-4 bg-indigo-600 text-white p-2 rounded-full shadow-lg"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={togglePlayPause}
          disabled={isModelLoading}
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
      
      <div className="text-center mt-3 text-sm text-gray-600">
        {isModelLoading ? 'Loading YOLO model...' : 
          isPlaying ? `Playing video with YOLO pothole detection (${detectedPotholes.length} potholes detected)` : 
                     'Click play to start YOLO pothole detection'}
      </div>
      
      {detectedPotholes.length > 0 && (
        <div className="mt-4">
          <h4 className="text-md font-medium text-gray-700">Detection Results:</h4>
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
    </motion.div>
  );
};

export default VideoPreview;