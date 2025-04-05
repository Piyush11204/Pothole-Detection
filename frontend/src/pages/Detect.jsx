import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  Upload,
  Trash2,
  Video,
  Image as ImageIcon,
  BarChart,
  AlertTriangle,
  ChevronRight,
  FileText,
  Volume2,
  ArrowRight,
  CheckCircle,
  Loader
} from 'lucide-react';

function Detect() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const navigate = useNavigate();

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    if (tabValue === 0) { // Video upload
      if (selectedFile.type.startsWith('video/')) {
        setFile(selectedFile);
        setError('');
        setResults(null);
      } else {
        setError('Please select a valid video file');
      }
    } else { // Image upload
      if (selectedFile.type.startsWith('image/')) {
        setFile(selectedFile);
        setError('');
        setResults(null);
      } else {
        setError('Please select a valid image file');
      }
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError(tabValue === 0 ? 'Please select a video file' : 'Please select an image file');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    const endpoint = tabValue === 0 ? 'api/detect' : 'api/detect/image';
    formData.append(tabValue === 0 ? 'video' : 'image', file);

    try {
      const response = await axios.post(`http://localhost:5000/${endpoint}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        onUploadProgress: (progressEvent) => {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          setUploadProgress(progress);
        }
      });
      
      setResults(response.data);
      setOpenDialog(true);
    } catch (error) {
      setError(`Error processing ${tabValue === 0 ? 'video' : 'image'}. Please try again.`);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    if (results) {
      localStorage.setItem('analysisResults', JSON.stringify(results));
      navigate('/card');
    }
  };

  const handleTabChange = (newValue) => {
    setTabValue(newValue);
    setFile(null);
    setError('');
    setResults(null);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  const resultVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { type: "spring", stiffness: 200, damping: 15 }
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <motion.div 
        className="text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-bold text-indigo-900 mb-4">Pothole Detection</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Upload a video or image to detect and analyze potholes in road surfaces
        </p>
      </motion.div>

      <motion.div 
        className="grid grid-cols-1 gap-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Upload Panel */}
        <motion.div 
          className="bg-white rounded-xl shadow-lg p-6"
          variants={itemVariants}
        >
          {/* Tabs */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => handleTabChange(0)}
                className={`flex items-center px-4 py-2 rounded-lg ${
                  tabValue === 0 
                    ? "bg-indigo-600 text-white" 
                    : "text-gray-700 hover:bg-gray-200"
                } transition-all duration-200`}
              >
                <Video className="w-5 h-5 mr-2" />
                <span>Video Upload</span>
              </button>
              <button
                onClick={() => handleTabChange(1)}
                className={`flex items-center px-4 py-2 rounded-lg ${
                  tabValue === 1 
                    ? "bg-indigo-600 text-white" 
                    : "text-gray-700 hover:bg-gray-200"
                } transition-all duration-200`}
              >
                <ImageIcon className="w-5 h-5 mr-2" />
                <span>Image Upload</span>
              </button>
            </div>
          </div>

          {/* Upload Area */}
          <div className="flex flex-col items-center">
            <input
              type="file"
              accept={tabValue === 0 ? "video/*" : "image/*"}
              className="hidden"
              id="file-upload"
              onChange={handleFileChange}
            />
            <label 
              htmlFor="file-upload"
              className="w-full max-w-md"
            >
              <motion.div 
                className="border-2 border-dashed border-indigo-300 rounded-lg p-8 text-center cursor-pointer hover:bg-indigo-50 transition-colors duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Upload className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700">
                  Select {tabValue === 0 ? 'Video' : 'Image'} File
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  or drag and drop here
                </p>
              </motion.div>
            </label>

            {/* Error Message */}
            {error && (
              <motion.div
                className="flex items-center mt-4 p-3 bg-red-50 text-red-800 rounded-lg"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Selected File */}
            {file && (
              <motion.div 
                className="w-full max-w-md mt-4 bg-indigo-50 rounded-lg p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {tabValue === 0 ? 
                      <Video className="w-5 h-5 text-indigo-600 mr-2" /> : 
                      <ImageIcon className="w-5 h-5 text-indigo-600 mr-2" />
                    }
                    <span className="font-medium text-gray-700 truncate max-w-xs">
                      {file.name}
                    </span>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Size: {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </motion.div>
            )}

            {/* Progress Bar */}
            {loading && (
              <motion.div 
                className="w-full max-w-md mt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-indigo-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="flex items-center justify-center mt-2 text-sm text-gray-600">
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  <span>Processing... {Math.round(uploadProgress)}%</span>
                </div>
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.button
              className={`mt-6 px-8 py-3 rounded-lg font-medium flex items-center ${
                !file || loading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              } transition-colors`}
              whileHover={!loading && file ? { scale: 1.05 } : {}}
              whileTap={!loading && file ? { scale: 0.95 } : {}}
              onClick={handleSubmit}
              disabled={!file || loading}
            >
              {loading ? 'Processing...' : `Analyze ${tabValue === 0 ? 'Video' : 'Image'}`}
              {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
            </motion.button>
          </div>
        </motion.div>

        {/* Instructions Panel */}
        <motion.div 
          className="bg-white rounded-xl shadow-lg p-6"
          variants={itemVariants}
        >
          <div className="flex items-center mb-4 text-indigo-700">
            <FileText className="w-6 h-6 mr-2" />
            <h2 className="text-xl font-semibold">Instructions</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="bg-indigo-100 rounded-full w-6 h-6 flex items-center justify-center text-indigo-700 font-medium mt-0.5 flex-shrink-0">
                  1
                </div>
                <p className="ml-3 text-gray-700">
                  Select the type of upload (Video or Image) using the tabs above.
                </p>
              </div>
              <div className="flex items-start">
                <div className="bg-indigo-100 rounded-full w-6 h-6 flex items-center justify-center text-indigo-700 font-medium mt-0.5 flex-shrink-0">
                  2
                </div>
                <p className="ml-3 text-gray-700">
                  Click "Select {tabValue === 0 ? 'Video' : 'Image'} File" to choose your file.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="bg-indigo-100 rounded-full w-6 h-6 flex items-center justify-center text-indigo-700 font-medium mt-0.5 flex-shrink-0">
                  3
                </div>
                <p className="ml-3 text-gray-700">
                  Ensure the {tabValue === 0 ? 'video' : 'image'} clearly shows the road surface.
                </p>
              </div>
              <div className="flex items-start">
                <div className="bg-indigo-100 rounded-full w-6 h-6 flex items-center justify-center text-indigo-700 font-medium mt-0.5 flex-shrink-0">
                  4
                </div>
                <p className="ml-3 text-gray-700">
                  Click "Analyze {tabValue === 0 ? 'Video' : 'Image'}" to start the detection process.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Results Dialog */}
      {openDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div 
            className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <div className="flex items-center mb-6 text-indigo-700">
              <BarChart className="w-6 h-6 mr-2" />
              <h2 className="text-xl font-semibold">Analysis Results</h2>
            </div>
            
            {results && (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div 
                  className="bg-indigo-50 rounded-lg p-4"
                  variants={resultVariants}
                >
                  <p className="text-gray-600 text-sm">Total Potholes</p>
                  <p className="text-3xl font-bold text-indigo-700">{results.total_potholes}</p>
                </motion.div>
                
                <motion.div 
                  className="bg-indigo-50 rounded-lg p-4"
                  variants={resultVariants}
                >
                  <p className="text-gray-600 text-sm">Total Volume</p>
                  <p className="text-3xl font-bold text-indigo-700">{results.total_volume.toFixed(2)} <span className="text-lg">cm³</span></p>
                </motion.div>
                
                <motion.div 
                  className="bg-indigo-50 rounded-lg p-4"
                  variants={resultVariants}
                >
                  <p className="text-gray-600 text-sm">Report File</p>
                  <p className="text-lg font-medium text-indigo-700 truncate">{results.csv_file}</p>
                </motion.div>
              </motion.div>
            )}
            
            <div className="flex justify-end">
              <motion.button
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium flex items-center hover:bg-indigo-700 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCloseDialog}
              >
                <span>View Detailed Report</span>
                <ChevronRight className="ml-1 w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default Detect;