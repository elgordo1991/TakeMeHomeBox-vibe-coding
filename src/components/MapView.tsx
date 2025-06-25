import React, { useState } from 'react';
import { Search, Filter, MapPin, Clock, Star, Camera, MessageCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface BoxListing {
  id: string;
  title: string;
  description: string;
  category: string;
  distance: string;
  timePosted: string;
  rating: number;
  image: string;
  location: { lat: number; lng: number };
  isSpotted?: boolean;
}

const MapView: React.FC = () => {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBox, setSelectedBox] = useState<BoxListing | null>(null);

  const categories = [
    { id: 'all', name: 'All', color: 'bg-gray-100 text-gray-700' },
    { id: 'books', name: 'Books', color: 'bg-blue-100 text-blue-700' },
    { id: 'clothes', name: 'Clothes', color: 'bg-purple-100 text-purple-700' },
    { id: 'toys', name: 'Toys', color: 'bg-pink-100 text-pink-700' },
    { id: 'kitchen', name: 'Kitchen', color: 'bg-orange-100 text-orange-700' },
    { id: 'electronics', name: 'Electronics', color: 'bg-green-100 text-green-700' },
  ];

  const mockBoxes: BoxListing[] = [
    {
      id: '1',
      title: 'Kitchen Essentials',
      description: 'Mugs, plates, old kettle, and some utensils',
      category: 'kitchen',
      distance: '0.3 km',
      timePosted: '2 hours ago',
      rating: 4.8,
      image: 'https://images.pexels.com/photos/4099354/pexels-photo-4099354.jpeg?auto=compress&cs=tinysrgb&w=400',
      location: { lat: 51.505, lng: -0.09 }
    },
    {
      id: '2',
      title: 'Children\'s Books',
      description: 'Collection of picture books and early readers',
      category: 'books',
      distance: '0.7 km',
      timePosted: '4 hours ago',
      rating: 5.0,
      image: 'https://images.pexels.com/photos/1907785/pexels-photo-1907785.jpeg?auto=compress&cs=tinysrgb&w=400',
      location: { lat: 51.507, lng: -0.087 }
    },
    {
      id: '3',
      title: 'Winter Clothes',
      description: 'Coats, sweaters, and scarves - various sizes',
      category: 'clothes',
      distance: '1.2 km',
      timePosted: '6 hours ago',
      rating: 4.5,
      image: 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=400',
      location: { lat: 51.503, lng: -0.085 },
      isSpotted: true
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Nearby Boxes
          </h1>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for items..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Categories */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  selectedCategory === category.id
                    ? 'bg-primary-500 text-white'
                    : `${category.color} dark:bg-gray-700 dark:text-gray-300`
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map placeholder */}
      <div className="h-64 bg-gradient-to-br from-primary-100 to-earth-100 dark:from-gray-700 dark:to-gray-600 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-primary-500 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-300">Interactive Map View</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Google Maps integration would go here
            </p>
          </div>
        </div>
        
        {/* Mock map pins */}
        {mockBoxes.map((box, index) => (
          <button
            key={box.id}
            onClick={() => setSelectedBox(box)}
            className={`absolute w-8 h-8 bg-primary-500 rounded-full border-2 border-white shadow-lg transform hover:scale-110 transition-transform ${
              box.isSpotted ? 'bg-orange-500' : 'bg-primary-500'
            }`}
            style={{
              left: `${30 + index * 25}%`,
              top: `${40 + index * 15}%`
            }}
          >
            <MapPin className="w-4 h-4 text-white mx-auto" />
          </button>
        ))}
      </div>

      {/* Listings */}
      <div className="p-4 space-y-4">
        {mockBoxes.map((box) => (
          <div
            key={box.id}
            onClick={() => setSelectedBox(box)}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex">
              <img
                src={box.image}
                alt={box.title}
                className="w-24 h-24 object-cover"
              />
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {box.title}
                    {box.isSpotted && (
                      <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                        Spotted
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {box.rating}
                    </span>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                  {box.description}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {box.distance}
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {box.timePosted}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Box Detail Modal */}
      {selectedBox && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl w-full max-w-md max-h-[80vh] overflow-y-auto animate-slide-up">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedBox.title}
                </h2>
                <button
                  onClick={() => setSelectedBox(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              
              <img
                src={selectedBox.image}
                alt={selectedBox.title}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {selectedBox.description}
              </p>
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <MapPin className="w-4 h-4 mr-1" />
                    {selectedBox.distance}
                  </span>
                  <span className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4 mr-1" />
                    {selectedBox.timePosted}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedBox.rating}
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button className="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2">
                  <MessageCircle className="w-4 h-4" />
                  <span>Comment</span>
                </button>
                <button className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2">
                  <Camera className="w-4 h-4" />
                  <span>Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;