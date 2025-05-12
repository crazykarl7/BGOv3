import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import UserHome from './pages/UserHome';
import AdminDashboard from './pages/AdminDashboard';
import OlympicAdmin from './pages/OlympicAdmin';
import GameAdmin from './pages/GameAdmin';
import OlympicPlayers from './pages/OlympicPlayers';
import OlympicEvents from './pages/OlympicEvents';
import OlympicScores from './pages/OlympicScores';
import OlympicLeaderboard from './pages/OlympicLeaderboard';
import UsersList from './pages/UsersList';
import TeamAdmin from './pages/TeamAdmin';
import { useAuthStore } from './store/authStore';

function PrivateRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && !user.is_admin) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <PrivateRoute adminOnly>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/olympics"
            element={
              <PrivateRoute adminOnly>
                <OlympicAdmin />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/games"
            element={
              <PrivateRoute adminOnly>
                <GameAdmin />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/olympics/:olympicId/players"
            element={
              <PrivateRoute adminOnly>
                <OlympicPlayers />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/olympics/:olympicId/events"
            element={
              <PrivateRoute adminOnly>
                <OlympicEvents />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/olympics/:olympicId/scores"
            element={
              <PrivateRoute adminOnly>
                <OlympicScores />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <PrivateRoute adminOnly>
                <UsersList />
              </PrivateRoute>
            }
          />

          {/* User Routes */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <UserHome />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile/:userId"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/olympics/:olympicId/scores"
            element={
              <PrivateRoute>
                <OlympicScores />
              </PrivateRoute>
            }
          />
          <Route
            path="/olympics/:olympicId/leaderboard"
            element={
              <PrivateRoute>
                <OlympicLeaderboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/olympics/:olympicId/teams"
            element={
              <PrivateRoute>
                <TeamAdmin />
              </PrivateRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;