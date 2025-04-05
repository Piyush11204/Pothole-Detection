import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut } from 'lucide-react';

const ImagePreview = ({ file, results }) => {
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Create object URL for the image file
  useEffect(() => {
    if (!file) return;

    const img = new Image();
    const imageUrl = URL.createObjectURL(file);

    img.onload = () => {
      // Calculate dimensions to maintain aspect ratio and fit within container
      const containerWidth = 800; // Maximum width
      const containerHeight = 450; // Maximum height

      let width = img.width;
      let height = img.height;

      if (width > containerWidth) {
        width = containerWidth;
        height = (img.height / img.width) * containerWidth;
      }

      if (height > containerHeight) {
        height = containerHeight;
        width = (img.width / img.height) * containerHeight;
      }

      setImageDimensions({ width, height, naturalWidth: img.width, naturalHeight: img.height });

      // Draw image with potholes on canvas
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
        drawImageWithPotholes(canvas, img);
      }
    };

    img.src = imageUrl;

    // Clean up URL on unmount
    return () => {
      URL.revokeObjectURL(imageUrl);
    };
  }, [file]);

  // Draw image with pothole detection rectangles
  const drawImageWithPotholes = (canvas, img) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Sample potholes data (you would replace this with actual detection data)
    const mockPotholes = results
      ? // Use actual results if available
        (results.potholes || []).map((pothole) => ({
          x: pothole.x * canvas.width,
          y: pothole.y * canvas.height,
          width: pothole.width * canvas.width,
          height: pothole.height * canvas.height,
        }))
      : // Use mock data otherwise
        [
          { x: canvas.width * 0.3, y: canvas.height * 0.6, width: 40, height: 30 },
          { x: canvas.width * 0.7, y: canvas.height * 0.7, width: 50, height: 35 },
          { x: canvas.width * 0.5, y: canvas.height * 0.5, width: 45, height: 25 },
        ];

    // Draw bounding boxes for potholes
    mockPotholes.forEach((pothole) => {
      ctx.beginPath();
      ctx.rect(pothole.x, pothole.y, pothole.width, pothole.height);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'yellow';
      ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
      ctx.stroke();
      ctx.fill();

      // Add "POTHOLE" label
      ctx.font = '14px Arial';
      ctx.fillStyle = 'yellow';
      ctx.fillText('POTHOLE', pothole.x, pothole.y - 5);
    });
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex justify-between items-center mb-4">
        <button
          className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition"
          onClick={() => setZoom((prev) => Math.min(prev + 0.1, 2))}
        >
          <ZoomIn className="w-5 h-5 text-gray-700" />
        </button>
        <button
          className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition"
          onClick={() => setZoom((prev) => Math.max(prev - 0.1, 0.5))}
        >
          <ZoomOut className="w-5 h-5 text-gray-700" />
        </button>
      </div>
      <div
        className="overflow-hidden"
        style={{
          width: imageDimensions.width * zoom,
          height: imageDimensions.height * zoom,
        }}
      >
        <canvas ref={canvasRef} style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }} />
      </div>
    </div>
  );
};

export default ImagePreview;