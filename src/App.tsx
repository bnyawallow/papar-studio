
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { supabaseConfigError } from './services/supabase';
import Dashboard from './pages/Dashboard';
import EditorPage from './pages/EditorPage';
import Viewer from './pages/Viewer';
import AppRunner from './pages/AppRunner';
import Toast from '../components/ui/Toast';

function App() {
  const [showConfigWarning, setShowConfigWarning] = useState(false);

  useEffect(() => {
    // Check on mount if Supabase is not configured
    if (!supabaseConfigError) {
      return;
    }
    
    setShowConfigWarning(true);

    // Listen for config error events
    const handleConfigError = () => {
      setShowConfigWarning(true);
    };

    window.addEventListener('supabase-config-error', handleConfigError);
    return () => window.removeEventListener('supabase-config-error', handleConfigError);
  }, []);

  return (
    <BrowserRouter>
      {showConfigWarning && (
        <Toast
          message="Supabase not configured. Running in offline mode."
          type="error"
          isVisible={showConfigWarning}
          onClose={() => setShowConfigWarning(false)}
        />
      )}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/editor/:id" element={<EditorPage />} />
        <Route path="/view/:id" element={<Viewer />} />
        {/* Support both ID-based and slug-based routes for published apps */}
        <Route path="/apps/:id" element={<AppRunner />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
