import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { AuthContext } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import PlayerList from "./PlayerList";
import Question from "./Question";
import { toast } from "react-toastify";
import Timer from "./Timer";

const GameRoom = () => {
  const { roomId } = useParams();
  const { currentUser } = useContext(AuthContext);
  const { socket, joinRoom, leaveRoom, startGame, submitAnswer, nextRound } =
    useSocket();
  const [room, setRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [roundResults, setRoundResults] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [answerTime, setAnswerTime] = useState(null);
  const [canAnswer, setCanAnswer] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigate = useNavigate();

  // Function to check if user is host - memoized to avoid stale closures
  const isUserHost = useCallback(() => {
    return room?.host?._id === currentUser?._id;
  }, [room, currentUser]);

  // Function to check if user is in room - memoized to avoid stale closures
  const isUserInRoom = useCallback(() => {
    return room?.players?.some(
      (player) => player.user._id === currentUser?._id
    );
  }, [room, currentUser]);

  // API call to fetch room details
  const fetchRoomDetails = useCallback(
    async (force = false) => {
      try {
        if (!room) setIsLoading(true);

        const response = await api.get(`/rooms/${roomId}`);

        if (response.data) {
          // Store previous state for comparison
          const prevRoom = room;

          // Avoid complete replacement of state to reduce flickering
          setRoom((prev) => {
            if (!prev) return response.data;

            return {
              ...prev,
              ...response.data,
              // Preserve answers if they exist in previous state but not in new data
              // This helps with reducing flickering during state transitions
              answers: response.data.answers || prev.answers,
              // Ensure we keep a valid status during transitions
              status: response.data.status || prev.status,
            };
          });

          // Check if user has answered the current question
          if (
            response.data.status === "playing" &&
            response.data.currentQuestion
          ) {
            const userAnsweredCurrentQuestion = response.data.answers?.some(
              (a) =>
                a.user === currentUser._id &&
                a.question === response.data.currentQuestion._id &&
                a.round === response.data.currentRound
            );
            setHasAnswered(userAnsweredCurrentQuestion);
          }

          // Update question timer when current question changes
          if (
            response.data.status === "playing" &&
            response.data.currentQuestion &&
            (!prevRoom ||
              prevRoom.currentQuestion?._id !==
                response.data.currentQuestion._id ||
              prevRoom.currentRound !== response.data.currentRound)
          ) {
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
          if (
            response.data.status === "playing" &&
            response.data.currentQuestion &&
            !isTransitioning
          ) {
            const answerCount =
              response.data.answers?.filter(
                (a) =>
                  a.question === response.data.currentQuestion?._id &&
                  a.round === response.data.currentRound
              ).length || 0;

            const allAnswered =
              answerCount === response.data.players.length &&
              response.data.players.length > 0;

            if (allAnswered && !roundResults) {
              // Count yes/no answers
              const yesAnswers =
                response.data.answers?.filter(
                  (a) =>
                    a.question === response.data.currentQuestion?._id &&
                    a.round === response.data.currentRound &&
                    a.answer === true
                ).length || 0;

              const noAnswers = answerCount - yesAnswers;

              // Set round results in a timeout to avoid state churn
              setTimeout(() => {
                setRoundResults({
                  yesCount: yesAnswers,
                  noCount: noAnswers,
                  question: response.data.currentQuestion?.text,
                });
              }, 500);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching room details:", error);
        // Only set error state if it's a critical failure
        if (!room) {
          setError("Failed to load room details");
        } else {
          // Just notify via toast for subsequent failures, but only if not transitioning
          if (!isTransitioning) {
            toast.error("Failed to refresh room data. Will retry shortly.");
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [roomId, currentUser, room, isTransitioning, roundResults]
  );

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
      if (socket && roomId && currentUser) {
        leaveRoom(roomId, currentUser._id);
      }
    };
  }, [roomId, currentUser, socket, joinRoom, leaveRoom, fetchRoomDetails]);

  // Socket event listeners setup
  useEffect(() => {
    if (!socket) return;

    // Define socket event handlers
    const socketHandlers = {
      "player-joined": (data) => {
        toast.info(`${data.user.name} joined the room`);
        setRoom((prev) => {
          if (!prev) return prev;

          // Check if player already exists
          const playerExists = prev.players.some(
            (p) => p.user._id === data.user._id
          );
          if (playerExists) return prev;

          return {
            ...prev,
            players: [...prev.players, { user: data.user }],
          };
        });
      },

      "player-left": (data) => {
        if (data && data.user) {
          toast.info(`${data.user.name} left the room`);
          setRoom((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              players: prev.players.filter((p) => p.user._id !== data.user._id),
            };
          });
        }
        fetchRoomDetails(true);
      },

      "host-changed": (data) => {
        if (data.newHostId === currentUser._id) {
          toast.success("You are now the host of this room");
        } else if (data.newHost && data.newHost.name) {
          toast.info(`${data.newHost.name} is now the host`);
        }
        setRoom((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            host: data.newHost,
          };
        });
      },

      "game-started": (data) => {
        toast.info("Game started!");

        // Set transition flag to prevent flickering
        setIsTransitioning(true);

        setHasAnswered(false);
        setRoundResults(null);
        setCanAnswer(false);

        // Set timer for enabling answer buttons
        setQuestionStartTime(new Date().getTime());

        // Update state in a controlled manner
        setRoom((prev) => ({
          ...prev,
          status: "playing",
          currentRound: 1,
          currentQuestion: data.currentQuestion,
        }));

        setTimeout(() => {
          setCanAnswer(true);
          setIsTransitioning(false);
        }, 3000);
      },

      "player-answered": (data) => {
        // Update the room state with the new answer without a full refresh
        if (room && data && data.userId) {
          setRoom((prev) => {
            if (!prev) return prev;

            // Check if this answer already exists
            const answerExists = prev.answers?.some(
              (a) =>
                a.user === data.userId &&
                a.question === prev.currentQuestion?._id &&
                a.round === prev.currentRound
            );

            // If the answer already exists, don't modify the state
            if (answerExists) return prev;

            const updatedAnswers = [
              ...(prev.answers || []),
              {
                user: data.userId,
                question: prev.currentQuestion?._id,
                round: prev.currentRound,
                answer: data.answer,
                timeToAnswer: data.timeToAnswer,
              },
            ];

            // Check if all players have answered
            const answerCount = updatedAnswers.filter(
              (a) =>
                a.question === prev.currentQuestion?._id &&
                a.round === prev.currentRound
            ).length;

            // If all players have answered, we'll prepare to show results
            if (
              answerCount === prev.players.length &&
              prev.players.length > 0 &&
              !roundResults
            ) {
              const yesAnswers = updatedAnswers.filter(
                (a) =>
                  a.question === prev.currentQuestion?._id &&
                  a.round === prev.currentRound &&
                  a.answer === true
              ).length;

              const noAnswers = answerCount - yesAnswers;

              // Set round results in a timeout to avoid state churn
              setTimeout(() => {
                setRoundResults({
                  yesCount: yesAnswers,
                  noCount: noAnswers,
                  question: prev.currentQuestion?.text,
                });
              }, 500);
            }

            // Return new state with updated answers
            return {
              ...prev,
              answers: updatedAnswers,
              // Make sure status stays as playing
              status: prev.status,
            };
          });
        }
      },

      "all-players-answered": (data) => {
        // Set round results directly from socket data
        if (data) {
          setRoundResults(data);
        }

        // Alert only the host about the next round option
        if (isUserHost()) {
          toast.info(
            "All players answered! You can proceed to the next round."
          );
        }
      },

      "round-started": (data) => {
        // Set transition flag to prevent flickering
        setIsTransitioning(true);

        toast.info(`Round ${data.currentRound} started!`);

        // Update state in batches to reduce renders
        setRoundResults(null);
        setHasAnswered(false);
        setCanAnswer(false);

        // Update room state with new round info
        setRoom((prev) => {
          if (!prev) return prev;
          
          return {
            ...prev,
            currentRound: data.currentRound,
            currentQuestion: data.currentQuestion,
            // Ensure status stays as "playing"
            status: "playing",
            // Reset answers for new round to prevent stale data
            answers:
              prev.answers?.filter((a) => a.round !== data.currentRound) || [],
          };
        });

        // Reset question timer
        setQuestionStartTime(new Date().getTime());

        // Wait for animation to complete before allowing answers
        setTimeout(() => {
          setCanAnswer(true);
          setIsTransitioning(false);
        }, 3000);
      },

      "game-ended": () => {
        toast.success("Game ended!");
        setRoom((prev) => ({
          ...prev,
          status: "completed"
        }));
        setTimeout(() => {
          navigate("/leaderboard");
        }, 1000);
      },

      "room-closed": () => {
        toast.info("Room was closed");
        navigate("/rooms");
      },

      error: ({ message }) => {
        toast.error(message);
      },
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
  }, [
    socket,
    fetchRoomDetails,
    roomId,
    currentUser,
    room,
    isUserHost,
    navigate,
    roundResults,
  ]);

  // Set up a simple polling interval to keep data fresh (especially useful if sockets fail)
  // useEffect(() => {
  //   const pollInterval = setInterval(() => {
  //     if (!isTransitioning && room) {
  //       fetchRoomDetails();
  //     }
  //   }, 10000); // Poll every 10 seconds as a backup

  //   return () => clearInterval(pollInterval);
  // }, [fetchRoomDetails, isTransitioning, room]);

  // Join room function
  const handleJoinRoom = async () => {
    try {
      setIsJoining(true);
      await api.post(`/rooms/${roomId}/join`, {
        userId: currentUser._id,
        passcode: room.type === "private" ? passcode : undefined,
      });

      // Join socket room
      joinRoom(roomId, currentUser._id);
      toast.success("Joined room successfully");
      fetchRoomDetails(true);
    } catch (error) {
      console.error("Error joining room:", error);
      toast.error(error.response?.data?.message || "Failed to join room");
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
      toast.info("Left room successfully");
      navigate("/rooms");
    } catch (error) {
      console.error("Error leaving room:", error);
      toast.error("Failed to leave room");
    }
  };

  // Start game function
  const handleStartGame = async () => {
    try {
      if (!isUserHost()) {
        toast.error("Only the host can start the game");
        return;
      }

      // Set transition flag to prevent flickering
      setIsTransitioning(true);

      const response = await api.post(`/rooms/${roomId}/start`, {
        userId: currentUser._id,
      });

      // Emit socket event to all clients
      startGame(roomId);

      // Update local state immediately
      setRoom((prev) => ({
        ...prev,
        status: "playing",
        currentRound: 1,
        currentQuestion: response.data.currentQuestion,
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
      console.error("Error starting game:", error);
      toast.error(error.response?.data?.message || "Failed to start game");
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
        timeToAnswer,
      });

      // Emit socket event
      submitAnswer(roomId, currentUser._id, answer, timeToAnswer);

      // Update local room state to reflect answer
      if (room) {
        setRoom((prev) => {
          if (!prev) return prev;
          
          return {
            ...prev,
            answers: [
              ...(prev.answers || []),
              {
                user: currentUser._id,
                question: prev.currentQuestion._id,
                round: prev.currentRound,
                answer: answer,
                timeToAnswer: timeToAnswer,
              },
            ],
            // Ensure status stays as "playing"
            status: "playing",
          };
        });
      }

      // Show feedback about timing
      if (timeToAnswer < 3) {
        toast.info("Base points only - answered too quickly!");
      } else if (timeToAnswer <= 5) {
        toast.success("Speed bonus: +3 points!");
      } else if (timeToAnswer <= 15) {
        toast.success("Speed bonus: +1 point!");
      } else {
        toast.info("Base points only - answered too slowly");
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast.error("Failed to submit answer");
      setHasAnswered(false);
    }
  };

  // Next round function
  const handleNextRound = async () => {
    try {
      if (!isUserHost()) {
        toast.error("Only the host can advance to the next round");
        return;
      }

      // Set transition flag to prevent flickering during round change
      setIsTransitioning(true);

      // Reset local state immediately
      setRoundResults(null);
      setHasAnswered(false);

      // Check if this is the final round
      const isFinalRound = room.currentRound >= room.maxRounds;

      // Keep status as "playing" during transitions to prevent "unknown status"
      setRoom((prev) => ({
        ...prev,
        currentRound: isFinalRound ? prev.currentRound : prev.currentRound + 1,
        status: "playing", // Always keep a valid status
      }));

      const response = await api.post(`/rooms/${roomId}/next-round`, {
        userId: currentUser._id,
      });

      // Emit socket event
      nextRound(roomId);

      // Update local state with response data
      if (response.data) {
        // If game ended
        if (response.data.status === "completed") {
          toast.success("Game completed!");
          setRoom((prev) => ({
            ...prev,
            status: "completed",
          }));
          setTimeout(() => {
            navigate("/leaderboard");
          }, 1000);
          return;
        }

        // If moving to next round
        setRoom((prev) => ({
          ...prev,
          currentRound: response.data.currentRound,
          currentQuestion: response.data.currentQuestion,
          status: response.data.status || "playing", // Fallback to playing if status is missing
          // Reset answers for new round
          answers:
            prev.answers?.filter(
              (a) => a.round !== response.data.currentRound
            ) || [],
        }));

        setQuestionStartTime(new Date().getTime());

        // Enable answering after 3 seconds
        setTimeout(() => {
          setCanAnswer(true);
          setIsTransitioning(false);
        }, 3000);
      }
    } catch (error) {
      console.error("Error advancing to next round:", error);
      toast.error(
        error.response?.data?.message || "Failed to advance to next round"
      );
      // Reset transition flag if there was an error
      setIsTransitioning(false);
      // Ensure room stays in a valid state even on error
      setRoom((prev) => ({
        ...prev,
        status: "playing", // Keep status as playing on error
      }));
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
          <svg
            className="w-16 h-16 text-red-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <h2 className="text-2xl font-bold mb-2">Error Loading Room</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => navigate("/rooms")}
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
          <svg
            className="w-16 h-16 text-gray-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <h2 className="text-2xl font-bold mb-2">Room Not Found</h2>
          <p className="mb-4 text-gray-600">
            The room you're looking for doesn't exist or has been closed.
          </p>
          <button
            onClick={() => navigate("/rooms")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            Back to Room List
          </button>
        </div>
      </div>
    );
  }

  // Calculate the count of players who have answered
  const answerCount =
    room.answers?.filter(
      (a) =>
        a.question === room.currentQuestion?._id &&
        a.round === room.currentRound
    ).length || 0;

  // Calculate the total number of players
  const totalPlayers = room.players.length;

  // Calculate if all players have answered
  const allPlayersAnswered = answerCount === totalPlayers && totalPlayers > 0;

  // Determine room status for rendering - fallback to "waiting" if status is invalid
  const roomStatus = ["waiting", "playing", "completed"].includes(room.status)
    ? room.status
    : "waiting";

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Room header with improved styling */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl shadow-sm border border-indigo-100">
        <div className="flex flex-col md:flex-row items-center mb-4 md:mb-0">
          <h1 className="text-2xl font-bold text-indigo-800">{room.name}</h1>
          <div className="flex flex-wrap gap-2 mt-2 md:mt-0 md:ml-4">
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full ${
                roomStatus === "waiting"
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : "bg-blue-100 text-blue-800 border border-blue-200"
              }`}
            >
              {roomStatus === "waiting"
                ? "Waiting for Players"
                : `Round ${room.currentRound} of ${room.maxRounds}`}
            </span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
              {room.type === "public" ? "Public Room" : "Private Room"}
            </span>
          </div>
        </div>
        <div className="w-full md:w-auto">
          {isUserInRoom() ? (
            <button
              onClick={handleLeaveRoom}
              className="w-full md:w-auto bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-md transition-colors shadow-sm"
            >
              Leave Room
            </button>
          ) : (
            <button
              onClick={handleJoinRoom}
              disabled={
                isJoining ||
                roomStatus !== "waiting" ||
                room.players.length >= room.maxPlayers
              }
              className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md transition-colors shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isJoining ? "Joining..." : "Join Room"}
            </button>
          )}
        </div>
      </div>

      {/* Private room passcode input */}
      {room.type === "private" && !isUserInRoom() && (
        <div className="mb-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <label className="block mb-2 font-medium text-gray-700">
            Room Passcode:
          </label>
          <div className="flex">
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="border border-gray-300 p-3 rounded-l-md flex-grow focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter the room passcode"
            />
            <button
              onClick={handleJoinRoom}
              disabled={isJoining || !passcode}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-r-md transition-colors disabled:bg-gray-400"
            >
              Enter
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            You need the passcode to enter this private room
          </p>
        </div>
      )}

      {/* Main content area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - Player list and controls */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
              Players
            </h2>
            <PlayerList
              players={room.players.map((player) => ({
                ...player,
                hasAnswered: room.answers?.some(
                  (a) =>
                    a.user === player.user._id &&
                    a.question === room.currentQuestion?._id &&
                    a.round === room.currentRound
                ),
              }))}
              host={room.host}
              currentUser={currentUser}
            />

            {isUserHost() && room.status === "waiting" && (
              <button
                onClick={handleStartGame}
                disabled={room.players.length < 2}
                className="w-full mt-6 bg-green-500 hover:bg-green-600 text-white py-3 rounded-md font-medium transition-colors shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {room.players.length < 2
                  ? "Need at least 2 players"
                  : "Start Game"}
              </button>
            )}

            {room.status === "playing" && (
              <div className="mt-6 bg-blue-50 p-4 rounded">
                <h3 className="font-semibold mb-2">Game Progress</h3>
                <div className="flex justify-between mb-2">
                  <span>Round:</span>
                  <span>
                    {room.currentRound} of {room.maxRounds}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Answers:</span>
                  <span>
                    {answerCount} of {totalPlayers}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            {room.status === "waiting" ? (
              <div className="bg-white p-8 rounded-lg shadow-sm text-center animate-fade-in">
                <div className="mb-6">
                  <svg
                    className="w-16 h-16 mx-auto text-indigo-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                </div>
                <h2 className="text-xl font-bold mb-4">
                  Waiting for players to join...
                </h2>
                <p className="text-gray-600 mb-2">
                  {isUserHost()
                    ? 'When you\'re ready, click "Start Game" to begin!'
                    : "The game will start when the host is ready."}
                </p>
                <p className="text-sm text-gray-500">
                  Players: {room.players.length}/{room.maxPlayers} • Rounds:{" "}
                  {room.maxRounds}
                </p>
              </div>
            ) : room.status === "playing" ? (
              <div
                className={`bg-white p-6 rounded-lg shadow-sm transition-opacity duration-300 ${
                  isTransitioning ? "opacity-50" : "opacity-100"
                }`}
              >
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

                {room.currentQuestion && !roundResults ? (
                  <Question
                    question={room.currentQuestion}
                    onAnswer={handleAnswer}
                    disabled={
                      !isUserInRoom() ||
                      hasAnswered ||
                      !canAnswer ||
                      isTransitioning
                    }
                    hasAnswered={hasAnswered}
                    canAnswer={canAnswer}
                  />
                ) : roundResults ? (
                  // Show round results if available
                  <div className="mt-6 bg-blue-50 p-6 rounded-lg border border-blue-100 animate-fade-in">
                    <h3 className="text-xl font-bold mb-4 text-center">
                      Round Results
                    </h3>

                    <div className="flex justify-around mb-6">
                      <div className="text-center p-4 bg-white rounded-lg shadow-sm w-40">
                        <div className="text-3xl font-bold text-green-600">
                          {roundResults?.yesCount || 0}
                        </div>
                        <div className="text-gray-600">Said Yes</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg shadow-sm w-40">
                        <div className="text-3xl font-bold text-red-600">
                          {roundResults?.noCount || 0}
                        </div>
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
                          className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-md font-medium transition-colors ${
                            isTransitioning
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          {isTransitioning
                            ? "Processing..."
                            : room.currentRound >= room.maxRounds
                            ? "End Game"
                            : "Next Round"}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-lg text-gray-500">
                      Waiting for the next question...
                    </p>
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
                          style={{
                            width: `${
                              totalPlayers > 0
                                ? (answerCount / totalPlayers) * 100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {allPlayersAnswered && !roundResults && (
                  <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="text-center font-medium">
                      All players have answered!
                    </p>
                    {isUserHost() && (
                      <button
                        onClick={handleNextRound}
                        className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-md font-medium transition-colors"
                      >
                        {room.currentRound >= room.maxRounds
                          ? "End Game"
                          : "Next Round"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : room.status === "completed" ? (
              <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                <svg
                  className="w-16 h-16 mx-auto text-green-500 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <h2 className="text-xl font-bold mb-4">Game completed!</h2>
                <p className="text-gray-600 mb-4">
                  Check the leaderboard to see the final scores.
                </p>
                <button
                  onClick={() => navigate("/leaderboard")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md transition-colors font-medium"
                >
                  View Leaderboard
                </button>
              </div>
            ) : (
              // Fallback for unknown status
              <div className="bg-gray-100 p-6 rounded-lg text-center">
                <h2 className="text-xl mb-2">Game status unknown</h2>
                <p>Please refresh the page or return to the rooms list.</p>
                <button
                  onClick={() => navigate("/rooms")}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Back to Rooms
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
