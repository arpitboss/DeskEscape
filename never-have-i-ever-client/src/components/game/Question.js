import React, { useEffect, useState } from 'react';

const Question = ({ question, onAnswer, disabled, hasAnswered, canAnswer }) => {
  const [animation, setAnimation] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  // Create animation when question appears
  useEffect(() => {
    if (!question) return;
    
    setAnimation('animate-pulse');
    setSelectedAnswer(null);
    
    const timer = setTimeout(() => setAnimation(''), 500);
    return () => clearTimeout(timer);
  }, [question]);

  const handleAnswer = (answer) => {
    setSelectedAnswer(answer);
    onAnswer(answer);
  };

  if (!question) {
    return (
      <div className="flex justify-center items-center h-48 bg-gray-50 rounded-lg">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${animation}`}>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-600 mb-2">Never have I ever...</h2>
        <p className="text-2xl text-indigo-700 font-medium">{question.text}</p>
      </div>

      {!canAnswer && !hasAnswered && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-lg my-6">
          <p className="flex items-center justify-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Take a moment to read the question...
          </p>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => handleAnswer(true)}
          disabled={disabled}
          className={`
            relative px-6 py-4 rounded-lg transition-all duration-200 shadow-sm
            ${hasAnswered && selectedAnswer === true 
              ? 'bg-indigo-100 text-indigo-800 border-2 border-indigo-300' 
              : hasAnswered 
                ? 'bg-gray-100 text-gray-500 border border-gray-200' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'
            }
            disabled:opacity-60 disabled:cursor-not-allowed
          `}
        >
          <span className="block font-bold text-lg mb-1">YES</span>
          <span className="text-sm block opacity-90">I have done this</span>
          
          {hasAnswered && selectedAnswer === true && (
            <span className="absolute top-2 right-2">
              <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </span>
          )}
        </button>

        <button
          onClick={() => handleAnswer(false)}
          disabled={disabled}
          className={`
            relative px-6 py-4 rounded-lg transition-all duration-200 shadow-sm
            ${hasAnswered && selectedAnswer === false 
              ? 'bg-indigo-100 text-indigo-800 border-2 border-indigo-300' 
              : hasAnswered 
                ? 'bg-gray-100 text-gray-500 border border-gray-200' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'
            }
            disabled:opacity-60 disabled:cursor-not-allowed
          `}
        >
          <span className="block font-bold text-lg mb-1">NO</span>
          <span className="text-sm block opacity-90">I haven't done this</span>
          
          {hasAnswered && selectedAnswer === false && (
            <span className="absolute top-2 right-2">
              <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </span>
          )}
        </button>
      </div>

      {hasAnswered && (
        <div className="mt-6 text-center py-3 bg-emerald-50 border border-emerald-100 rounded-lg">
          <p className="text-emerald-600 font-medium">
            Your answer has been submitted!
          </p>
          <p className="text-gray-500 text-sm mt-1">
            Waiting for other players to respond...
          </p>
        </div>
      )}

      {!hasAnswered && !canAnswer && (
        <div className="mt-4 text-center text-amber-600 font-medium">
          You can answer in <span className="font-bold">3 seconds</span>
        </div>
      )}
    </div>
  );
};

export default Question;