import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import AdminPortal from './components/AdminPortal';
import WorkerPortal from './components/WorkerPortal';
import ResidentPortal from './components/ResidentPortal';
import type { LoginUser } from './types';

function AppContent({
  token,
  user,
  isVerifying,
  handleLoginSuccess,
  handleLogout,
  setUser
}: {
  token: string | null;
  user: LoginUser | null;
  isVerifying: boolean;
  handleLoginSuccess: (token: string, user: any) => void;
  handleLogout: () => void;
  setUser: React.Dispatch<React.SetStateAction<LoginUser | null>>;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Watch auth state and route changes to perform redirects
  useEffect(() => {
    if (isVerifying) return;

    const path = location.pathname;

    if (!token || !user) {
      // Not logged in -> only allow /login
      if (path !== '/login') {
        navigate('/login', { replace: true });
      }
    } else {
      // Logged in -> redirect if at /login or /
      if (path === '/login' || path === '/') {
        if (user.role === 'admin') navigate('/admin', { replace: true });
        else if (user.role === 'worker') navigate('/worker', { replace: true });
        else if (user.role === 'resident') navigate('/resident', { replace: true });
      } else {
        // Logged in but trying to access an unauthorized portal -> redirect to their authorized portal
        if (path === '/admin' && user.role !== 'admin') {
          navigate(user.role === 'worker' ? '/worker' : '/resident', { replace: true });
        } else if (path === '/worker' && user.role !== 'worker') {
          navigate(user.role === 'admin' ? '/admin' : '/resident', { replace: true });
        } else if (path === '/resident' && user.role !== 'resident') {
          navigate(user.role === 'admin' ? '/admin' : '/worker', { replace: true });
        }
      }
    }
  }, [token, user, isVerifying, location.pathname, navigate]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          !token ? (
            <Login onLoginSuccess={handleLoginSuccess} />
          ) : (
            <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'worker' ? '/worker' : '/resident'} replace />
          )
        }
      />
      <Route
        path="/admin"
        element={
          token && user && user.role === 'admin' ? (
            <AdminPortal
              token={token}
              user={user}
              onLogout={handleLogout}
              onUserUpdate={(freshUser) => {
                setUser(freshUser);
                localStorage.setItem('ecotrack_user_profile', JSON.stringify(freshUser));
              }}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/worker"
        element={
          token && user && user.role === 'worker' ? (
            <WorkerPortal token={token} user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/resident"
        element={
          token && user && user.role === 'resident' ? (
            <ResidentPortal token={token} user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      {/* Fallback route */}
      <Route
        path="*"
        element={
          !token ? (
            <Navigate to="/login" replace />
          ) : (
            <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'worker' ? '/worker' : '/resident'} replace />
          )
        }
      />
    </Routes>
  );
}

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
              localStorage.removeItem('ecotrack_jwt_token');
              localStorage.removeItem('ecotrack_user_profile');
            }
          })
          .catch(() => {
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

  return (
    <HashRouter>
      <AppContent
        token={token}
        user={user}
        isVerifying={isVerifying}
        handleLoginSuccess={handleLoginSuccess}
        handleLogout={handleLogout}
        setUser={setUser}
      />
    </HashRouter>
  );
}
