import { useState, useEffect } from 'react';
import Login from './components/Login';
import AdminPortal from './components/AdminPortal';
import WorkerPortal from './components/WorkerPortal';
import ResidentPortal from './components/ResidentPortal';
import type { LoginUser } from './types';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<LoginUser | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  // Restore and verify authenticated session from localStorage
  useEffect(() => {
    const cachedToken = localStorage.getItem('ecotrack_jwt_token');
    const cachedUser = localStorage.getItem('ecotrack_user_profile');

    if (cachedToken && cachedUser) {
      try {
        const parsedUser: LoginUser = JSON.parse(cachedUser);
        // Verify the token is still valid against the backend
        fetch('/api/user', {
          headers: {
            'Authorization': `Bearer ${cachedToken}`,
            'Accept': 'application/json',
          },
        })
          .then(async (res) => {
            if (res.ok) {
              const freshData = await res.json().catch(() => null);
              if (freshData && freshData.data) {
                const freshUser: LoginUser = {
                  id: freshData.data.id,
                  name: freshData.data.name,
                  email: freshData.data.email,
                  phone: freshData.data.phone || '',
                  role: freshData.data.role,
                  shift: freshData.data.shift,
                  profile_photo_url: freshData.data.profile_photo_path ? `/storage/${freshData.data.profile_photo_path}` : null
                };
                setToken(cachedToken);
                setUser(freshUser);
                localStorage.setItem('ecotrack_user_profile', JSON.stringify(freshUser));
              } else {
                setToken(cachedToken);
                setUser(parsedUser);
              }
            } else {
              // Token expired or revoked — clear session
              localStorage.removeItem('ecotrack_jwt_token');
              localStorage.removeItem('ecotrack_user_profile');
            }
          })
          .catch(() => {
            // Backend unreachable — restore cached session for offline support
            setToken(cachedToken);
            setUser(parsedUser);
          })
          .finally(() => setIsVerifying(false));
      } catch (err) {
        console.warn('Failed parsing cached subscriber session details.', err);
        localStorage.removeItem('ecotrack_jwt_token');
        localStorage.removeItem('ecotrack_user_profile');
        setIsVerifying(false);
      }
    } else {
      setIsVerifying(false);
    }
  }, []);

  const handleLoginSuccess = (newToken: string, newUser: any) => {
    const formattedUser: LoginUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone || '',
      role: newUser.role,
      shift: newUser.shift,
      profile_photo_url: newUser.profile_photo_url || (newUser.profile_photo_path ? `/storage/${newUser.profile_photo_path}` : null)
    };
    setToken(newToken);
    setUser(formattedUser);
    localStorage.setItem('ecotrack_jwt_token', newToken);
    localStorage.setItem('ecotrack_user_profile', JSON.stringify(formattedUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('ecotrack_jwt_token');
    localStorage.removeItem('ecotrack_user_profile');
  };

  // Show nothing while verifying cached token
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Session routing tree
  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  switch (user.role) {
    case 'admin':
      return <AdminPortal token={token} user={user} onLogout={handleLogout} onUserUpdate={(freshUser) => {
        setUser(freshUser);
        localStorage.setItem('ecotrack_user_profile', JSON.stringify(freshUser));
      }} />;
    
    case 'worker':
      return <WorkerPortal token={token} user={user} onLogout={handleLogout} />;
    
    case 'resident':
      return <ResidentPortal token={token} user={user} onLogout={handleLogout} />;
    
    default:
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans p-6 text-center">
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl max-w-sm space-y-3">
            <h2 className="text-sm font-bold text-rose-400">Undefined Access Privileges</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your profile does not map to a recognized logistics hierarchy. Please contact Complex Security.
            </p>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Return to Login
            </button>
          </div>
        </div>
      );
  }
}
