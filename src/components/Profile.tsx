import React, { useState, useEffect } from 'react';
import { User, Star, Gift, Package, Settings, LogOut, Edit, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Profile: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ username: '', bio: '' });

  useEffect(() => {
    if (user) {
      setEditData({
        username: user.username || '',
        bio: user.bio || ''
      });
    }
  }, [user]);

  const handleSave = () => {
    updateProfile(editData);
    setIsEditing(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditData({
      ...editData,
      [e.target.name]: e.target.value
    });
  };

  if (!user) return null;

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
        {/* Profile Card */}
        <div className="card-dark p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-dark-blue-light rounded-full flex items-center justify-center border border-silver/30">
                <User className="w-10 h-10 text-silver" />
              </div>
              {isEditing && (
                <button className="absolute -bottom-1 -right-1 bg-dark-blue border border-silver text-silver rounded-full p-1.5 hover:bg-dark-blue-light transition-colors">
                  <Camera className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  name="username"
                  value={editData.username}
                  onChange={handleInputChange}
                  className="text-xl font-bold bg-transparent border-b border-silver/30 text-silver-light focus:outline-none focus:border-silver"
                />
              ) : (
                <h2 className="text-xl font-bold text-silver-light">
                  {user.username}
                </h2>
              )}
              <div className="flex items-center space-x-1 mt-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-silver">{user.rating}</span>
                <span className="text-silver/60">•</span>
                <span className="text-sm text-silver/60">
                  Community Member
                </span>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="mb-6">
            <h3 className="font-medium text-silver-light mb-2">About</h3>
            {isEditing ? (
              <textarea
                name="bio"
                value={editData.bio}
                onChange={handleInputChange}
                rows={3}
                className="input-dark w-full p-3 rounded-lg resize-none"
                placeholder="Tell us about yourself..."
              />
            ) : (
              <p className="text-silver">
                {user.bio || 'No bio added yet.'}
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
                onClick={() => setIsEditing(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card-dark p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-dark-blue-light p-2 rounded-lg border border-silver/30">
                <Gift className="w-5 h-5 text-silver" />
              </div>
              <div>
                <p className="text-2xl font-bold text-silver-light">
                  {user.itemsGiven}
                </p>
                <p className="text-sm text-silver">Items Given</p>
              </div>
            </div>
          </div>
          
          <div className="card-dark p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-dark-blue-light p-2 rounded-lg border border-silver/30">
                <Package className="w-5 h-5 text-silver" />
              </div>
              <div>
                <p className="text-2xl font-bold text-silver-light">
                  {user.itemsTaken}
                </p>
                <p className="text-sm text-silver">Items Taken</p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="card-dark overflow-hidden">
          <div className="p-4 border-b border-silver/30">
            <h3 className="font-semibold text-silver-light flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Settings
            </h3>
          </div>
          
          <div className="divide-y divide-silver/30">
            {/* Logout */}
            <button
              onClick={logout}
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