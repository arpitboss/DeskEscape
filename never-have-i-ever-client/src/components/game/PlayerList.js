import React from 'react';
import Avatar from '../common/Avatar';

const PlayerList = ({ players, host, currentUser }) => {
  // Sort players: host first, then current user, then others by points
  const sortedPlayers = React.useMemo(() => {
    return [...players].sort((a, b) => {
      // Host comes first
      if (a.user?._id === host?._id) return -1;
      if (b.user?._id === host?._id) return 1;

      // Current user comes second
      if (a.user?._id === currentUser?._id) return -1;
      if (b.user?._id === currentUser?._id) return 1;

      // Everyone else sorted by points (descending)
      return (b.points || 0) - (a.points || 0);
    });
  }, [players, host, currentUser]);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-100">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-lg font-bold flex items-center justify-between">
          <span className="text-gray-800">Players ({players.length})</span>
          <span className="text-sm text-gray-500 font-medium">Points</span>
        </h2>
      </div>

      {players.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p>No players have joined yet</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {sortedPlayers.map((player) => {
            const isHost = host?._id === player.user?._id;
            const isCurrentUser = currentUser?._id === player.user?._id;
            const hasAnswered = player.hasAnswered;

            return (
              <li
                key={player.user?._id}
                className={`flex items-center justify-between p-3 ${isCurrentUser ? 'bg-indigo-50' : 'hover:bg-gray-50'} transition-colors`}
              >
                <div className="flex items-center space-x-3">
                  <Avatar
                    user={player.user}
                    size="medium"
                  />

                  <div>
                    <div className="font-medium text-gray-800">
                      {player.user?.name}
                      {isCurrentUser && <span className="text-gray-500 text-xs ml-1">(you)</span>}
                    </div>

                    <div className="flex items-center mt-1">
                      {isHost && (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                          Host
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {hasAnswered && (
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                      Answered
                    </span>
                  )}
                  <div className="font-bold text-lg text-indigo-600">{player.points || 0}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default PlayerList;