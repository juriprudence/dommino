import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, update, push } from 'firebase/database';
import './App.css';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyABvehKr_lcwOdJExQLlwFLvtR83LTnW_8",
  authDomain: "myproje-4a2e2.firebaseapp.com",
  databaseURL: "https://myproje-4a2e2.firebaseio.com",
  projectId: "myproje-4a2e2",
  storageBucket: "myproje-4a2e2.appspot.com", // Fixed: incorrect storageBucket URL format
  messagingSenderId: "913698461417",
  appId: "1:913698461417:web:953647edfd328c14f7c278"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Test Firebase connection
console.log("Firebase initialized");
const connectionRef = ref(database, '.info/connected');
onValue(connectionRef, (snap) => {
  if (snap.val() === true) {
    console.log('Connected to Firebase');
  } else {
    console.log('Not connected to Firebase');
  }
});

// Arabic translations
const arabicText = {
  gameTitle: "لعبة الدومينو",
  enterName: "أدخل اسمك",
  startGame: "ابدأ لعبة جديدة",
  waiting: "...في انتظار انضمام اللاعب الثاني",
  shareLink: "شارك هذا الرابط مع صديقك",
  copyLink: "انسخ الرابط",
  roomId: "رقم الغرفة",
  noTiles: "لا توجد قطع على اللوحة بعد",
  yourTiles: "قطع الدومينو الخاصة بك",
  playTile: "العب القطعة المختارة",
  drawTile: "اسحب قطعة",
  gameOver: "انتهت اللعبة!",
  wins: "فاز!",
  newGame: "لعبة جديدة",
  joinGame: "انضم إلى اللعبة",
  notYourTurn: "!ليس دورك",
  cantPlay: "!لا يمكن لعب هذه القطعة هنا",
  noTilesLeft: "!لا توجد قطع متبقية في الكومة",
  drew: "سحب قطعة",
  canPlay: "سحب قطعة ويمكنه اللعب",
  passes: "سحب قطعة ويمرر",
  hasNoPlayable: "ليس لديه قطع قابلة للعب ويمرر",
  you: "(أنت)",
  tiles: "القطع",
  loading: "...جاري تحميل اللعبة", // Added missing translation
  gameNotFound: "اللعبة غير موجودة" // Added missing translation
};

// Utility Functions
const generateDominoTiles = () => {
  const tiles = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      tiles.push({ left: i, right: j, id: `${i}-${j}` });
    }
  }
  return tiles;
};

const shuffleTiles = (tiles) => {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Domino Dot Display Component
const DominoDots = ({ value }) => {
  const renderDots = () => {
    switch (value) {
      case 0:
        return <div className="dots-container empty"></div>;
      case 1:
        return (
          <div className="dots-container one">
            <span className="dot center"></span>
          </div>
        );
      case 2:
        return (
          <div className="dots-container two">
            <span className="dot top-right"></span>
            <span className="dot bottom-left"></span>
          </div>
        );
      case 3:
        return (
          <div className="dots-container three">
            <span className="dot top-right"></span>
            <span className="dot center"></span>
            <span className="dot bottom-left"></span>
          </div>
        );
      case 4:
        return (
          <div className="dots-container four">
            <span className="dot top-left"></span>
            <span className="dot top-right"></span>
            <span className="dot bottom-left"></span>
            <span className="dot bottom-right"></span>
          </div>
        );
      case 5:
        return (
          <div className="dots-container five">
            <span className="dot top-left"></span>
            <span className="dot top-right"></span>
            <span className="dot center"></span>
            <span className="dot bottom-left"></span>
            <span className="dot bottom-right"></span>
          </div>
        );
      case 6:
        return (
          <div className="dots-container six">
            <span className="dot top-left"></span>
            <span className="dot top-right"></span>
            <span className="dot middle-left"></span>
            <span className="dot middle-right"></span>
            <span className="dot bottom-left"></span>
            <span className="dot bottom-right"></span>
          </div>
        );
      default:
        return null;
    }
  };

  return renderDots();
};

// Check if a tile can be played on the board
const canPlayTile = (tile, board) => {
  // If board is empty, any tile can be played
  if (!board || board.length === 0) { // Fixed: Add check for null board
    return { canPlay: true, position: "first", orientation: "horizontal" };
  }

  // Check if tile can be played at the left end of the board
  const leftEndTile = board[0];
  const leftValue = leftEndTile.orientation === "horizontal" ? leftEndTile.left : 
                    leftEndTile.flipped ? leftEndTile.right : leftEndTile.left;

  // Check if tile can be played at the right end of the board
  const rightEndTile = board[board.length - 1];
  const rightValue = rightEndTile.orientation === "horizontal" ? rightEndTile.right :
                     rightEndTile.flipped ? rightEndTile.left : rightEndTile.right;

  const canPlayLeft = tile.left === leftValue || tile.right === leftValue;
  const canPlayRight = tile.left === rightValue || tile.right === rightValue;

  if (canPlayLeft) {
    // Determine orientation for left placement
    return { 
      canPlay: true, 
      position: "left",
      flipped: tile.right === leftValue,
      orientation: "horizontal"
    };
  }

  if (canPlayRight) {
    // Determine orientation for right placement
    return { 
      canPlay: true, 
      position: "right",
      flipped: tile.left === rightValue,
      orientation: "horizontal"
    };
  }

  return { canPlay: false };
};

// Check for a game winner
const checkWinner = (game) => {
  if (game.players.player1.tiles.length === 0) {
    return "player1";
  } else if (game.players.player2.tiles.length === 0) {
    return "player2";
  }
  return null;
};

// Check if player is blocked (can't make a move)
const isPlayerBlocked = (playerTiles, board) => {
  if (!board || board.length === 0) return false; // Fixed: Add check for null board
  
  for (const tile of playerTiles) {
    const { canPlay } = canPlayTile(tile, board);
    if (canPlay) return false;
  }
  
  return true;
};

// Home Component (Landing Page)
const Home = () => {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');

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

// Game Room Component
const GameRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playerNumber, setPlayerNumber] = useState(localStorage.getItem('playerNumber') || '');
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedTile, setSelectedTile] = useState(null);
  const [gameMessage, setGameMessage] = useState('');

  useEffect(() => {
    console.log("Loading room:", roomId);
    const gameRef = ref(database, `games/${roomId}`);
    
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      console.log("Game data:", data);
      
      if (!data) {
        setError('Game not found');
        setLoading(false);
        return;
      }
      
      setGame(data);
      if (data.gameState.message) {
        setGameMessage(data.gameState.message);
      }
      setLoading(false);

      // Check if player2 spot is open and you're not already player1
      if (data.players.player2 && !data.players.player2.connected && playerNumber !== 'player1' && !joinDialogOpen) {
        setJoinDialogOpen(true);
      }
    }, (err) => {
      console.error("Firebase onValue error:", err);
      setError('Error loading game: ' + err.message);
      setLoading(false);
    });

    // Clean up subscription on unmount
    return () => unsubscribe();
  }, [roomId, playerNumber, joinDialogOpen]);

  const joinGame = async () => {
    if (!newPlayerName.trim()) {
      setError('Please enter a name');
      return;
    }

    try {
      // Update player2 info
      await update(ref(database, `games/${roomId}/players/player2`), {
        name: newPlayerName,
        connected: true
      });

      // If both players are now connected, start the game
      await update(ref(database, `games/${roomId}/gameState`), {
        status: 'playing'
      });

      localStorage.setItem('playerName', newPlayerName);
      localStorage.setItem('playerNumber', 'player2');
      setPlayerNumber('player2');
      setJoinDialogOpen(false);
    } catch (error) {
      setError('Failed to join game');
      console.error(error);
    }
  };

  const copyGameLink = () => {
    const link = `https://juriprudence.github.io/dommino/#/room/${roomId}`;
    navigator.clipboard.writeText(link)
      .then(() => {
        alert('Game link copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        // Fallback for browsers that don't support clipboard API
        const tempInput = document.createElement('input');
        tempInput.value = link;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        alert('Game link copied to clipboard!');
      });
  };

  const handleTileSelect = (tile, index) => {
    // Only allow selecting tile if it's your turn
    if (!game) return; // Fixed: Add check for null game
    const currentPlayerNumber = game.gameState.currentPlayerIndex === 0 ? 'player1' : 'player2';
    if (playerNumber !== currentPlayerNumber) {
      setGameMessage(arabicText.notYourTurn);
      return;
    }

    setSelectedTile({ ...tile, index });
  };

  const handlePlayTile = async () => {
    if (!selectedTile || !game) return; // Fixed: Add check for null game

    const currentPlayerNumber = game.gameState.currentPlayerIndex === 0 ? 'player1' : 'player2';
    if (playerNumber !== currentPlayerNumber) {
      setGameMessage(arabicText.notYourTurn);
      return;
    }

    const board = game.gameState.board || [];
    const { canPlay, position, flipped, orientation } = canPlayTile(selectedTile, board);

    if (!canPlay) {
      setGameMessage(arabicText.cantPlay);
      return;
    }

    // Clone the player's tiles and remove the played tile
    const updatedPlayerTiles = [...game.players[playerNumber].tiles];
    updatedPlayerTiles.splice(selectedTile.index, 1);

    // Create a new board with the played tile
    let updatedBoard = [...board];
    // Determine orientation: double = vertical, else horizontal
    let tileOrientation = (selectedTile.left === selectedTile.right) ? "vertical" : "horizontal";
    const playedTile = {
      left: selectedTile.left,
      right: selectedTile.right,
      id: selectedTile.id,
      flipped: flipped || false,
      orientation: tileOrientation
    };

    if (position === "first" || position === "left") {
      updatedBoard.unshift(playedTile);
    } else {
      updatedBoard.push(playedTile);
    }

    // Check if a player has won
    const nextPlayerIndex = game.gameState.currentPlayerIndex === 0 ? 1 : 0;
    let winner = null;
    let message = "";
    
    if (updatedPlayerTiles.length === 0) {
      winner = playerNumber;
      message = `${game.players[playerNumber].name} ${arabicText.wins}`;
    }

    // Update game state in Firebase
    try {
      const updates = {
        [`players/${playerNumber}/tiles`]: updatedPlayerTiles,
        [`gameState/board`]: updatedBoard,
        [`gameState/currentPlayerIndex`]: nextPlayerIndex
      };

      if (winner) {
        updates[`gameState/winner`] = winner;
        updates[`gameState/status`] = "finished";
        updates[`gameState/message`] = message;
      }

      await update(ref(database, `games/${roomId}`), updates);
      setSelectedTile(null);
    } catch (error) {
      console.error("Error updating game:", error);
      setError("Failed to play tile");
    }
  };

  const handleDrawTile = async () => {
    if (!game) return; // Fixed: Add check for null game
    
    const currentPlayerNumber = game.gameState.currentPlayerIndex === 0 ? 'player1' : 'player2';
    if (playerNumber !== currentPlayerNumber) {
      setGameMessage(arabicText.notYourTurn);
      return;
    }

    if (!game.gameState.boneyard || game.gameState.boneyard.length === 0) { // Fixed: Check for null boneyard
      setGameMessage(arabicText.noTilesLeft);
      
      // If boneyard is empty and player can't play, skip turn
      const canPlay = !isPlayerBlocked(game.players[playerNumber].tiles, game.gameState.board);
      if (!canPlay) {
        const nextPlayerIndex = game.gameState.currentPlayerIndex === 0 ? 1 : 0;
        await update(ref(database, `games/${roomId}/gameState`), {
          currentPlayerIndex: nextPlayerIndex,
          message: `${game.players[playerNumber].name} ${arabicText.hasNoPlayable}`
        });
      }
      return;
    }

    // Draw a tile from the boneyard
    const drawnTile = game.gameState.boneyard[0];
    const updatedBoneyard = game.gameState.boneyard.slice(1);
    const updatedPlayerTiles = [...game.players[playerNumber].tiles, drawnTile];

    // Check if the drawn tile can be played
    const { canPlay } = canPlayTile(drawnTile, game.gameState.board);
    const nextPlayerIndex = canPlay ? game.gameState.currentPlayerIndex : 
                           (game.gameState.currentPlayerIndex === 0 ? 1 : 0);

    const message = canPlay ? 
      `${game.players[playerNumber].name} ${arabicText.canPlay}` :
      `${game.players[playerNumber].name} ${arabicText.passes}`;

    try {
      await update(ref(database, `games/${roomId}`), {
        [`players/${playerNumber}/tiles`]: updatedPlayerTiles,
        [`gameState/boneyard`]: updatedBoneyard,
        [`gameState/currentPlayerIndex`]: nextPlayerIndex,
        [`gameState/message`]: message
      });
    } catch (error) {
      console.error("Error drawing tile:", error);
      setError("Failed to draw tile");
    }
  };

  const isMyTurn = () => {
    if (!game || !playerNumber) return false;
    const currentPlayerNumber = game.gameState.currentPlayerIndex === 0 ? 'player1' : 'player2';
    return playerNumber === currentPlayerNumber;
  };

  if (loading) {
    return <div className="loading arabic-text">{arabicText.loading}</div>; // Fixed: Use translation
  }

  if (error) {
    return <div className="error arabic-text">{error}</div>;
  }

  if (!game) {
    return <div className="error arabic-text">{arabicText.gameNotFound}</div>; // Fixed: Use translation
  }

  // Check if game is in waiting state
  const isWaiting = game.gameState.status === 'waiting';
  const isFinished = game.gameState.status === 'finished';

  return (
    <div className="game-room" dir="rtl">
      <h1 className="arabic-text">{arabicText.gameTitle}</h1>
      <div className="game-info">
        <p className="arabic-text">{arabicText.roomId}: {roomId}</p>
        <button onClick={copyGameLink} className="copy-link-button arabic-text">{arabicText.copyLink}</button>
      </div>

      {gameMessage && (
        <div className="game-message arabic-text">
          {gameMessage}
        </div>
      )}

      {isWaiting ? (
        <div className="waiting-screen">
          <h2 className="arabic-text">{arabicText.waiting}</h2>
          <p className="arabic-text">{arabicText.shareLink}</p>
          <p className="game-link">https://juriprudence.github.io/dommino/#/room/{roomId}</p>
          <button onClick={copyGameLink} className="copy-link-button arabic-text">{arabicText.copyLink}</button>
        </div>
      ) : (
        <div className="game-board">
          <div className="players-info">
            <div className={`player ${game.gameState.currentPlayerIndex === 0 ? 'active' : ''}`}>
              <h3 className="arabic-text">{game.players.player1.name} {playerNumber === 'player1' ? arabicText.you : ''}</h3>
              <p className="arabic-text">{arabicText.tiles}: {game.players.player1.tiles.length}</p>
            </div>
            <div className={`player ${game.gameState.currentPlayerIndex === 1 ? 'active' : ''}`}>
              <h3 className="arabic-text">{game.players.player2.name} {playerNumber === 'player2' ? arabicText.you : ''}</h3>
              <p className="arabic-text">{arabicText.tiles}: {game.players.player2.tiles.length}</p>
            </div>
          </div>

          <div className="board-area">
            {game.gameState.board && game.gameState.board.length > 0 ? (
              <div className="board-tiles">
                {game.gameState.board.map((tile, index) => (
                  <div key={`board-${index}`} className="board-tile">
                    <div className={`domino ${tile.orientation} ${tile.flipped ? 'flipped' : ''}`}>
                      <div className="domino-half">
                        <DominoDots value={tile.left} />
                      </div>
                      <div className="domino-half">
                        <DominoDots value={tile.right} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="arabic-text">{arabicText.noTiles}</p>
            )}
          </div>

          {!isFinished && playerNumber && game.players[playerNumber] && (
            <div className="player-controls">
              <div className="player-hand">
                <h3 className="arabic-text">{arabicText.yourTiles}</h3>
                <div className="tiles">
                  {game.players[playerNumber].tiles.map((tile, index) => (
                    <div 
                      key={`hand-${index}`} 
                      className={`hand-tile ${selectedTile && selectedTile.index === index ? 'selected' : ''}`}
                      onClick={() => handleTileSelect(tile, index)}
                    >
                      <div className="domino">
                        <div className="domino-half">
                          <DominoDots value={tile.left} />
                        </div>
                        <div className="domino-half">
                          <DominoDots value={tile.right} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="game-actions">
                <button 
                  onClick={handlePlayTile} 
                  disabled={!selectedTile || !isMyTurn()}
                  className={`play-button arabic-text ${!selectedTile || !isMyTurn() ? 'disabled' : ''}`}
                >
                  {arabicText.playTile}
                </button>
                <button 
                  onClick={handleDrawTile}
                  disabled={!isMyTurn() || !game.gameState.boneyard || game.gameState.boneyard.length === 0} // Fixed: Check for null boneyard
                  className={`draw-button arabic-text ${!isMyTurn() || !game.gameState.boneyard || game.gameState.boneyard.length === 0 ? 'disabled' : ''}`}
                >
                  {arabicText.drawTile} ({game.gameState.boneyard ? game.gameState.boneyard.length : 0}) {/* Fixed: Check for null boneyard */}
                </button>
              </div>
            </div>
          )}

          {isFinished && game.gameState.winner && game.players[game.gameState.winner] && ( // Fixed: Added checks to prevent errors
            <div className="game-over">
              <h2 className="arabic-text">{arabicText.gameOver}</h2>
              <p className="arabic-text">{game.players[game.gameState.winner].name} {arabicText.wins}</p>
              <button onClick={() => navigate('/')} className="new-game-button arabic-text">
                {arabicText.newGame}
              </button>
            </div>
          )}
        </div>
      )}

      {joinDialogOpen && (
        <div className="join-dialog">
          <h2 className="arabic-text">{arabicText.joinGame}</h2>
          <input
            type="text"
            placeholder={arabicText.enterName}
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            className="player-name-input arabic-input"
            dir="rtl"
          />
          <button onClick={joinGame} className="join-button arabic-text">{arabicText.joinGame}</button>
        </div>
      )}
    </div>
  );
};

// The drawTile function declaration was unused and conflicted with the handleDrawTile method
// So it has been removed as it wasn't being used properly

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomId" element={<GameRoom />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;