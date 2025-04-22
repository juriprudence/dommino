import React, { useState, useEffect } from 'react'; // Import useEffect
import { useNavigate } from 'react-router-dom';
import { getDatabase, ref, set, push, update } from 'firebase/database';
import { arabicText, generateDominoTiles, shuffleTiles, fetchLeaderboard } from './util';
import DominoDots from './DominoDots';

// Home Component (Landing Page)
const Home = () => {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [playMode, setPlayMode] = useState('multiplayer'); // 'multiplayer', 'ai', or 'anyone'
  const [aiDifficulty, setAiDifficulty] = useState('medium'); // 'easy', 'medium', 'hard'
  const database = getDatabase();

  // Load player name from localStorage on component mount
  useEffect(() => {
    const savedName = localStorage.getItem('playerName');
    if (savedName) {
      setPlayerName(savedName);
    }
  }, []); // Empty dependency array ensures this runs only once

  const handleStartGame = async () => {
    if (!playerName.trim()) {
      setError('Please enter a name');
      return;
    }
    if (playMode === 'anyone') {
      // Check if player is already player1 in a waiting game
      const gamesRef = ref(database, 'games');
      import('firebase/database').then(({ get }) => {
        get(gamesRef).then(snapshot => {
          let found = false;
          let foundGameId = null;
          let foundGameData = null;
          if (snapshot.exists()) {
            snapshot.forEach(childSnap => {
              const val = childSnap.val();
              const now = Date.now();
              const created = val?.gameState?.timestamp || 0;
              const lastActive = val?.gameState?.lastActive || created;
              const thirtyMinutes = 30 * 60 * 1000;
              const fiveMinutes = 5 * 60 * 1000;
              if (
                val &&
                val.gameState &&
                val.gameState.gameMode === 'anyone' &&
                val.gameState.status === 'waiting' &&
                now - created <= thirtyMinutes &&
                now - lastActive <= fiveMinutes &&
                val.players &&
                val.players.player1 &&
                val.players.player1.name === playerName
              ) {
                found = true;
                foundGameId = childSnap.key;
                foundGameData = val;
                return true; // break
              }
            });
          }
          if (found && foundGameId && foundGameData) {
            // Already player1 in a waiting game, just navigate
            localStorage.setItem('playerName', playerName);
            localStorage.setItem('playerNumber', 'player1');
            navigate(`/room/${foundGameId}`);
          } else {
            handlePlayWithAnyone();
          }
        });
      });
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
      
      // Set game data based on play mode
      const gameData = {
        players: {
          player1: {
            name: playerName,
            tiles: player1Tiles,
            connected: true
          },
          player2: {
            name: playMode === 'ai' ? arabicText.aiPlayerName : '',
            tiles: player2Tiles,
            connected: playMode === 'ai'
          }
        },
        gameState: {
          status: playMode === 'ai' ? 'playing' : 'waiting',
          currentPlayerIndex: 0,
          board: [],
          boneyard: boneyard,
          timestamp: Date.now(),
          winner: null,
          message: "",
          gameMode: playMode,
          aiDifficulty: playMode === 'ai' ? aiDifficulty : null,
          scores: { player1: 0, player2: 0 } // Initialize scores
        }
      };

      set(newGameRef, gameData).then(() => {
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

  const handlePlayWithAnyone = async () => {
    if (!playerName.trim()) {
      setError('Please enter a name');
      return;
    }
    setError('');
    const database = getDatabase();
    const gamesRef = ref(database, 'games');
    // Find a waiting matchmaking game
    let found = false;
    let foundGameId = null;
    let foundGameData = null;
    // Use a one-time read to find a waiting game
    await new Promise((resolve) => {
      import('firebase/database').then(({ get, child }) => {
        get(gamesRef).then(snapshot => {
          if (snapshot.exists()) {
            snapshot.forEach(childSnap => {
              const val = childSnap.val();
              const now = Date.now();
              const created = val?.gameState?.timestamp || 0;
              const lastActive = val?.gameState?.lastActive || created;
              const thirtyMinutes = 30 * 60 * 1000;
              const fiveMinutes = 5 * 60 * 1000;
              if (
                val &&
                val.gameState &&
                val.gameState.gameMode === 'anyone' &&
                val.gameState.status === 'waiting' &&
                now - created <= thirtyMinutes &&
                now - lastActive <= fiveMinutes
              ) {
                found = true;
                foundGameId = childSnap.key;
                foundGameData = val;
                return true; // break
              }
            });
          }
          resolve();
        });
      });
    });

    // Update lastActive timestamp every 30 seconds while waiting
    if (!found) {
      const interval = setInterval(() => {
        if (playMode === 'anyone') {
          const waitingGameRef = ref(database, `games/${localStorage.getItem('waitingGameId')}/gameState`);
          update(waitingGameRef, { lastActive: Date.now() });
        }
      }, 30000);
      // Save interval id to clear later if needed
      localStorage.setItem('waitingIntervalId', interval);
    }

    if (found && foundGameId && foundGameData) {
      // Join as player2
      await update(ref(database, `games/${foundGameId}/players/player2`), {
        name: playerName,
        connected: true
      });
      await update(ref(database, `games/${foundGameId}/gameState`), {
        status: 'playing'
      });
      localStorage.setItem('playerName', playerName);
      localStorage.setItem('playerNumber', 'player2');
      navigate(`/room/${foundGameId}`);
    } else {
      // Create a new waiting game
      const newGameRef = push(gamesRef);
      const gameId = newGameRef.key;
      const tiles = generateDominoTiles();
      const shuffledTiles = shuffleTiles(tiles);
      const player1Tiles = shuffledTiles.slice(0, 7);
      const player2Tiles = shuffledTiles.slice(7, 14);
      const boneyard = shuffledTiles.slice(14);
      const gameData = {
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
          lastActive: Date.now(),
          winner: null,
          message: '',
          gameMode: 'anyone',
          aiDifficulty: null,
          scores: { player1: 0, player2: 0 } // Initialize scores
        }
      };
      await set(newGameRef, gameData);
      localStorage.setItem('playerName', playerName);
      localStorage.setItem('playerNumber', 'player1');
      localStorage.setItem('waitingGameId', gameId);
      navigate(`/room/${gameId}`);
    }
  };

  return (
    <div className="home-container">
      <div className="logo-container">
        <img src="/logo.png" alt="Domino Game Logo" className="game-logo" />
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
        
        <div className="game-mode-selection">
          <div className="radio-group arabic-text">
            <label>
              <input
                type="radio"
                value="multiplayer"
                checked={playMode === 'multiplayer'}
                onChange={() => setPlayMode('multiplayer')}
              />
              {arabicText.multiplayerMode}
            </label>
            <label>
              <input
                type="radio"
                value="ai"
                checked={playMode === 'ai'}
                onChange={() => setPlayMode('ai')}
              />
              {arabicText.aiMode}
            </label>
            <label>
              <input
                type="radio"
                value="anyone"
                checked={playMode === 'anyone'}
                onChange={() => setPlayMode('anyone')}
              />
              العب مع أي شخص
            </label>
          </div>
          
          {playMode === 'ai' && (
            <div className="ai-difficulty arabic-text">
              <h4>{arabicText.aiDifficulty}</h4>
              <div className="difficulty-options">
                <label>
                  <input
                    type="radio"
                    value="easy"
                    checked={aiDifficulty === 'easy'}
                    onChange={() => setAiDifficulty('easy')}
                  />
                  {arabicText.easy}
                </label>
                <label>
                  <input
                    type="radio"
                    value="medium"
                    checked={aiDifficulty === 'medium'}
                    onChange={() => setAiDifficulty('medium')}
                  />
                  {arabicText.medium}
                </label>
                <label>
                  <input
                    type="radio"
                    value="hard"
                    checked={aiDifficulty === 'hard'}
                    onChange={() => setAiDifficulty('hard')}
                  />
                  {arabicText.hard}
                </label>
              </div>
            </div>
          )}
        </div>
        
        {error && <p className="error-message">{error}</p>}
        <button onClick={handleStartGame} className="start-game-button arabic-text">
          {arabicText.startGame}
        </button>
        <button onClick={() => navigate('/lobby')} className="start-game-button arabic-text" style={{marginTop: '10px'}}>
          الذهاب إلى اللوبي
        </button>
        <button onClick={() => navigate('/best-player')} className="start-game-button arabic-text" style={{marginTop: '10px'}}>
          أفضل لاعب
        </button>
      </div>
    </div>
  );
};

export default Home;