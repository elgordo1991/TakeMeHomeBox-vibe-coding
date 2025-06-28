import React, { useState, useEffect } from 'react';
import { User, Star, Gift, Package, Settings, LogOut, Edit, Camera, Bell, BellOff, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserListings, updateListingStatus, deleteListing, BoxListing } from '../services/firestore';
import ImageUpload from './ImageUpload';

const Profile: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ username: '', bio: '' });
  const [notifications, setNotifications] = useState(true);
  const [userListings, setUserListings] = useState<BoxListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'taken' | 'expired'>('active');

  useEffect(() => {
    if (user) {
      setEditData({
        username: user.username || '',
        bio: user.bio || ''
      });
      loadUserListings();
    }
  }, [user]);

  const loadUserListings = async () => {
    if (!user) return;
    
    setLoadingListings(true);
    try {
      const listings = await getUserListings(user.id);
      setUserListings(listings);
    } catch (error) {
      console.error('Error loading user listings:', error);
    } finally {
      setLoadingListings(false);
    }
  };

  const handleSave = () => {
    if (user && updateProfile) {
      updateProfile(editData);
    }
    setIsEditing(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditData({
      ...editData,
      [e.target.name]: e.target.value
    });
  };

  const handleAvatarUpload = (imageUrl: string) => {
    if (user && updateProfile) {
      updateProfile({ avatar: imageUrl });
    }
  };

  const handleAvatarRemove = () => {
    if (user && updateProfile) {
      updateProfile({ avatar: '' });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleMarkAsTaken = async (listingId: string) => {
    try {
      await updateListingStatus(listingId, 'taken');
      await loadUserListings(); // Refresh listings
      alert('Listing marked as taken!');
    } catch (error) {
      console.error('Error marking as taken:', error);
      alert('Failed to mark as taken. Please try again.');
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      try {
        await deleteListing(listingId);
        await loadUserListings(); // Refresh listings
        alert('Listing deleted successfully!');
      } catch (error) {
        console.error('Error deleting listing:', error);
        alert('Failed to delete listing. Please try again.');
      }
    }
  };

  // Calculate user rank based on activity
  const calculateRank = () => {
    if (!user) return { emoji: '🆕', title: 'Noob', level: 1 };
    
    const totalActivity = user.itemsGiven + user.itemsTaken;
    
    if (totalActivity >= 50) return { emoji: '💎', title: 'Treasure Hunter', level: 5 };
    if (totalActivity >= 25) return { emoji: '🪙', title: 'Giver', level: 4 };
    if (totalActivity >= 15) return { emoji: '🎒', title: 'Scavenger', level: 3 };
    if (totalActivity >= 5) return { emoji: '🧹', title: 'Forager', level: 2 };
    return { emoji: '🆕', title: 'Noob', level: 1 };
  };

  // Get rating emoji based on average rating
  const getRatingEmoji = (rating: number) => {
    if (rating >= 4.5) return '💎'; // Perfect quality
    if (rating >= 3.5) return '✨'; // Great quality
    if (rating >= 2.5) return '📦'; // Okay quality
    if (rating >= 1.5) return '💩'; // Poor quality
    return '🗑️'; // Trash quality
  };

  const getTimePosted = (createdAt: any) => {
    if (!createdAt) return 'Unknown';
    
    const now = new Date();
    const created = createdAt.toDate();
    const diffMs = now.getTime() - created.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${Math.max(1, diffMinutes)} minute${diffMinutes > 1 ? 's' : ''} ago`;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-deep-blue flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-xl font-bold text-silver-light mb-2">Not Signed In</h2>
          <p className="text-silver">Please sign in to view your profile</p>
        </div>
      </div>
    );
  }

  const rank = calculateRank();
  const ratingEmoji = getRatingEmoji(user.rating);

  const filteredListings = userListings.filter(listing => listing.status === activeTab);

  return (
    <div className="min-h-screen bg-deep-blue">
      {/* Header */}
      <div className="card-dark border-b border-silver/30">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-silver-light">Profile</h1>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn-secondary p-2"
            >
              <Edit className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Info Section */}
        <div className="card-dark p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative">
              <ImageUpload
                currentImage={user.avatar}
                onImageUploaded={handleAvatarUpload}
                onImageRemoved={user.avatar ? handleAvatarRemove : undefined}
                size="lg"
                shape="circle"
                placeholder="Add Photo"
                folder="avatars"
                className="flex-shrink-0"
              />
            </div>
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  name="username"
                  value={editData.username}
                  onChange={handleInputChange}
                  className="text-xl font-bold bg-transparent border-b border-silver/30 text-silver-light focus:outline-none focus:border-silver w-full"
                  placeholder="Enter username"
                />
              ) : (
                <h2 className="text-xl font-bold text-silver-light">
                  {user.username}
                </h2>
              )}
              <div className="flex items-center space-x-2 mt-2">
                <div className="flex items-center space-x-1">
                  <span className="text-2xl">{ratingEmoji}</span>
                  <span className="text-silver font-medium">{user.rating}</span>
                </div>
                <span className="text-silver/60">•</span>
                <div className="flex items-center space-x-1">
                  <span className="text-lg">{rank.emoji}</span>
                  <span className="text-sm text-silver/60">{rank.title}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bio Section */}
          <div className="mb-6">
            <h3 className="font-medium text-silver-light mb-2">About Me</h3>
            {isEditing ? (
              <textarea
                name="bio"
                value={editData.bio}
                onChange={handleInputChange}
                rows={3}
                className="input-dark w-full p-3 rounded-lg resize-none"
                placeholder="Tell the community about yourself..."
              />
            ) : (
              <p className="text-silver">
                {user.bio || 'No bio added yet. Click edit to add one!'}
              </p>
            )}
          </div>

          {/* Save/Cancel buttons */}
          {isEditing && (
            <div className="flex space-x-3">
              <button
                onClick={handleSave}
                className="btn-primary flex-1"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditData({
                    username: user.username || '',
                    bio: user.bio || ''
                  });
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card-dark p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-dark-blue-light p-3 rounded-lg border border-silver/30">
                <span className="text-2xl">📤</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-silver-light">
                  {userListings.length}
                </p>
                <p className="text-sm text-silver">Total Listings</p>
              </div>
            </div>
          </div>
          
          <div className="card-dark p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-dark-blue-light p-3 rounded-lg border border-silver/30">
                <span className="text-2xl">📥</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-silver-light">
                  {user.itemsTaken}
                </p>
                <p className="text-sm text-silver">Boxes Found</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rank & Progress Section */}
        <div className="card-dark p-6">
          <h3 className="font-semibold text-silver-light mb-4">Community Rank</h3>
          
          {/* Current Rank Badge */}
          <div className="p-4 bg-gradient-to-r from-dark-blue-light to-dark-blue rounded-lg border border-silver/50 shadow-silver-glow mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-silver mb-1">Current Rank</p>
                <div className="flex items-center space-x-2">
                  <span className="text-3xl">{rank.emoji}</span>
                  <span className="text-lg font-bold text-silver-light">{rank.title}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-silver/60">Level {rank.level}</p>
                <p className="text-xs text-silver/60">
                  {user.itemsGiven + user.itemsTaken} total activities
                </p>
              </div>
            </div>
          </div>

          {/* Progress to next rank */}
          {rank.level < 5 && (
            <div className="p-3 bg-dark-blue rounded-lg border border-silver/30">
              <p className="text-sm text-silver mb-2">
                Progress to next rank
              </p>
              <div className="w-full bg-dark-blue-light rounded-full h-2">
                <div 
                  className="bg-silver h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(100, ((user.itemsGiven + user.itemsTaken) % 10) * 10)}%` 
                  }}
                ></div>
              </div>
              <p className="text-xs text-silver/60 mt-1">
                {10 - ((user.itemsGiven + user.itemsTaken) % 10)} more activities needed
              </p>
            </div>
          )}
        </div>

        {/* My Listings Section */}
        <div className="card-dark overflow-hidden">
          <div className="p-4 border-b border-silver/30">
            <h3 className="font-semibold text-silver-light flex items-center">
              <Package className="w-5 h-5 mr-2" />
              My Listings
            </h3>
          </div>

          {/* Listing Status Tabs */}
          <div className="flex border-b border-silver/30">
            {[
              { key: 'active', label: 'Active', count: userListings.filter(l => l.status === 'active').length },
              { key: 'taken', label: 'Taken', count: userListings.filter(l => l.status === 'taken').length },
              { key: 'expired', label: 'Expired', count: userListings.filter(l => l.status === 'expired').length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 p-3 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-silver-light bg-dark-blue-light border-b-2 border-silver'
                    : 'text-silver/60 hover:text-silver'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Listings Content */}
          <div className="max-h-96 overflow-y-auto">
            {loadingListings ? (
              <div className="p-6 text-center">
                <div className="w-6 h-6 border-2 border-silver/30 border-t-silver rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-silver text-sm">Loading listings...</p>
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-4xl mb-2">📦</div>
                <p className="text-silver text-sm">
                  {activeTab === 'active' ? 'No active listings' : 
                   activeTab === 'taken' ? 'No taken listings' : 'No expired listings'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-silver/30">
                {filteredListings.map((listing) => (
                  <div key={listing.id} className="p-4">
                    <div className="flex items-start space-x-3">
                      <img
                        src={listing.images[0] || 'https://images.pexels.com/photos/416978/pexels-photo-416978.jpeg?auto=compress&cs=tinysrgb&w=400'}
                        alt={listing.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-silver-light truncate">
                              {listing.title}
                              {listing.isSpotted && (
                                <span className="ml-2 px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full border border-orange-500/30">
                                  Spotted
                                </span>
                              )}
                            </h4>
                            <p className="text-sm text-silver/60 mt-1">
                              {listing.description.length > 50 
                                ? `${listing.description.substring(0, 50)}...`
                                : listing.description
                              }
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-silver/60">
                              <span>{getTimePosted(listing.createdAt)}</span>
                              <span>Rating: {listing.rating ? listing.rating.toFixed(1) : '0.0'}</span>
                              <span>{listing.ratings.length} reviews</span>
                            </div>
                          </div>
                          
                          {/* Action buttons */}
                          {activeTab === 'active' && (
                            <div className="flex space-x-2 ml-2">
                              <button
                                onClick={() => handleMarkAsTaken(listing.id!)}
                                className="btn-secondary text-xs px-2 py-1"
                                title="Mark as taken"
                              >
                                Taken
                              </button>
                              <button
                                onClick={() => handleDeleteListing(listing.id!)}
                                className="text-red-400 hover:text-red-300 p-1"
                                title="Delete listing"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Settings Section */}
        <div className="card-dark overflow-hidden">
          <div className="p-4 border-b border-silver/30">
            <h3 className="font-semibold text-silver-light flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Settings
            </h3>
          </div>
          
          <div className="divide-y divide-silver/30">
            {/* Notifications Toggle */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {notifications ? (
                  <Bell className="w-5 h-5 text-silver" />
                ) : (
                  <BellOff className="w-5 h-5 text-silver/60" />
                )}
                <div>
                  <p className="text-silver font-medium">Notifications</p>
                  <p className="text-sm text-silver/60">Get notified about nearby boxes</p>
                </div>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors active:animate-press-down ${
                  notifications ? 'bg-silver' : 'bg-silver/30'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-dark-blue transition-transform ${
                    notifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Account Info */}
            <div className="p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-silver/60">Email:</span>
                  <span className="text-silver">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-silver/60">Member since:</span>
                  <span className="text-silver">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-silver/60">Last active:</span>
                  <span className="text-silver">
                    {new Date(user.lastActive).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full p-4 flex items-center space-x-3 hover:bg-red-500/10 transition-colors text-red-400 active:animate-press-down"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;