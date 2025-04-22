import { getDatabase, ref, set, onValue, update, push } from 'firebase/database';

// Arabic translations
export const arabicText = {
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
  winsLowPoints: "فاز بأقل عدد من النقاط!",
  gameTied: "تعادل في اللعبة!",
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
  loading: "...جاري تحميل اللعبة",
  gameNotFound: "اللعبة غير موجودة",
  played: "لعب قطعة",
  
  // AI related translations
  aiMode: "العب ضد الذكاء الاصطناعي",
  multiplayerMode: "العب مع صديق",
  aiDifficulty: "مستوى الصعوبة",
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
  aiPlayerName: "الخصم الآلي",
  aiIndicator: "(ذكاء اصطناعي)",
  aiThinking: "يفكر",
  aiModeActive: "وضع الذكاء الاصطناعي",
  
  // Auto-restart and winner display translations
  goesFirst: "يبدأ اللعبة",
  playAgain: "العب مرة أخرى",
  newGameStartingIn: "ستبدأ لعبة جديدة خلال",
  seconds: "ثوان",
  hasWon: "فاز"
};

// Utility Functions
export const generateDominoTiles = () => {
  const tiles = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      tiles.push({ left: i, right: j, id: `${i}-${j}` });
    }
  }
  return tiles;
};

export const shuffleTiles = (tiles) => {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Check if a tile can be played on the board
export const canPlayTile = (tile, board) => {
  // If board is empty, any tile can be played
  if (!board || board.length === 0) {
    return { canPlay: true, position: "first", needsFlip: false, orientation: "horizontal" };
  }

  // Get the values at the ends of the board
  const leftEndTile = board[0];
  const rightEndTile = board[board.length - 1];

  // The value to match on the left and right
  const boardLeftValue = leftEndTile.left;
  const boardRightValue = rightEndTile.right;

  // Check if the tile can be played on the left
  if (tile.right === boardLeftValue) {
    // No flip needed, right of tile matches left of board
    return {
      canPlay: true,
      position: "left",
      needsFlip: false,
      orientation: tile.left === tile.right ? "vertical" : "horizontal"
    };
  }
  if (tile.left === boardLeftValue) {
    // Flip needed, left of tile matches left of board
    return {
      canPlay: true,
      position: "left",
      needsFlip: true,
      orientation: tile.left === tile.right ? "vertical" : "horizontal"
    };
  }

  // Check if the tile can be played on the right
  if (tile.left === boardRightValue) {
    // No flip needed, left of tile matches right of board
    return {
      canPlay: true,
      position: "right",
      needsFlip: false,
      orientation: tile.left === tile.right ? "vertical" : "horizontal"
    };
  }
  if (tile.right === boardRightValue) {
    // Flip needed, right of tile matches right of board
    return {
      canPlay: true,
      position: "right",
      needsFlip: true,
      orientation: tile.left === tile.right ? "vertical" : "horizontal"
    };
  }

  return { canPlay: false };
};

// Check for a game winner
export const checkWinner = (game) => {
  if (game.players.player1.tiles.length === 0) {
    return "player1";
  } else if (game.players.player2.tiles.length === 0) {
    return "player2";
  }
  
  // Check if game is deadlocked (both players can't play)
  const p1Blocked = isPlayerBlocked(game.players.player1.tiles, game.gameState.board);
  const p2Blocked = isPlayerBlocked(game.players.player2.tiles, game.gameState.board);
  
  if (p1Blocked && p2Blocked && (!game.gameState.boneyard || game.gameState.boneyard.length === 0)) {
    // Calculate points - player with lowest points wins
    const p1Points = game.players.player1.tiles.reduce((sum, tile) => sum + tile.left + tile.right, 0);
    const p2Points = game.players.player2.tiles.reduce((sum, tile) => sum + tile.left + tile.right, 0);
    
    if (p1Points < p2Points) {
      return "player1";
    } else if (p2Points < p1Points) {
      return "player2";
    } else {
      return "tie"; // Game is tied
    }
  }
  
  return null;
};

// Check if player is blocked (can't make a move)
export const isPlayerBlocked = (playerTiles, board) => {
  if (!board || board.length === 0) return false;
  
  for (const tile of playerTiles) {
    const { canPlay } = canPlayTile(tile, board);
    if (canPlay) return false;
  }
  
  return true;
};

// Calculate total points in a player's hand
export const calculatePoints = (tiles) => {
  return tiles.reduce((sum, tile) => sum + tile.left + tile.right, 0);
};

// Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyABvehKr_lcwOdJExQLlwFLvtR83LTnW_8",
  authDomain: "myproje-4a2e2.firebaseapp.com",
  databaseURL: "https://myproje-4a2e2.firebaseio.com",
  projectId: "myproje-4a2e2",
  storageBucket: "myproje-4a2e2",
  messagingSenderId: "913698461417",
  appId: "1:913698461417:web:953647edfd328c14f7c278"
};

// Update leaderboard: increment or set a player's score
export const updateLeaderboard = async (playerName, points) => {
  const db = getDatabase();
  const leaderboardRef = ref(db, 'leaderboard/' + playerName);
  // Use a transaction to increment points atomically and ensure points is always a valid number
  await update(leaderboardRef, {
    // If points is undefined or not a number, treat as 0
    points: typeof points === 'number' && !isNaN(points) ? points : 0,
    lastUpdated: Date.now()
  });
};

// Fetch leaderboard: get all players and their scores
export const fetchLeaderboard = (callback) => {
  const db = getDatabase();
  const leaderboardRef = ref(db, 'leaderboard');
  onValue(leaderboardRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
};