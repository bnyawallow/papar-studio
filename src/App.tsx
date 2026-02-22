import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import EditorPage from './pages/EditorPage';
import Viewer from './pages/Viewer';
import AppRunner from './pages/AppRunner';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/editor/:id" element={<EditorPage />} />
        <Route path="/view/:id" element={<Viewer />} />
        <Route path="/apps/:id" element={<AppRunner />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
