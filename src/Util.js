import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, set, onValue, update, push, runTransaction, get, off } from 'firebase/database'; // Added 'off'

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
  joinGame: "انضم للعبة",
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
  hasWon: "فاز",

  // Added missing keys for button text
  welcome: "مرحباً",
  guest: "زائر",
  logout: "تسجيل الخروج",
  returnHome: "الرئيسية",
  lobby: "اللوبي",
  bestPlayer: "أفضل لاعب",
  createGame: "إنشاء لعبة جديدة",
  login: "تسجيل الدخول",
  register: "تسجيل حساب جديد",
  playAnonymously: "العب كضيف",
  or: "أو",
  needAccount: "ليس لديك حساب؟ سجل الآن",
  haveAccount: "لديك حساب؟ تسجيل الدخول",
  processing: "...جاري المعالجة",
  joining: "...جاري الانضمام",
  needLogin: "يجب تسجيل الدخول للانضمام إلى اللعبة",
  playerInfoMissing: "معلومات اللاعب الأول غير موجودة",
  cannotJoinOwnGame: "لا يمكنك الانضمام إلى لعبتك الخاصة",
  needMoreCoins: "تحتاج على الأقل",
  yourBalance: "رصيدك",
  joinFailed: "فشل الانضمام للغرفة",
  bet: "الرهان",
  invalidChoice: "اختيار غير صالح",
  failedToDrawTile: "فشل في سحب القطعة",
  failedToStartNewGame: "فشل في بدء لعبة جديدة",
  player1: "اللاعب 1",
  player2: "اللاعب 2",
  yourTurn: "دورك",
  opponentTurn: "دور الخصم",
  waitingForOpponent: "في انتظار الخصم",
  playerName: "اسم اللاعب",
  totalWins: "إجمالي الفوز",
  winRate: "نسبة الفوز",
  gamesPlayed: "عدد المباريات",
  play: "العب",
  draw: "اسحب",
  confirmJoinBet: "هذه اللعبة تحتوي على رهان. هل تريد المتابعة؟",
  continue: "متابعة",
  cancel: "إلغاء",

  // New translations for AdSense fix
  footerHome: "الرئيسية",
  footerAbout: "من نحن",
  footerContact: "اتصل بنا",
  footerPrivacy: "سياسة الخصوصية",
  footerTerms: "شروط الخدمة",
  copyright: "جميع الحقوق محفوظة © 2026 لعبة الدومينو",
  privacyTitle: "سياسة الخصوصية",
  termsTitle: "شروط الخدمة",
  aboutTitle: "من نحن",
  contactTitle: "اتصل بنا",
  seoTitle: "حول لعبة الدومينو",
  seoIntro: "تعد لعبة الدومينو من أشهر وأقدم الألعاب الشعبية في العالم العربي. تعتمد اللعبة على المهارة والذكاء في وضع القطع بشكل استراتيجي.",
  seoHistoryTitle: "تاريخ الدومينو",
  seoHistoryDesc: "نشأت لعبة الدومينو في الصين في القرن الثالث عشر، ثم انتقلت إلى أوروبا وأصبحت جزءاً أساسياً من المقاهي العربية التقليدية.",
  seoRulesTitle: "كيفية اللعب",
  seoRulesDesc: "تتكون اللعبة من 28 قطعة. يبدأ كل لاعب بـ 7 قطع، والهدف هو التخلص من جميع القطع عبر مطابقة الأرقام على اللوحة.",
  seoVariationsTitle: "أنواع الدومينو",
  seoVariationsDesc: "هناك عدة طرق للعب، منها 'العادية' و'المغلقة'، وتتميز اللعبة بتنوع قوانينها حسب المناطق الجغرافية."
};

// Placeholder English translations (replace with actual text)
const englishText = {
  gameTitle: "Domino Game",
  enterName: "Enter your name",
  startGame: "Start New Game",
  waiting: "...Waiting for Player 2 to join",
  shareLink: "Share this link with your friend",
  copyLink: "Copy Link",
  roomId: "Room ID",
  noTiles: "No tiles on the board yet",
  yourTiles: "Your Dominoes",
  playTile: "Play Selected Tile",
  drawTile: "Draw Tile",
  gameOver: "Game Over!",
  wins: "Wins!",
  winsLowPoints: "Wins with the lowest points!",
  gameTied: "Game Tied!",
  newGame: "New Game",
  joinGame: "Join Game",
  notYourTurn: "Not your turn!",
  cantPlay: "Cannot play this tile here!",
  noTilesLeft: "No tiles left in the boneyard!",
  drew: "Drew a tile",
  canPlay: "Drew a tile and can play",
  passes: "Drew a tile and passes",
  hasNoPlayable: "Has no playable tiles and passes",
  you: "(You)",
  tiles: "Tiles",
  loading: "...Loading Game",
  gameNotFound: "Game not found",
  played: "Played a tile",
  aiMode: "Play vs AI",
  multiplayerMode: "Play with Friend",
  aiDifficulty: "AI Difficulty",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  aiPlayerName: "AI Opponent",
  aiIndicator: "(AI)",
  aiThinking: "Thinking...",
  aiModeActive: "AI Mode",
  goesFirst: "Goes first",
  playAgain: "Play Again",
  newGameStartingIn: "New game starting in",
  seconds: "seconds",
  hasWon: "has won",
  welcome: "Welcome",
  guest: "Guest",
  logout: "Logout",
  returnHome: "Home",
  lobby: "Lobby",
  bestPlayer: "Best Player",
  createGame: "Create New Game",
  login: "Login",
  register: "Register",
  playAnonymously: "Play as Guest",
  or: "OR",
  needAccount: "Need an account? Register",
  haveAccount: "Have an account? Login",
  processing: "...Processing",
  joining: "...Joining",
  coins: "Coins", // Added coins key
  emailPlaceholder: "Email",
  passwordPlaceholder: "Password (min 6 chars for register)",
  enterNamePlaceholder: "Enter Your Name",
  placeBet: "Place Bet (Coins):",
  playWithAnyone: "Play with Anyone",
  findJoinGame: "Find/Join Game",
  needLogin: "You need to login to join the game",
  playerInfoMissing: "Player 1 information is missing",
  cannotJoinOwnGame: "You cannot join your own game",
  needMoreCoins: "You need at least",
  yourBalance: "Your balance",
  joinFailed: "Failed to join room",
  bet: "Bet",
  invalidChoice: "Invalid choice",
  failedToDrawTile: "Failed to draw tile",
  failedToStartNewGame: "Failed to start new game",
  player1: "Player 1",
  player2: "Player 2",
  yourTurn: "Your Turn",
  opponentTurn: "Opponent's Turn",
  waitingForOpponent: "Waiting for Opponent",
  playerName: "Player Name",
  totalWins: "Total Wins",
  winRate: "Win Rate",
  gamesPlayed: "Games Played",
  play: "Play",
  draw: "Draw",
  confirmJoinBet: "This game has a bet. Do you want to continue?",
  continue: "Continue",
  cancel: "Cancel",

  // New translations for AdSense fix
  footerHome: "Home",
  footerAbout: "About Us",
  footerContact: "Contact Us",
  footerPrivacy: "Privacy Policy",
  footerTerms: "Terms of Service",
  copyright: "All Rights Reserved © 2026 Domino Game",
  privacyTitle: "Privacy Policy",
  termsTitle: "Terms of Service",
  aboutTitle: "About Us",
  contactTitle: "Contact Us",
  seoTitle: "About Domino Game",
  seoIntro: "Dominoes is one of the most famous and oldest table games in the world. It relies on skill and intelligence to strategically place tiles.",
  seoHistoryTitle: "History of Dominoes",
  seoHistoryDesc: "The game originated in China in the 13th century, then moved to Europe and became a staple of tradition across the globe.",
  seoRulesTitle: "How to Play",
  seoRulesDesc: "The game consists of 28 tiles. Each player starts with 7 tiles, and the goal is to empty your hand by matching numbers on the board.",
  seoVariationsTitle: "Variations",
  seoVariationsDesc: "There are many ways to play, including 'Block' and 'Draw' games, with rules varying by region."
};

// Placeholder French translations (replace with actual text)
const frenchText = {
  gameTitle: "Jeu de Domino",
  enterName: "Entrez votre nom",
  startGame: "Commencer une nouvelle partie",
  waiting: "...En attente du joueur 2",
  shareLink: "Partagez ce lien avec votre ami",
  copyLink: "Copier le lien",
  roomId: "ID de la salle",
  noTiles: "Aucun domino sur le plateau pour l'instant",
  yourTiles: "Vos Dominos",
  playTile: "Jouer le domino sélectionné",
  drawTile: "Piocher un domino",
  gameOver: "Partie terminée !",
  wins: "Gagne !",
  winsLowPoints: "Gagne avec le moins de points !",
  gameTied: "Égalité !",
  newGame: "Nouvelle partie",
  joinGame: "Rejoindre la partie",
  notYourTurn: "Pas votre tour !",
  cantPlay: "Impossible de jouer ce domino ici !",
  noTilesLeft: "Plus de dominos dans la pioche !",
  drew: "A pioché un domino",
  canPlay: "A pioché et peut jouer",
  passes: "A pioché et passe",
  hasNoPlayable: "N'a pas de domino jouable et passe",
  you: "(Vous)",
  tiles: "Dominos",
  loading: "...Chargement de la partie",
  gameNotFound: "Partie non trouvée",
  played: "A joué un domino",
  aiMode: "Jouer contre l'IA",
  multiplayerMode: "Jouer avec un ami",
  aiDifficulty: "Difficulté IA",
  easy: "Facile",
  medium: "Moyen",
  hard: "Difficile",
  aiPlayerName: "Adversaire IA",
  aiIndicator: "(IA)",
  aiThinking: "Réfléchit...",
  aiModeActive: "Mode IA",
  goesFirst: "Commence",
  playAgain: "Rejouer",
  newGameStartingIn: "Nouvelle partie dans",
  seconds: "secondes",
  hasWon: "a gagné",
  welcome: "Bienvenue",
  guest: "Invité",
  logout: "Déconnexion",
  returnHome: "Accueil",
  footerHome: "Accueil",
  lobby: "Salon",
  bestPlayer: "Meilleur Joueur",
  createGame: "Créer une partie",
  login: "Connexion",
  register: "Inscription",
  playAnonymously: "Jouer en tant qu'invité",
  or: "OU",
  needAccount: "Besoin d'un compte ? S'inscrire",
  haveAccount: "Déjà un compte ? Se connecter",
  processing: "...Traitement",
  joining: "...Rejoint",
  coins: "Pièces", // Added coins key
  emailPlaceholder: "Email",
  passwordPlaceholder: "Mot de passe (min 6 caractères pour l'inscription)",
  enterNamePlaceholder: "Entrez votre nom",
  placeBet: "Placer un pari (Pièces):",
  playWithAnyone: "Jouer avec n'importe qui",
  findJoinGame: "Trouver/Rejoindre une partie",
  needLogin: "Vous devez vous connecter pour rejoindre la partie",
  playerInfoMissing: "Les informations du joueur 1 sont manquantes",
  cannotJoinOwnGame: "Vous ne pouvez pas rejoindre votre propre partie",
  needMoreCoins: "Vous avez besoin d'au moins",
  yourBalance: "Votre solde",
  joinFailed: "Échec de la connexion à la salle",
  bet: "Pari",
  invalidChoice: "Choix invalide",
  failedToDrawTile: "Échec du tirage d'un domino",
  failedToStartNewGame: "Échec du démarrage d'une nouvelle partie",
  player1: "Joueur 1",
  player2: "Joueur 2",
  yourTurn: "Votre Tour",
  opponentTurn: "Tour de l'Adversaire",
  waitingForOpponent: "En attente de l'adversaire",
  playerName: "Nom du Joueur",
  totalWins: "Victoires Totales",
  winRate: "Taux de Victoire",
  gamesPlayed: "Parties Jouées",
  play: "Jouer",
  draw: "Piocher",
  confirmJoinBet: "Cette partie a un pari. Voulez-vous continuer ?",
  continue: "Continuer",
  cancel: "Annuler",

  // New translations for AdSense fix
  footerAbout: "À propos",
  footerContact: "Contactez-nous",
  footerPrivacy: "Confidentialité",
  footerTerms: "Conditions",
  copyright: "Tous droits réservés © 2026 Jeu de Domino",
  privacyTitle: "Politique de Confidentialité",
  termsTitle: "Conditions d'Utilisation",
  aboutTitle: "À Propos de Nous",
  contactTitle: "Contactez-nous",
  seoTitle: "À Propos du Jeu de Domino",
  seoIntro: "Le Domino est l'un des jeux de table les plus célèbres et les plus anciens au monde. Il repose sur l'habileté et l'intelligence.",
  seoHistoryTitle: "Histoire du Domino",
  seoHistoryDesc: "Le jeu est né en Chine au XIIIe siècle, puis s'est répandu en Europe et dans le monde entier.",
  seoRulesTitle: "Comment Jouer",
  seoRulesDesc: "Le jeu se compose de 28 dominos. Chaque joueur commence avec 7 dominos, l'objectif est de vider sa main.",
  seoVariationsTitle: "Variations",
  seoVariationsDesc: "Il existe de nombreuses façons de jouer, y compris le 'Bloque' et le 'Tirage'."
};

// Combine all translations
export const translations = {
  ar: arabicText,
  en: englishText,
  fr: frenchText,
};


// Function to get the correct text object based on language code
export const getText = (languageCode = 'en') => {
  return translations[languageCode] || translations.en; // Default to English
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

// Check if a tile can be played on the board, returns an array of possible plays
export const canPlayTile = (tile, board) => {
  const possiblePlays = [];
  const isDouble = tile.left === tile.right;
  const orientation = isDouble ? "vertical" : "horizontal";

  // If board is empty, any tile can be played
  if (!board || board.length === 0) {
    possiblePlays.push({ position: "first", needsFlip: false, orientation: orientation });
    return possiblePlays;
  }

  // Get the values at the ends of the board
  const leftEndTile = board[0];
  const rightEndTile = board[board.length - 1];
  const boardLeftValue = leftEndTile.left;
  const boardRightValue = rightEndTile.right;

  // Check if the tile can be played on the left
  if (tile.right === boardLeftValue) {
    // No flip needed, right of tile matches left of board
    possiblePlays.push({
      position: "left",
      needsFlip: false,
      orientation: orientation
    });
  } else if (tile.left === boardLeftValue) { // Use else if to avoid adding duplicate left plays for doubles
    // Flip needed, left of tile matches left of board
    possiblePlays.push({
      position: "left",
      needsFlip: true,
      orientation: orientation
    });
  }

  // Check if the tile can be played on the right
  if (tile.left === boardRightValue) {
    // No flip needed, left of tile matches right of board
    possiblePlays.push({
      position: "right",
      needsFlip: false,
      orientation: orientation
    });
  } else if (tile.right === boardRightValue) { // Use else if to avoid adding duplicate right plays for doubles
    // Flip needed, right of tile matches right of board
    possiblePlays.push({
      position: "right",
      needsFlip: true,
      orientation: orientation
    });
  }

  return possiblePlays; // Return array of possible plays (empty if none)
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); // Export auth instance
export const db = getDatabase(app); // Export database instance (assuming you might need it elsewhere)

// Update leaderboard: increment or set a player's score and store their uid
export const updateLeaderboard = async (playerName, points, uid) => {
  const leaderboardRef = ref(db, 'leaderboard/' + playerName);
  await update(leaderboardRef, {
    points: typeof points === 'number' && !isNaN(points) ? points : 0,
    uid: uid || null,
    lastUpdated: Date.now()
  });
};

// Fetch leaderboard: get all players and their scores
export const fetchLeaderboard = (callback) => {
  // const db = getDatabase(); // No longer needed here
  const leaderboardRef = ref(db, 'leaderboard');
  onValue(leaderboardRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
};

// Coin management
export const getUserCoins = (uid, callback) => {
  const coinsRef = ref(db, `coins/${uid}`);
  onValue(coinsRef, (snapshot) => {
    const coins = snapshot.val();
    callback(typeof coins === 'number' ? coins : 0);
  });
  // Return the unsubscribe function for cleanup
  return () => off(coinsRef);
};

// New function specifically for subscribing with cleanup
export const subscribeToUserCoins = (uid, callback) => {
  if (!uid) {
    console.warn("subscribeToUserCoins called without uid");
    return () => { }; // Return a no-op function if no uid
  }
  const coinsRef = ref(db, `coins/${uid}`);
  const unsubscribe = onValue(coinsRef, (snapshot) => {
    const coins = snapshot.val();
    callback(typeof coins === 'number' ? coins : 0);
  }, (error) => {
    console.error(`Error subscribing to coins for UID ${uid}:`, error);
    // Optionally call callback with an error indicator or default value
    callback(0); // Example: default to 0 on error
  });

  // Return the unsubscribe function provided by onValue
  return unsubscribe;
};


// The setUserCoins function below is safe to keep for user registration/init only.
export const setUserCoins = async (uid, coins) => {
  const coinsRef = ref(db, `coins/${uid}`);
  await set(coinsRef, coins);
};

export const addUserCoins = async (uid, amount) => {
  const coinsRef = ref(db, `coins/${uid}`);
  let current = 0;
  await onValue(coinsRef, (snapshot) => {
    current = snapshot.val() || 0;
  }, { onlyOnce: true });
  await set(coinsRef, current + amount);
};

export const transferBetCoins = async (winnerUid, loserUids, betAmount) => {
  if (!winnerUid || !Array.isArray(loserUids) || loserUids.length === 0 || typeof betAmount !== 'number' || betAmount <= 0) {
    console.error("Invalid parameters for transferBetCoins:", { winnerUid, loserUids, betAmount });
    return;
  }

  const winnerCoinsRef = ref(db, `coins/${winnerUid}`);
  let totalWinnings = 0;
  const successfulLosers = []; // Keep track of losers who successfully paid

  // Process each loser
  for (const loserUid of loserUids) {
    if (!loserUid) {
      console.warn("Skipping undefined loserUid in transferBetCoins");
      continue;
    }
    const loserCoinsRef = ref(db, `coins/${loserUid}`);
    try {
      const loserTx = await runTransaction(loserCoinsRef, (currentCoins) => {
        const coins = (typeof currentCoins === 'number') ? currentCoins : 0;
        // Ensure loser doesn't go below 0, though Firebase rules might also enforce this
        const newAmount = coins - betAmount;
        console.log(`[TXN Loser ${loserUid}] Current: ${coins}, Bet: ${betAmount}, New: ${newAmount < 0 ? 0 : newAmount}`);
        return newAmount < 0 ? 0 : newAmount;
      });

      if (loserTx.committed) {
        console.log(`Successfully deducted ${betAmount} coins from loser ${loserUid}`);
        totalWinnings += betAmount;
        successfulLosers.push(loserUid); // Add to list of successful payers
      } else {
        console.log(`Loser deduction transaction failed or aborted for ${loserUid}.`);
      }
    } catch (error) {
      console.error(`Failed to deduct coins from loser ${loserUid}:`, error);
      // Decide if the transaction should halt or continue for other losers
    }
  }

  // Add total winnings to the winner only if there were successful deductions
  if (totalWinnings > 0) {
    try {
      const winnerTx = await runTransaction(winnerCoinsRef, (currentCoins) => {
        const coins = (typeof currentCoins === 'number') ? currentCoins : 0;
        console.log(`[TXN Winner ${winnerUid}] Current: ${coins}, Adding: ${totalWinnings}, New: ${coins + totalWinnings}`);
        return coins + totalWinnings;
      });

      if (winnerTx.committed) {
        console.log(`Successfully added ${totalWinnings} coins to winner ${winnerUid} from ${successfulLosers.length} loser(s).`);
      } else {
        console.error(`CRITICAL: Winner transaction failed for ${winnerUid} after ${successfulLosers.length} loser(s) paid. Total Winnings: ${totalWinnings}. Attempting to refund.`);
        // Attempt to refund all successful losers
        for (const refundedLoserUid of successfulLosers) {
          const loserCoinsRef = ref(db, `coins/${refundedLoserUid}`);
          try {
            await runTransaction(loserCoinsRef, (currentCoins) => {
              const coins = (typeof currentCoins === 'number') ? currentCoins : 0;
              console.log(`[TXN Loser ${refundedLoserUid}] REFUNDING ${betAmount}. New balance: ${coins + betAmount}`);
              return coins + betAmount;
            });
            console.log(`Successfully refunded ${betAmount} to loser ${refundedLoserUid}.`);
          } catch (refundError) {
            console.error(`CRITICAL: FAILED TO REFUND LOSER ${refundedLoserUid} after winner transaction failure. Amount: ${betAmount}. Error:`, refundError);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to add coins to winner ${winnerUid}:`, error);
      // Also attempt to refund if this block fails
      for (const refundedLoserUid of successfulLosers) {
        const loserCoinsRef = ref(db, `coins/${refundedLoserUid}`);
        try {
          await runTransaction(loserCoinsRef, (currentCoins) => {
            const coins = (typeof currentCoins === 'number') ? currentCoins : 0;
            return coins + betAmount;
          });
        } catch (refundError) {
          console.error(`CRITICAL: FAILED TO REFUND LOSER ${refundedLoserUid} (after winner main catch). Error:`, refundError);
        }
      }
    }
  } else {
    console.log("No winnings to transfer as no loser deductions were successful.");
  }
};

// Get coin balance for a user (promise version, fetches once)
export const fetchUserCoins = async (uid) => {
  const coinsRef = ref(db, `coins/${uid}`);
  const snapshot = await get(coinsRef);
  const coins = snapshot.val();
  return typeof coins === 'number' ? coins : 0;
};