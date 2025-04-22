import React, { useEffect, useState } from 'react';

const Question = ({ question, onAnswer, disabled, hasAnswered, canAnswer }) => {
  
  const [animation, setAnimation] = useState('');
  
  // Create animation when question appears
  useEffect(() => {
    setAnimation('animate-fade-in');
    const timer = setTimeout(() => setAnimation(''), 500);
    return () => clearTimeout(timer);
  }, [question]);

  if (!question) {
    return <div className="text-center p-8">Loading question...</div>;
  }

  return (
    <div className={`question-card ${animation}`}>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Never have I ever...</h2>
        <p className="text-xl text-indigo-700 font-medium mb-8">{question.text}</p>
        
        {!canAnswer && !hasAnswered && (
          <div className="bg-yellow-50 text-yellow-700 p-3 rounded-md mb-6">
            <p>Take a moment to read the question...</p>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
          <button
            onClick={() => onAnswer(true)}
            disabled={disabled}
            className={`px-6 py-3 rounded-lg transition-all ${
              hasAnswered
               ? 'bg-blue-100 text-blue-800'
               : 'bg-blue-500 text-white hover:bg-blue-600'
           } disabled:opacity-50`}
          >
            <span className="block font-bold mb-1">YES</span>
            <span className="text-sm block">I have done this</span>
          </button>
          
          <button
            onClick={() => onAnswer(false)}
            disabled={disabled}
            className={`px-6 py-3 rounded-lg transition-all ${
              hasAnswered
               ? 'bg-blue-100 text-blue-800'
               : 'bg-blue-500 text-white hover:bg-blue-600'
           } disabled:opacity-50`}
          >
            <span className="block font-bold mb-1">NO</span>
            <span className="text-sm block">I haven't done this</span>
          </button>
        </div>
      </div>

      {hasAnswered && (
        <div className="mt-6 text-center">
          <p className="text-green-600 font-medium">
            Your answer has been submitted!
          </p>
          <p className="text-gray-500 text-sm">
            Waiting for other players to respond...
          </p>
        </div>
      )}
      
      {!hasAnswered && !canAnswer && (
        <div className="mt-4 text-center text-orange-600">
          You can answer in <span className="font-bold">3 seconds</span>
        </div>
      )}
    </div>
  );
};

export default Question;