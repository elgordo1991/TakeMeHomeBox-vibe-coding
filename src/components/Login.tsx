import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, MessageCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

declare global {
  interface Window {
    google: any;
  }
}

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    bio: ''
  });

  const { login, signup, loginWithGoogle, user } = useAuth();

  // If already logged in, don't show login page
  if (user) {
    return null;
  }

  // Handle Google sign-in safely
  const handleGoogleSignIn = async (response: any) => {
    try {
      setLoading(true);
      setError('');
      await loginWithGoogle(response.credential);
    } catch (error: any) {
      console.error("Google Sign-In error:", error);
      setError(error.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initialize Google Sign-In button
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    // Only initialize if we have a client ID
    if (!clientId || clientId === 'your_google_client_id_here') {
      console.log('Google Client ID not configured');
      return;
    }
    
    const initializeGoogleSignIn = () => {
      const buttonEl = document.getElementById("google-signin-button");

      if (window.google && window.google.accounts && window.google.accounts.id && buttonEl) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleSignIn,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          window.google.accounts.id.renderButton(buttonEl, {
            theme: "filled_blue",
            size: "large",
            width: "100%",
            text: isLogin ? "signin_with" : "signup_with",
            shape: "rectangular",
          });

          setGoogleLoaded(true);
        } catch (error) {
          console.error("Google Sign-In initialization error:", error);
          setGoogleLoaded(false);
        }
      }
    };

    if (!window.google || !window.google.accounts) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleSignIn;
      document.body.appendChild(script);
    } else {
      initializeGoogleSignIn();
    }

    const retryIntervals = [500, 1000, 2000];
    const timeouts = retryIntervals.map(delay => 
      setTimeout(() => {
        if (!googleLoaded) {
          initializeGoogleSignIn();
        }
      }, delay)
    );

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [googleLoaded, isLogin]);

  // Check username availability
  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3) {
      setUsernameAvailable(false);
      return;
    }

    setCheckingUsername(true);
    
    // Simulate API call - in real app, this would check against your database
    setTimeout(() => {
      // Basic validation: no spaces, minimum length, not common usernames
      const isValid = username.length >= 3 && 
                     !/\s/.test(username) && 
                     !['admin', 'user', 'test', 'takemehomebox'].includes(username.toLowerCase());
      
      setUsernameAvailable(isValid);
      setCheckingUsername(false);
    }, 500);
  };

  // Validate form data
  const validateForm = () => {
    if (!formData.email) {
      setError('Email is required');
      return false;
    }
    
    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }
    
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    
    if (!isLogin) {
      if (!formData.username) {
        setError('Username is required');
        return false;
      }
      
      if (!usernameAvailable) {
        setError('Please choose a valid username');
        return false;
      }
    }
    
    return true;
  };

  // Handle email-based login/signup
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await signup(formData);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email. Please sign up first.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (error.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(error.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear error when user starts typing
    if (error) {
      setError('');
    }

    // Check username availability when typing
    if (name === 'username' && !isLogin) {
      if (value.length >= 3) {
        checkUsernameAvailability(value);
      } else {
        setUsernameAvailable(null);
      }
    }
  };

  const handleGoogleFallback = () => {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.prompt();
    } else {
      setError('Google Sign-In is not available. Please use email login or try refreshing the page.');
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({ email: '', password: '', username: '', bio: '' });
    setUsernameAvailable(null);
    setError('');
  };

  const hasGoogleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID && 
                           import.meta.env.VITE_GOOGLE_CLIENT_ID !== 'your_google_client_id_here';

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-shimmer">
      <div className="w-full max-w-md">
        {/* Card with shimmer border */}
        <div className="card-dark p-8">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="logo-animated text-6xl">
                📦
              </div>
            </div>
            <h1 className="text-2xl font-bold text-silver-light">
              TakeMeHomeBox
            </h1>
            <p className="text-silver mt-2">
              {isLogin ? 'Welcome back to the community!' : 'Join the sharing community'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Google Sign-In Button */}
          {hasGoogleClientId && (
            <div className="mb-6">
              <div id="google-signin-button" className="w-full flex justify-center min-h-[44px]"></div>
              
              {!googleLoaded && (
                <button
                  type="button"
                  onClick={handleGoogleFallback}
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>
              )}

              {!googleLoaded && (
                <div className="text-center mt-2">
                  <span className="text-xs text-silver/60">
                    Loading Google Sign-In...
                  </span>
                </div>
              )}

              {/* Divider */}
              <div className="relative mt-6 mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-silver/30"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-dark-blue text-silver">
                    Or continue with email
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-silver mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-silver/60" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input-dark w-full pl-10 pr-4 py-3 rounded-lg"
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Username (only for signup) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-silver mb-2">
                  Unique Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-silver/60" />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className={`input-dark w-full pl-10 pr-10 py-3 rounded-lg ${
                      formData.username.length >= 3 
                        ? usernameAvailable === true 
                          ? 'border-green-500 focus:border-green-500' 
                          : usernameAvailable === false 
                            ? 'border-red-500 focus:border-red-500' 
                            : ''
                        : ''
                    }`}
                    placeholder="Choose a unique username"
                    required
                    disabled={loading}
                  />
                  {/* Username validation indicator */}
                  {formData.username.length >= 3 && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {checkingUsername ? (
                        <div className="w-4 h-4 border-2 border-silver/30 border-t-silver rounded-full animate-spin"></div>
                      ) : usernameAvailable === true ? (
                        <span className="text-green-500 text-lg">✓</span>
                      ) : usernameAvailable === false ? (
                        <span className="text-red-500 text-lg">✗</span>
                      ) : null}
                    </div>
                  )}
                </div>
                {formData.username.length >= 3 && usernameAvailable === false && (
                  <p className="text-red-400 text-xs mt-1">
                    Username not available or invalid (min 3 chars, no spaces)
                  </p>
                )}
                {formData.username.length >= 3 && usernameAvailable === true && (
                  <p className="text-green-400 text-xs mt-1">
                    Username is available!
                  </p>
                )}
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-silver mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-silver/60" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="input-dark w-full pl-10 pr-10 py-3 rounded-lg"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-silver/60 hover:text-silver disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {!isLogin && (
                <p className="text-xs text-silver/60 mt-1">
                  Password must be at least 6 characters long
                </p>
              )}
            </div>

            {/* Bio (only for signup) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-silver mb-2">
                  Bio (Optional)
                </label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-3 w-5 h-5 text-silver/60" />
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={3}
                    className="input-dark w-full pl-10 pr-4 py-3 rounded-lg resize-none"
                    placeholder="Tell the community about yourself..."
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary w-full text-lg font-semibold py-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              disabled={loading || (!isLogin && !usernameAvailable)}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-silver/30 border-t-silver rounded-full animate-spin"></div>
                  <span>{isLogin ? 'Signing In...' : 'Creating Account...'}</span>
                </>
              ) : (
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </form>

          {/* Toggle Sign-in/Sign-up */}
          <div className="mt-6 text-center">
            <button
              onClick={toggleMode}
              className="text-silver hover:text-silver-light font-medium transition-colors disabled:cursor-not-allowed"
              disabled={loading}
            >
              {isLogin 
                ? "No account? Sign up!" 
                : "Already have one? Sign in"
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;