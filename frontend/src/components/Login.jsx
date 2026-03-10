import React, { useState } from 'react';
import { Mail, Lock, Loader2, AlertTriangle, FileText, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    clearError();

    try {
      if (isSignUp) {
        const { error: err } = await signUpWithEmail(email, password);
        if (!err) {
          setMessage('Welcome! Please check your email to confirm your account.');
          setEmail('');
          setPassword('');
        }
      } else {
        const { error: err } = await signInWithEmail(email, password);
        if (!err) {
          setMessage('Sign in successful!');
        }
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    clearError();
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col md:flex-row font-sans selection:bg-olive-light selection:text-olive-dark">
      
      {/* Left Editorial Section */}
      <div className="hidden md:flex md:w-1/2 bg-olive-dark relative overflow-hidden flex-col justify-between p-12 lg:p-24 items-start">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-olive-light to-transparent"></div>
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-cream p-2.5 rounded-xl shadow-sm">
            <FileText className="w-6 h-6 text-earth-dark" strokeWidth={2.5} />
          </div>
          <span className="text-cream text-xl font-bold tracking-tight">Agentic Reader</span>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg mt-24 mb-12">
          <h1 className="text-5xl lg:text-6xl text-cream font-serif tracking-tight leading-[1.1]">
            Turn reading into a dialogue.
          </h1>
          <p className="text-xl text-olive-light/90 font-light leading-relaxed">
            Upload documents, provide links, and let our intelligent agents extract, summarize, and answer questions. A modern workspace for profound understanding.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-olive-light/60 text-sm font-medium tracking-widest uppercase">
          <span>Analysis</span>
          <span className="w-1 h-1 rounded-full bg-olive-light/40"></span>
          <span>Synthesis</span>
          <span className="w-1 h-1 rounded-full bg-olive-light/40"></span>
          <span>Insight</span>
        </div>
      </div>

      {/* Right Form Section */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-24 relative bg-cream">
        <div className="w-full max-w-md space-y-10">
          
          <div className="md:hidden flex items-center gap-3 mb-12">
            <div className="bg-olive-dark p-2 rounded-xl">
              <FileText className="w-5 h-5 text-cream" strokeWidth={2.5} />
            </div>
            <span className="text-earth-dark text-lg font-bold tracking-tight">Agentic Reader</span>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-serif text-earth-dark tracking-tight">
              {isSignUp ? 'Create an account' : 'Welcome back'}
            </h2>
            <p className="text-earth-dark/60 text-lg">
              {isSignUp 
                ? 'Join to start building your brilliant library.' 
                : 'Enter your credentials to access your workspace.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-3 border border-red-100">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="bg-olive-light/20 text-olive-dark px-4 py-3 rounded-xl text-sm flex items-center gap-3 border border-olive-light/30">
              <div className="w-2 h-2 rounded-full bg-olive-dark animate-pulse"></div>
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleEmailSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-earth-dark ml-1">Email address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-earth-dark/40 group-focus-within:text-olive-dark transition-colors">
                  <Mail className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-white border border-earth-dark/10 rounded-2xl text-earth-dark placeholder:text-earth-dark/30 focus:ring-4 focus:ring-olive-light/30 focus:border-olive-dark transition-all duration-300 outline-none"
                  placeholder="name@email.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-earth-dark ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-earth-dark/40 group-focus-within:text-olive-dark transition-colors">
                  <Lock className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-white border border-earth-dark/10 rounded-2xl text-earth-dark placeholder:text-earth-dark/30 focus:ring-4 focus:ring-olive-light/30 focus:border-olive-dark transition-all duration-300 outline-none"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-olive-dark hover:bg-olive-dark/90 text-cream py-3.5 rounded-2xl font-medium tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="relative flex items-center justify-center">
            <span className="absolute bg-cream px-4 text-xs font-medium uppercase tracking-wider text-earth-dark/40">Or continue with</span>
            <div className="w-full h-px bg-earth-dark/10"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-gray-50 border border-earth-dark/10 text-earth-dark py-3.5 rounded-2xl font-medium transition-all duration-300 flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </button>

          <div className="text-center mt-8">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                clearError();
                setMessage('');
              }}
              className="text-earth-dark/60 hover:text-earth-dark text-sm font-medium transition-colors border-b border-transparent hover:border-earth-dark/30 pb-0.5"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
