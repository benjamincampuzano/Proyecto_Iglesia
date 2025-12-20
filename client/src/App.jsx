import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './layouts/Layout';
import ConnectivityHandler from './components/ConnectivityHandler';

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

// Placeholder components for now

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
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

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ConnectivityHandler />
          <Suspense fallback={<PageLoader />}>
            <Routes>
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
                <Route path="auditoria" element={<AdminRoute><AuditDashboard /></AdminRoute>} />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
