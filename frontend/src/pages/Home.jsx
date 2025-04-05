import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  Image, 
  Gauge, 
  BarChart4, 
  Upload,
  Search,
  FileCheck,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Check
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Sample pothole image (replace with actual image URL in production)
const potholeImage = "https://www.shutterstock.com/image-photo/pothole-deep-filled-rainwater-traffic-260nw-2430169503.jpg";

function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  // Sample data for charts
  const monthlyStats = [
    { name: 'Jan', potholes: 245, repairs: 180 },
    { name: 'Feb', potholes: 380, repairs: 230 },
    { name: 'Mar', potholes: 420, repairs: 340 },
    { name: 'Apr', potholes: 520, repairs: 410 },
    { name: 'May', potholes: 350, repairs: 320 },
    { name: 'Jun', potholes: 290, repairs: 260 }
  ];

  const severityData = [
    { name: 'Low', value: 45 },
    { name: 'Medium', value: 30 },
    { name: 'High', value: 15 },
    { name: 'Critical', value: 10 }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const features = [
    {
      title: "Multi-Modal Detection",
      description: "Process both images and videos of road surfaces for comprehensive pothole detection.",
      icon: <Image className="w-10 h-10" />,
      color: 'bg-indigo-950'
    },
    {
      title: "Advanced AI Technology",
      description: "State-of-the-art machine learning models for accurate pothole identification.",
      icon: <Gauge className="w-10 h-10" />,
      color: 'bg-red-700'
    },
    {
      title: "Detailed Analysis",
      description: "Comprehensive insights including dimensions, severity, and volume calculations.",
      icon: <BarChart4 className="w-10 h-10" />,
      color: 'bg-blue-700'
    }
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const tabs = ['Overview', 'Statistics', 'Impact'];

  return (
    <div className="min-h-screen bg-indigo-50/30">
      {/* Hero Section with 3D/Glassmorphism Style */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-950 to-blue-900">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-40 w-80 h-80 bg-purple-600/30 rounded-full filter blur-3xl animate-blob"></div>
          <div className="absolute top-0 -right-40 w-80 h-80 bg-blue-600/30 rounded-full filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-0 left-20 w-80 h-80 bg-indigo-600/30 rounded-full filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              className="text-white"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                Smart <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Pothole</span> Detection
              </h1>
              <p className="text-xl md:text-2xl mb-10 opacity-90 leading-relaxed">
                Revolutionizing road maintenance with AI-powered detection and analysis of potholes.
              </p>
              <div className="flex flex-wrap gap-4">
                <motion.button
                  className="bg-white text-indigo-950 px-8 py-4 rounded-full text-lg font-semibold transition-all flex items-center gap-2 group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(user ? '/detect' : '/login')}
                >
                  {user ? 'Start Detection' : 'Get Started'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
                <motion.button
                  className="border-2 border-white/70 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white/10 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Watch Demo
                </motion.button>
              </div>
              
              {/* Quick stats in glassmorphism cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16">
                <motion.div 
                  className="backdrop-blur-md bg-white/10 p-4 rounded-2xl border border-white/20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-4xl font-bold">95%</p>
                  <p className="text-sm opacity-80">Detection Accuracy</p>
                </motion.div>
                <motion.div 
                  className="backdrop-blur-md bg-white/10 p-4 rounded-2xl border border-white/20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <p className="text-4xl font-bold">2.5s</p>
                  <p className="text-sm opacity-80">Processing Time</p>
                </motion.div>
                <motion.div 
                  className="backdrop-blur-md bg-white/10 p-4 rounded-2xl border border-white/20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <p className="text-4xl font-bold">87%</p>
                  <p className="text-sm opacity-80">Cost Reduction</p>
                </motion.div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden lg:block"
            >
              {/* 3D-like visualization */}
              <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-3xl blur opacity-30"></div>
                <div className="relative bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                  <img 
                    src={potholeImage} 
                    alt="Pothole Detection" 
                    className="w-full h-[440px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                    <div className="p-6 text-white">
                      <p className="text-sm font-semibold">Detection in Progress</p>
                      <div className="w-full h-2 bg-white/20 rounded-full mt-2">
                        <div className="h-full w-3/4 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/80"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <p className="text-sm mb-2">Scroll to explore</p>
          <div className="w-0.5 h-10 bg-white/50 mx-auto"></div>
        </motion.div>
      </div>

      {/* Interactive Data Visualization Section */}
      <div className="container mx-auto px-6 py-24">
        <motion.div 
          className="mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold text-center text-indigo-950 mb-4">
            Pothole Analytics Dashboard
          </h2>
          <p className="text-gray-600 text-center max-w-3xl mx-auto">
            Our system provides comprehensive insights through advanced data visualization, 
            helping authorities make informed decisions about road maintenance.
          </p>
        </motion.div>
        
        {/* Tabs for different charts */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-16">
          <div className="flex border-b">
            {tabs.map((tab, index) => (
              <button
                key={index}
                className={`flex-1 py-4 font-medium text-lg transition-all ${
                  activeTab === index 
                    ? 'text-indigo-600 border-b-2 border-indigo-600' 
                    : 'text-gray-500 hover:text-indigo-600'
                }`}
                onClick={() => setActiveTab(index)}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="p-6">
            {activeTab === 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="h-80">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Monthly Detection Trends</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={monthlyStats}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" stroke="#888" />
                      <YAxis stroke="#888" />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="potholes" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="repairs" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-80">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Pothole Severity Distribution</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {severityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {activeTab === 1 && (
              <div className="h-80">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Detection vs Repair Rate</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyStats}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="potholes" name="Detected" fill="#8884d8" />
                    <Bar dataKey="repairs" name="Repaired" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {activeTab === 2 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-indigo-50 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-indigo-900 mb-2">Financial Impact</h3>
                  <p className="text-4xl font-bold text-indigo-600">$3B</p>
                  <p className="text-gray-600">Annual cost in vehicle damages</p>
                  <div className="mt-4 flex items-center text-green-600">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    <span className="text-sm">35% increase over 5 years</span>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-blue-900 mb-2">Safety Incidents</h3>
                  <p className="text-4xl font-bold text-blue-600">2,000+</p>
                  <p className="text-gray-600">Accidents caused in 2023</p>
                  <div className="mt-4 h-2 bg-blue-200 rounded-full">
                    <div className="h-full w-3/4 bg-blue-600 rounded-full"></div>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-purple-900 mb-2">AI Impact</h3>
                  <p className="text-4xl font-bold text-purple-600">68%</p>
                  <p className="text-gray-600">Faster response time</p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">Efficiency</span>
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">Cost Saving</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Section with 3D Cards */}
      <div className="py-24 bg-gradient-to-b from-white to-indigo-50">
        <div className="container mx-auto px-6">
          <motion.h2 
            className="text-4xl font-bold text-center text-indigo-950 mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Advanced Features
          </motion.h2>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-10"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                variants={item}
                className="relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-50 group-hover:opacity-75 transition duration-300"></div>
                <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 group-hover:-translate-y-2 h-full flex flex-col">
                  <div className="p-8">
                    <div className={`${feature.color} text-white rounded-full w-16 h-16 flex items-center justify-center mb-6 mx-auto shadow-lg`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold text-indigo-950 mb-4 text-center">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed text-center">
                      {feature.description}
                    </p>
                  </div>
                  <div className="mt-auto p-4 text-center">
                    <button className="text-indigo-600 font-medium hover:text-indigo-800 flex items-center justify-center mx-auto gap-1 group-hover:gap-2 transition-all">
                      Learn more <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* How It Works Section - Timeline Style */}
      <div className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <motion.h2 
            className="text-4xl font-bold text-center text-indigo-950 mb-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            How It Works
          </motion.h2>
          
          <p className="text-gray-600 text-center max-w-3xl mx-auto mb-16">
            Our intelligent system simplifies the complex process of pothole detection
            and analysis through an intuitive three-step workflow.
          </p>
          
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-indigo-100"></div>
            
            {/* Step 1 */}
            <motion.div 
              className="relative mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center justify-center mb-4">
                <div className="bg-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl z-10">1</div>
              </div>
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-8 shadow-lg max-w-2xl mx-auto">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="bg-white rounded-xl p-4 shadow-md">
                    <Upload className="w-12 h-12 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-indigo-800 mb-2">Upload Media</h3>
                    <p className="text-gray-600">
                      Simply upload your road surface images or videos through our intuitive drag-and-drop interface. 
                      We support multiple file formats including JPG, PNG, MP4, and more.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Step 2 */}
            <motion.div 
              className="relative mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="flex items-center justify-center mb-4">
                <div className="bg-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl z-10">2</div>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 shadow-lg max-w-2xl mx-auto">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="bg-white rounded-xl p-4 shadow-md">
                    <Search className="w-12 h-12 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-blue-800 mb-2">AI Analysis</h3>
                    <p className="text-gray-600">
                      Our advanced AI system automatically processes your media, identifying potholes 
                      with precise measurements and severity classifications in real-time.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Step 3 */}
            <motion.div 
              className="relative"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="flex items-center justify-center mb-4">
                <div className="bg-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl z-10">3</div>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-8 shadow-lg max-w-2xl mx-auto">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="bg-white rounded-xl p-4 shadow-md">
                    <FileCheck className="w-12 h-12 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-purple-800 mb-2">Comprehensive Results</h3>
                    <p className="text-gray-600">
                      View detailed analysis including dimensions, severity levels, volume calculations, 
                      and actionable insights for prioritizing repairs and maintenance.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-24 bg-indigo-950 text-white">
        <div className="container mx-auto px-6">
          <motion.h2 
            className="text-4xl font-bold text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Trusted by Road Authorities
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              className="backdrop-blur-md bg-white/5 p-8 rounded-2xl border border-white/10"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center mr-4 font-bold">JD</div>
                <div>
                  <p className="font-semibold">John Doe</p>
                  <p className="text-indigo-300 text-sm">City Transportation Director</p>
                </div>
              </div>
              <p className="italic text-indigo-100">
                "This AI system has transformed how we approach road maintenance. We've reduced response times by 65% and saved millions in our annual budget."
              </p>
            </motion.div>
            
            <motion.div 
              className="backdrop-blur-md bg-white/5 p-8 rounded-2xl border border-white/10"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center mr-4 font-bold">SM</div>
                <div>
                  <p className="font-semibold">Sarah Miller</p>
                  <p className="text-indigo-300 text-sm">Highway Maintenance Manager</p>
                </div>
              </div>
              <p className="italic text-indigo-100">
                "The precision of the detection system is remarkable. We're now able to prioritize repairs based on accurate severity assessments, making our roads safer."
              </p>
            </motion.div>
            
            <motion.div 
              className="backdrop-blur-md bg-white/5 p-8 rounded-2xl border border-white/10"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center mr-4 font-bold">RJ</div>
                <div>
                  <p className="font-semibold">Robert Johnson</p>
                  <p className="text-indigo-300 text-sm">Urban Planning Director</p>
                </div>
              </div>
              <p className="italic text-indigo-100">
                "The data insights we gain from this platform have completely changed our approach to infrastructure planning. It's not just detection – it's predictive maintenance."
              </p>
            </motion.div>
          </div>
        </div>
      </div>
        
      {/* Call to Action */}
      <div className="container mx-auto px-6 py-24">
        <motion.div 
          className="relative rounded-3xl overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
          
          {/* Decorative elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                <path d="M0,0 L100,0 L100,100 L0,100 Z" fill="url(#grid-pattern)" opacity="0.1"></path>
              </svg>
              <svg width="0" height="0">
                <defs>
                  <pattern id="grid-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"></path>
                  </pattern>
                </defs>
              </svg>
            </div>
          </div>
          
          {/* Content */}
          <div className="relative p-16 text-center text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Transform Road Maintenance?</h2>
            <p className="text-lg md:text-xl mb-8">
              Join us in revolutionizing road maintenance with cutting-edge AI technology. 
              Take the first step towards safer and more efficient roads today.
            </p>
            <div className="flex justify-center gap-4">
              <motion.button
                className="bg-white text-indigo-950 px-8 py-4 rounded-full text-lg font-semibold transition-all flex items-center gap-2 group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(user ? '/detect' : '/signup')}
              >
                {user ? 'Start Now' : 'Sign Up'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              <motion.button
                className="border-2 border-white/70 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white/10 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/contact')}
              >
                Contact Us
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Home;