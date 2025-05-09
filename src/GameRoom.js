import React, { useState, useEffect, useRef, useCallback } from 'react'; // Added useCallback
import { useParams, useNavigate } from 'react-router-dom';
import { ref, onValue, update, remove, get } from 'firebase/database'; // Added get
import { canPlayTile, isPlayerBlocked, updateLeaderboard, fetchLeaderboard, transferBetCoins, setUserCoins, getUserCoins, db, fetchUserCoins } from './Util'; // Added fetchUserCoins, removed unused getUserCoins
// import DominoDots from './DominoDots'; // Removed unused import
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
          const nextPlayerIndex = 0; // Back to human player
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
              const loser = winner === 'player1' ? 'player2' : 'player1';
              const loserUid = gameData.players[loser]?.uid;
              if (winnerUid && loserUid) {
                (async () => {
                  await transferBetCoins(winnerUid, loserUid, game.gameState.betAmount);
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
          const nextPlayerIndex = canPlay ? 1 : 0; // Stay AI's turn if can play, otherwise human's turn
  
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
          await update(ref(db, `games/${roomId}/gameState`), { // Use imported db
            currentPlayerIndex: 0, // Back to human player
            message: `${gameData.players?.player2?.name} ${text.passes}`
          });
  
          // Check if both players are blocked
          const humanBlocked = isPlayerBlocked(gameData.players?.player1?.tiles || [], board);
          if (humanBlocked) {
            // Game is deadlocked - determine winner by remaining pip count
            const p1Points = (gameData.players?.player1?.tiles || []).reduce((sum, tile) => sum + tile.left + tile.right, 0);
            const p2Points = (gameData.players?.player2?.tiles || []).reduce((sum, tile) => sum + tile.left + tile.right, 0);
  
            let winner, message;
            if (p1Points < p2Points) {
              winner = "player1";
              message = `${gameData.players?.player1?.name} ${text.winsLowPoints}`;
            } else if (p2Points < p1Points) {
              winner = "player2";
              message = `${gameData.players?.player2?.name} ${text.winsLowPoints}`;
            } else {
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
                const loser = winner === 'player1' ? 'player2' : 'player1';
                const loserUid = gameData.players[loser]?.uid;
                if (winnerUid && loserUid) {
                  (async () => {
                    await transferBetCoins(winnerUid, loserUid, game.gameState.betAmount);
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
        } else if (data.players.player2 && !data.players.player2.connected && data.gameState.status !== 'finished') { // Added status check
          // Auto-join as player2 if spot is open and game not finished
          (async () => {
            // Fetch player 2's current coins
            const player2Coins = await fetchUserCoins(user.uid);
            let currentCoins = player2Coins;

            // Initialize if needed
            if (typeof player2Coins !== 'number' || player2Coins < 0) {
                console.log(`Initializing coins for player 2 (${user.uid}) on auto-join`);
                await setUserCoins(user.uid, 100); // Set default 100 coins
                currentCoins = 100; // Use the initialized value for the check
            }

            // Check if player 2 has enough coins for the bet
            const betAmount = data?.gameState?.betAmount || 0;
            if (betAmount > 0 && currentCoins < betAmount) {
                console.log(`Player ${user.uid} cannot auto-join room ${roomId} due to insufficient coins for bet ${betAmount}.`);
                alert(`لا يمكنك الانضمام لهذه اللعبة تلقائيًا. الرهان هو ${betAmount} عملة، ولديك ${currentCoins} فقط. (Cannot auto-join this game. The bet is ${betAmount} coins, and you only have ${currentCoins}.)`);
                navigate('/'); // Redirect to home
                return; // Stop the auto-join process
            }

            // Proceed with auto-joining if enough coins
            console.log(`Auto-joining player ${user.uid} to room ${roomId}`);
            await update(ref(db, `games/${roomId}/players/player2`), {
              name: user.displayName || '',
              uid: user.uid,
              connected: true
            });
            await update(ref(db, `games/${roomId}/gameState`), {
              status: 'playing',
              lastActive: Date.now() // Update activity on join
            });
            setPlayerNumber('player2');
          })();
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
  }, [roomId, user, handleAIMove]); // Added handleAIMove dependency
  
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
    // Check for deadlock (no one can play and boneyard is empty)
    if (game && !game.gameState.winner && game.gameState.status !== 'waiting' && game.gameState.status !== 'finished') {
      const p1Blocked = isPlayerBlocked(game.players.player1.tiles, game.gameState.board);
      const p2Blocked = isPlayerBlocked(game.players.player2.tiles, game.gameState.board);
      const boneyardEmpty = !game.gameState.boneyard || game.gameState.boneyard.length === 0;
      if (p1Blocked && p2Blocked && boneyardEmpty) {
        // Calculate points
        const p1Points = game.players.player1.tiles.reduce((sum, tile) => sum + tile.left + tile.right, 0);
        const p2Points = game.players.player2.tiles.reduce((sum, tile) => sum + tile.left + tile.right, 0);
        let winnerBlocked, messageBlocked;
        if (p1Points < p2Points) {
          winnerBlocked = "player1";
          messageBlocked = `${game.players?.player1?.name} ${text.winsLowPoints}`;
        } else if (p2Points < p1Points) {
          winnerBlocked = "player2";
          messageBlocked = `${game.players?.player2?.name} ${text.winsLowPoints}`;
        } else {
          winnerBlocked = "tie";
          messageBlocked = text.gameTied;
        }
        // Only update if not already set
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
          if (game.gameState.betAmount && game.gameState.betAmount > 0) {
            const winnerUid = game.players[winnerBlocked]?.uid;
            const loser = winnerBlocked === 'player1' ? 'player2' : 'player1';
            const loserUid = game.players[loser]?.uid;
            if (winnerUid && loserUid) {
              (async () => {
                await transferBetCoins(winnerUid, loserUid, game.gameState.betAmount);
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
    const currentPlayerNumber = game.gameState.currentPlayerIndex === 0 ? 'player1' : 'player2';
    if (playerNumber !== currentPlayerNumber) {
      setGameMessage(text.notYourTurn);
      return;
    }

    setSelectedTile({ ...tile, index });
  };

  const executePlay = async (chosenPlay) => {
    const { position, needsFlip, orientation } = chosenPlay;
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
    const nextPlayerIndex = game.gameState.currentPlayerIndex === 0 ? 1 : 0;
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
        if (game.gameState.betAmount && game.gameState.betAmount > 0) {
          const winnerUid = game.players[winner]?.uid;
          const loser = winner === 'player1' ? 'player2' : 'player1';
          const loserUid = game.players[loser]?.uid;
          if (winnerUid && loserUid) {
            (async () => {
              await transferBetCoins(winnerUid, loserUid, game.gameState.betAmount);
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
        if (p1Blocked && p2Blocked && boneyardEmpty) {
          const p1Points = (playerNumber === 'player1' ? updatedPlayerTiles : game.players.player1.tiles).reduce((sum, tile) => sum + tile.left + tile.right, 0);
          const p2Points = (playerNumber === 'player2' ? updatedPlayerTiles : game.players.player2.tiles).reduce((sum, tile) => sum + tile.left + tile.right, 0);
          let winnerBlocked, messageBlocked;
          if (p1Points < p2Points) {
            winnerBlocked = "player1";
            messageBlocked = `${game.players?.player1?.name} ${text.winsLowPoints}`;
          } else if (p2Points < p1Points) {
            winnerBlocked = "player2";
            messageBlocked = `${game.players?.player2?.name} ${text.winsLowPoints}`;
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
            if (game.gameState.betAmount && game.gameState.betAmount > 0) {
              const winnerUid = game.players[winnerBlocked]?.uid;
              const loser = winnerBlocked === 'player1' ? 'player2' : 'player1';
              const loserUid = game.players[loser]?.uid;
              if (winnerUid && loserUid) {
                (async () => {
                  await transferBetCoins(winnerUid, loserUid, game.gameState.betAmount);
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
    const currentPlayerNumber = game.gameState.currentPlayerIndex === 0 ? 'player1' : 'player2';
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
    if (!game) return;
    
    const currentPlayerNumber = game.gameState.currentPlayerIndex === 0 ? 'player1' : 'player2';
    if (playerNumber !== currentPlayerNumber) {
      setGameMessage(text.notYourTurn);
      return;
    }

    if (!game.gameState.boneyard || game.gameState.boneyard.length === 0) {
      setGameMessage(text.noTilesLeft);
      
      // If boneyard is empty and player can't play, skip turn
      const canPlay = !isPlayerBlocked(game.players?.[playerNumber]?.tiles || [], game.gameState.board);
      if (!canPlay) {
        const nextPlayerIndex = game.gameState.currentPlayerIndex === 0 ? 1 : 0;
        // Check if both players are blocked and boneyard is empty
        const p1Blocked = isPlayerBlocked(game.players.player1.tiles, game.gameState.board);
        const p2Blocked = isPlayerBlocked(game.players.player2.tiles, game.gameState.board);
        const boneyardEmpty = !game.gameState.boneyard || game.gameState.boneyard.length === 0;
        if (p1Blocked && p2Blocked && boneyardEmpty) {
          const p1Points = game.players.player1.tiles.reduce((sum, tile) => sum + tile.left + tile.right, 0);
          const p2Points = game.players.player2.tiles.reduce((sum, tile) => sum + tile.left + tile.right, 0);
          let winnerBlocked, messageBlocked;
          if (p1Points < p2Points) {
            winnerBlocked = "player1";
            messageBlocked = `${game.players?.player1?.name} ${text.winsLowPoints}`;
          } else if (p2Points < p1Points) {
            winnerBlocked = "player2";
            messageBlocked = `${game.players?.player2?.name} ${text.winsLowPoints}`;
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
            if (game.gameState.betAmount && game.gameState.betAmount > 0) {
              const winnerUid = game.players[winnerBlocked]?.uid;
              const loser = winnerBlocked === 'player1' ? 'player2' : 'player1';
              const loserUid = game.players[loser]?.uid;
              if (winnerUid && loserUid) {
                (async () => {
                  await transferBetCoins(winnerUid, loserUid, game.gameState.betAmount);
                })();
              }
            }
          }
          await update(ref(db, `games/${roomId}/gameState`), deadlockUpdates);
        } else {
          await update(ref(db, `games/${roomId}/gameState`), {
            currentPlayerIndex: nextPlayerIndex,
            message: `${game.players?.[playerNumber]?.name} ${text.hasNoPlayable}`
          });
        }
      }
      return;
    }

    // Draw a tile from the boneyard
    const drawnTile = game.gameState.boneyard[0];
    const updatedBoneyard = game.gameState.boneyard.slice(1);
    const updatedPlayerTiles = [...(game.players?.[playerNumber]?.tiles || []), drawnTile];
    // Check if the drawn tile can be played
    const { canPlay } = canPlayTile(drawnTile, game.gameState.board);
    const nextPlayerIndex = canPlay ? game.gameState.currentPlayerIndex : 
                         (game.gameState.currentPlayerIndex === 0 ? 1 : 0);

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
      setError(text.failedToDrawTile);
    }
  };

  const isMyTurn = () => {
    if (!game || !playerNumber) return false;
    const currentPlayerNumber = game.gameState.currentPlayerIndex === 0 ? 'player1' : 'player2';
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
                  <button className="play-button arabic-text" style={{marginLeft: '10px'}} onClick={() => handleDirectionChoice('right')}>{text.right}</button>
                  <button className="play-button arabic-text" onClick={() => handleDirectionChoice('left')}>{text.left}</button>
                </div>
              )}
              <PlayerHand
                tiles={game.players?.[playerNumber]?.tiles}
                selectedTile={selectedTile}
                onTileSelect={handleTileSelect}
                board={game.gameState.board}
                text={text}
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
    </div>
  );
};

export default GameRoom;