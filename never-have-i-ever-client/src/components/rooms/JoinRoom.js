// src/components/rooms/JoinRoom.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'react-toastify';

const JoinRoom = () => {
    const { currentUser } = useContext(AuthContext);
    const [roomData, setRoomData] = useState({
        roomId: '',
        passcode: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [roomInfo, setRoomInfo] = useState(null);
    const [passcode, setPasscode] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const navigate = useNavigate();

    const handleChange = e => setPasscode(e.target.value.trim());

    const handleCheckRoom = async () => {
        if (!passcode) {
            toast.error('Please enter a passcode');
            return;
        }

        setIsLoading(true);
        try {
            // new: GET /rooms/passcode/:passcode
            const response = await api.get(`/rooms/passcode/${passcode}`);
            setRoomInfo(response.data);
            setIsPrivate(response.data.type === 'private');
            toast.success('Room found! Please enter passcode if required.');
        } catch (error) {
            // Suppress the 400 from invalid ObjectId
            if (error.response?.status === 400) {
                toast.error('Room not found');
            } else {
                console.error('Unexpected error finding room:', error);
                toast.error(error.response?.data?.message || 'Failed to find room');
            }
            setRoomInfo(null);
        } finally {
            setIsLoading(false);
        }
    };


    const handleJoinRoom = async (e) => {
        e.preventDefault();
        if (!roomInfo) return;              // nothing to join yet
        setIsLoading(true);

        try {
            // await api.post(`/rooms/${roomData.roomId}/join`, {
            await api.post(
                `/rooms/${roomInfo._id}/join`,
                { userId: currentUser._id, passcode }
            );

            toast.success('Joined room successfully');
            navigate(`/rooms/${roomInfo._id}`);
        } catch (error) {
            const status = error.response?.status;
            if (status === 401) {
                toast.error('Invalid passcode');
            } else if (status === 400) {
                toast.error('Cannot join this room');
            } else {
                console.error('Unexpected error joining room:', error);
                toast.error(error.response?.data?.message || 'Failed to join room');
            }
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-6 text-center text-indigo-600">
                    Join Private Room
                </h2>

                <div className="mb-4">
                    <label
                        htmlFor="passcode"
                        className="block text-gray-700 text-sm font-bold mb-2"
                    >
                        Passcode
                    </label>
                    <div className="flex">
                        <input
                            id="passcode"
                            type="text"
                            value={passcode}
                            onChange={handleChange}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Enter room passcode"
                        />
                        <button
                            type="button"
                            onClick={handleCheckRoom}
                            disabled={isLoading}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-r-md"
                        >
                            Check
                        </button>
                    </div>
                </div>

                {roomInfo && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-md">
                        <h3 className="font-bold text-lg">{roomInfo.name}</h3>
                        <div className="flex gap-2 mt-2">
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                {roomInfo.status === 'waiting'
                                    ? 'Waiting for Players'
                                    : 'In Progress'}
                            </span>
                        </div>
                        <div className="mt-2 text-sm">
                            <p>
                                Players: {roomInfo.players.length}/{roomInfo.maxPlayers}
                            </p>
                            <p>Rounds: {roomInfo.maxRounds}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleJoinRoom}>
                    <button
                        type="submit"
                        disabled={isLoading || !roomInfo}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
                    >
                        {isLoading ? 'Joining...' : 'Join Room'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default JoinRoom;