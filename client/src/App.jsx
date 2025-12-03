import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './layouts/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Ganar from './pages/Ganar';

// Placeholder components for now
const Home = () => <h1 className="text-3xl font-bold">Dashboard</h1>;
const Consolidar = () => <h1 className="text-3xl font-bold">Consolidar</h1>;
const Discipular = () => <h1 className="text-3xl font-bold">Discipular</h1>;
const Enviar = () => <h1 className="text-3xl font-bold">Enviar</h1>;
const Encuentros = () => <h1 className="text-3xl font-bold">Encuentros</h1>;
const Convenciones = () => <h1 className="text-3xl font-bold">Convenciones</h1>;

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
