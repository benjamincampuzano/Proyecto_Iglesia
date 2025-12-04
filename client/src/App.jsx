import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './layouts/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Ganar from './pages/Ganar';
import Home from './pages/Home';
import Consolidar from './pages/Consolidar';
import Discipular from './pages/Discipular';

// Placeholder components for now
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
    <ThemeProvider>
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
    </ThemeProvider>
  );
}

export default App;
