import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import PlayerList from './PlayerList';
import Question from './Question';
import { toast } from 'react-toastify';
import Timer from './Timer';

const GameRoom = () => {
  const { roomId } = useParams();
  const { currentUser } = useContext(AuthContext);
  const { socket, joinRoom, leaveRoom, startGame, submitAnswer, nextRound } = useSocket();
  const [room, setRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [roundResults, setRoundResults] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [answerTime, setAnswerTime] = useState(null);
  const [canAnswer, setCanAnswer] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [lastPollingUpdate, setLastPollingUpdate] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigate = useNavigate();

  // Add debounce mechanism for API calls
  const fetchTimeoutRef = useRef(null);
  const fetchInProgressRef = useRef(false);

  // Function to check if user is host - memoized to avoid stale closures
  const isUserHost = useCallback(() => {
    return room?.host?._id === currentUser?._id;
  }, [room, currentUser]);

  // Function to check if user is in room - memoized to avoid stale closures
  const isUserInRoom = useCallback(() => {
    return room?.players?.some(player => player.user._id === currentUser?._id);
  }, [room, currentUser]);

  // API call to fetch room details - improved with better debouncing
  const fetchRoomDetails = useCallback(async (force = false) => {
    // Clear any pending fetch timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }

    // Skip if already fetching data unless forced
    if (fetchInProgressRef.current && !force) return;

    // Skip if we're in transition between rounds to prevent flickering
    if (isTransitioning && !force) return;

    // Skip refresh if it's been less than 3 seconds since the last update
    // unless it's a forced refresh
    if (!force && Date.now() - lastUpdated < 3000) {
      return;
    }

    try {
      fetchInProgressRef.current = true;
      setIsRefreshing(true);
      if (!room) setIsLoading(true);

      const response = await api.get(`/rooms/${roomId}`);

      if (response.data) {
        // Store previous state for comparison
        const prevRoom = room;

        // Avoid complete replacement of state to reduce flickering
        setRoom(prev => {
          if (!prev) return response.data;

          return {
            ...prev,
            ...response.data,
            // Preserve answers if they exist in previous state but not in new data
            // This helps with reducing flickering during state transitions
            answers: response.data.answers || prev.answers,
          };
        });

        // Check if user has answered the current question
        if (response.data.status === 'playing' && response.data.currentQuestion) {
          const userAnsweredCurrentQuestion = response.data.answers?.some(
            a => a.user === currentUser._id &&
              a.question === response.data.currentQuestion._id &&
              a.round === response.data.currentRound
          );
          setHasAnswered(userAnsweredCurrentQuestion);
        }

        // Update question timer when current question changes
        if (response.data.status === 'playing' &&
          response.data.currentQuestion &&
          (!prevRoom ||
            prevRoom.currentQuestion?._id !== response.data.currentQuestion._id ||
            prevRoom.currentRound !== response.data.currentRound)) {

          // Only update these states if not in a transition to prevent flickering
          if (!isTransitioning) {
            setQuestionStartTime(new Date().getTime());
            setCanAnswer(false);
            setRoundResults(null);

            // Reset the answer timer
            setTimeout(() => {
              setCanAnswer(true);
            }, 3000);
          }
        }

        // Update round results if all players have answered
        if (response.data.status === 'playing' && response.data.currentQuestion && !isTransitioning) {
          const answerCount = response.data.answers?.filter(
            a => a.question === response.data.currentQuestion?._id &&
              a.round === response.data.currentRound
          ).length || 0;

          const allAnswered = answerCount === response.data.players.length &&
            response.data.players.length > 0;

          if (allAnswered && !roundResults) {
            // Count yes/no answers
            const yesAnswers = response.data.answers?.filter(
              a => a.question === response.data.currentQuestion?._id &&
                a.round === response.data.currentRound &&
                a.answer === true
            ).length || 0;

            const noAnswers = answerCount - yesAnswers;

            setRoundResults({
              yesCount: yesAnswers,
              noCount: noAnswers,
              question: response.data.currentQuestion?.text
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching room details:', error);
      // Only set error state if it's a critical failure
      if (!room) {
        setError('Failed to load room details');
      } else {
        // Just notify via toast for subsequent failures, but only if not transitioning
        if (!isTransitioning) {
          toast.error('Failed to refresh room data. Will retry shortly.');
        }
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      fetchInProgressRef.current = false;
      // Only update lastUpdated timestamp on successful fetches
      const updateTime = Date.now();
      setLastUpdated(updateTime);
      setLastPollingUpdate(updateTime);
    }
  }, [roomId, currentUser, room, isLoading, isTransitioning]);

  // Improved polling logic with exponential backoff
  const scheduleNextFetch = useCallback((delay = 5000) => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    fetchTimeoutRef.current = setTimeout(() => {
      if (!isTransitioning && !fetchInProgressRef.current) {
        fetchRoomDetails();
      }
    }, delay);
  }, [fetchRoomDetails, isTransitioning]);

  // Initial load and socket connection for realtime communication
  useEffect(() => {
    fetchRoomDetails(true);

    // Connect to socket on component mount
    if (socket && roomId && currentUser) {
      // Try to join socket room immediately if user ID is available
      joinRoom(roomId, currentUser._id);
    }

    // Cleanup on unmount
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      if (socket && roomId && currentUser) {
        leaveRoom(roomId, currentUser._id);
      }
    };
  }, [roomId, currentUser, socket, joinRoom, leaveRoom]);

  // Socket event listeners setup
  useEffect(() => {
    if (!socket) return;

    // Define socket event handlers
    const socketHandlers = {
      'player-joined': (data) => {
        toast.info(`${data.user.name} joined the room`);
        fetchRoomDetails(true);
      },

      'player-left': (data) => {
        if (data && data.user) {
          toast.info(`${data.user.name} left the room`);
        }
        fetchRoomDetails(true);
      },

      'host-changed': (data) => {
        if (data.newHostId === currentUser._id) {
          toast.success("You are now the host of this room");
        } else if (data.newHost && data.newHost.name) {
          toast.info(`${data.newHost.name} is now the host`);
        }
        fetchRoomDetails(true);
      },

      'game-started': (data) => {
        toast.info('Game started!');

        // Set transition flag to prevent flickering
        setIsTransitioning(true);

        setHasAnswered(false);
        setRoundResults(null);
        setCanAnswer(false);

        // Set timer for enabling answer buttons
        setQuestionStartTime(new Date().getTime());

        // Update state in a controlled manner
        setRoom(prev => ({
          ...prev,
          status: 'playing',
          currentRound: 1,
          currentQuestion: data.currentQuestion
        }));

        setTimeout(() => {
          setCanAnswer(true);
          setIsTransitioning(false);
          fetchRoomDetails(true);
        }, 3000);
      },

      'player-answered': (data) => {
        // Update the room state with the new answer without a full refresh
        if (room && data && data.userId) {
          setRoom(prev => {
            // Check if this answer already exists
            const answerExists = prev.answers?.some(
              a => a.user === data.userId &&
                a.question === prev.currentQuestion._id &&
                a.round === prev.currentRound
            );

            // If the answer already exists, don't modify the state
            if (answerExists) return prev;

            const updatedAnswers = [
              ...(prev.answers || []),
              {
                user: data.userId,
                question: prev.currentQuestion._id,
                round: prev.currentRound,
                answer: data.answer
              }
            ];

            // Check if all players have answered
            const answerCount = updatedAnswers.filter(
              a => a.question === prev.currentQuestion._id &&
                a.round === prev.currentRound
            ).length;

            // If all players have answered, we'll prepare to show results
            if (answerCount === prev.players.length && prev.players.length > 0 && !roundResults) {
              const yesAnswers = updatedAnswers.filter(
                a => a.question === prev.currentQuestion._id &&
                  a.round === prev.currentRound &&
                  a.answer === true
              ).length;

              const noAnswers = answerCount - yesAnswers;

              // Set round results in a timeout to avoid state churn
              setTimeout(() => {
                setRoundResults({
                  yesCount: yesAnswers,
                  noCount: noAnswers,
                  question: prev.currentQuestion.text
                });
              }, 500);
            }

            // Return new state with updated answers
            return {
              ...prev,
              answers: updatedAnswers
            };
          });
        }
      },

      'all-players-answered': (data) => {
        // Set round results directly from socket data
        if (data) {
          setRoundResults(data);
        }

        // Alert only the host about the next round option
        if (isUserHost()) {
          toast.info('All players answered! You can proceed to the next round.');
        }
      },

      'round-started': (data) => {
        // Set transition flag to prevent flickering
        setIsTransitioning(true);

        toast.info(`Round ${data.currentRound} started!`);

        // Update state in batches to reduce renders
        setRoundResults(null);
        setHasAnswered(false);
        setCanAnswer(false);

        // Update room state with new round info
        setRoom(prev => ({
          ...prev,
          currentRound: data.currentRound,
          currentQuestion: data.currentQuestion,
        }));

        // Reset question timer
        setQuestionStartTime(new Date().getTime());

        // Wait for animation to complete before allowing answers
        setTimeout(() => {
          setCanAnswer(true);
          setIsTransitioning(false);
          fetchRoomDetails(true);
        }, 3000);
      },

      'game-ended': () => {
        toast.success('Game ended!');
        navigate('/leaderboard');
      },

      'room-closed': () => {
        toast.info('Room was closed');
        navigate('/rooms');
      },

      'error': ({ message }) => {
        toast.error(message);
      }
    };

    // Register all event handlers
    Object.entries(socketHandlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    // Cleanup function to remove event listeners
    return () => {
      Object.entries(socketHandlers).forEach(([event, _]) => {
        socket.off(event);
      });
    };
  }, [socket, fetchRoomDetails, roomId, currentUser, room, isUserHost, navigate, roundResults]);

  // Improved polling strategy - less frequent and with condition checks
  useEffect(() => {
    // Only poll if:
    // 1. We have a room
    // 2. Not currently refreshing
    // 3. Not in transition
    // 4. Last poll was more than 30 seconds ago
    if (room && !isRefreshing && !isTransitioning && Date.now() - lastPollingUpdate > 30000) {
      scheduleNextFetch();
    }

    // Set up a recurring polling with increasing intervals based on activity
    const pollingInterval = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastPollingUpdate;

      if (!isRefreshing && !isTransitioning) {
        // Use exponential backoff: poll more frequently during active game play, less during waiting
        const baseInterval = room?.status === 'playing' ? 15000 : 30000;
        const maxInterval = 60000; // Max 1 minute

        // Calculate next interval with some randomness to avoid all clients hitting server at same time
        const nextInterval = Math.min(
          baseInterval * Math.pow(1.5, Math.floor(timeSinceLastUpdate / baseInterval)),
          maxInterval
        ) * (0.8 + Math.random() * 0.4); // Add ±20% randomness

        if (timeSinceLastUpdate > nextInterval) {
          console.log('Scheduled polling update...');
          fetchRoomDetails();
        }
      }
    }, 5000);

    return () => clearInterval(pollingInterval);
  }, [fetchRoomDetails, room, lastPollingUpdate, isRefreshing, isTransitioning, scheduleNextFetch]);

  // Join room function
  const handleJoinRoom = async () => {
    try {
      setIsJoining(true);
      await api.post(`/rooms/${roomId}/join`, {
        userId: currentUser._id,
        passcode: room.type === 'private' ? passcode : undefined
      });

      // Join socket room
      joinRoom(roomId, currentUser._id);
      toast.success('Joined room successfully');
      fetchRoomDetails(true);
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error(error.response?.data?.message || 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  // Leave room function
  const handleLeaveRoom = async () => {
    try {
      // First check if user is the host
      if (isUserHost()) {
        // Confirm with the user if they want to transfer host status
        const confirmLeave = window.confirm(
          "You are the host of this room. Leaving will transfer host status to another player. Are you sure you want to leave?"
        );

        if (!confirmLeave) {
          return;
        }
      }

      await api.post(`/rooms/${roomId}/leave`, { userId: currentUser._id });
      leaveRoom(roomId, currentUser._id);
      toast.info('Left room successfully');
      navigate('/rooms');
    } catch (error) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room');
    }
  };

  // Start game function
  const handleStartGame = async () => {
    try {
      if (!isUserHost()) {
        toast.error('Only the host can start the game');
        return;
      }

      // Set transition flag to prevent flickering
      setIsTransitioning(true);

      const response = await api.post(`/rooms/${roomId}/start`, { userId: currentUser._id });

      // Emit socket event to all clients
      startGame(roomId);

      // Update local state immediately
      setRoom(prev => ({
        ...prev,
        status: 'playing',
        currentRound: 1,
        currentQuestion: response.data.currentQuestion
      }));

      setHasAnswered(false);
      setRoundResults(null);
      setQuestionStartTime(new Date().getTime());

      // Enable answering after 3 seconds
      setTimeout(() => {
        setCanAnswer(true);
        setIsTransitioning(false);
      }, 3000);
    } catch (error) {
      console.error('Error starting game:', error);
      toast.error(error.response?.data?.message || 'Failed to start game');
      setIsTransitioning(false);
    }
  };

  // Answer question function
  const handleAnswer = async (answer) => {
    try {
      // Calculate answer time
      const now = new Date().getTime();
      const timeToAnswer = (now - questionStartTime) / 1000;
      setAnswerTime(timeToAnswer);

      // Update local state immediately
      setHasAnswered(true);

      // Include time in answer submission
      await api.post(`/rooms/${roomId}/answers`, {
        userId: currentUser._id,
        answer,
        timeToAnswer
      });

      // Emit socket event
      submitAnswer(roomId, currentUser._id, answer, timeToAnswer);

      // Update local room state to reflect answer
      if (room) {
        setRoom(prev => ({
          ...prev,
          answers: [
            ...(prev.answers || []),
            {
              user: currentUser._id,
              question: prev.currentQuestion._id,
              round: prev.currentRound,
              answer: answer,
              timeToAnswer: timeToAnswer
            }
          ]
        }));
      }

      // Show feedback about timing
      if (timeToAnswer < 3) {
        toast.info('Base points only - answered too quickly!');
      } else if (timeToAnswer <= 5) {
        toast.success('Speed bonus: +3 points!');
      } else if (timeToAnswer <= 15) {
        toast.success('Speed bonus: +1 point!');
      } else {
        toast.info('Base points only - answered too slowly');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('Failed to submit answer');
      setHasAnswered(false);
    }
  };

  // Next round function
  const handleNextRound = async () => {
    try {
      if (!isUserHost()) {
        toast.error('Only the host can advance to the next round');
        return;
      }

      // Set transition flag to prevent flickering during round change
      setIsTransitioning(true);

      // Reset local state immediately
      setRoundResults(null);
      setHasAnswered(false);

      let nextRoundNumber = room.currentRound;
      if (room.currentRound >= room.maxRounds) {
        nextRoundNumber = room.maxRounds;
      } else {
        nextRoundNumber = room.currentRound + 1;
      }

      // Pre-update local state to reduce perception of delay
      setRoom(prev => ({
        ...prev,
        currentRound: nextRoundNumber,
        // We'll keep the current question until we get the new one from the server
      }));

      const response = await api.post(`/rooms/${roomId}/next-round`, { userId: currentUser._id });

      // Emit socket event
      nextRound(roomId);

      // Update local state with response data
      if (response.data) {
        // If game ended
        if (response.data.status === 'completed') {
          toast.success('Game completed!');
          setTimeout(() => {
            navigate('/leaderboard');
          }, 1000);
          return;
        }

        // If moving to next round
        setRoom(prev => ({
          ...prev,
          currentRound: response.data.currentRound,
          currentQuestion: response.data.currentQuestion,
          status: response.data.status,
          // Reset answers for new round
          answers: prev.answers?.filter(a => a.round !== response.data.currentRound) || []
        }));

        setQuestionStartTime(new Date().getTime());

        // Enable answering after 3 seconds
        setTimeout(() => {
          setCanAnswer(true);
          setIsTransitioning(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error advancing to next round:', error);
      toast.error(error.response?.data?.message || 'Failed to advance to next round');
      // Reset transition flag if there was an error
      setIsTransitioning(false);
    }
  };

  // Loading state - improved with skeleton UI
  if (isLoading && !room) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center">
          <div className="w-full max-w-4xl">
            {/* Header skeleton */}
            <div className="h-16 bg-gray-200 animate-pulse rounded-lg mb-6"></div>

            {/* Main content skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="h-64 bg-gray-200 animate-pulse rounded-lg"></div>
              </div>
              <div className="md:col-span-2">
                <div className="h-64 bg-gray-200 animate-pulse rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !room) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center">
        <div className="text-red-500 text-center p-8 bg-red-50 rounded-lg shadow-md max-w-lg w-full">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h2 className="text-2xl font-bold mb-2">Error Loading Room</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => navigate('/rooms')}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            Return to Room List
          </button>
        </div>
      </div>
    );
  }

  // Room not found state
  if (!room) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center">
        <div className="text-center p-8 bg-gray-50 rounded-lg shadow-md max-w-lg w-full">
          <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h2 className="text-2xl font-bold mb-2">Room Not Found</h2>
          <p className="mb-4 text-gray-600">The room you're looking for doesn't exist or has been closed.</p>
          <button
            onClick={() => navigate('/rooms')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            Back to Room List
          </button>
        </div>
      </div>
    );
  }

  // Calculate the count of players who have answered
  const answerCount = room.answers?.filter(
    a => a.question === room.currentQuestion?._id && a.round === room.currentRound
  ).length || 0;

  // Calculate the total number of players
  const totalPlayers = room.players.length;

  // Calculate if all players have answered
  const allPlayersAnswered = answerCount === totalPlayers && totalPlayers > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Room header with improved styling */}
      <div className="mb-8 bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-500 px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <h1 className="text-2xl font-bold text-white">{room.name}</h1>
              <div className="ml-4 flex gap-2">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${room.status === 'waiting'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
                  }`}>
                  {room.status === 'waiting'
                    ? 'Waiting for Players'
                    : `Round ${room.currentRound} of ${room.maxRounds}`}
                </span>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                  {room.type === 'public' ? 'Public Room' : 'Private Room'}
                </span>
              </div>
            </div>

            <div className="w-full md:w-auto">
              {isUserInRoom() ? (
                <button
                  onClick={handleLeaveRoom}
                  className="w-full md:w-auto bg-white text-red-600 border border-red-200 hover:bg-red-50 px-6 py-2 rounded-lg transition-colors shadow-sm font-medium"
                >
                  Leave Room
                </button>
              ) : (
                <button
                  onClick={handleJoinRoom}
                  disabled={isJoining || room.status !== 'waiting' || room.players.length >= room.maxPlayers}
                  className="w-full md:w-auto bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 px-6 py-2 rounded-lg transition-colors shadow-sm font-medium disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
                >
                  {isJoining ? 'Joining...' : 'Join Room'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Room details bar */}
      <div className="px-6 py-3 bg-indigo-50 flex flex-wrap gap-4 justify-between items-center text-sm">
        <div className="flex items-center">
          <svg className="w-4 h-4 text-indigo-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="font-medium text-gray-700">Host: {room.host?.name || 'Anonymous'}</span>
        </div>

        <div className="flex items-center">
          <svg className="w-4 h-4 text-indigo-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="font-medium text-gray-700">Players: {room.players.length}/{room.maxPlayers}</span>
        </div>

        <div className="flex items-center">
          <svg className="w-4 h-4 text-indigo-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium text-gray-700">Rounds: {room.maxRounds}</span>
        </div>

        {room.status === 'playing' && (
          <div className="flex items-center">
            <svg className="w-4 h-4 text-indigo-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="font-medium text-gray-700">Current Round: {room.currentRound}/{room.maxRounds}</span>
          </div>
        )}
      </div>

      {/* Private room passcode input */}
      {
        room.type === 'private' && !isUserInRoom() && (
          <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-full p-3">
                <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              <div className="flex-grow">
                <div className="mb-1.5 font-medium text-gray-800">Private Room</div>
                <p className="text-sm text-gray-600 mb-3">This room requires a passcode to enter</p>

                <div className="flex">
                  <input
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="border border-gray-300 p-3 rounded-l-lg flex-grow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter the room passcode"
                  />
                  <button
                    onClick={handleJoinRoom}
                    disabled={isJoining || !passcode}
                    className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-6 py-3 rounded-r-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {isJoining ? 'Entering...' : 'Enter Room'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Player list column */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Players</h2>
            </div>

            <div className="p-4">
              <PlayerList
                players={room.players.map(player => ({
                  ...player,
                  hasAnswered: room.answers?.some(
                    a => a.user === player.user._id &&
                      a.question === room.currentQuestion?._id &&
                      a.round === room.currentRound
                  )
                }))}
                host={room.host}
                currentUser={currentUser}
              />
            </div>

            {isUserHost() && room.status === 'waiting' && (
              <div className="p-4 border-t border-gray-100">
                <button
                  onClick={handleStartGame}
                  disabled={room.players.length < 2}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-3 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {room.players.length < 2 ? 'Need at least 2 players' : 'Start Game'}
                </button>
              </div>
            )}

            {room.status === 'playing' && (
              <div className="p-4 border-t border-gray-100">
                <div className="bg-indigo-50 p-5 rounded-lg">
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Game Progress
                  </h3>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Round:</span>
                      <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded font-medium">
                        {room.currentRound} of {room.maxRounds}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Answers:</span>
                      <div className="flex items-center">
                        <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded font-medium mr-2">
                          {answerCount} of {totalPlayers}
                        </span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-500 h-2 rounded-full"
                            style={{
                              width: `${totalPlayers > 0 ? (answerCount / totalPlayers) * 100 : 0}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-8">
            {room.status === 'waiting' ? (
              <div className="bg-white p-8 rounded-lg shadow-sm text-center animate-fade-in">
                <div className="mb-6">
                  <svg className="w-16 h-16 mx-auto text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h2 className="text-xl font-bold mb-4">Waiting for players to join...</h2>
                <p className="text-gray-600 mb-2">
                  {isUserHost()
                    ? 'When you\'re ready, click "Start Game" to begin!'
                    : 'The game will start when the host is ready.'}
                </p>
                <p className="text-sm text-gray-500">
                  Players: {room.players.length}/{room.maxPlayers} • Rounds: {room.maxRounds}
                </p>
              </div>
            ) : room.status === 'playing' ? (
              <div className={`bg-white p-6 rounded-lg shadow-sm transition-opacity duration-300 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
                <div className="mb-4 flex items-center justify-between">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    Round {room.currentRound} of {room.maxRounds}
                  </span>

                  {!roundResults && room.currentQuestion && !hasAnswered && (
                    <Timer
                      startTime={questionStartTime}
                      canAnswer={canAnswer}
                    />
                  )}
                </div>

                {(room.currentQuestion && !roundResults) ? (
                  <Question
                    question={room.currentQuestion}
                    onAnswer={handleAnswer}
                    disabled={!isUserInRoom() || hasAnswered || !canAnswer || isTransitioning}
                    hasAnswered={hasAnswered}
                    canAnswer={canAnswer}
                  />
                ) : roundResults ? (
                  // Show round results if available
                  <div className="mt-6 bg-blue-50 p-6 rounded-lg border border-blue-100 animate-fade-in">
                    <h3 className="text-xl font-bold mb-4 text-center">Round Results</h3>

                    <div className="flex justify-around mb-6">
                      <div className="text-center p-4 bg-white rounded-lg shadow-sm w-40">
                        <div className="text-3xl font-bold text-green-600">{roundResults?.yesCount || 0}</div>
                        <div className="text-gray-600">Said Yes</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg shadow-sm w-40">
                        <div className="text-3xl font-bold text-red-600">{roundResults?.noCount || 0}</div>
                        <div className="text-gray-600">Said No</div>
                      </div>
                    </div>

                    <div className="border-t border-blue-100 pt-4 text-center">
                      <p className="text-gray-600 mb-4">
                        {roundResults?.question || room.currentQuestion?.text}
                      </p>

                      {isUserHost() && (
                        <button
                          onClick={handleNextRound}
                          disabled={isTransitioning}
                          className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-md font-medium transition-colors ${isTransitioning ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isTransitioning ? 'Processing...' : room.currentRound >= room.maxRounds ? 'End Game' : 'Next Round'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-lg text-gray-500">Waiting for the next question...</p>
                  </div>
                )}

                {!roundResults && room.currentQuestion && (
                  <div className="mt-6 bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        {answerCount} of {totalPlayers} players answered
                      </span>
                      <div className="w-2/3 bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{ width: `${totalPlayers > 0 ? (answerCount / totalPlayers) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {allPlayersAnswered && !roundResults && (
                  <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="text-center font-medium">All players have answered!</p>
                    {isUserHost() && (
                      <button
                        onClick={handleNextRound}
                        className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-md font-medium transition-colors"
                      >
                        {room.currentRound >= room.maxRounds ? 'End Game' : 'Next Round'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-100 p-6 rounded-lg text-center">
                <h2 className="text-xl mb-2">Game completed!</h2>
                <p>Check the leaderboard to see the final scores.</p>
                <button
                  onClick={() => navigate('/leaderboard')}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  View Leaderboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div >
  );
};

export default GameRoom;