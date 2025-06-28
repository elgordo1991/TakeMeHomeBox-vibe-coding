import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

declare global {
  interface Window {
    google: any;
  }
}

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [googleLoaded, setGoogleLoaded] = useState(false);
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

  // Initialize Google Sign-In button with better error handling
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
            theme: "outline",
            size: "large",
            width: "100%",
            text: "signin_with",
            shape: "rectangular",
          });

          setGoogleLoaded(true);
          console.log("✅ Google Sign-In button rendered successfully");
        } catch (error) {
          console.error("Google Sign-In initialization error:", error);
          setGoogleLoaded(false);
        }
      } else {
        console.log("Google API not ready yet, will retry...");
        setGoogleLoaded(false);
      }
    };

    if (!window.google || !window.google.accounts) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log("✅ Google script loaded manually");
        initializeGoogleSignIn();
      };
      document.body.appendChild(script);
    } else {
      initializeGoogleSignIn();
    }

    const retryIntervals = [500, 1000, 2000, 3000];
    const timeouts = retryIntervals.map(delay => 
      setTimeout(() => {
        if (!googleLoaded) {
          initializeGoogleSignIn();
        }
      }, delay)
    );

    const handleGoogleLoad = () => {
      console.log("Google API loaded via event listener");
      setTimeout(initializeGoogleSignIn, 100);
    };

    window.addEventListener('load', handleGoogleLoad);

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
      window.removeEventListener('load', handleGoogleLoad);
    };
  }, [isLogin, googleLoaded]);

  // Handle email-based login/signup
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await signup(formData);
      }
    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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
              {isLogin ? 'Welcome back!' : 'Join the community'}
            </p>
          </div>

          {/* Google Sign-In Button */}
          <div className="mb-6">
            <div id="google-signin-button" className="w-full flex justify-center min-h-[44px]"></div>
            
            {!googleLoaded && (
              <button
                type="button"
                onClick={handleGoogleFallback}
                className="btn-secondary w-full flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
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
              <span className="px-2 bg-dark-blue text-silver">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-silver mb-2">
                Email
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

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-silver mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-silver/60" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="input-dark w-full pl-10 pr-4 py-3 rounded-lg"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Additional fields for signup */}
            {!isLogin && (
              <>
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-silver mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-silver/60" />
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="input-dark w-full pl-10 pr-4 py-3 rounded-lg"
                      placeholder="Your username"
                      required
                    />
                  </div>
                </div>

                {/* Bio */}
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
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                </div>
              </>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary w-full"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Toggle Sign-in/Sign-up */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-silver hover:text-silver-light font-medium transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;