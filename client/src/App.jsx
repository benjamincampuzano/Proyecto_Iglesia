import { Suspense, lazy, useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useLoading } from './context/LoadingContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoadingProvider } from './context/LoadingContext';
import Layout from './layouts/Layout';
import ConnectivityHandler from './components/ConnectivityHandler';
import LoadingOverlay from './components/LoadingOverlay';
import TransitionLoader from './components/TransitionLoader';

// Lazy load pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Ganar = lazy(() => import('./pages/Ganar'));
const Home = lazy(() => import('./pages/Home'));
const Consolidar = lazy(() => import('./pages/Consolidar'));
const Discipular = lazy(() => import('./pages/Discipular'));
const Enviar = lazy(() => import('./pages/Enviar'));
const NetworkAssignment = lazy(() => import('./components/NetworkAssignment'));
const Convenciones = lazy(() => import('./pages/Convenciones'));
const Encuentros = lazy(() => import('./pages/Encuentros'));
const AuditDashboard = lazy(() => import('./pages/AuditDashboard'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const SetupWizard = lazy(() => import('./pages/SetupWizard'));

// Placeholder components for now

const PrivateRoute = ({ children }) => {
  const { user, loading, isInitialized } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!isInitialized) return <Navigate to="/setup" />;
  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user && (user.role === 'SUPER_ADMIN' || user.role === 'PASTOR') ? children : <Navigate to="/" />;
};

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

const RouteTransitionHandler = () => {
  const location = useLocation();
  const { startLoading, stopLoading, updateProgress } = useLoading();
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      startLoading();
      prevPathRef.current = location.pathname;

      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.random() * 20;
        if (currentProgress > 90) {
          currentProgress = 95;
          clearInterval(interval);
        }
        updateProgress(Math.floor(currentProgress));
      }, 40);

      let isFinished = false;
      const finish = () => {
        if (!isFinished) {
          isFinished = true;
          stopLoading();
          clearInterval(interval);
        }
      };

      const timeout = setTimeout(finish, 1000);

      return () => {
        clearTimeout(timeout);
        finish();
      };
    }
  }, [location.pathname, startLoading, stopLoading, updateProgress]);

  return null;
};

function App() {
  return (
    <ThemeProvider>
      <LoadingProvider>
        <BrowserRouter>
          <AuthProvider>
            <ConnectivityHandler />
            <RouteTransitionHandler />
            <LoadingOverlay />
            <Suspense fallback={<TransitionLoader />}>
              <Routes>
                <Route path="/setup" element={<SetupWizard />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                  <Route index element={<Home />} />
                  <Route path="ganar" element={<Ganar />} />
                  <Route path="consolidar" element={<Consolidar />} />
                  <Route path="discipular" element={<Discipular />} />
                  <Route path="enviar" element={<Enviar />} />
                  <Route path="encuentros" element={<Encuentros />} />
                  <Route path="convenciones" element={<Convenciones />} />
                  <Route path="network" element={<NetworkAssignment />} />
                  <Route path="usuarios" element={<AdminRoute><UserManagement /></AdminRoute>} />
                  <Route path="auditoria" element={<AdminRoute><AuditDashboard /></AdminRoute>} />
                </Route>
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </LoadingProvider>
    </ThemeProvider>
  );
}

export default App;
