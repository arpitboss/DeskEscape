import React, { useState, useEffect } from 'react';

const Timer = ({ startTime, canAnswer }) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerColor, setTimerColor] = useState('text-gray-600');

  useEffect(() => {
    if (!startTime) return;
    
    const intervalId = setInterval(() => {
      const now = new Date().getTime();
      const elapsed = (now - startTime) / 1000; // convert to seconds
      setElapsedTime(elapsed);
      
      // Update color based on timing thresholds
      if (elapsed < 3) {
        setTimerColor('text-orange-500'); // Reading period
      } else if (elapsed <= 5) {
        setTimerColor('text-green-600'); // Best bonus period
      } else if (elapsed <= 15) {
        setTimerColor('text-blue-600'); // Regular bonus period
      } else {
        setTimerColor('text-gray-600'); // No bonus period
      }
    }, 100);
    
    return () => clearInterval(intervalId);
  }, [startTime]);

  // Format time as seconds with one decimal place
  const formattedTime = elapsedTime.toFixed(1);
  
  // Determine which bonus applies
  let bonusText = '';
  if (!canAnswer) {
    bonusText = 'Reading period';
  } else if (elapsedTime <= 5) {
    bonusText = '+3 bonus';
  } else if (elapsedTime <= 15) {
    bonusText = '+1 bonus';
  } else {
    bonusText = 'No time bonus';
  }

  return (
    <div className="flex items-center">
      <div className="text-sm font-medium mr-2">Time:</div>
      <div className={`font-bold ${timerColor}`}>{formattedTime}s</div>
      <div className="ml-2 text-xs px-2 py-1 bg-gray-100 rounded-full">{bonusText}</div>
    </div>
  );
};

export default Timer;