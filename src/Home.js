import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, set, push, update } from 'firebase/database'; // Removed getDatabase
import { arabicText, canPlayTile, isPlayerBlocked, updateLeaderboard, fetchLeaderboard, db, generateDominoTiles, shuffleTiles } from './Util'; // Corrected casing
import DominoDots from './DominoDots'; // Keep if used elsewhere, otherwise remove

// Home Component (Landing Page)
// Accept user and coins as props
const Home = ({ user, coins }) => {
  const navigate = useNavigate();
  // Removed playerName state, using user.name prop instead
  const [error, setError] = useState('');
  const [playMode, setPlayMode] = useState('multiplayer'); // 'multiplayer', 'ai', or 'anyone'
  const [aiDifficulty, setAiDifficulty] = useState('medium'); // 'easy', 'medium', 'hard'
  // const database = getDatabase(); // Use imported db instance
  const [betAmount, setBetAmount] = useState(0); // State for bet amount

  // Removed useEffect for loading playerName from localStorage

  const handleStartGame = async () => {
    // Use user.displayName from Firebase Auth object
    if (!user || !user.displayName) { // Check for displayName
        setError('User information is missing.'); // Should not happen if login works
        return;
    }

    // Validate bet amount for multiplayer games
    if (playMode === 'multiplayer') {
        const bet = parseInt(betAmount, 10) || 0;
        if (bet < 0) {
            setError('Bet amount cannot be negative.');
            return;
        }
        // Assuming 'coins' prop holds the user's current coin balance
        if (bet > coins) {
            setError(`You cannot bet more than your current coins (${coins}).`);
            return;
        }
    }
    setError(''); // Clear previous errors

    const currentUserName = user.displayName; // Use displayName

    if (playMode === 'anyone') {
      // Check if player is already player1 in a waiting game (by uid)
      const gamesRef = ref(db, 'games');
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
                val.players.player1.uid === user.uid // Compare by uid
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
            localStorage.setItem('playerName', currentUserName);
            localStorage.setItem('playerNumber', 'player1');
            navigate(`/room/${foundGameId}`);
          } else {
            handlePlayWithAnyone(); // Call the other handler
          }
        });
      });
      return;
    }

    // Logic for 'multiplayer' and 'ai' modes
    try {
      console.log("Creating new game...");
      const gamesRef = ref(db, 'games'); // Use imported db
      const newGameRef = push(gamesRef);
      const gameId = newGameRef.key;

      console.log("Game ID:", gameId);

      const tiles = generateDominoTiles();
      const shuffledTiles = shuffleTiles(tiles);

      const player1Tiles = shuffledTiles.slice(0, 7);
      const player2Tiles = shuffledTiles.slice(7, 14);
      const boneyard = shuffledTiles.slice(14);

      const gameData = {
        players: {
          player1: {
            name: currentUserName, // Use prop
            uid: user.uid, // Add user ID
            tiles: player1Tiles,
            connected: true
            // TODO: Add coins if needed for game logic?
          },
          player2: {
            name: playMode === 'ai' ? arabicText.aiPlayerName : '',
            uid: '',
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
          scores: { player1: 0, player2: 0 },
          betAmount: playMode === 'multiplayer' ? (parseInt(betAmount, 10) || 0) : 0 // Add bet amount
        }
      };

      set(newGameRef, gameData).then(() => {
        console.log("Game data saved successfully");
        localStorage.setItem('playerName', currentUserName); // Still useful?
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
  if (!user || !user.displayName) {
    setError('User information is missing.');
    return;
  }
  setError('');
  const currentUserName = user.displayName;
  const gamesRef = ref(db, 'games');
  let found = false;
  let foundGameId = null;
  let foundGameData = null;
  await new Promise((resolve) => {
    import('firebase/database').then(({ get }) => {
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
              now - lastActive <= fiveMinutes &&
              val.players && val.players.player1 && val.players.player1.uid !== user.uid // Only join if not same uid
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

  // Clear any previous waiting interval
  const existingIntervalId = localStorage.getItem('waitingIntervalId');
  if (existingIntervalId) {
      clearInterval(parseInt(existingIntervalId, 10));
      localStorage.removeItem('waitingIntervalId');
  }
   const existingWaitingGameId = localStorage.getItem('waitingGameId');
   if (existingWaitingGameId) {
       localStorage.removeItem('waitingGameId');
   }


  if (found && foundGameId && foundGameData) {
    // Join as player2
    console.log(`Joining game ${foundGameId} as player 2`);
    await update(ref(db, `games/${foundGameId}/players/player2`), { // Use imported db
      name: currentUserName, // Use displayName
      uid: user.uid, // Add user ID
      connected: true
    });
    await update(ref(db, `games/${foundGameId}/gameState`), { // Use imported db
      status: 'playing',
      lastActive: Date.now() // Update activity when joining
    });
    localStorage.setItem('playerName', currentUserName); // Still useful?
    localStorage.setItem('playerNumber', 'player2');
    navigate(`/room/${foundGameId}`);
  } else {
    // Create a new waiting game
    console.log(`Creating new 'anyone' game for ${currentUserName}`);
    const newGameRef = push(gamesRef);
    const gameId = newGameRef.key;
    const tiles = generateDominoTiles();
    const shuffledTiles = shuffleTiles(tiles);
    const player1Tiles = shuffledTiles.slice(0, 7);
    const player2Tiles = shuffledTiles.slice(7, 14); // Pre-assign tiles for player 2
    const boneyard = shuffledTiles.slice(14);
    const gameData = {
      players: {
        player1: {
          name: currentUserName, // Use prop
          uid: user.uid, // Add user ID
          tiles: player1Tiles,
          connected: true
        },
        player2: {
          name: '', // Waiting for player 2
          tiles: player2Tiles, // Assign tiles but keep disconnected
          connected: false
        }
      },
      gameState: {
        status: 'waiting',
        currentPlayerIndex: 0,
        board: [],
        boneyard: boneyard,
        timestamp: Date.now(),
        lastActive: Date.now(), // Set initial lastActive
        winner: null,
        message: 'Waiting for another player...',
        gameMode: 'anyone',
        aiDifficulty: null,
        scores: { player1: 0, player2: 0 }
      }
    };
    await set(newGameRef, gameData);
    localStorage.setItem('playerName', currentUserName); // Still useful?
    localStorage.setItem('playerNumber', 'player1');
    localStorage.setItem('waitingGameId', gameId); // Store the ID of the game we are waiting in

     // Start interval to update lastActive for the *new* waiting game
     const interval = setInterval(() => {
         const currentWaitingGameId = localStorage.getItem('waitingGameId');
         // Only update if we are still supposed to be waiting in this game
         if (currentWaitingGameId === gameId) {
             console.log(`Updating lastActive for waiting game ${gameId}`);
             const waitingGameRef = ref(db, `games/${gameId}/gameState`); // Use imported db
             update(waitingGameRef, { lastActive: Date.now() }).catch(err => {
                 console.error("Error updating lastActive:", err);
                 // Consider clearing interval if update fails repeatedly
             });
         } else {
             console.log("No longer waiting in this game, clearing interval.");
             clearInterval(interval); // Clear interval if game ID changed
             localStorage.removeItem('waitingIntervalId');
         }
     }, 30000); // 30 seconds
     localStorage.setItem('waitingIntervalId', interval.toString()); // Store interval ID as string


    navigate(`/room/${gameId}`);
  }
};

  // Clear waiting interval on component unmount or before navigating away
  useEffect(() => {
      return () => {
          const intervalId = localStorage.getItem('waitingIntervalId');
          if (intervalId) {
              clearInterval(parseInt(intervalId, 10));
              localStorage.removeItem('waitingIntervalId');
              // Optionally remove the waiting game itself if player 1 leaves?
              // const waitingGameId = localStorage.getItem('waitingGameId');
              // if (waitingGameId) {
              //    remove(ref(database, `games/${waitingGameId}`));
              //    localStorage.removeItem('waitingGameId');
              // }
          }
           // Clean up waitingGameId if user navigates away manually
           // localStorage.removeItem('waitingGameId');
      };
  }, []); // Run only on unmount


  return (
    <div className="home-container">
      
      <div className="logo-container">
        <img src="/logo.png" alt="Domino Game Logo" className="game-logo" />
      </div>
      <h1 className="arabic-text">{arabicText.gameTitle}</h1>
      <div className="start-game-form">
        {/* Removed player name input */}

        <div className="game-mode-selection">
          <div className="radio-group arabic-text">
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <input
                type="radio"
                value="multiplayer"
                checked={playMode === 'multiplayer'}
                onChange={() => setPlayMode('multiplayer')}
                style={{ marginLeft: '8px' }}
              />
              {arabicText.multiplayerMode}
            </label>
            {/* Bet input appears only if 'multiplayer' (play with friend) is selected */}
            {user && playMode === 'multiplayer' && (
              <div className="bet-input-container arabic-text" style={{ margin: '0 0 12px 0', padding: '6px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label htmlFor="betAmount" style={{ fontWeight: 'bold', minWidth: '110px' }}>ضع رهان (عملات): </label>
                <input
                  type="number"
                  id="betAmount"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  min="0"
                  step="1"
                  placeholder="0"
                  style={{ width: '70px', borderRadius: '4px', border: '1px solid #ccc', padding: '2px 6px' }}
                />
              </div>
            )}
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
        {/* Updated button text based on mode */}
        <button onClick={playMode === 'anyone' ? handlePlayWithAnyone : handleStartGame} className="start-game-button arabic-text">
          {playMode === 'multiplayer' ? arabicText.createGame :
           playMode === 'ai' ? arabicText.startGame :
           'ابحث عن لعبة / انضم'}
        </button>
        <button onClick={() => navigate('/lobby')} className="start-game-button arabic-text" style={{marginTop: '10px'}}>
          {arabicText.lobby} {/* Using key from util.js */}
        </button>
        <button onClick={() => navigate('/best-player')} className="start-game-button arabic-text" style={{marginTop: '10px'}}>
          {arabicText.bestPlayer} {/* Using key from util.js */}
        </button>
      </div>

      {/* Simple styling for user info */}
      <style>{`
        .user-info {
          position: absolute;
          top: 10px;
          right: 10px;
          background-color: rgba(255, 255, 255, 0.8);
          padding: 5px 10px;
          border-radius: 4px;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default Home;