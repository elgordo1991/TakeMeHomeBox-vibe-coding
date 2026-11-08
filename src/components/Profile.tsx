import React, { useState, useEffect } from 'react';
import { User, Star, Gift, Package, Settings, LogOut, Edit, Camera, Bell, BellOff, Trash2, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserListings, updateListingStatus, deleteListing, BoxListing } from '../services/firestore';
import ImageUpload from './ImageUpload';
import { timeAgo } from '../utils/dates';
import { ratingSummary } from '../utils/rating';

const Profile: React.FC = () => {
  const { user, logout, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ username: '', bio: '' });
  const [notifications, setNotifications] = useState(true);
  const [userListings, setUserListings] = useState<BoxListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'expired'>('active');
  const [showDetails, setShowDetails] = useState(false);

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
      const listings = await getUserListings(user.uid);
      setUserListings(listings);
    } catch (error) {
      console.error('Error loading user listings:', error);
    } finally {
      setLoadingListings(false);
    }
  };

  const handleSave = async () => {
    if (user && updateProfile) {
      try {
        await updateProfile(editData);
        setIsEditing(false);
      } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile. Please try again.');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditData({
      ...editData,
      [e.target.name]: e.target.value
    });
  };

  const handleAvatarUpload = async (imageUrl: string) => {
    if (user && updateProfile) {
      try {
        await updateProfile({ avatar: imageUrl });
      } catch (error) {
        console.error('Error updating avatar:', error);
        alert('Failed to update avatar. Please try again.');
      }
    }
  };

  const handleAvatarRemove = async () => {
    if (user && updateProfile) {
      try {
        await updateProfile({ avatar: '' });
      } catch (error) {
        console.error('Error removing avatar:', error);
        alert('Failed to remove avatar. Please try again.');
      }
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
    } catch (error) {
      console.error('Error marking as taken:', error);
      alert('Failed to mark as taken. Please try again.');
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) return;

    // Remove it from the list straight away
    setUserListings((prev) => prev.filter((l) => l.id !== listingId));
    try {
      await deleteListing(listingId);
    } catch (error) {
      console.error('Error deleting listing:', error);
      // Re-check: if it's already gone, the delete did what was wanted.
      const fresh = await getUserListings(user!.uid);
      setUserListings(fresh);
      if (fresh.some((l) => l.id === listingId)) {
        alert('Failed to delete listing. Please try again.');
      }
    }
  };

  // ✅ UPDATED: Calculate user rank based on total activity
  const calculateRank = () => {
    if (!user) return { emoji: '🆕', title: 'Noob', level: 1 };
    
    // Calculate total activity from both itemsGiven and itemsTaken
    const totalActivity = (user.itemsGiven || 0) + (user.itemsTaken || 0);
    
    // Updated rank thresholds and titles
    if (totalActivity >= 50) return { emoji: '💎', title: 'Treasure Hunter', level: 5 };
    if (totalActivity >= 25) return { emoji: '🪙', title: 'Giver', level: 4 };
    if (totalActivity >= 15) return { emoji: '🎒', title: 'Scavenger', level: 3 };
    if (totalActivity >= 5) return { emoji: '🧹', title: 'Forager', level: 2 };
    return { emoji: '🆕', title: 'Noob', level: 1 };
  };

  // ✅ NEW: Calculate progress to next rank
  const calculateProgress = () => {
    if (!user) return { current: 0, next: 5, progress: 0, isMaxLevel: false };
    
    const totalActivity = (user.itemsGiven || 0) + (user.itemsTaken || 0);
    const levelThresholds = [5, 15, 25, 50]; // Level thresholds
    
    // Find the next level threshold
    const nextThreshold = levelThresholds.find(threshold => totalActivity < threshold);
    
    if (!nextThreshold) {
      // User is at max level
      return {
        current: totalActivity,
        next: 50,
        progress: 100,
        isMaxLevel: true
      };
    }
    
    // Find current level threshold
    const currentThresholdIndex = levelThresholds.indexOf(nextThreshold) - 1;
    const currentThreshold = currentThresholdIndex >= 0 ? levelThresholds[currentThresholdIndex] : 0;
    
    // Calculate progress within current level
    const progressInLevel = totalActivity - currentThreshold;
    const levelRange = nextThreshold - currentThreshold;
    const progressPercentage = (progressInLevel / levelRange) * 100;
    
    return {
      current: totalActivity,
      next: nextThreshold,
      progress: Math.min(progressPercentage, 100),
      isMaxLevel: false,
      activitiesNeeded: nextThreshold - totalActivity
    };
  };

  const getTimePosted = (createdAt: unknown) => timeAgo(createdAt);

  // ✅ NEW: Format date helper function
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Unknown';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-xl font-bold text-ink mb-2">Not Signed In</h2>
          <p className="text-muted">Please sign in to view your profile</p>
        </div>
      </div>
    );
  }

  const rank = calculateRank();
  const progress = calculateProgress();
  const totalActivity = (user.itemsGiven || 0) + (user.itemsTaken || 0);

  // ✅ UPDATED: Improved filtering logic as requested
  const filteredListings = userListings.filter(listing => {
    if (activeTab === 'active') return listing.status === 'active';
    if (activeTab === 'expired') return listing.status === 'expired';
    return false; // Fallback - should never reach here with current tabs
  });

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
        <div className="px-4 pb-4 pt-5">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl">Profile</h1>
            <button
              onClick={() => setIsEditing(!isEditing)}
              aria-label="Edit profile"
              className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-soft transition active:scale-95 ${isEditing ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-ink'}`}
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
                  className="w-full border-b-2 border-line bg-transparent text-2xl font-black text-ink focus:border-accent focus:outline-none"
                  placeholder="Enter username"
                />
              ) : (
                <h2 className="text-2xl font-black">
                  {user.username}
                </h2>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1">
                  <span className="text-base">{rank.emoji}</span>
                  <span className="text-sm font-bold text-accent-dark">{rank.title}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bio Section */}
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-subtle">About Me</h3>
            {isEditing ? (
              <textarea
                name="bio"
                value={editData.bio}
                onChange={handleInputChange}
                rows={3}
                className="input-dark w-full p-3 resize-none"
                placeholder="Tell the community about yourself..."
              />
            ) : (
              <p className="text-muted">
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

        {/* ✅ UPDATED: Enhanced Stats Summary with Total Activity */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card-dark flex flex-col items-center p-4 text-center">
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft">
              <span className="text-xl">📤</span>
            </div>
            <p className="text-2xl font-black text-ink">
              {user.itemsGiven || 0}
            </p>
            <p className="text-xs font-semibold text-muted">Items Given</p>
          </div>
          
          <div className="card-dark flex flex-col items-center p-4 text-center">
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft">
              <span className="text-xl">📥</span>
            </div>
            <p className="text-2xl font-black text-ink">
              {user.itemsTaken || 0}
            </p>
            <p className="text-xs font-semibold text-muted">Items Found</p>
          </div>

          <div className="card-dark flex flex-col items-center p-4 text-center">
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft">
              <span className="text-xl">🏆</span>
            </div>
            <p className="text-2xl font-black text-ink">
              {totalActivity}
            </p>
            <p className="text-xs font-semibold text-muted">Total Activity</p>
          </div>
        </div>

        {/* ✅ UPDATED: Enhanced Rank & Progress Section */}
        <div className="card-dark p-6">
          <h3 className="mb-4 text-lg font-extrabold">Community Rank</h3>
          
          {/* Current Rank Badge */}
          <div className="mb-4 rounded-3xl bg-gradient-to-br from-accent to-accent-dark p-5 text-white shadow-accent">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm font-semibold text-white/80">Current Rank</p>
                <div className="flex items-center space-x-2">
                  <span className="text-3xl">{rank.emoji}</span>
                  <span className="text-xl font-black text-white">{rank.title}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">Level {rank.level}</p>
                <p className="text-xs text-white/80">
                  {totalActivity} total activities
                </p>
              </div>
            </div>
          </div>

          {/* ✅ UPDATED: Progress to next rank with improved calculation */}
          {!progress.isMaxLevel && (
            <div className="rounded-2xl border border-line bg-sand/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted">
                  Progress to next rank
                </p>
                <p className="text-xs text-subtle">
                  {progress.current}/{progress.next}
                </p>
              </div>
              <div className="w-full bg-sand rounded-full h-2 mb-2">
                <div 
                  className="bg-accent h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-subtle">
                {progress.activitiesNeeded} more activities needed for {
                  progress.next === 5 ? '🧹 Forager' :
                  progress.next === 15 ? '🎒 Scavenger' :
                  progress.next === 25 ? '🪙 Giver' :
                  progress.next === 50 ? '💎 Treasure Hunter' : 'next level'
                }
              </p>
            </div>
          )}

          {/* Max Level Achievement */}
          {progress.isMaxLevel && (
            <div className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border border-yellow-200">
              <div className="text-center">
                <span className="text-3xl mb-2 block">🏆</span>
                <p className="text-yellow-600 font-bold">Maximum Rank Achieved!</p>
                <p className="text-yellow-600/80 text-sm">
                  You've reached the highest community rank with {totalActivity} activities!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* My Listings Section */}
        <div className="card-dark overflow-hidden">
          <div className="p-4 border-b border-line">
            <h3 className="flex items-center text-lg font-extrabold">
              <Package className="w-5 h-5 mr-2" />
              My Listings
            </h3>
          </div>

          {/* ✅ UPDATED: Listing Status Tabs - Removed 'taken' tab */}
          <div className="mx-4 mt-4 flex gap-1 rounded-full bg-sand p-1">
            {[
              { key: 'active', label: 'Active', count: userListings.filter(l => l.status === 'active').length },
              { key: 'expired', label: 'Expired', count: userListings.filter(l => l.status === 'expired').length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 rounded-full py-2 text-sm font-bold transition-all ${
                  activeTab === tab.key
                    ? 'bg-surface text-ink shadow-soft'
                    : 'text-subtle hover:text-ink'
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
                <div className="w-6 h-6 border-2 border-line border-t-accent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-muted text-sm">Loading listings...</p>
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-4xl mb-2">📦</div>
                <p className="text-muted text-sm">
                  {activeTab === 'active' ? 'No active listings' : 'No expired listings'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {filteredListings.map((listing) => (
                  <div key={listing.id} className="p-4">
                    <div className="flex items-start space-x-3">
                      <img
                        src={listing.images[0] || 'https://images.pexels.com/photos/416978/pexels-photo-416978.jpeg?auto=compress&cs=tinysrgb&w=400'}
                        alt={listing.title}
                        className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="truncate font-extrabold text-ink">
                              {listing.title}
                              {listing.isSpotted && (
                                <span className="ml-2 px-2 py-1 bg-orange-50 text-orange-600 text-xs rounded-full border border-orange-200">
                                  Spotted
                                </span>
                              )}
                            </h4>
                            <p className="text-sm text-subtle mt-1">
                              {listing.description.length > 50 
                                ? `${listing.description.substring(0, 50)}...`
                                : listing.description
                              }
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-subtle">
                              <span>{getTimePosted(listing.createdAt)}</span>
                              <span>
                                {ratingSummary(listing).emoji}{' '}
                                {ratingSummary(listing).count
                                  ? `${ratingSummary(listing).text} (${ratingSummary(listing).count})`
                                  : 'No ratings yet'}
                              </span>
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
                                className="text-red-600 hover:text-red-700 p-1"
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
          <div className="p-4 border-b border-line">
            <h3 className="flex items-center text-lg font-extrabold">
              <Settings className="w-5 h-5 mr-2" />
              Settings
            </h3>
          </div>
          
          <div className="divide-y divide-line">
            {/* Notifications Toggle */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {notifications ? (
                  <Bell className="w-5 h-5 text-muted" />
                ) : (
                  <BellOff className="w-5 h-5 text-subtle" />
                )}
                <div>
                  <p className="text-muted font-medium">Notifications</p>
                  <p className="text-sm text-subtle">Get notified about nearby boxes</p>
                </div>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors active:animate-press-down ${
                  notifications ? 'bg-accent' : 'bg-line-strong'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    notifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* ✅ NEW: Account Details Dropdown */}
            <div className="p-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between text-left hover:bg-sand/50 transition-colors rounded-2xl p-2 -m-2"
              >
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-muted" />
                  <div>
                    <p className="text-muted font-medium">Account Details</p>
                    <p className="text-sm text-subtle">View account information</p>
                  </div>
                </div>
                {showDetails ? (
                  <ChevronUp className="w-5 h-5 text-subtle" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-subtle" />
                )}
              </button>

              {showDetails && (
                <div className="mt-4 p-4 bg-surface rounded-2xl border border-line space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-subtle">Email:</span>
                    <span className="text-muted">{user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-subtle">Joined:</span>
                    <span className="text-muted">{formatDate(user.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-subtle">User ID:</span>
                    <span className="text-muted font-mono text-xs">{user.uid}</span>
                  </div>
                </div>
              )}
            </div>

            {/* ✅ NEW: Terms & Conditions Link */}
            <div className="p-4">
              <Link
                to="/terms"
                className="flex items-center space-x-3 hover:bg-sand/50 transition-colors rounded-2xl p-2 -m-2"
              >
                <FileText className="w-5 h-5 text-muted" />
                <div>
                  <p className="text-muted font-medium">Terms & Conditions</p>
                  <p className="text-sm text-subtle">View our terms and policies</p>
                </div>
              </Link>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full p-4 flex items-center space-x-3 hover:bg-red-50 transition-colors text-red-600 active:animate-press-down"
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