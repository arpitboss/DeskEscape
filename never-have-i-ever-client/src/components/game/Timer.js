import React, { useState, useEffect } from 'react';

const Timer = ({ startTime, canAnswer }) => {
    const [elapsedTime, setElapsedTime] = useState(0);
    const [bonusInfo, setBonusInfo] = useState({ text: 'Reading period', color: 'text-amber-500', bgColor: 'bg-amber-50' });

    useEffect(() => {
        if (!startTime) return;

        const intervalId = setInterval(() => {
            const now = new Date().getTime();
            const elapsed = Math.max(0, (now - startTime) / 1000); // convert to seconds, ensure non-negative
            setElapsedTime(elapsed);

            // Update bonus information based on timing thresholds
            if (!canAnswer) {
                setBonusInfo({
                    text: 'Reading period',
                    color: 'text-amber-500',
                    bgColor: 'bg-amber-50',
                });
            } else if (elapsed <= 5) {
                setBonusInfo({
                    text: '+3 bonus points',
                    color: 'text-emerald-600',
                    bgColor: 'bg-emerald-50',
                });
            } else if (elapsed <= 15) {
                setBonusInfo({
                    text: '+1 bonus point',
                    color: 'text-blue-600',
                    bgColor: 'bg-blue-50',
                });
            } else {
                setBonusInfo({
                    text: 'No time bonus',
                    color: 'text-gray-600',
                    bgColor: 'bg-gray-50',
                });
            }
        }, 100);

        return () => clearInterval(intervalId);
    }, [startTime, canAnswer]);

    // Format time as seconds with one decimal place
    const formattedTime = elapsedTime.toFixed(1);

    return (
        <div className="flex items-center space-x-2">
            <div className="flex items-center">
                <svg className="w-5 h-5 text-gray-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-bold text-lg">{formattedTime}s</span>
            </div>

            <div className={`px-3 py-1 rounded-full text-xs font-medium ${bonusInfo.color} ${bonusInfo.bgColor} border border-opacity-40`}>
                {bonusInfo.text}
            </div>
        </div>
    );
};

export default Timer;