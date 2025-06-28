import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, MessageCircle, Eye, EyeOff } from 'lucide-react';
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
      await loginWithGoogle(response.credential);
    } catch (error) {
      console.error("Google Sign-In callback error:", error);
    }
  };

  // Initialize Google Sign-In button
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
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
            text: "signin_with",
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
  }, [googleLoaded]);

  // Check username availability (basic validation)
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

  // Handle email-based login/signup
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLogin && !usernameAvailable) {
      alert('Please choose a valid username');
      return;
    }

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await signup(formData);
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert('Authentication failed. Please try again.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

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
      alert('Google Sign-In is not available. Please use email login or try refreshing the page.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-deep-blue">
      <div className="w-full max-w-md">
        {/* Card with shimmer border */}
        <div className="card-dark p-8">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="logo-animated text-6xl">
                📦💎
              </div>
            </div>
            <h1 className="text-2xl font-bold text-silver-light">
              TakeMeHomeBox
            </h1>
            <p className="text-silver mt-2">
              {isLogin ? 'Welcome back to the community!' : 'Join the sharing community'}
            </p>
          </div>

          {/* Google Sign-In Button */}
          <div className="mb-6">
            <div id="google-signin-button" className="w-full flex justify-center min-h-[44px]"></div>
            
            {!googleLoaded && (
              <button
                type="button"
                onClick={handleGoogleFallback}
                className="btn-primary w-full flex items-center justify-center space-x-3"
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
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-silver/30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-dark-blue text-silver">
                Or continue with email
              </span>
            </div>
          </div>

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
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-silver/60 hover:text-silver"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
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
                  />
                </div>
              </div>
            )}

            {/* Submit Button with bounce animation */}
            <button
              type="submit"
              className="btn-primary w-full text-lg font-semibold py-4"
              disabled={!isLogin && !usernameAvailable}
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Toggle Sign-in/Sign-up */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({ email: '', password: '', username: '', bio: '' });
                setUsernameAvailable(null);
              }}
              className="text-silver hover:text-silver-light font-medium transition-colors"
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