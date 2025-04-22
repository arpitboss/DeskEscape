import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import Avatar from '../common/Avatar';

const Header = () => {
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-indigo-600 text-white shadow sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to={currentUser ? "/rooms" : "/"} className="text-xl font-bold flex items-center">
          <span className="text-yellow-300 mr-1">Never</span>
          <span>Have I Ever</span>
        </Link>

        <nav className="hidden md:flex space-x-6">
          {currentUser && (
            <>
              <Link to="/rooms" className="bg-purple-500 hover:bg-indigo-700 px-4 py-2 rounded-md transition">Rooms</Link>
              <Link to="/rooms/create" className="bg-indigo-500 hover:bg-indigo-700 px-4 py-2 rounded-md transition">Create Room</Link>
              <Link to="/rooms/join" className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-md transition">Join Room</Link>
              <Link to="/leaderboard" className="bg-indigo-500 hover:bg-indigo-700 px-4 py-2 rounded-md transition">Leaderboard</Link>
            </>
          )}
        </nav>

        <div className="flex items-center space-x-4">
          {currentUser ? (
            <>
              <Link to="/profile" className="flex items-center group">
                <Avatar
                  user={currentUser}
                  size="small"
                  className="transition transform group-hover:scale-110"
                />
                <span className="ml-2 hidden sm:block">{currentUser.name}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/"
              className="bg-white text-indigo-600 px-3 py-1 rounded hover:bg-indigo-50 transition"
            >
              Join Game
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;