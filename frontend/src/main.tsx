import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LobbyPage from './pages/LobbyPage'
import ScreenPage from './pages/ScreenPage'
import AdminPage from './pages/AdminPage'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LobbyPage />} />
        <Route path="/screen/:gameId" element={<ScreenPage />} />
        <Route path="/admin/:gameId" element={<AdminPage />} />
        {/* Legacy redirects */}
        <Route path="/admin" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
