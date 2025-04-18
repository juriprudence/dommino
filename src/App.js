import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, update, push, serverTimestamp, onDisconnect, goOffline, goOnline } from 'firebase/database';
import './App.css'; // Make sure you have corresponding CSS styles

// Firebase configuration (KEEP YOUR KEYS SECURE - consider environment variables for production)
const firebaseConfig = {
  apiKey: "AIzaSyABvehKr_lcwOdJExQLlwFLvtR83LTnW_8", // Replace with your actual API key
  authDomain: "myproje-4a2e2.firebaseapp.com",
  // IMPORTANT: Use the correct RTDB URL for your project's region. Check Firebase Console.
  databaseURL: "https://myproje-4a2e2-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "myproje-4a2e2",
  storageBucket: "myproje-4a2e2.appspot.com",
  messagingSenderId: "913698461417",
  appId: "1:913698461417:web:953647edfd328c14f7c278"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Test Firebase connection and handle presence
console.log("Firebase initializing...");
const connectionRef = ref(database, '.info/connected');
onValue(connectionRef, (snap) => {
  if (snap.val() === true) {
    console.log('Connected to Firebase Realtime Database');
  } else {
    console.log('Not connected to Firebase Realtime Database');
  }
});

// Arabic translations
const arabicText = {
  gameTitle: "لعبة الدومينو",
  enterName: "أدخل اسمك",
  startGame: "ابدأ لعبة جديدة",
  waiting: "...في انتظار انضمام اللاعب الثاني",
  shareLink: "شارك هذا الرابط مع صديقك للانضمام:",
  copyLink: "انسخ الرابط",
  linkCopied: "تم نسخ الرابط!",
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
  noTilesLeft: "!لا توجد قطع متبقية للسحب",
  drew: "سحب قطعة",
  canPlayAfterDraw: "سحب قطعة ويمكنه اللعب الآن",
  passesAfterDraw: "سحب قطعة ولا يمكنه اللعب، يمرر الدور",
  hasNoPlayableAndBoneyardEmpty: "لا يملك قطعًا قابلة للعب ولا يوجد قطع للسحب، يمرر الدور",
  you: "(أنت)",
  tiles: "القطع",
  loading: "...جاري تحميل اللعبة",
  gameNotFound: "اللعبة غير موجودة أو تم حذفها",
  errorOccurred: "حدث خطأ",
  failedToCreate: "فشل في إنشاء اللعبة",
  failedToJoin: "فشل في الانضمام للعبة",
  failedToPlay: "فشل في لعب القطعة",
  failedToDraw: "فشل في سحب قطعة",
  enterNameToJoin: "أدخل اسمك للانضمام",
  opponentDisconnected: "الخصم غير متصل",
  waitingForOpponent: "...في انتظار عودة الخصم",
  gameDraw: "انتهت اللعبة بالتعادل (الطاولة مقفلة)!",
  selectTileFirst: "اختر قطعة أولاً",
  opponentNeedsToDraw: "قد يحتاج للسحب.",
  yourTurnNow: "دورك الآن",
  waitingTurn: "انتظر دورك",
  opponentPassed: "مرر الدور", // Added missing translation
};

// --- Utility Functions ---

const generateDominoTiles = () => {
  const tiles = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      const id = i <= j ? `${i}-${j}` : `${j}-${i}`;
      tiles.push({ left: i, right: j, id: id });
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

// --- Domino Dot Display Component ---
const DominoDots = React.memo(({ value }) => {
  const renderDots = () => {
    switch (value) {
      case 0: return <div className="dots-container empty"></div>;
      case 1: return <div className="dots-container one"><span className="dot center"></span></div>;
      case 2: return <div className="dots-container two"><span className="dot top-right"></span><span className="dot bottom-left"></span></div>;
      case 3: return <div className="dots-container three"><span className="dot top-right"></span><span className="dot center"></span><span className="dot bottom-left"></span></div>;
      case 4: return <div className="dots-container four"><span className="dot top-left"></span><span className="dot top-right"></span><span className="dot bottom-left"></span><span className="dot bottom-right"></span></div>;
      case 5: return <div className="dots-container five"><span className="dot top-left"></span><span className="dot top-right"></span><span className="dot center"></span><span className="dot bottom-left"></span><span className="dot bottom-right"></span></div>;
      case 6: return <div className="dots-container six"><span className="dot top-left"></span><span className="dot top-right"></span><span className="dot middle-left"></span><span className="dot middle-right"></span><span className="dot bottom-left"></span><span className="dot bottom-right"></span></div>;
      default: return null;
    }
  };
  return renderDots();
});

// --- Core Game Logic Functions ---

// ** Determines the outward-facing value at a specific end of the board **
const getEndValue = (board, end) => {
    if (!board || board.length === 0) return null;
    // The board array represents the chain visually from left to right.
    // The 'left' property of the first tile is the "leftmost" value.
    // The 'right' property of the last tile is the "rightmost" value.
    if (end === 'left') {
        return board[0].left;
    } else { // end === 'right'
        return board[board.length - 1].right;
    }
};

// ** Check if a tile can be played on the current board **
const canPlayTile = (tile, board) => {
    if (!board || board.length === 0) {
        // Any tile can start. matchingValue is irrelevant.
        return { canPlay: true, position: "first", matchingValue: null };
    }

    const leftEndValue = getEndValue(board, 'left');
    const rightEndValue = getEndValue(board, 'right');

    // Check left end
    if (tile.left === leftEndValue || tile.right === leftEndValue) {
        // Can play left. Needs to match leftEndValue.
        return { canPlay: true, position: "left", matchingValue: leftEndValue };
    }
    // Check right end
    if (tile.left === rightEndValue || tile.right === rightEndValue) {
        // Can play right. Needs to match rightEndValue.
        return { canPlay: true, position: "right", matchingValue: rightEndValue };
    }

    return { canPlay: false };
};

// Check if a player has won (no tiles left)
const checkWinner = (game) => {
  if (!game || !game.players) return null;
  if (game.players.player1?.tiles?.length === 0) return "player1";
  if (game.players.player2?.tiles?.length === 0) return "player2";
  return null;
};

// Check if the game is blocked (neither player can play, boneyard empty)
const checkBlockedGame = (game) => {
    if (!game || !game.gameState || !game.players) return false;
    const boneyardEmpty = !game.gameState.boneyard || game.gameState.boneyard.length === 0;
    if (!boneyardEmpty) return false;
    const player1Blocked = isPlayerBlocked(game.players.player1?.tiles || [], game.gameState.board || []);
    const player2Blocked = isPlayerBlocked(game.players.player2?.tiles || [], game.gameState.board || []);
    return player1Blocked && player2Blocked;
};

// Calculate points (sum of dots) for a player's tiles
const calculatePoints = (tiles) => {
    return tiles.reduce((sum, tile) => sum + tile.left + tile.right, 0);
}

// Check if a player is blocked (has no playable tiles)
const isPlayerBlocked = (playerTiles, board) => {
  if (!playerTiles || playerTiles.length === 0) return false; // Cannot be blocked if no tiles
  if (!board || board.length === 0) return false; // Never blocked if board is empty

  for (const tile of playerTiles) {
    const { canPlay } = canPlayTile(tile, board);
    if (canPlay) return false; // Found a playable tile
  }
  return true; // No playable tiles found
};

// --- Home Component (Landing Page) ---
const Home = () => {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleStartGame = async () => {
    if (!playerName.trim()) {
      setError(arabicText.enterName);
      return;
    }
    if (isCreating) return;
    setIsCreating(true);
    setError('');

    try {
      console.log("Creating new game...");
      const gamesRef = ref(database, 'games');
      const newGameRef = push(gamesRef);
      const gameId = newGameRef.key;

      if (!gameId) throw new Error("Failed to get unique game ID from Firebase.");

      console.log("Game ID:", gameId);

      const tiles = generateDominoTiles();
      const shuffledTiles = shuffleTiles(tiles);
      const player1Tiles = shuffledTiles.slice(0, 7);
      const player2Tiles = shuffledTiles.slice(7, 14);
      const boneyard = shuffledTiles.slice(14);

      const initialGameData = {
        gameId: gameId,
        players: {
          player1: { id: 'player1', name: playerName, tiles: player1Tiles, connected: true, lastSeen: serverTimestamp() },
          player2: { id: 'player2', name: '', tiles: player2Tiles, connected: false, lastSeen: null }
        },
        gameState: {
          status: 'waiting', currentPlayerIndex: 0, board: [], boneyard: boneyard,
          timestamp: serverTimestamp(), winner: null, message: `${playerName} ${arabicText.startGame}`,
          turnStartTime: null,
        }
      };

      await set(newGameRef, initialGameData);
      console.log("Game data saved successfully");

      localStorage.setItem('playerName', playerName);
      localStorage.setItem('playerNumber', 'player1');
      localStorage.setItem('currentGameId', gameId);

      navigate(`/room/${gameId}`);

    } catch (error) {
      console.error("Firebase set error:", error);
      setError(`${arabicText.failedToCreate}: ${error.message}`);
      setIsCreating(false);
    }
  };

  return (
    <div className="home-container">
      <div className="domino-logo">
        <div className="logo-domino">
          <div className="domino-half"><DominoDots value={6} /></div>
          <div className="domino-half"><DominoDots value={6} /></div>
        </div>
      </div>
      <h1 className="arabic-text">{arabicText.gameTitle}</h1>
      <div className="start-game-form">
        <input
          type="text" placeholder={arabicText.enterName} value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="player-name-input arabic-input" maxLength={20} dir="rtl"
        />
        {error && <p className="error-message">{error}</p>}
        <button
           onClick={handleStartGame} className="start-game-button arabic-text"
           disabled={isCreating}
        >
          {isCreating ? arabicText.loading : arabicText.startGame}
        </button>
      </div>
    </div>
  );
};


// --- Game Room Component ---
const GameRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playerNumber, setPlayerNumber] = useState(localStorage.getItem('playerNumber') || null);
  const [playerName, setPlayerName] = useState(localStorage.getItem('playerName') || '');
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedTile, setSelectedTile] = useState(null); // { tile: { left, right, id }, index: number }
  const [gameMessage, setGameMessage] = useState('');
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);

  // Establish presence for the current player
  useEffect(() => {
    if (!roomId || !playerNumber) return;

    const playerRef = ref(database, `games/${roomId}/players/${playerNumber}`);
    const playerConnectedRef = ref(database, `games/${roomId}/players/${playerNumber}/connected`);
    const playerLastSeenRef = ref(database, `games/${roomId}/players/${playerNumber}/lastSeen`);

    let presenceIntervalId = null;

    const presenceListener = onValue(connectionRef, (snap) => {
        const isConnected = snap.val() === true;
        if (!isConnected) {
            set(playerLastSeenRef, serverTimestamp());
            if (presenceIntervalId) clearInterval(presenceIntervalId); // Stop periodic updates if disconnected
            return;
        }

        set(playerConnectedRef, true);
        onDisconnect(playerRef).update({
            connected: false,
            lastSeen: serverTimestamp()
        }).catch(err => console.error("Firebase onDisconnect error:", err));

        // Update lastSeen periodically while connected
        if (presenceIntervalId) clearInterval(presenceIntervalId); // Clear previous interval if any
        presenceIntervalId = setInterval(() => {
            set(playerLastSeenRef, serverTimestamp()).catch(err => console.warn("Error updating lastSeen:", err));
        }, 60 * 1000); // Update every minute

    });

    // Clean up on unmount
    return () => {
        presenceListener(); // Detach the listener
        if (presenceIntervalId) clearInterval(presenceIntervalId);
        onDisconnect(playerRef).cancel().catch(err => console.warn("Error cancelling onDisconnect:", err));
        // Optional: Force offline status on manual leave?
        // update(playerRef, { connected: false, lastSeen: serverTimestamp() });
    };

  }, [roomId, playerNumber]);


  // Fetch game data and subscribe to updates
  useEffect(() => {
    console.log(`Loading room: ${roomId}, Player: ${playerNumber || 'N/A'}`);
    setLoading(true);
    setError('');
    const gameRef = ref(database, `games/${roomId}`);

    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      console.log("Game data received:", data);

      if (!data) {
        setError(arabicText.gameNotFound);
        setGame(null);
        setLoading(false);
        localStorage.removeItem('currentGameId'); // Clear local state if game disappears
        localStorage.removeItem('playerNumber');
        return;
      }

      setGame(data);
      setGameMessage(data.gameState.message || '');
      setLoading(false);

      const storedPlayerNumber = localStorage.getItem('playerNumber');
      const storedGameId = localStorage.getItem('currentGameId');

      // Logic to handle joining or identifying existing player
      if (data.gameState.status === 'waiting' && data.players.player2 && !data.players.player2.name && storedGameId === roomId && storedPlayerNumber === 'player1') {
        setPlayerNumber('player1');
        setPlayerName(data.players.player1.name);
        setJoinDialogOpen(false);
      } else if (data.gameState.status === 'waiting' && data.players.player2 && !data.players.player2.connected && (!storedPlayerNumber || storedGameId !== roomId) && !joinDialogOpen) {
         console.log("Opening join dialog for Player 2");
         setJoinDialogOpen(true);
         setPlayerNumber(null);
      } else if (storedPlayerNumber && storedGameId === roomId) {
          setPlayerNumber(storedPlayerNumber);
          setPlayerName(localStorage.getItem('playerName') || '');
          setJoinDialogOpen(false);
      } else if (data.gameState.status !== 'waiting' && (!storedPlayerNumber || storedGameId !== roomId)) {
          setError("Game already in progress or finished.");
          // navigate('/'); // Option to redirect spectators
      }

    }, (err) => {
      console.error("Firebase onValue error:", err);
      setError(`${arabicText.errorOccurred}: ${err.message}`);
      setLoading(false);
    });

    return () => {
        console.log("Unsubscribing from game updates:", roomId);
        unsubscribe();
    };
  }, [roomId, joinDialogOpen, navigate, playerNumber]); // Rerun if these change

  // --- Game Actions ---

  const joinGame = useCallback(async () => {
    if (!newPlayerName.trim()) {
      setError(arabicText.enterNameToJoin);
      return;
    }
    if (!game || game.players.player2.connected) {
        setError("Cannot join game now.");
        return;
    }
    setError('');

    try {
      console.log(`Player ${newPlayerName} joining as Player 2`);
      const updates = {
        [`players/player2/name`]: newPlayerName,
        [`players/player2/connected`]: true,
        [`players/player2/lastSeen`]: serverTimestamp(),
        [`gameState/status`]: 'playing',
        [`gameState/message`]: `${game.players.player1.name} ${arabicText.yourTurnNow}`,
        [`gameState/turnStartTime`]: serverTimestamp()
      };

      await update(ref(database, `games/${roomId}`), updates);

      localStorage.setItem('playerName', newPlayerName);
      localStorage.setItem('playerNumber', 'player2');
      localStorage.setItem('currentGameId', roomId);
      setPlayerName(newPlayerName);
      setPlayerNumber('player2'); // Update state immediately
      setJoinDialogOpen(false);
      console.log("Joined successfully");

    } catch (error) {
      console.error("Join game error:", error);
      setError(`${arabicText.failedToJoin}: ${error.message}`);
    }
  }, [roomId, game, newPlayerName, navigate]);

  const copyGameLink = useCallback(() => {
    const link = window.location.href;
    navigator.clipboard.writeText(link)
      .then(() => {
        setShowCopyFeedback(true);
        setTimeout(() => setShowCopyFeedback(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        alert("Failed to copy link automatically.");
      });
  }, []);

  const handleTileSelect = useCallback((tile, index) => {
    if (!game || !isMyTurn() || game.gameState.status !== 'playing') return;
    console.log("Selected tile:", tile, "at index:", index);
    setSelectedTile({ tile: { ...tile }, index });
    setGameMessage(''); // Clear previous messages
  }, [game, isMyTurn]); // Dependency needs isMyTurn

    // Helper to check if it's the current user's turn (memoized)
    const isMyTurn = useCallback(() => {
        if (!game || !playerNumber || game.gameState.status !== 'playing') return false;
        const currentPlayerId = game.gameState.currentPlayerIndex === 0 ? 'player1' : 'player2';
        return playerNumber === currentPlayerId;
    }, [game, playerNumber]);


  // ** Handle Playing a Tile (with Corrected Flipping Logic) **
  const handlePlayTile = useCallback(async () => {
    if (!selectedTile || !game || !isMyTurn() || game.gameState.status !== 'playing') {
        console.warn("Play condition not met:", { selectedTile, game, isMyTurn: isMyTurn(), status: game?.gameState?.status });
        if (!selectedTile && isMyTurn()) setGameMessage(arabicText.selectTileFirst);
        else if (!isMyTurn()) setGameMessage(arabicText.notYourTurn);
        return;
    }

    const board = game.gameState.board || [];
    const { canPlay, position, matchingValue } = canPlayTile(selectedTile.tile, board);

    if (!canPlay) {
      setGameMessage(arabicText.cantPlay);
      setSelectedTile(null);
      return;
    }

    try {
        const updates = {};
        const currentPlayerTiles = [...game.players[playerNumber].tiles];
        // ** IMPORTANT: Use a deep copy for the tile to modify **
        const playedTileData = JSON.parse(JSON.stringify(currentPlayerTiles.splice(selectedTile.index, 1)[0]));
        updates[`players/${playerNumber}/tiles`] = currentPlayerTiles;

        let tileToAdd = playedTileData;
        tileToAdd.orientation = (tileToAdd.left === tileToAdd.right) ? "vertical" : "horizontal";

        // --- *** CORRECTED TILE FLIPPING LOGIC *** ---
        if (position !== 'first') {
            if (position === 'left') {
                // Playing on the left end (unshift). RIGHT side must match board's leftEndValue.
                if (tileToAdd.left === matchingValue) {
                    [tileToAdd.left, tileToAdd.right] = [tileToAdd.right, tileToAdd.left]; // Flip
                    console.log(`Flipped ${selectedTile.tile.id} to ${tileToAdd.left}|${tileToAdd.right} for left placement`);
                }
            } else { // position === 'right'
                // Playing on the right end (push). LEFT side must match board's rightEndValue.
                if (tileToAdd.right === matchingValue) {
                    [tileToAdd.left, tileToAdd.right] = [tileToAdd.right, tileToAdd.left]; // Flip
                    console.log(`Flipped ${selectedTile.tile.id} to ${tileToAdd.left}|${tileToAdd.right} for right placement`);
                }
            }
        }
        // --- *** END OF CORRECTION *** ---

        let updatedBoard = [...board];
        if (position === "first" || position === "left") {
            updatedBoard.unshift(tileToAdd);
            console.log(`Board: Adding ${tileToAdd.left}|${tileToAdd.right} to start`);
        } else {
            updatedBoard.push(tileToAdd);
            console.log(`Board: Adding ${tileToAdd.left}|${tileToAdd.right} to end`);
        }
        updates[`gameState/board`] = updatedBoard;

        // Check for Winner / Draw / Next Turn
        let winner = null;
        let gameEndStatus = game.gameState.status;
        let message = ""; // Will be set below
        const nextPlayerIndex = game.gameState.currentPlayerIndex === 0 ? 1 : 0;
        const nextPlayerNumber = nextPlayerIndex === 0 ? 'player1' : 'player2';
        const opponentName = game.players[nextPlayerNumber]?.name || 'الخصم';

        if (currentPlayerTiles.length === 0) {
            winner = playerNumber;
            gameEndStatus = "finished";
            message = `${playerName} ${arabicText.wins}`;
            updates[`gameState/winner`] = winner;
            updates[`gameState/status`] = gameEndStatus;
            console.log("Winner detected:", playerNumber);
        } else {
            // Switch Player
            updates[`gameState/currentPlayerIndex`] = nextPlayerIndex;
            updates[`gameState/turnStartTime`] = serverTimestamp();

            // Check if next player is blocked
            const nextPlayerTiles = game.players[nextPlayerNumber]?.tiles || [];
            const boneyardEmpty = !game.gameState.boneyard || game.gameState.boneyard.length === 0;
            message = `${opponentName} ${arabicText.yourTurnNow}`; // Default message for next player

            if (isPlayerBlocked(nextPlayerTiles, updatedBoard)) {
                 if (boneyardEmpty) {
                     // Both players blocked, boneyard empty -> DRAW
                     if (isPlayerBlocked(currentPlayerTiles, updatedBoard)) {
                          gameEndStatus = "finished";
                          winner = 'draw';
                          message = arabicText.gameDraw;
                          updates[`gameState/status`] = gameEndStatus;
                          updates[`gameState/winner`] = winner;
                          console.log("Game Draw detected");
                     } else {
                          // Next player blocked & boneyard empty, but current *could* play (shouldn't happen in standard dominoes after a valid play)
                          message = `${opponentName} ${arabicText.hasNoPlayableAndBoneyardEmpty}`;
                          console.warn("Next player blocked (boneyard empty), current is not? Odd state.");
                     }
                 } else {
                     // Next player blocked, but can draw
                     message = `${opponentName} ${arabicText.opponentNeedsToDraw}`; // More specific message
                     console.log("Next player blocked, needs to draw.");
                 }
            }
        }

        updates[`gameState/message`] = message;
        await update(ref(database, `games/${roomId}`), updates);
        setSelectedTile(null);

    } catch (error) {
        console.error("Error playing tile:", error);
        setError(`${arabicText.failedToPlay}: ${error.message}`);
    }
  }, [selectedTile, game, playerNumber, playerName, roomId, isMyTurn, arabicText]);


  const handleDrawTile = useCallback(async () => {
    if (!game || !isMyTurn() || game.gameState.status !== 'playing') return;

    const boneyard = game.gameState.boneyard || [];
    const board = game.gameState.board || [];
    const playerTiles = game.players[playerNumber].tiles || [];
    const playerIsCurrentlyBlocked = isPlayerBlocked(playerTiles, board);

    if (boneyard.length === 0) {
      setGameMessage(arabicText.noTilesLeft);
      if (playerIsCurrentlyBlocked) {
        // Must pass turn if blocked and boneyard empty
        try {
            const nextPlayerIndex = game.gameState.currentPlayerIndex === 0 ? 1 : 0;
            const nextPlayerNumber = nextPlayerIndex === 0 ? 'player1' : 'player2';
            const opponentName = game.players[nextPlayerNumber]?.name || 'الخصم';
            let message = `${playerName} ${arabicText.opponentPassed}. ${opponentName} ${arabicText.yourTurnNow}`;
            let updates = {
                currentPlayerIndex: nextPlayerIndex,
                turnStartTime: serverTimestamp(),
                message: message
            };

             // Check for immediate Draw if other player is also blocked
             const otherPlayerTiles = game.players[nextPlayerNumber]?.tiles || [];
             if(isPlayerBlocked(otherPlayerTiles, board)) {
                 updates.message = arabicText.gameDraw;
                 updates.status = 'finished';
                 updates.winner = 'draw';
                 console.log("Game Draw detected (pass blocked player, other also blocked)");
             } else {
                 console.log("Player passing turn (blocked, boneyard empty)");
             }
            await update(ref(database, `games/${roomId}/gameState`), updates);
        } catch (error) {
            console.error("Error passing turn:", error);
            setError("Failed to pass turn.");
        }
      } else {
          // Boneyard empty, but player *can* play.
          setGameMessage("لا يمكنك السحب، لديك قطعة للعب!");
      }
      return;
    }

    // --- Boneyard is not empty ---
    try {
      const updates = {};
      const drawnTile = boneyard[0];
      const updatedBoneyard = boneyard.slice(1);
      const updatedPlayerTiles = [...playerTiles, drawnTile];

      updates[`players/${playerNumber}/tiles`] = updatedPlayerTiles;
      updates[`gameState/boneyard`] = updatedBoneyard;

      const canPlayAfterDraw = !isPlayerBlocked(updatedPlayerTiles, board);
      let message = `${playerName} ${arabicText.drew}`;

      if (canPlayAfterDraw) {
        message += `. ${arabicText.canPlayAfterDraw}`;
        updates[`gameState/message`] = message;
        updates[`gameState/turnStartTime`] = serverTimestamp(); // Reset timer, turn stays
        console.log("Player drew, can play now.");
      } else {
        // Drew and still cannot play. Pass the turn.
        const nextPlayerIndex = game.gameState.currentPlayerIndex === 0 ? 1 : 0;
        const nextPlayerNumber = nextPlayerIndex === 0 ? 'player1' : 'player2';
        const opponentName = game.players[nextPlayerNumber]?.name || 'الخصم';
        message += `. ${arabicText.passesAfterDraw}. ${opponentName} ${arabicText.yourTurnNow}`;
        updates[`gameState/currentPlayerIndex`] = nextPlayerIndex;
        updates[`gameState/turnStartTime`] = serverTimestamp();
        updates[`gameState/message`] = message;
        console.log("Player drew, still blocked, passing turn.");

        // Check for Draw if boneyard just became empty AND next player is blocked
        if (updatedBoneyard.length === 0) {
             const nextPlayerTiles = game.players[nextPlayerNumber]?.tiles || [];
             if (isPlayerBlocked(nextPlayerTiles, board)) {
                  updates[`gameState/message`] = arabicText.gameDraw;
                  updates[`gameState/status`] = 'finished';
                  updates[`gameState/winner`] = 'draw';
                  console.log("Game Draw detected (drew last tile, next player blocked)");
             }
        }
      }

      await update(ref(database, `games/${roomId}`), updates);
      setSelectedTile(null);

    } catch (error) {
      console.error("Error drawing tile:", error);
      setError(`${arabicText.failedToDraw}: ${error.message}`);
    }
  }, [game, playerNumber, playerName, roomId, isMyTurn, arabicText]);


  // Helper to get opponent's player number
  const getOpponentNumber = useCallback(() => {
      if (!playerNumber) return null;
      return playerNumber === 'player1' ? 'player2' : 'player1';
  }, [playerNumber]);

  // --- Render Logic ---

  if (loading) {
    return <div className="loading arabic-text">{arabicText.loading}</div>;
  }

  if (error && !game) {
    return <div className="error-fullpage arabic-text">{error}</div>;
  }

  if (joinDialogOpen) {
     return (
        <div className="game-room" dir="rtl">
             <h1 className="arabic-text">{arabicText.gameTitle}</h1>
             <div className="join-dialog">
                <h2 className="arabic-text">{arabicText.joinGame}</h2>
                {error && <p className="error-message">{error}</p>}
                <input
                    type="text" placeholder={arabicText.enterName} value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="player-name-input arabic-input" maxLength={20} dir="rtl"
                />
                <button onClick={joinGame} className="join-button arabic-text">
                    {arabicText.joinGame}
                </button>
             </div>
        </div>
     );
  }

  if (!game || !playerNumber) {
      console.error("Game rendering error: No game data or playerNumber.", { game, playerNumber });
      return <div className="error-fullpage arabic-text">{error || arabicText.errorOccurred + ": الحالة غير متوقعة."}</div>;
  }

  const isWaiting = game.gameState.status === 'waiting';
  const isPlaying = game.gameState.status === 'playing';
  const isFinished = game.gameState.status === 'finished';
  const opponentNumber = getOpponentNumber();
  const opponent = opponentNumber ? game.players[opponentNumber] : null;
  const opponentConnected = opponent?.connected;

  return (
    <div className="game-room" dir="rtl">
      <h1 className="arabic-text">{arabicText.gameTitle}</h1>

      {error && <div className="error-inline arabic-text">{error}</div>}

      <div className="game-info">
        <span className="arabic-text">{arabicText.roomId}: {roomId}</span>
        {isWaiting && (
            <button onClick={copyGameLink} className="copy-link-button arabic-text">
                {showCopyFeedback ? arabicText.linkCopied : arabicText.copyLink}
            </button>
        )}
      </div>

      {gameMessage && (
        <div className={`game-message arabic-text ${isMyTurn() ? 'my-turn-message' : ''}`}>
          {gameMessage}
        </div>
      )}
       {!opponentConnected && isPlaying && (
          <div className="game-message error-message arabic-text">
              {arabicText.opponentDisconnected}. {arabicText.waitingForOpponent}
          </div>
      )}

      {isWaiting && playerNumber === 'player1' && (
        <div className="waiting-screen">
          <h2 className="arabic-text">{arabicText.waiting}</h2>
          <p className="arabic-text">{arabicText.shareLink}</p>
          <p className="game-link">{window.location.href}</p>
          {/* Copy button is now in the game-info bar */}
        </div>
      )}

      {(isPlaying || isFinished) && (
        <div className="game-content">
          <div className="players-info">
            {/* Player 1 Info */}
            <div className={`player-info ${game.gameState.currentPlayerIndex === 0 && isPlaying ? 'active-turn' : ''} ${!game.players.player1.connected && isPlaying ? 'disconnected' : ''}`}>
              <h3 className="arabic-text player-name">
                {game.players.player1.name} {playerNumber === 'player1' ? arabicText.you : ''}
                {!game.players.player1.connected && isPlaying && <span className="status-indicator"> (غير متصل)</span>}
              </h3>
              <p className="arabic-text">{arabicText.tiles}: {game.players.player1?.tiles?.length ?? '?'}</p>
            </div>
             {/* Boneyard Info */}
             <div className="boneyard-info">
                <span className="domino-icon">🦴</span>
                <span className="arabic-text"> ({game.gameState.boneyard?.length ?? 0})</span>
             </div>
            {/* Player 2 Info */}
            <div className={`player-info ${game.gameState.currentPlayerIndex === 1 && isPlaying ? 'active-turn' : ''} ${!game.players.player2.connected && isPlaying ? 'disconnected' : ''}`}>
              <h3 className="arabic-text player-name">
                {game.players.player2.name || '؟؟؟'} {playerNumber === 'player2' ? arabicText.you : ''}
                 {!game.players.player2.connected && isPlaying && <span className="status-indicator"> (غير متصل)</span>}
              </h3>
              <p className="arabic-text">{arabicText.tiles}: {game.players.player2?.tiles?.length ?? '?'}</p>
            </div>
          </div>

          <div className="board-area-container">
             <div className="board-area">
                {game.gameState.board && game.gameState.board.length > 0 ? (
                <div className="board-tiles">
                    {game.gameState.board.map((tile, index) => (
                    <div key={`${tile.id}-${index}`} className={`board-tile-wrapper ${tile.orientation}`}>
                        <div title={`${tile.left}|${tile.right}`} className={`domino ${tile.orientation}`}>
                        <div className="domino-half"><DominoDots value={tile.left} /></div>
                        <div className="domino-half"><DominoDots value={tile.right} /></div>
                        </div>
                    </div>
                    ))}
                </div>
                ) : (
                <p className="arabic-text no-tiles-message">{arabicText.noTiles}</p>
                )}
            </div>
          </div>

          {isPlaying && playerNumber && game.players[playerNumber]?.tiles && (
            <div className="player-controls">
              <div className="player-hand">
                <div className="tiles">
                  {game.players[playerNumber].tiles.map((tile, index) => (
                    <div
                      key={`${tile.id}-hand-${index}`}
                      className={`hand-tile ${selectedTile?.index === index ? 'selected' : ''} ${!isMyTurn() ? 'disabled' : ''}`}
                      onClick={() => handleTileSelect(tile, index)}
                      title={`${tile.left}|${tile.right}`}
                    >
                      <div className="domino">
                        <div className="domino-half"><DominoDots value={tile.left} /></div>
                        <div className="domino-half"><DominoDots value={tile.right} /></div>
                      </div>
                    </div>
                  ))}
                   {game.players[playerNumber].tiles.length === 0 && isPlaying && (
                      <p className="arabic-text">لا تملك قطعًا!</p>
                   )}
                </div>
              </div>

              <div className="game-actions">
                <button
                  onClick={handlePlayTile}
                  disabled={!selectedTile || !isMyTurn() || !opponentConnected}
                  className={`action-button play-button arabic-text ${(!selectedTile || !isMyTurn() || !opponentConnected) ? 'disabled' : ''}`}
                  title={!selectedTile ? arabicText.selectTileFirst : !isMyTurn() ? arabicText.notYourTurn : !opponentConnected ? arabicText.opponentDisconnected : arabicText.playTile}
                >
                  {arabicText.playTile}
                </button>
                <button
                  onClick={handleDrawTile}
                  disabled={!isMyTurn() || (game.gameState.boneyard?.length === 0) || !opponentConnected}
                  className={`action-button draw-button arabic-text ${(!isMyTurn() || (game.gameState.boneyard?.length === 0) || !opponentConnected) ? 'disabled' : ''}`}
                  title={!isMyTurn() ? arabicText.notYourTurn : (game.gameState.boneyard?.length === 0) ? arabicText.noTilesLeft : !opponentConnected ? arabicText.opponentDisconnected : arabicText.drawTile}
                >
                  {arabicText.drawTile}
                </button>
              </div>
            </div>
          )}

          {isFinished && (
            <div className="game-over">
              <h2 className="arabic-text">{arabicText.gameOver}</h2>
              {game.gameState.winner === 'draw' ? (
                  <p className="arabic-text winner-message">{arabicText.gameDraw}</p>
              ) : game.gameState.winner && game.players[game.gameState.winner] ? (
                 <p className="arabic-text winner-message">
                     {game.players[game.gameState.winner].name} {arabicText.wins}
                </p>
              ) : (
                  <p className="arabic-text winner-message">انتهت اللعبة.</p>
              )}
              <button onClick={() => {
                  localStorage.removeItem('currentGameId');
                  localStorage.removeItem('playerNumber');
                  navigate('/');
                }}
                className="action-button new-game-button arabic-text">
                {arabicText.newGame}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Main App Component ---
function App() {
    return (
        <Router>
            <div className="App">
                <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/room/:roomId" element={<GameRoom />} />
                <Route path="*" element={ <div className="error-fullpage arabic-text"><h1>404 - الصفحة غير موجودة</h1><a href="/#/">العودة للرئيسية</a></div>} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;