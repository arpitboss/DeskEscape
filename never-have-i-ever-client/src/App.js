// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';



// Layout components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

// Auth components
import CreateUser from './components/auth/CreateUser';
import UserProfile from './components/auth/UserProfile';

// Room components
import RoomList from './components/rooms/RoomList';
import CreateRoom from './components/rooms/CreateRoom';
import JoinRoom from './components/rooms/JoinRoom';

// Game components
import GameRoom from './components/game/GameRoom';

// Leaderboard component
import Leaderboard from './components/leaderboard/Leaderboard';

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { currentUser } = React.useContext(AuthContext);
  
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<CreateUser />} />
                
                {/* Protected routes */}
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <UserProfile />
                  </ProtectedRoute>
                } />
                
                <Route path="/rooms" element={
                  <ProtectedRoute>
                    <RoomList />
                  </ProtectedRoute>
                } />
                
                <Route path="/rooms/create" element={
                  <ProtectedRoute>
                    <CreateRoom />
                  </ProtectedRoute>
                } />

                <Route path="/rooms/join" element={
                  <ProtectedRoute>
                    <JoinRoom />
                  </ProtectedRoute>
                } />
                
                <Route path="/rooms/:roomId" element={
                  <ProtectedRoute>
                    <GameRoom />
                  </ProtectedRoute>
                } />
                
                <Route path="/leaderboard" element={
                  <ProtectedRoute>
                    <Leaderboard />
                  </ProtectedRoute>
                } />
              </Routes>
            </main>
            <ToastContainer position="top-right" autoClose={3000} />
            <Footer />
          </div>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;