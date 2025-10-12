// desktop-app/src/components/PetDisplay.jsx - CLICKABLE PET

import React, { useState, useEffect, useRef } from 'react';

const WEBSOCKET_URL = 'ws://localhost:8000/ws';

export default function PetDisplay() {
  const [petState, setPetState] = useState({
    health: 100,
    evolution_stage: 1,
    points: 0,
    streak: 0,
    state: 'happy',
  });
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(WEBSOCKET_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('✅ Pet WebSocket connected');
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'threat_detected') {
              console.warn('🚨 THREAT - Auto-opening popup');

              if (data.pet_state) {
                setPetState(data.pet_state);
              }

              if (window.electron && window.electron.showIntervention) {
                window.electron.showIntervention({
                  type: data.threat.threat_type || 'Unknown Threat',
                  details: data.threat.user_friendly_message || data.threat.explanation,
                  severity: data.threat.confidence || 50,
                  timestamp: new Date().toISOString(),
                  petState: data.pet_state,
                  isThreat: true
                });
              }
            }
            else if (data.type === 'health_update') {
              if (data.pet_state) {
                setPetState(data.pet_state);
              }
            }
          } catch (err) {
            console.error('❌ Error:', err);
          }
        };

        ws.onerror = () => setIsConnected(false);
        ws.onclose = () => {
          setIsConnected(false);
          setTimeout(connectWebSocket, 3000);
        };
      } catch (error) {
        setIsConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleClick = () => {
    console.log('🖱️ Pet clicked - Opening stats popup');
    if (window.electron && window.electron.showIntervention) {
      window.electron.showIntervention({
        type: null,
        details: null,
        severity: 0,
        timestamp: new Date().toISOString(),
        petState: petState,
        isThreat: false
      });
    }
  };

  const getPetAnimation = () => {
    if (petState.state === 'critical' || petState.state === 'alert') {
      return 'animate-pulse';
    }
    return '';
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        onClick={handleClick}
        className={`w-40 h-40 bg-white rounded-lg shadow-xl flex items-center justify-center cursor-pointer hover:scale-105 transition-transform ${getPetAnimation()}`}
        style={{
          border: isConnected ? '3px solid #00ff00' : '3px solid #ff0000'
        }}
      >
        <div className="text-6xl select-none">
          {petState.state === 'alert' || petState.state === 'critical' ? '😱' : '😊'}
        </div>
      </div>
    </div>
  );
}