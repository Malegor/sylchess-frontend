import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Client } from '@stomp/stompjs';

function App() {
    const [fen, setFen] = useState('start');
    const [error, setError] = useState('');
    const stompClientRef = useRef(null);

    useEffect(() => {
        const client = new Client({
            brokerURL: 'ws://localhost:8080/chess-socket',
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        client.onConnect = (frame) => {
            console.log('Connected to WebSocket!');
            stompClientRef.current = client;

            // 1. First subscribe securely to the data pipeline
            client.subscribe('/topic/game-update', (message) => {
                const gameData = JSON.parse(message.body);
                if (gameData) {
                    console.log("Received data from Java:", gameData);
                    setFen(gameData.fen);
                    setError(gameData.error.trim() ? gameData.error : '');
                }
            });

            // 2. Add a tiny delay before asking Java to start, ensuring subscriptions are active
            setTimeout(() => {
                client.publish({ destination: '/app/start' });
            }, 200);
        };

        client.onStompError = (frame) => {
            console.error('STOMP Error:', frame.body);
        };

        client.activate();
        return () => client.deactivate();
    }, []);

    function onDrop(sourceSquare, targetSquare) {
        if (!stompClientRef.current || !stompClientRef.current.connected) return false;

        const moveString = `${sourceSquare}${targetSquare}`;
        console.log("Publishing move to Java backend:", moveString);

        // Send move execution up to Java
        stompClientRef.current.publish({
            destination: '/app/move',
            body: moveString
        });

        // Return true to let the UI hold the piece in place until Java returns the verified FEN state
        return true;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#282c34' }}>
            <div style={{ width: '500px', maxWidth: '90vw' }}>
                <h1 style={{ color: 'white', textAlign: 'center' }}>Java-React Chess</h1>
                {error && <div style={{ color: '#ff6b6b', textAlign: 'center', marginBottom: '10px', fontWeight: 'bold' }}>{error}</div>}

                {/* Wrapping container helper for precise target CSS scoping */}
                <div className="chessboard-container">
                    <Chessboard position={fen} onPieceDrop={onDrop} />
                </div>
            </div>
        </div>
    );
}

export default App;
