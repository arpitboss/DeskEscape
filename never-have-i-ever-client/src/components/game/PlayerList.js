import React from 'react';
import Avatar from '../common/Avatar';

const PlayerList = ({ players, host, currentUser }) => {
  // Sort players: host first, then current user, then others by points
  const sortedPlayers = [...players].sort((a, b) => {
    // Host comes first
    if (a.user._id === host._id) return -1;
    if (b.user._id === host._id) return 1;

    // Current user comes second
    if (a.user._id === currentUser?._id) return -1;
    if (b.user._id === currentUser?._id) return 1;

    // Everyone else sorted by points (descending)
    return b.points - a.points;
  });

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h2 className="text-lg font-bold mb-4 flex items-center justify-between">
        <span>Players ({players.length})</span>
        <span className="text-sm text-gray-500 font-normal">Points</span>
      </h2>

      <ul className="space-y-3">
        {sortedPlayers.map((player) => {
          const isHost = host._id === player.user._id;
          const isCurrentUser = currentUser?._id === player.user._id;
          const hasAnswered = player.hasAnswered;

          return (
            <li
              key={player.user._id}
              className={`flex items-center justify-between p-2 rounded-md
                ${isCurrentUser ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-center">
                <Avatar
                  user={player.user}
                  size="medium"
                  className="mr-3"
                />

                <div>
                  <span className="font-medium">
                    {player.user.name}
                    {isCurrentUser && <span className="text-gray-500 text-xs ml-1">(you)</span>}
                  </span>

                  {isHost && (
                    <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                      Host
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                {hasAnswered && (
                  <span className="mr-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                    Answered
                  </span>
                )}
                <div className="font-bold text-lg">{player.points} pts</div>
              </div>
            </li>
          );
        })}
      </ul>

      {players.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          No players have joined yet
        </div>
      )}
    </div>
  );
};

export default PlayerList;