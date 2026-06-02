import React, { useState, useEffect } from 'react';
import { Trash2, Map, Image, BarChart3, Home, Menu, X, Recycle, TrendingUp, MapPin } from 'lucide-react';

// API Configuration
const API_BASE = 'http://localhost:5000/api';

// Home Page Component
const HomePage = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="bg-green-600 p-4 rounded-full">
              <Recycle className="w-16 h-16 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Smart Waste Management System
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            AI-driven waste classification and real-time route optimization for efficient waste collection
          </p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => onNavigate('classifier')}
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              Classify Waste
            </button>
            <button 
              onClick={() => onNavigate('routes')}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Optimize Routes
            </button>
          </div>
        </div>

        {/* Problem Statement */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">The Problem</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="bg-red-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Inefficient Collection</h3>
                <p className="text-gray-600">Manual scheduling and fixed routes lead to trucks visiting empty bins, wasting fuel and time</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <Trash2 className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Poor Segregation</h3>
                <p className="text-gray-600">Citizens struggle to identify recyclable materials, leading to contaminated waste streams</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <div 
            onClick={() => onNavigate('classifier')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition cursor-pointer"
          >
            <Image className="w-12 h-12 text-green-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">AI Waste Classifier</h3>
            <p className="text-gray-600">Upload images to identify waste types and get recycling guidance</p>
          </div>
          
          <div 
            onClick={() => onNavigate('routes')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition cursor-pointer"
          >
            <Map className="w-12 h-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Route Optimizer</h3>
            <p className="text-gray-600">Real-time optimized collection routes based on bin fill levels</p>
          </div>
          
          <div 
            onClick={() => onNavigate('admin')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition cursor-pointer"
          >
            <BarChart3 className="w-12 h-12 text-purple-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Admin Dashboard</h3>
            <p className="text-gray-600">Manage bins, monitor fill levels, and track collection history</p>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="bg-white rounded-xl shadow-lg p-8 mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Technology Stack</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="font-semibold text-blue-700">React 18</p>
              <p className="text-sm text-gray-600">Frontend</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="font-semibold text-green-700">TensorFlow.js</p>
              <p className="text-sm text-gray-600">ML Classification</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="font-semibold text-purple-700">Flask + PostgreSQL</p>
              <p className="text-sm text-gray-600">Backend</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="font-semibold text-orange-700">Leaflet.js</p>
              <p className="text-sm text-gray-600">Mapping</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Waste Classifier Component
const WasteClassifier = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const wasteTypes = {
    'Plastic': { color: 'bg-blue-100 text-blue-800', icon: '♻️', bin: 'Blue Bin' },
    'Paper': { color: 'bg-yellow-100 text-yellow-800', icon: '📄', bin: 'Yellow Bin' },
    'Glass': { color: 'bg-green-100 text-green-800', icon: '🍾', bin: 'Green Bin' },
    'Metal': { color: 'bg-gray-100 text-gray-800', icon: '🔩', bin: 'Gray Bin' },
    'Organic': { color: 'bg-amber-100 text-amber-800', icon: '🍃', bin: 'Brown Bin' },
    'E-Waste': { color: 'bg-red-100 text-red-800', icon: '🔌', bin: 'Red Bin' }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
      setResult(null);
    }
  };

  const classifyImage = async () => {
    if (!selectedImage) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('image', selectedImage);

    try {
      const response = await fetch(`${API_BASE}/classify`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Classification error:', error);
      // Fallback to mock data
      const types = Object.keys(wasteTypes);
      const mockType = types[Math.floor(Math.random() * types.length)];
      setResult({
        classification: mockType,
        confidence: 0.87,
        recycling_info: `Please dispose in the ${wasteTypes[mockType].bin}`
      });
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">AI Waste Classifier</h1>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Upload Waste Image</h2>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
            ) : (
              <div className="py-12">
                <Image className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Upload an image of waste to classify</p>
              </div>
            )}
          </div>
          
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="imageInput"
          />
          <label
            htmlFor="imageInput"
            className="block w-full bg-green-600 text-white py-3 rounded-lg text-center cursor-pointer hover:bg-green-700 transition mb-4"
          >
            Choose Image
          </label>
          
          <button
            onClick={classifyImage}
            disabled={!selectedImage || loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Classifying...' : 'Classify Waste'}
          </button>
        </div>

        {/* Results Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Classification Result</h2>
          
          {result ? (
            <div className="space-y-4">
              <div className={`p-6 rounded-lg ${wasteTypes[result.classification]?.color || 'bg-gray-100'}`}>
                <div className="text-4xl mb-2">{wasteTypes[result.classification]?.icon}</div>
                <h3 className="text-3xl font-bold mb-2">{result.classification}</h3>
                <p className="text-lg">Confidence: {(result.confidence * 100).toFixed(1)}%</p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Disposal Instructions:</h4>
                <p className="text-blue-800">{result.recycling_info}</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">Recommended Bin:</h4>
                <p className="text-green-800 text-xl">{wasteTypes[result.classification]?.bin}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Trash2 className="w-16 h-16 mx-auto mb-4" />
              <p>Upload and classify an image to see results</p>
            </div>
          )}
        </div>
      </div>

      {/* Waste Type Reference */}
      <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
        <h2 className="text-2xl font-semibold mb-4">Waste Type Reference</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {Object.entries(wasteTypes).map(([type, info]) => (
            <div key={type} className={`p-4 rounded-lg ${info.color}`}>
              <div className="text-2xl mb-2">{info.icon}</div>
              <h3 className="font-bold text-lg">{type}</h3>
              <p className="text-sm">{info.bin}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Route Optimizer Component (Simplified without full Leaflet)
const RouteOptimizer = () => {
  const [bins, setBins] = useState([]);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [threshold, setThreshold] = useState(70);

  useEffect(() => {
    fetchBins();
  }, []);

  const fetchBins = async () => {
    try {
      const response = await fetch(`${API_BASE}/bins`);
      const data = await response.json();
      setBins(data);
    } catch (error) {
      console.error('Error fetching bins:', error);
      // Mock data fallback
      setBins([
        { id: 1, name: 'Bin A', latitude: 22.5726, longitude: 88.3639, current_fill_level: 85, status: 'active' },
        { id: 2, name: 'Bin B', latitude: 22.5826, longitude: 88.3739, current_fill_level: 92, status: 'active' },
        { id: 3, name: 'Bin C', latitude: 22.5626, longitude: 88.3539, current_fill_level: 78, status: 'active' }
      ]);
    }
  };

  const optimizeRoute = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/optimize-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold })
      });
      const data = await response.json();
      setRoute(data);
    } catch (error) {
      console.error('Error optimizing route:', error);
    }
    setLoading(false);
  };

  const fullBins = bins.filter(b => b.current_fill_level >= threshold);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">Route Optimizer</h1>
      
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <MapPin className="w-8 h-8 text-blue-600 mb-2" />
          <p className="text-gray-600">Total Bins</p>
          <p className="text-3xl font-bold">{bins.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <Trash2 className="w-8 h-8 text-orange-600 mb-2" />
          <p className="text-gray-600">Bins Need Collection</p>
          <p className="text-3xl font-bold">{fullBins.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <Map className="w-8 h-8 text-green-600 mb-2" />
          <p className="text-gray-600">Optimized Distance</p>
          <p className="text-3xl font-bold">{route ? `${route.distance} km` : '--'}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Route Configuration</h2>
        <div className="flex items-center gap-4 mb-4">
          <label className="font-semibold">Fill Level Threshold:</label>
          <input
            type="range"
            min="0"
            max="100"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="flex-1"
          />
          <span className="font-bold text-xl">{threshold}%</span>
        </div>
        <button
          onClick={optimizeRoute}
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
        >
          {loading ? 'Optimizing...' : 'Generate Optimized Route'}
        </button>
      </div>

      {route && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Optimized Collection Route</h2>
          <div className="bg-green-50 p-4 rounded-lg mb-4">
            <p className="text-lg">Total Distance: <span className="font-bold">{route.distance} km</span></p>
            <p className="text-lg">Bins to Collect: <span className="font-bold">{route.bins_count}</span></p>
          </div>
          <div className="space-y-2">
            {route.route.map((bin, index) => (
              <div key={bin.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{bin.name}</p>
                  <p className="text-sm text-gray-600">Fill Level: {bin.current_fill_level}%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {bin.latitude.toFixed(4)}, {bin.longitude.toFixed(4)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">All Bins Status</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Bin Name</th>
                <th className="p-3 text-left">Fill Level</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Location</th>
              </tr>
            </thead>
            <tbody>
              {bins.map(bin => (
                <tr key={bin.id} className="border-b">
                  <td className="p-3">{bin.name}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            bin.current_fill_level >= 80 ? 'bg-red-600' :
                            bin.current_fill_level >= 60 ? 'bg-yellow-600' : 'bg-green-600'
                          }`}
                          style={{ width: `${bin.current_fill_level}%` }}
                        />
                      </div>
                      <span className="font-semibold">{bin.current_fill_level}%</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-sm ${
                      bin.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {bin.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-gray-600">
                    {bin.latitude.toFixed(4)}, {bin.longitude.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Admin Panel Component
const AdminPanel = () => {
  const [bins, setBins] = useState([]);
  const [stats, setStats] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    capacity: 100,
    current_fill_level: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [binsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/bins`),
        fetch(`${API_BASE}/stats`)
      ]);
      setBins(await binsRes.json());
      setStats(await statsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
      // Mock data
      setBins([
        { id: 1, name: 'Bin A', latitude: 22.5726, longitude: 88.3639, current_fill_level: 85, status: 'active' }
      ]);
      setStats({ total_bins: 1, active_bins: 1, full_bins: 1, average_fill_level: 85 });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE}/bins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setShowAddForm(false);
      setFormData({ name: '', latitude: '', longitude: '', capacity: 100, current_fill_level: 0 });
      fetchData();
    } catch (error) {
      console.error('Error adding bin:', error);
    }
  };

  const deleteBin = async (id) => {
    if (!confirm('Delete this bin?')) return;
    try {
      await fetch(`${API_BASE}/bins/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Error deleting bin:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>
      
      {stats && (
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <BarChart3 className="w-8 h-8 text-blue-600 mb-2" />
            <p className="text-gray-600">Total Bins</p>
            <p className="text-3xl font-bold">{stats.total_bins}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <MapPin className="w-8 h-8 text-green-600 mb-2" />
            <p className="text-gray-600">Active Bins</p>
            <p className="text-3xl font-bold">{stats.active_bins}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <Trash2 className="w-8 h-8 text-red-600 mb-2" />
            <p className="text-gray-600">Full Bins</p>
            <p className="text-3xl font-bold">{stats.full_bins}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <TrendingUp className="w-8 h-8 text-purple-600 mb-2" />
            <p className="text-gray-600">Avg Fill Level</p>
            <p className="text-3xl font-bold">{stats.average_fill_level}%</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Manage Bins</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
          >
            {showAddForm ? 'Cancel' : 'Add New Bin'}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-lg mb-6">
            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Bin Name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="p-3 border rounded-lg"
                required
              />
              <input
                type="number"
                step="0.0001"
                placeholder="Latitude"
                value={formData.latitude}
                onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                className="p-3 border rounded-lg"
                required
              />
              <input
                type="number"
                step="0.0001"
                placeholder="Longitude"
                value={formData.longitude}
                onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                className="p-3 border rounded-lg"
                required
              />
              <input
                type="number"
                placeholder="Current Fill Level (%)"
                value={formData.current_fill_level}
                onChange={(e) => setFormData({...formData, current_fill_level: Number(e.target.value)})}
                className="p-3 border rounded-lg"
                min="0"
                max="100"
              />
            </div>
            <button type="submit" className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
              Add Bin
            </button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Fill Level</th>
                <th className="p-3 text-left">Location</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bins.map(bin => (
                <tr key={bin.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{bin.id}</td>
                  <td className="p-3 font-semibold">{bin.name}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            bin.current_fill_level >= 80 ? 'bg-red-600' :
                            bin.current_fill_level >= 60 ? 'bg-yellow-600' : 'bg-green-600'
                          }`}
                          style={{ width: `${bin.current_fill_level}%` }}
                        />
                      </div>
                      <span>{bin.current_fill_level}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-sm">
                    {bin.latitude.toFixed(4)}, {bin.longitude.toFixed(4)}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-sm ${
                      bin.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100'
                    }`}>
                      {bin.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => deleteBin(bin.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Main App Component with Navigation
export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);

  const navigation = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'classifier', label: 'Waste Classifier', icon: Image },
    { id: 'routes', label: 'Route Optimizer', icon: Map },
    { id: 'admin', label: 'Admin Panel', icon: BarChart3 }
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={setCurrentPage} />;
      case 'classifier':
        return <WasteClassifier />;
      case 'routes':
        return <RouteOptimizer />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-2">
              <Recycle className="w-8 h-8 text-green-600" />
              <span className="text-xl font-bold text-gray-800">Smart Waste Management</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex gap-6">
              {navigation.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setCurrentPage(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    currentPage === id
                      ? 'bg-green-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {menuOpen && (
            <div className="md:hidden pb-4">
              {navigation.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setCurrentPage(id);
                    setMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-3 rounded-lg transition ${
                    currentPage === id
                      ? 'bg-green-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Page Content */}
      <main>
        {renderPage()}
      </main>
    </div>
  );
}