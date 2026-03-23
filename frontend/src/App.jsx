import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PlaceProvider } from './context/PlaceContext';
import Navbar from './components/Common/Navbar';
import HomePage from './pages/HomePage';
import PlaceDetailPage from './pages/PlaceDetailPage';
import AdminPage from './pages/AdminPage';
import SplashScreen from './components/Common/SplashScreen';

function App() {
  const [started, setStarted] = useState(false);

  if (!started) {
    return <SplashScreen onStart={() => setStarted(true)} />;
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <PlaceProvider>
          <div className="min-h-screen bg-gray-50 font-sans">
            <Navbar />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/place/:id" element={<PlaceDetailPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </div>
        </PlaceProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
