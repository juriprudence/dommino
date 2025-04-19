import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDatabase, ref, set, push } from 'firebase/database';
import { arabicText, generateDominoTiles, shuffleTiles } from './util';
import DominoDots from './DominoDots';

// Home Component (Landing Page)
const Home = () => {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const database = getDatabase();

  const handleStartGame = () => {
    if (!playerName.trim()) {
      setError('Please enter a name');
      return;
    }

    try {
      console.log("Creating new game...");
      // Create a reference for a new game with an auto-generated ID
      const gamesRef = ref(database, 'games');
      const newGameRef = push(gamesRef);
      const gameId = newGameRef.key;
      
      console.log("Game ID:", gameId);
      
      // Generate and shuffle tiles
      const tiles = generateDominoTiles();
      const shuffledTiles = shuffleTiles(tiles);
      
      const player1Tiles = shuffledTiles.slice(0, 7);
      const player2Tiles = shuffledTiles.slice(7, 14);
      const boneyard = shuffledTiles.slice(14);
      
      // Set basic game data
      set(newGameRef, {
        players: {
          player1: {
            name: playerName,
            tiles: player1Tiles,
            connected: true
          },
          player2: {
            name: '',
            tiles: player2Tiles,
            connected: false
          }
        },
        gameState: {
          status: 'waiting',
          currentPlayerIndex: 0,
          board: [],
          boneyard: boneyard,
          timestamp: Date.now(),
          winner: null,
          message: ""
        }
      }).then(() => {
        console.log("Game data saved successfully");
        localStorage.setItem('playerName', playerName);
        localStorage.setItem('playerNumber', 'player1');
        navigate(`/room/${gameId}`);
      }).catch(error => {
        console.error("Firebase set error:", error);
        setError('Failed to create game: ' + error.message);
      });
    } catch (error) {
      console.error("General error:", error);
      setError('Failed to create game: ' + error.message);
    }
  };

  return (
    <div className="home-container">
      <div className="domino-logo">
        <div className="logo-domino">
          <div className="domino-half">
            <DominoDots value={6} />
          </div>
          <div className="domino-half">
            <DominoDots value={6} />
          </div>
        </div>
      </div>
      <h1 className="arabic-text">{arabicText.gameTitle}</h1>
      <div className="start-game-form">
        <input
          type="text"
          placeholder={arabicText.enterName}
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="player-name-input arabic-input"
          dir="rtl"
        />
        {error && <p className="error-message">{error}</p>}
        <button onClick={handleStartGame} className="start-game-button arabic-text">
          {arabicText.startGame}
        </button>
      </div>
    </div>
  );
};

export default Home;