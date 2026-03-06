import React, { useState, useEffect, useRef, useCallback } from 'react'; // Added useCallback
import { useParams, useNavigate } from 'react-router-dom';
import { ref, onValue, update, remove, get, set } from 'firebase/database'; // Added get, set
import { canPlayTile, isPlayerBlocked, updateLeaderboard, fetchLeaderboard, transferBetCoins, setUserCoins, getUserCoins, db, fetchUserCoins } from './Util'; // Added fetchUserCoins, removed unused getUserCoins
import DominoDots from './DominoDots';
import AIPlayer from './AIPlayer';
import WinnerDisplay from './WinnerDisplay';
// import PlayerInfo from './PlayerInfo'; // Removed unused import
import BoardArea from './BoardArea'; // Import BoardArea
import PlayerHand from './PlayerHand'; // Import PlayerHand
import GameActions from './GameActions'; // Import GameActions
import JoinDialog from './JoinDialog'; // Import JoinDialog
import PlayersInfo from './PlayersInfo'; // Import PlayersInfo

// GameRoom.js - Main component for the game room
// PlayerInfo.js - displays player info (name, score, tiles, AI indicator)
// BoardArea.js - renders the domino board
// PlayerHand.js - shows the current player's hand and handles tile selection
// GameActions.js - contains play/draw buttons and their logic
// JoinDialog.js - handles the join dialog for player2
// WinnerDisplay.js - already exists for showing the winner

// You can move each logical section into its own file/component, then import and use them in GameRoom.js.
// Example (not full code):
// import PlayerInfo from './PlayerInfo';
// import BoardArea from './BoardArea';
// import PlayerHand from './PlayerHand';
// import GameActions from './GameActions';
// import JoinDialog from './JoinDialog';

// Game Room Component
// Accept user and coins as props
const GameRoom = ({ user, coins, text, language, onLanguageChange }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playerNumber, setPlayerNumber] = useState(''); // No localStorage
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedTile, setSelectedTile] = useState(null);
  const [animatingTile, setAnimatingTile] = useState(null); // New state for animation
  const [directionChoice, setDirectionChoice] = useState(null); // State for direction choice
  const [gameMessage, setGameMessage] = useState('');
  const [aiThinking, setAiThinking] = useState(false);
  const boardAreaRef = useRef(null);
  const aiRef = useRef(null);
  // const database = getDatabase(); // Use imported db instance

  // Wrap handleAIMove in useCallback to stabilize its reference for the useEffect dependency array
  const handleAIMove = useCallback(async (gameData) => {
    if (aiThinking) return; // Prevent multiple AI moves at once

    setAiThinking(true);

    // Add a small delay to make the AI "think"
    setTimeout(async () => {
      try {
        if (!aiRef.current) {
          aiRef.current = new AIPlayer(gameData.gameState.aiDifficulty);
        }

        const aiPlayer = aiRef.current;
        const aiTiles = gameData.players?.player2?.tiles || [];
        const board = gameData.gameState.board || [];
        const boneyard = gameData.gameState.boneyard;

        // Get AI's decision
        const aiMove = aiPlayer.makeMove(aiTiles, board, boneyard);

        if (aiMove.action === 'play') {
          // AI wants to play a tile
          const selectedTile = {
            ...aiTiles[aiMove.tileIndex],
            index: aiMove.tileIndex
          };

          // Clone the player's tiles and remove the played tile
          const updatedAiTiles = [...aiTiles];
          updatedAiTiles.splice(aiMove.tileIndex, 1);

          // Create the tile to be played with correct orientation
          const isDouble = selectedTile.left === selectedTile.right;
          const tileOrientation = isDouble ? "vertical" : "horizontal";

          let playedTile;
          const position = aiMove.position;

          if (position === "first") {
            playedTile = {
              left: selectedTile.left,
              right: selectedTile.right,
              id: selectedTile.id,
              orientation: tileOrientation,
              flipped: false
            };
          } else if (position === "left") {
            // The right value of the new tile must match the left value of the board
            const boardLeftValue = board[0].left;
            if (selectedTile.right === boardLeftValue) {
              playedTile = {
                left: selectedTile.left,
                right: selectedTile.right,
                id: selectedTile.id,
                orientation: tileOrientation,
                flipped: false
              };
            } else {
              playedTile = {
                left: selectedTile.right,
                right: selectedTile.left,
                id: selectedTile.id,
                orientation: tileOrientation,
                flipped: true
              };
            }
          } else { // position === "right"
            // The left value of the new tile must match the right value of the board
            const boardRightValue = board[board.length - 1].right;
            if (selectedTile.left === boardRightValue) {
              playedTile = {
                left: selectedTile.left,
                right: selectedTile.right,
                id: selectedTile.id,
                orientation: tileOrientation,
                flipped: false
              };
            } else {
              playedTile = {
                left: selectedTile.right,
                right: selectedTile.left,
                id: selectedTile.id,
                orientation: tileOrientation,
                flipped: true
              };
            }
          }

          // Update the board
          let updatedBoard = [...board];
          if (position === "first" || position === "left") {
            updatedBoard.unshift(playedTile);
          } else {
            updatedBoard.push(playedTile);
          }

          // Update game state
          const playerCount = gameData.gameState.playerCount || (gameData.players.player3 && gameData.players.player3.connected && gameData.players.player3.tiles && gameData.players.player3.tiles.length > 0 ? 3 : 2);
          const nextPlayerIndex = playerCount === 3 ? 2 : 0; // If 3 players, AI (P1 index) passes to P3 (index 2), else to P1 (index 0)
          let winner = null;
          let message = "";

          if (updatedAiTiles.length === 0) {
            winner = "player2";
            message = `${gameData.players?.player2?.name} ${text.wins}`;
          }

          const updates = {
            [`players/player2/tiles`]: updatedAiTiles,
            [`gameState/board`]: updatedBoard,
            [`gameState/currentPlayerIndex`]: nextPlayerIndex,
            [`gameState/message`]: `${gameData.players?.player2?.name} ${text.played}`
          };

          if (winner) {
            updates[`gameState/winner`] = winner;
            updates[`gameState/status`] = "finished";
            updates[`gameState/message`] = message;
            // Increment winner's score
            const currentScore = gameData.gameState.scores?.[winner] || 0;
            updates[`gameState/scores/${winner}`] = currentScore + 1;
            // Update leaderboard in Firebase
            updateLeaderboard(gameData.players?.[winner]?.name, currentScore + 1, gameData.players?.[winner]?.uid);
            // Transfer coins if it's a bet game
            if (gameData.gameState.betAmount && gameData.gameState.betAmount > 0) {
              const winnerUid = gameData.players[winner]?.uid;
              const loserUids = [];
              if (winner === 'player1') {
                if (gameData.players.player2?.uid) loserUids.push(gameData.players.player2.uid);
                if (gameData.players.player3?.uid) loserUids.push(gameData.players.player3.uid);
              } else if (winner === 'player2') {
                if (gameData.players.player1?.uid) loserUids.push(gameData.players.player1.uid);
                if (gameData.players.player3?.uid) loserUids.push(gameData.players.player3.uid);
              } else if (winner === 'player3') {
                if (gameData.players.player1?.uid) loserUids.push(gameData.players.player1.uid);
                if (gameData.players.player2?.uid) loserUids.push(gameData.players.player2.uid);
              }
              if (winnerUid && loserUids.length > 0) {
                (async () => {
                  await transferBetCoins(winnerUid, loserUids.filter(uid => uid !== winnerUid), gameData.gameState.betAmount);
                })();
              }
            }
          }

          await update(ref(db, `games/${roomId}`), updates); // Use imported db

        } else if (aiMove.action === 'draw') {
          // AI wants to draw a tile
          const drawnTile = boneyard[0];
          const updatedBoneyard = boneyard.slice(1);
          const updatedAiTiles = [...aiTiles, drawnTile];

          // Check if the drawn tile can be played
          const { canPlay } = canPlayTile(drawnTile, board);
          const playerCount = gameData.gameState.playerCount || (gameData.players.player3 && gameData.players.player3.connected && gameData.players.player3.tiles && gameData.players.player3.tiles.length > 0 ? 3 : 2);
          // AI is player index 1. If AI can't play drawn tile, turn passes.
          // If 2 players, passes to 0. If 3 players, passes to 2.
          const nextPlayerIndex = canPlay ? 1 : (playerCount === 3 ? 2 : 0);

          const message = canPlay ?
            `${gameData.players?.player2?.name} ${text.canPlay}` :
            `${gameData.players?.player2?.name} ${text.passes}`;

          await update(ref(db, `games/${roomId}`), { // Use imported db
            [`players/player2/tiles`]: updatedAiTiles,
            [`gameState/boneyard`]: updatedBoneyard,
            [`gameState/currentPlayerIndex`]: nextPlayerIndex,
            [`gameState/message`]: message
          });

          // If AI can play the drawn tile, it will make another move on the next game update

        } else {
          // AI passes
          const playerCount = gameData.gameState.playerCount || (gameData.players.player3 && gameData.players.player3.connected && gameData.players.player3.tiles && gameData.players.player3.tiles.length > 0 ? 3 : 2);
          await update(ref(db, `games/${roomId}/gameState`), { // Use imported db
            currentPlayerIndex: playerCount === 3 ? 2 : 0, // AI (player index 1) passes. If 3 players, turn to player index 2. Else to player index 0.
            message: `${gameData.players?.player2?.name} ${text.passes}`
          });

          // Check if all active players are blocked (AI just passed, so it's blocked)
          const p1Tiles = gameData.players?.player1?.tiles || [];
          const p1Blocked = isPlayerBlocked(p1Tiles, board);
          let p3Blocked = true; // Assume blocked if not present or no tiles
          let p3Points = Infinity;
          const player3Exists = gameData.players?.player3 && gameData.players.player3.connected && gameData.players.player3.tiles;

          if (player3Exists) {
            const p3Tiles = gameData.players.player3.tiles || [];
            p3Blocked = isPlayerBlocked(p3Tiles, board);
            p3Points = p3Tiles.reduce((sum, tile) => sum + tile.left + tile.right, 0);
          }

          if (p1Blocked && p3Blocked) { // AI (player2) is already known to be blocked here
            const p1Points = p1Tiles.reduce((sum, tile) => sum + tile.left + tile.right, 0);
            const p2Points = (gameData.players?.player2?.tiles || []).reduce((sum, tile) => sum + tile.left + tile.right, 0); // AI points

            let winner, message;
            const points = [{ player: "player1", score: p1Points }, { player: "player2", score: p2Points }];
            if (player3Exists) {
              points.push({ player: "player3", score: p3Points });
            }
            points.sort((a, b) => a.score - b.score);

            if (points.length > 1 && points[0].score === points[1].score && (!points[2] || points[0].score < points[2].score)) {
              winner = "tie"; // Tie between first two if they have same lowest score
              message = text.gameTied;
            } else if (points[0].score < (points[1] ? points[1].score : Infinity)) {
              winner = points[0].player;
              message = `${gameData.players?.[winner]?.name} ${text.winsLowPoints}`;
            } else { // Should ideally be a tie if all have same points or other unhandled scenarios
              winner = "tie";
              message = text.gameTied;
            }

            const deadlockUpdates = {
              winner: winner,
              status: "finished",
              message: message
            };
            // Increment winner's score if not a tie
            if (winner !== "tie") {
              const currentScore = gameData.gameState.scores?.[winner] || 0;
              deadlockUpdates[`scores/${winner}`] = currentScore + 1;
              // Update leaderboard in Firebase
              updateLeaderboard(gameData.players?.[winner]?.name, currentScore + 1, gameData.players?.[winner]?.uid);
              // Transfer coins if it's a bet game
              if (gameData.gameState.betAmount && gameData.gameState.betAmount > 0) {
                const winnerUid = gameData.players[winner]?.uid;
                const loserUids = [];
                const playerKeys = Object.keys(gameData.players).filter(pKey => gameData.players[pKey]?.uid && gameData.players[pKey].uid !== winnerUid);
                playerKeys.forEach(pKey => loserUids.push(gameData.players[pKey].uid));

                if (winnerUid && loserUids.length > 0) {
                  (async () => {
                    await transferBetCoins(winnerUid, loserUids, gameData.gameState.betAmount);
                  })();
                }
              }
            }
            await update(ref(db, `games/${roomId}/gameState`), deadlockUpdates); // Use imported db
          }
        }
      } catch (error) {
        console.error("Error during AI move:", error);
      } finally {
        setAiThinking(false);
      }
    }, 1500); // 1.5 second delay for "thinking"
  }, [aiThinking, roomId, text]); // Dependencies for useCallback

  useEffect(() => {
    console.log("Loading room:", roomId);
    const gameRef = ref(db, `games/${roomId}`); // Use imported db

    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      console.log("Game data:", data);

      if (!data) {
        setError('Game not found');
        setLoading(false);
        return;
      }
      setGame(data);
      if (data.gameState.message) setGameMessage(data.gameState.message);
      setLoading(false);

      // Assign playerNumber based on uid from Firebase
      if (user && user.uid) {
        if (data.players.player1 && data.players.player1.uid === user.uid) {
          setPlayerNumber('player1');
        } else if (data.players.player2 && data.players.player2.uid === user.uid) {
          setPlayerNumber('player2');
        } else if (data.players.player3 && data.players.player3.uid === user.uid) {
          setPlayerNumber('player3');
        } else {
          // Attempt to auto-join as player2 if spot is open
          if (data.players.player1 && data.players.player1.uid !== user.uid &&
            data.players.player2 && !data.players.player2.connected &&
            data.gameState.status !== 'finished') { // Ensure game is not finished (allows joining waiting games)
            (async () => {
              const player2Coins = await fetchUserCoins(user.uid);
              let currentCoins = player2Coins;
              if (typeof player2Coins !== 'number' || player2Coins < 0) {
                await setUserCoins(user.uid, 100); currentCoins = 100;
              }
              const betAmount = data?.gameState?.betAmount || 0;
              if (betAmount > 0 && currentCoins < betAmount) {
                alert(`لا يمكنك الانضمام لهذه اللعبة تلقائيًا كلاعب ثاني. الرهان هو ${betAmount} عملة، ولديك ${currentCoins} فقط.`);
                navigate('/'); return;
              }
              console.log(`Auto-joining player ${user.uid} as Player 2 in room ${roomId}`);
              // Ensure player2 object exists or create it
              const p2Updates = { name: user.displayName || 'Player 2', uid: user.uid, connected: true, score: data.players.player2?.score || 0, tiles: data.players.player2?.tiles || [] };
              if (!data.players.player2) { // If player2 object doesn't exist at all
                await set(ref(db, `games/${roomId}/players/player2`), p2Updates);
              } else {
                await update(ref(db, `games/${roomId}/players/player2`), p2Updates);
              }
              await update(ref(db, `games/${roomId}/gameState`), { status: 'playing', lastActive: Date.now() });
              setPlayerNumber('player2');
            })();
          }
          // Attempt to auto-join as player3 if player1 and player2 are present and player3 spot is open
          else if (data.players.player1 && data.players.player1.connected && data.players.player1.uid !== user.uid &&
            data.players.player2 && data.players.player2.connected && data.players.player2.uid !== user.uid &&
            (!data.players.player3 || !data.players.player3.connected) &&
            data.gameState.status === 'playing') {
            // Ensure player3 slot is truly available for this user
            if (!data.players.player3 || !data.players.player3.uid || data.players.player3.uid === user.uid) {
              (async () => {
                console.log(`User ${user.uid} attempting to join as Player 3 in room ${roomId}`);
                const player3Name = user.displayName || `Player 3`;

                const betAmount = data?.gameState?.betAmount || 0;
                if (betAmount > 0) {
                  const player3Coins = await fetchUserCoins(user.uid);
                  let currentCoins = player3Coins;
                  if (typeof player3Coins !== 'number' || player3Coins < 0) {
                    await setUserCoins(user.uid, 100); currentCoins = 100;
                  }
                  if (currentCoins < betAmount) {
                    alert(`${player3Name}, لا يمكنك الانضمام لهذه اللعبة كلاعب ثالث. الرهان هو ${betAmount} عملة، ولديك ${currentCoins} فقط.`);
                    return;
                  }
                }

                if (!data.gameState.boneyard || data.gameState.boneyard.length < 7) {
                  console.log(`Player ${user.uid} cannot join as Player 3: Not enough tiles in boneyard.`);
                  alert(`${player3Name}, لا يمكن الانضمام كلاعب ثالث، لا توجد قطع كافية في السحب.`);
                  return;
                }

                const p3Updates = {
                  name: player3Name,
                  uid: user.uid,
                  connected: true,
                  score: 0, // Initialize score for player3
                  tiles: [], // Initialize tiles, will be dealt by the new useEffect
                  fully_joined_and_dealt: false // Initialize flag
                };

                // Use set to create player3 if it doesn't exist, or update if it does (e.g., was placeholder)
                await set(ref(db, `games/${roomId}/players/player3`), p3Updates);
                // gameState updates (like playerCount) will be handled by the tile dealing useEffect for consistency
                setPlayerNumber('player3');
              })();
            }
          }
        }
      }

      // Create AI player instance if not already created
      if (data.gameState.gameMode === 'ai' && !aiRef.current) {
        aiRef.current = new AIPlayer(data.gameState.aiDifficulty);
      }

      // If it's AI's turn, make a move after a small delay
      if (
        data.gameState.gameMode === 'ai' &&
        data.gameState.status === 'playing' &&
        data.gameState.currentPlayerIndex === 1 &&
        !data.gameState.winner
      ) {
        handleAIMove(data);
      }
    }, (err) => {
      console.error("Firebase onValue error:", err);
      setError('Error loading game: ' + err.message);
      setLoading(false);
    });

    // Fetch leaderboard from Firebase
    // fetchLeaderboard is imported from Util, which should use the initialized db instance
    // fetchLeaderboard((data) => { // Removed unused leaderboard fetch
    //   setLeaderboard(data || {});
    // });

    // Clean up subscription on unmount
    return () => unsubscribe();
  }, [roomId, user, handleAIMove, navigate, text, db]); // Added navigate, text, db

  useEffect(() => {
    // Auto-scroll board on small devices when board changes
    if (game && game.gameState && game.gameState.board && boardAreaRef.current) {
      if (window.innerWidth <= 768) {
        // Scroll to the far right (end)
        boardAreaRef.current.scrollLeft = boardAreaRef.current.scrollWidth;
      }
    }
  }, [game?.gameState?.board?.length]); // Simplified dependency

  useEffect(() => {
    // Check if waiting for more than 30 minutes
    if (game && game.gameState.status === 'waiting') {
      const now = Date.now();
      const created = game.gameState.timestamp || now;
      const thirtyMinutes = 30 * 60 * 1000;
      if (now - created > thirtyMinutes) {
        setGameMessage('لقد انتظرت أكثر من 30 دقيقة. يرجى بدء طلب جديد للعثور على لاعب.');
      }
    }
  }, [game]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Consider if automatically removing the game is the desired behavior.
      // Maybe just mark the player as disconnected instead?
      // For now, keeping the remove logic but using the imported db.
      if (window.confirm('هل تريد حذف هذه الغرفة عند مغادرتها؟')) {
        if (roomId) {
          remove(ref(db, `games/${roomId}`)); // Use imported db
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomId]); // Removed database from dependency array

  useEffect(() => {
    // Deal tiles to player3 if they've connected, have no tiles, and haven't been dealt yet
    if (game && game.players && game.players.player3 && game.players.player3.connected &&
      (!game.players.player3.tiles || game.players.player3.tiles.length === 0) &&
      !game.players.player3.fully_joined_and_dealt && // Prevent re-dealing
      game.gameState && game.gameState.boneyard && game.gameState.boneyard.length >= 7 &&
      game.gameState.status === 'playing') {

      (async () => {
        const gameRef = ref(db, `games/${roomId}`);
        // Read the latest game state to prevent race conditions
        const snapshot = await get(gameRef);
        const currentGameData = snapshot.val();

        // Double-check conditions with the fresh data
        if (currentGameData && currentGameData.players && currentGameData.players.player3 &&
          currentGameData.players.player3.connected &&
          (!currentGameData.players.player3.tiles || currentGameData.players.player3.tiles.length === 0) &&
          !currentGameData.players.player3.fully_joined_and_dealt &&
          currentGameData.gameState && currentGameData.gameState.boneyard && currentGameData.gameState.boneyard.length >= 7 &&
          currentGameData.gameState.status === 'playing') {

          console.log(`Dealing 7 tiles to Player 3 (${currentGameData.players.player3.name || 'Player 3'})`);
          const player3Tiles = currentGameData.gameState.boneyard.slice(0, 7);
          const updatedBoneyard = currentGameData.gameState.boneyard.slice(7);

          const updates = {
            [`players/player3/tiles`]: player3Tiles,
            [`players/player3/fully_joined_and_dealt`]: true,
            [`gameState/boneyard`]: updatedBoneyard,
            [`gameState/message`]: `${currentGameData.players.player3.name || 'Player 3'} ${text.hasJoinedAndDrawn || 'has joined and drawn 7 tiles!'}`,
            [`gameState/playerCount`]: 3, // Set player count to 3
          };
          await update(gameRef, updates);
        } else {
          console.log("Player 3 tile dealing conditions no longer met after fetching fresh data.");
        }
      })();
    }
  }, [game, roomId, text, db]); // Dependencies
  useEffect(() => {
    // Check for deadlock (all active players can't play and boneyard is empty)
    if (game && !game.gameState.winner && game.gameState.status !== 'waiting' && game.gameState.status !== 'finished') {
      const p1Tiles = game.players.player1?.tiles || [];
      const p2Tiles = game.players.player2?.tiles || [];
      const p1Blocked = isPlayerBlocked(p1Tiles, game.gameState.board);
      const p2Blocked = isPlayerBlocked(p2Tiles, game.gameState.board);

      let p3Blocked = true; // Assume blocked if not participating
      let p3Points = Infinity;
      const player3Exists = game.players.player3 && game.players.player3.connected && game.players.player3.tiles && game.players.player3.tiles.length > 0;

      if (player3Exists) {
        const p3Tiles = game.players.player3.tiles;
        p3Blocked = isPlayerBlocked(p3Tiles, game.gameState.board);
      }

      const boneyardEmpty = !game.gameState.boneyard || game.gameState.boneyard.length === 0;

      if (p1Blocked && p2Blocked && p3Blocked && boneyardEmpty) {
        const p1Points = p1Tiles.reduce((sum, tile) => sum + tile.left + tile.right, 0);
        const p2Points = p2Tiles.reduce((sum, tile) => sum + tile.left + tile.right, 0);
        if (player3Exists) {
          p3Points = game.players.player3.tiles.reduce((sum, tile) => sum + tile.left + tile.right, 0);
        }

        let winnerBlocked, messageBlocked;
        const points = [{ player: "player1", score: p1Points }, { player: "player2", score: p2Points }];
        if (player3Exists) {
          points.push({ player: "player3", score: p3Points });
        }
        points.sort((a, b) => a.score - b.score);

        if (points.length > 1 && points[0].score === points[1].score && (!points[2] || points[0].score < points[2].score)) {
          winnerBlocked = "tie";
          messageBlocked = text.gameTied;
        } else if (points[0].score < (points[1] ? points[1].score : Infinity)) {
          winnerBlocked = points[0].player;
          messageBlocked = `${game.players?.[winnerBlocked]?.name} ${text.winsLowPoints}`;
        } else {
          winnerBlocked = "tie";
          messageBlocked = text.gameTied;
        }

        const deadlockUpdates = {
          winner: winnerBlocked,
          status: "finished",
          message: messageBlocked
        };
        if (winnerBlocked !== "tie") {
          const currentScore = game.gameState.scores?.[winnerBlocked] || 0;
          deadlockUpdates[`scores/${winnerBlocked}`] = currentScore + 1;
          updateLeaderboard(game.players?.[winnerBlocked]?.name, currentScore + 1, game.players?.[winnerBlocked]?.uid);
          // Transfer coins if it's a bet game
          if (game.gameState.betAmount && game.gameState.betAmount > 0 && winnerBlocked !== "tie") {
            const winnerUid = game.players[winnerBlocked]?.uid;
            const loserUids = [];
            const allPlayerKeys = ['player1', 'player2', 'player3'];
            allPlayerKeys.forEach(pKey => {
              if (pKey !== winnerBlocked && game.players[pKey]?.uid) {
                loserUids.push(game.players[pKey].uid);
              }
            });
            if (winnerUid && loserUids.length > 0) {
              (async () => {
                await transferBetCoins(winnerUid, loserUids, game.gameState.betAmount);
              })();
            }
          }
        }
        update(ref(db, `games/${roomId}/gameState`), deadlockUpdates); // Use imported db
      }
    }
  }, [game, roomId]); // Removed database from dependency array

  // Removed duplicate handleAIMove definition (lines 443-657)

  // When a player joins as player2, ensure their uid is set and coins entry exists
  const joinGame = async () => {
    if (!newPlayerName.trim()) {
      setError('Please enter a name');
      return;
    }
    try {
      const finalName = user?.displayName || newPlayerName.trim();
      await update(ref(db, `games/${roomId}/players/player2`), {
        name: finalName,
        uid: user.uid,
        connected: true
      });
      // Fetch player 2's current coins
      const player2Coins = await fetchUserCoins(user.uid);
      let currentCoins = player2Coins;

      // Initialize if needed
      if (typeof player2Coins !== 'number' || player2Coins < 0) {
        console.log(`Initializing coins for player 2 (${user.uid}) on join`);
        await setUserCoins(user.uid, 100); // Set default 100 coins
        currentCoins = 100; // Use the initialized value for the check
      }

      // Check if player 2 has enough coins for the bet
      const betAmount = game?.gameState?.betAmount || 0;
      if (betAmount > 0 && currentCoins < betAmount) {
        alert(`لا يمكنك الانضمام لهذه اللعبة. الرهان هو ${betAmount} عملة، ولديك ${currentCoins} فقط. (You cannot join this game. The bet is ${betAmount} coins, and you only have ${currentCoins}.)`);
        navigate('/'); // Redirect to home
        setJoinDialogOpen(false); // Close dialog
        return; // Stop the joining process
      }

      // Proceed with joining if enough coins
      await update(ref(db, `games/${roomId}/gameState`), {
        status: 'playing'
      });
      setPlayerNumber('player2');
      setJoinDialogOpen(false);
    } catch (error) {
      setError('Failed to join game');
      console.error(error);
    }
  };

  const copyGameLink = () => {
    const link = `https://elhabdomino.fun/#/room/${roomId}`;
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
    if (!game) return;
    const playerIndexMap = ['player1', 'player2', 'player3'];
    if (game.gameState.currentPlayerIndex >= playerIndexMap.length) return; // Safety
    const currentPlayerNumber = playerIndexMap[game.gameState.currentPlayerIndex];

    if (playerNumber !== currentPlayerNumber) {
      setGameMessage(text.notYourTurn);
      return;
    }

    setSelectedTile({ ...tile, index });
  };

  const executePlay = async (chosenPlay) => {
    const { position, needsFlip, orientation } = chosenPlay;

    // Capture the start position of the tile in the hand
    const handTileElement = document.getElementById(`hand-tile-${selectedTile.index}`);
    const startRect = handTileElement ? handTileElement.getBoundingClientRect() : null;

    // Set animating tile state
    if (startRect) {
      setAnimatingTile({
        tile: selectedTile,
        startX: startRect.left,
        startY: startRect.top,
        currentX: startRect.left,
        currentY: startRect.top,
        orientation: orientation,
        needsFlip: needsFlip,
        status: 'starting'
      });

      // Allow a frame for rendering the 'starting' position
      setTimeout(() => {
        const boardAreaElement = boardAreaRef.current;
        const boardRect = boardAreaElement ? boardAreaElement.getBoundingClientRect() : null;

        if (boardRect) {
          // Target position: middle of the board for now, or near left/right based on position
          let targetX = boardRect.left + boardRect.width / 2;
          let targetY = boardRect.top + boardRect.height / 2;

          if (position === 'left' || position === 'first') {
            targetX = boardRect.left + 50;
          } else if (position === 'right') {
            targetX = boardRect.left + boardRect.width - 130;
          }

          setAnimatingTile(prev => ({
            ...prev,
            currentX: targetX,
            currentY: targetY,
            status: 'moving'
          }));
        }
      }, 50);

      // Wait for animation to finish before updating Firebase
      await new Promise(resolve => setTimeout(resolve, 650));
      setAnimatingTile(null);
    }

    const updatedPlayerTiles = [...(game.players?.[playerNumber]?.tiles || [])];
    updatedPlayerTiles.splice(selectedTile.index, 1);
    let playedTile = {
      left: needsFlip ? selectedTile.right : selectedTile.left,
      right: needsFlip ? selectedTile.left : selectedTile.right,
      id: selectedTile.id,
      orientation: orientation,
      flipped: needsFlip
    };
    let updatedBoard = [...(game.gameState.board || [])];
    if (position === "first" || position === "left") {
      updatedBoard.unshift(playedTile);
    } else {
      updatedBoard.push(playedTile);
    }
    const playerCount = game.gameState.playerCount || (game.players.player3 && game.players.player3.connected && game.players.player3.tiles && game.players.player3.tiles.length > 0 ? 3 : 2);
    const nextPlayerIndex = (game.gameState.currentPlayerIndex + 1) % playerCount;
    let winner = null;
    let message = "";
    if (updatedPlayerTiles.length === 0) {
      winner = playerNumber;
      message = `${game.players?.[playerNumber]?.name} ${text.wins}`;
    }
    try {
      const updates = {
        [`players/${playerNumber}/tiles`]: updatedPlayerTiles,
        [`gameState/board`]: updatedBoard,
        [`gameState/currentPlayerIndex`]: nextPlayerIndex,
        [`gameState/message`]: `${game.players?.[playerNumber]?.name} ${text.played}`
      };
      if (winner) {
        updates[`gameState/winner`] = winner;
        updates[`gameState/status`] = "finished";
        updates[`gameState/message`] = message;
        const currentScore = game.gameState.scores?.[winner] || 0;
        updates[`gameState/scores/${winner}`] = currentScore + 1;
        updateLeaderboard(game.players?.[winner]?.name, currentScore + 1, game.players?.[winner]?.uid);
        // Transfer coins if it's a bet game
        if (game.gameState.betAmount && game.gameState.betAmount > 0 && winner) {
          const winnerUid = game.players[winner]?.uid;
          const loserUids = [];
          const allPlayerKeys = ['player1', 'player2', 'player3'];
          allPlayerKeys.forEach(pKey => {
            if (pKey !== winner && game.players[pKey]?.uid) {
              loserUids.push(game.players[pKey].uid);
            }
          });
          if (winnerUid && loserUids.length > 0) {
            (async () => {
              await transferBetCoins(winnerUid, loserUids, game.gameState.betAmount);
            })();
          }
        }
      } else {
        const p1Blocked = isPlayerBlocked(
          playerNumber === 'player1' ? updatedPlayerTiles : game.players.player1.tiles,
          updatedBoard
        );
        const p2Blocked = isPlayerBlocked(
          playerNumber === 'player2' ? updatedPlayerTiles : game.players.player2.tiles,
          updatedBoard
        );
        const boneyardEmpty = !game.gameState.boneyard || game.gameState.boneyard.length === 0;

        // Define p3Blocked and player3Exists for this scope
        let p3Blocked = true; // Default to true (blocked)
        const player3Exists = game.players.player3 && game.players.player3.connected && game.players.player3.tiles;
        const p3FinalTiles = playerNumber === 'player3' ? updatedPlayerTiles : (game.players.player3?.tiles || []);

        if (player3Exists) {
          p3Blocked = isPlayerBlocked(p3FinalTiles, updatedBoard);
        }

        if (p1Blocked && p2Blocked && p3Blocked && boneyardEmpty) {
          const p1FinalTiles = playerNumber === 'player1' ? updatedPlayerTiles : (game.players.player1?.tiles || []);
          const p2FinalTiles = playerNumber === 'player2' ? updatedPlayerTiles : (game.players.player2?.tiles || []);
          // p3FinalTiles is already defined above

          const p1Points = p1FinalTiles.reduce((sum, tile) => sum + tile.left + tile.right, 0);
          const p2Points = p2FinalTiles.reduce((sum, tile) => sum + tile.left + tile.right, 0);
          let p3PointsVal = Infinity; // Use a different variable name to avoid conflict if p3Points was meant for something else
          if (player3Exists && p3FinalTiles.length > 0) {
            p3PointsVal = p3FinalTiles.reduce((sum, tile) => sum + tile.left + tile.right, 0);
          }

          let winnerBlocked, messageBlocked;
          const points = [{ player: "player1", score: p1Points }, { player: "player2", score: p2Points }];
          if (player3Exists) {
            points.push({ player: "player3", score: p3PointsVal });
          }
          points.sort((a, b) => a.score - b.score);

          if (points.length > 1 && points[0].score === points[1].score && (!points[2] || points[0].score < points[2].score)) {
            winnerBlocked = "tie";
            messageBlocked = text.gameTied;
          } else if (points[0].score < (points[1] ? points[1].score : Infinity)) {
            winnerBlocked = points[0].player;
            messageBlocked = `${game.players?.[winnerBlocked]?.name} ${text.winsLowPoints}`;
          } else {
            winnerBlocked = "tie";
            messageBlocked = text.gameTied;
          }
          updates[`gameState/winner`] = winnerBlocked;
          updates[`gameState/status`] = "finished";
          updates[`gameState/message`] = messageBlocked;
          if (winnerBlocked !== "tie") {
            const currentScore = game.gameState.scores?.[winnerBlocked] || 0;
            updates[`gameState/scores/${winnerBlocked}`] = currentScore + 1;
            updateLeaderboard(game.players?.[winnerBlocked]?.name, currentScore + 1, game.players?.[winnerBlocked]?.uid);
            // Transfer coins if it's a bet game
            if (game.gameState.betAmount && game.gameState.betAmount > 0 && winnerBlocked !== "tie") {
              const winnerUid = game.players[winnerBlocked]?.uid;
              const loserUids = [];
              const allPlayerKeys = ['player1', 'player2', 'player3'];
              allPlayerKeys.forEach(pKey => {
                if (pKey !== winnerBlocked && game.players[pKey]?.uid) {
                  loserUids.push(game.players[pKey].uid);
                }
              });
              if (winnerUid && loserUids.length > 0) {
                (async () => {
                  await transferBetCoins(winnerUid, loserUids, game.gameState.betAmount);
                })();
              }
            }
          }
        }
      }
      await update(ref(db, `games/${roomId}`), updates); // Use imported db
      setSelectedTile(null);
      setDirectionChoice(null);
    } catch (error) {
      console.error("Error updating game:", error);
      setError("Failed to play tile");
    }
  };

  const handleDirectionChoice = (position) => {
    if (!selectedTile || !game) return;
    const board = game.gameState.board || [];
    const possiblePlays = canPlayTile(selectedTile, board);
    const chosenPlay = possiblePlays.find(play => play.position === position);
    if (chosenPlay) {
      executePlay(chosenPlay);
    } else {
      setGameMessage(text.invalidChoice);
      setDirectionChoice(null);
    }
  };

  const handlePlayTile = async () => {
    if (!game) return;
    const playerIndexMap = ['player1', 'player2', 'player3'];
    if (game.gameState.currentPlayerIndex >= playerIndexMap.length) return; // Safety
    const currentPlayerNumber = playerIndexMap[game.gameState.currentPlayerIndex];

    if (playerNumber !== currentPlayerNumber) {
      setGameMessage(text.notYourTurn);
      return;
    }
    const board = game.gameState.board || [];
    const possiblePlays = canPlayTile(selectedTile, board);
    if (possiblePlays.length === 0) {
      setGameMessage(text.cantPlay);
      return;
    }
    if (possiblePlays.length > 1) {
      setDirectionChoice({ left: true, right: true });
      return;
    }
    executePlay(possiblePlays[0]);
  };

  const handleDrawTile = async () => {
    if (!game || !game.gameState.boneyard || game.gameState.boneyard.length === 0) return;

    // Check if it's player's turn
    const playerIndexMap = ['player1', 'player2', 'player3'];
    if (game.gameState.currentPlayerIndex >= playerIndexMap.length) return;
    const currentPlayerNumber = playerIndexMap[game.gameState.currentPlayerIndex];
    if (playerNumber !== currentPlayerNumber) {
      setGameMessage(text.notYourTurn);
      return;
    }

    const tile = game.gameState.boneyard[0];
    const updatedBoneyard = game.gameState.boneyard.slice(1);
    const updatedPlayerTiles = [...(game.players?.[playerNumber]?.tiles || []), tile];

    const { canPlay } = canPlayTile(tile, game.gameState.board);
    const playerCount = game.gameState.playerCount || (game.players.player3 && game.players.player3.connected && game.players.player3.tiles && game.players.player3.tiles.length > 0 ? 3 : 2);

    // If can play, stay on current player. If not, next player.
    const nextPlayerIndex = canPlay ? game.gameState.currentPlayerIndex : (game.gameState.currentPlayerIndex + 1) % playerCount;

    const message = canPlay ?
      `${game.players?.[playerNumber]?.name} ${text.canPlay}` :
      `${game.players?.[playerNumber]?.name} ${text.passes}`;

    try {
      await update(ref(db, `games/${roomId}`), {
        [`players/${playerNumber}/tiles`]: updatedPlayerTiles,
        [`gameState/boneyard`]: updatedBoneyard,
        [`gameState/currentPlayerIndex`]: nextPlayerIndex,
        [`gameState/message`]: message
      });
    } catch (error) {
      console.error("Error drawing tile:", error);
    }
  };

  const isMyTurn = () => {
    if (!game || !playerNumber) return false;
    const playerIndexMap = ['player1', 'player2', 'player3']; // Max 3 players
    if (game.gameState.currentPlayerIndex >= playerIndexMap.length) return false; // Safety check
    const currentPlayerNumber = playerIndexMap[game.gameState.currentPlayerIndex];
    return playerNumber === currentPlayerNumber;
  };

  const startNewGame = async () => {
    try {
      navigate('/');
    } catch (error) {
      console.error("Error starting new game:", error);
      setError(text.failedToStartNewGame);
    }
  };

  if (loading) {
    return <div className="loading arabic-text">{text.loading}</div>;
  }

  if (error) {
    return <div className="error arabic-text">{error}</div>;
  }

  if (!game) {
    return <div className="error arabic-text">{text.gameNotFound}</div>;
  }

  // Check if game is in waiting state
  const isWaiting = game.gameState.status === 'waiting';
  const isFinished = game.gameState.status === 'finished';
  const isAiMode = game.gameState.gameMode === 'ai';

  return (
    <div className="game-room" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="game-header">
        <h1 className="arabic-text">{text.gameTitle}</h1>
        {isWaiting && (
          <div className="game-info">
            <p className="arabic-text room-id-display">{text.roomId}: {roomId}</p>
            <span className="arabic-text">{text.coins || 'النقاط'}: {coins}</span>
            {!isAiMode && (
              <button onClick={copyGameLink} className="copy-link-button arabic-text">{text.copyLink}</button>
            )}
            {isAiMode && (
              <span className="ai-mode-indicator arabic-text">{text.aiModeActive} ({text[game.gameState.aiDifficulty]})</span>
            )}
          </div>
        )}
        {gameMessage && (
          <div className="game-message arabic-text">
            {gameMessage}
          </div>
        )}
      </div>
      {isWaiting ? (
        <div className="waiting-screen">
          <h2 className="arabic-text">{text.waiting}</h2>
          <p className="arabic-text">{text.shareLink}</p>
          <p className="game-link">https://elhabdomino.fun/#/room/{roomId}</p>
          <button onClick={copyGameLink} className="copy-link-button arabic-text">{text.copyLink}</button>
        </div>
      ) : (
        <div className="game-board">
          <PlayersInfo
            game={game}
            playerNumber={playerNumber}
            isAiMode={isAiMode}
            aiThinking={aiThinking}
            text={text}
          />

          <BoardArea
            ref={boardAreaRef}
            board={game.gameState.board}
            text={text}
          />

          {!isFinished && playerNumber && game.players?.[playerNumber] && (
            <div className="player-controls">
              {directionChoice && (
                <div className="direction-choice-buttons" style={{ textAlign: 'center', margin: '10px 0' }}>
                  <button className="play-button arabic-text" style={{ marginLeft: '10px' }} onClick={() => handleDirectionChoice('right')}>{text.right}</button>
                  <button className="play-button arabic-text" onClick={() => handleDirectionChoice('left')}>{text.left}</button>
                </div>
              )}
              <PlayerHand
                tiles={game.players?.[playerNumber]?.tiles}
                selectedTile={selectedTile}
                onTileSelect={handleTileSelect}
                board={game.gameState.board}
                text={text}
                animatingTileId={animatingTile?.tile?.id}
              />

              <GameActions
                onPlayTile={handlePlayTile}
                onDrawTile={handleDrawTile}
                selectedTile={selectedTile}
                isMyTurn={isMyTurn}
                boneyard={game.gameState.boneyard}
                text={text}
              />
            </div>
          )}

          {isFinished && game.gameState.winner && (
            <WinnerDisplay
              winner={game.gameState.winner === 'tie' ? 'tie' : game.players[game.gameState.winner]}
              onNewGame={startNewGame}
              isTie={game.gameState.winner === 'tie'}
              text={text}
            />
          )}
        </div>
      )}

      {joinDialogOpen && (
        <JoinDialog
          newPlayerName={newPlayerName}
          setNewPlayerName={setNewPlayerName}
          joinGame={joinGame}
          text={text}
        />
      )}

      {/* Flying Tile Animation Layer */}
      {animatingTile && (
        <div className="flying-tile-container">
          <div
            className={`domino flying-tile ${animatingTile.orientation} ${animatingTile.needsFlip ? 'flipped' : ''}`}
            style={{
              left: `${animatingTile.currentX}px`,
              top: `${animatingTile.currentY}px`,
              opacity: animatingTile.status === 'starting' ? 1 : 0.8,
              transform: `scale(${animatingTile.status === 'starting' ? 1 : 0.8}) ${animatingTile.needsFlip ? 'rotate(180deg)' : ''}`,
              zIndex: 9999
            }}
          >
            <div className="domino-half">
              <DominoDots value={animatingTile.tile.left} />
            </div>
            <div className="domino-half">
              <DominoDots value={animatingTile.tile.right} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRoom;