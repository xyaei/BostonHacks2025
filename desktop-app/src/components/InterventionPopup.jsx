// desktop-app/src/components/InterventionPopup.jsx - MANUAL + AUTO OPEN

import React, { useEffect, useState } from 'react';

export default function InterventionPopup() {
    const [data, setData] = useState(null);

    useEffect(() => {
        window.electron.onThreatData((receivedData) => {
            console.log('📨 Popup received:', receivedData);
            setData(receivedData);
        });
    }, []);

    const handleClose = () => {
        window.electron.closePopup();
    };

    const handleStartConversation = () => {
        window.electron.startConversation();
    };

    const getSeverityColor = (severity) => {
        if (severity >= 80) return 'from-red-600 to-red-800';
        if (severity >= 60) return 'from-orange-500 to-red-600';
        if (severity >= 40) return 'from-yellow-500 to-orange-500';
        return 'from-yellow-400 to-yellow-600';
    };

    const getSeverityText = (severity) => {
        if (severity >= 80) return 'CRITICAL';
        if (severity >= 60) return 'HIGH';
        if (severity >= 40) return 'MEDIUM';
        return 'LOW';
    };

    const getBarColor = (value) => {
        if (value > 70) return 'bg-green-500';
        if (value > 50) return 'bg-yellow-500';
        if (value > 20) return 'bg-orange-500';
        return 'bg-red-500';
    };

    if (!data) {
        return (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    const petState = data.petState || {
        health: 100,
        evolution_stage: 1,
        points: 0,
        streak: 0,
        state: 'happy'
    };

    const isThreat = data.isThreat;

    return (
        <div className={`w-full h-full ${isThreat
                ? `bg-gradient-to-br ${getSeverityColor(data.severity || 50)}`
                : 'bg-gradient-to-br from-gray-700 to-gray-900'
            } flex items-center justify-center p-6`}>
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full">

                {/* Header - Different for Threat vs Manual Open */}
                {isThreat ? (
                    // THREAT MODE
                    <div className="text-center mb-4">
                        <div className="text-6xl mb-2">🚨</div>
                        <h1 className="text-3xl font-bold text-red-600 mb-2">
                            SECURITY THREAT!
                        </h1>
                        <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${data.severity >= 80 ? 'bg-red-600 text-white' :
                                data.severity >= 60 ? 'bg-orange-500 text-white' :
                                    data.severity >= 40 ? 'bg-yellow-500 text-black' :
                                        'bg-yellow-400 text-black'
                            }`}>
                            {getSeverityText(data.severity || 50)} RISK
                        </div>
                    </div>
                ) : (
                    // MANUAL OPEN MODE
                    <div className="text-center mb-4">
                        <div className="text-6xl mb-2">🛡️</div>
                        <h1 className="text-3xl font-bold text-green-600 mb-2">
                            CyberPet Dashboard
                        </h1>
                        <p className="text-gray-600 text-sm">
                            Monitor your pet's security status
                        </p>
                    </div>
                )}

                {/* Threat Details - Only show if threat */}
                {isThreat && data.type && (
                    <div className="mb-4 p-4 bg-red-50 rounded-lg">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">
                            {data.type}
                        </h2>
                        <p className="text-gray-700 text-sm">
                            {data.details || 'A security threat was detected.'}
                        </p>
                        {data.timestamp && (
                            <p className="text-xs text-gray-500 mt-2">
                                Detected: {new Date(data.timestamp).toLocaleString()}
                            </p>
                        )}
                    </div>
                )}

                {/* Pet Stats Panel - Always shown */}
                <div className="mb-4 p-4 bg-gray-800 rounded-lg text-white">
                    <h3 className="text-lg font-bold text-green-400 mb-3 text-center">
                        🛡️ CyberPet Status
                    </h3>

                    <div className="space-y-3">
                        {/* Health Bar */}
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Health</span>
                                <span className="font-bold">{Math.round(petState.health)}%</span>
                            </div>
                            <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${getBarColor(petState.health)}`}
                                    style={{ width: `${Math.max(0, Math.min(100, petState.health))}%` }}
                                />
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                            <div className="bg-gray-700 p-2 rounded">
                                <div className="text-gray-400 text-xs">Stage</div>
                                <div className="font-bold text-green-400">{petState.evolution_stage}</div>
                            </div>
                            <div className="bg-gray-700 p-2 rounded">
                                <div className="text-gray-400 text-xs">Points</div>
                                <div className="font-bold text-blue-400">{petState.points}</div>
                            </div>
                            <div className="bg-gray-700 p-2 rounded">
                                <div className="text-gray-400 text-xs">Streak</div>
                                <div className="font-bold text-yellow-400">{petState.streak}</div>
                            </div>
                        </div>

                        {/* Current State */}
                        <div className="text-center">
                            <span className="text-xs text-gray-400">Status: </span>
                            <span className="font-semibold capitalize">{petState.state.replace('_', ' ')}</span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    {isThreat && (
                        <button
                            onClick={handleStartConversation}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
                        >
                            💬 Learn More
                        </button>
                    )}
                    <button
                        onClick={handleClose}
                        className={`${isThreat ? 'flex-1' : 'w-full'} bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200`}
                    >
                        {isThreat ? '✓ Dismiss' : '✓ Close'}
                    </button>
                </div>

                {/* Warning - Only show if threat */}
                {isThreat && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg text-center">
                        <p className="text-sm text-red-800 font-semibold">
                            ⚠️ Your CyberPet's health has been affected!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}