import React, { useState, useEffect } from 'react';
import { User, Star, Gift, Package, Settings, LogOut, Edit, Camera, Bell, BellOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Profile: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ username: '', bio: '' });
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    if (user) {
      setEditData({
        username: user.username || '',
        bio: user.bio || ''
      });
    }
  }, [user]);

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

  const handleAvatarUpload = () => {
    alert('Avatar upload feature coming soon!');
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
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
    if (rating >= 4.5) return '💎';
    if (rating >= 3.5) return '✨';
    if (rating >= 2.5) return '📦';
    if (rating >= 1.5) return '💩';
    return '🗑️';
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
              <div className="w-20 h-20 bg-dark-blue-light rounded-full flex items-center justify-center border border-silver/30 overflow-hidden">
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-silver" />
                )}
              </div>
              <button 
                onClick={handleAvatarUpload}
                className="absolute -bottom-1 -right-1 bg-dark-blue border border-silver text-silver rounded-full p-1.5 hover:bg-dark-blue-light transition-colors active:animate-press-down"
              >
                <Camera className="w-3 h-3" />
              </button>
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
                  {user.itemsGiven}
                </p>
                <p className="text-sm text-silver">Boxes Listed</p>
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

        {/* Rating & Rank System */}
        <div className="card-dark p-6">
          <h3 className="font-semibold text-silver-light mb-4">Community Standing</h3>
          
          {/* Current Rating */}
          <div className="flex items-center justify-between mb-4 p-4 bg-dark-blue-light rounded-lg border border-silver/30">
            <div>
              <p className="text-sm text-silver mb-1">Average Box Rating</p>
              <div className="flex items-center space-x-2">
                <span className="text-3xl">{ratingEmoji}</span>
                <span className="text-xl font-bold text-silver-light">{user.rating}</span>
                <span className="text-sm text-silver/60">/ 5.0</span>
              </div>
            </div>
          </div>

          {/* Current Rank Badge */}
          <div className="p-4 bg-gradient-to-r from-dark-blue-light to-dark-blue rounded-lg border border-silver/50 shadow-silver-glow">
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
            <div className="mt-4 p-3 bg-dark-blue rounded-lg border border-silver/30">
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