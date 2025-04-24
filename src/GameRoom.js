import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDatabase, ref, onValue, update, remove } from 'firebase/database';
import { arabicText, canPlayTile, isPlayerBlocked, updateLeaderboard, fetchLeaderboard } from './util';
import DominoDots from './DominoDots';
import AIPlayer from './AIPlayer';
import WinnerDisplay from './WinnerDisplay';
import PlayerInfo from './PlayerInfo';

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
  const [directionChoice, setDirectionChoice] = useState(null); // State for direction choice
  const [gameMessage, setGameMessage] = useState('');
  const [aiThinking, setAiThinking] = useState(false);
  const [leaderboard, setLeaderboard] = useState({});
  const boardAreaRef = useRef(null);
  const aiRef = useRef(null);
  const database = getDatabase();

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

      // Check if player2 spot is open and you're not already player1
      if (
        data.gameState.gameMode !== 'ai' && 
        data.players.player2 && 
        !data.players.player2.connected && 
        playerNumber !== 'player1' && 
        !joinDialogOpen
      ) {
        // Auto-join if playerName is saved
        const savedName = localStorage.getItem('playerName');
        if (savedName) {
          setNewPlayerName(savedName);
          (async () => {
            await update(ref(database, `games/${roomId}/players/player2`), {
              name: savedName,
              connected: true
            });
            await update(ref(database, `games/${roomId}/gameState`), {
              status: 'playing'
            });
            localStorage.setItem('playerNumber', 'player2');
            setPlayerNumber('player2');
            setJoinDialogOpen(false);
          })();
        } else {
          setJoinDialogOpen(true);
        }
      }
    }, (err) => {
      console.error("Firebase onValue error:", err);
      setError('Error loading game: ' + err.message);
      setLoading(false);
    });

    // Fetch leaderboard from Firebase
    fetchLeaderboard((data) => {
      setLeaderboard(data || {});
    });

    // Clean up subscription on unmount
    return () => unsubscribe();
  }, [roomId, playerNumber, joinDialogOpen, database]);

  useEffect(() => {
    // Auto-scroll board on small devices when board changes
    if (game && game.gameState && game.gameState.board && boardAreaRef.current) {
      if (window.innerWidth <= 768) {
        // Scroll to the far right (end)
        boardAreaRef.current.scrollLeft = boardAreaRef.current.scrollWidth;
      }
    }
  }, [game && game.gameState && game.gameState.board && game.gameState.board.length]);

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
      if (window.confirm('هل تريد حذف هذه الغرفة عند مغادرتها؟')) {
        if (roomId) {
          remove(ref(database, `games/${roomId}`));
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomId, database]);

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
          messageBlocked = `${game.players?.player1?.name} ${arabicText.winsLowPoints}`;
        } else if (p2Points < p1Points) {
          winnerBlocked = "player2";
          messageBlocked = `${game.players?.player2?.name} ${arabicText.winsLowPoints}`;
        } else {
          winnerBlocked = "tie";
          messageBlocked = arabicText.gameTied;
        }
        // Only update if not already set
        update(ref(database, `games/${roomId}/gameState`), {
          winner: winnerBlocked,
          status: "finished",
          message: messageBlocked
        });
      }
    }
  }, [game, database, roomId]);

  const handleAIMove = async (gameData) => {
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
            message = `${gameData.players?.player2?.name} ${arabicText.wins}`;
          }
          
          const updates = {
            [`players/player2/tiles`]: updatedAiTiles,
            [`gameState/board`]: updatedBoard,
            [`gameState/currentPlayerIndex`]: nextPlayerIndex,
            [`gameState/message`]: `${gameData.players?.player2?.name} ${arabicText.played}`
          };
          
          if (winner) {
            updates[`gameState/winner`] = winner;
            updates[`gameState/status`] = "finished";
            updates[`gameState/message`] = message;
            // Increment winner's score
            const currentScore = gameData.gameState.scores?.[winner] || 0;
            updates[`gameState/scores/${winner}`] = currentScore + 1;
            // Update leaderboard in Firebase
            updateLeaderboard(gameData.players?.[winner]?.name);
          }
          
          await update(ref(database, `games/${roomId}`), updates);
          
        } else if (aiMove.action === 'draw') {
          // AI wants to draw a tile
          const drawnTile = boneyard[0];
          const updatedBoneyard = boneyard.slice(1);
          const updatedAiTiles = [...aiTiles, drawnTile];
          
          // Check if the drawn tile can be played
          const { canPlay } = canPlayTile(drawnTile, board);
          const nextPlayerIndex = canPlay ? 1 : 0; // Stay AI's turn if can play, otherwise human's turn
          
          const message = canPlay ? 
            `${gameData.players?.player2?.name} ${arabicText.canPlay}` :
            `${gameData.players?.player2?.name} ${arabicText.passes}`;
          
          await update(ref(database, `games/${roomId}`), {
            [`players/player2/tiles`]: updatedAiTiles,
            [`gameState/boneyard`]: updatedBoneyard,
            [`gameState/currentPlayerIndex`]: nextPlayerIndex,
            [`gameState/message`]: message
          });
          
          // If AI can play the drawn tile, it will make another move on the next game update
          
        } else {
          // AI passes
          await update(ref(database, `games/${roomId}/gameState`), {
            currentPlayerIndex: 0, // Back to human player
            message: `${gameData.players?.player2?.name} ${arabicText.passes}`
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
              message = `${gameData.players?.player1?.name} ${arabicText.winsLowPoints}`;
            } else if (p2Points < p1Points) {
              winner = "player2";
              message = `${gameData.players?.player2?.name} ${arabicText.winsLowPoints}`;
            } else {
              winner = "tie";
              message = arabicText.gameTied;
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
              updateLeaderboard(gameData.players?.[winner]?.name);
            }
            await update(ref(database, `games/${roomId}/gameState`), deadlockUpdates);
          }
        }
      } catch (error) {
        console.error("Error during AI move:", error);
      } finally {
        setAiThinking(false);
      }
    }, 1500); // 1.5 second delay for "thinking"
  };

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
      setGameMessage(arabicText.notYourTurn);
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
      message = `${game.players?.[playerNumber]?.name} ${arabicText.wins}`;
    }
    try {
      const updates = {
        [`players/${playerNumber}/tiles`]: updatedPlayerTiles,
        [`gameState/board`]: updatedBoard,
        [`gameState/currentPlayerIndex`]: nextPlayerIndex,
        [`gameState/message`]: `${game.players?.[playerNumber]?.name} ${arabicText.played}`
      };
      if (winner) {
        updates[`gameState/winner`] = winner;
        updates[`gameState/status`] = "finished";
        updates[`gameState/message`] = message;
        const currentScore = game.gameState.scores?.[winner] || 0;
        updates[`gameState/scores/${winner}`] = currentScore + 1;
        updateLeaderboard(game.players?.[winner]?.name);
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
            messageBlocked = `${game.players?.player1?.name} ${arabicText.winsLowPoints}`;
          } else if (p2Points < p1Points) {
            winnerBlocked = "player2";
            messageBlocked = `${game.players?.player2?.name} ${arabicText.winsLowPoints}`;
          } else {
            winnerBlocked = "tie";
            messageBlocked = arabicText.gameTied;
          }
          updates[`gameState/winner`] = winnerBlocked;
          updates[`gameState/status`] = "finished";
          updates[`gameState/message`] = messageBlocked;
          if (winnerBlocked !== "tie") {
            const currentScore = game.gameState.scores?.[winnerBlocked] || 0;
            updates[`gameState/scores/${winnerBlocked}`] = currentScore + 1;
            updateLeaderboard(game.players?.[winnerBlocked]?.name);
          }
        }
      }
      await update(ref(database, `games/${roomId}`), updates);
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
      setGameMessage("اختيار غير صالح.");
      setDirectionChoice(null);
    }
  };

  const handlePlayTile = async () => {
    const currentPlayerNumber = game.gameState.currentPlayerIndex === 0 ? 'player1' : 'player2';
    if (playerNumber !== currentPlayerNumber) {
      setGameMessage(arabicText.notYourTurn);
      return;
    }
    const board = game.gameState.board || [];
    const possiblePlays = canPlayTile(selectedTile, board);
    if (possiblePlays.length === 0) {
      setGameMessage(arabicText.cantPlay);
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
      setGameMessage(arabicText.notYourTurn);
      return;
    }

    if (!game.gameState.boneyard || game.gameState.boneyard.length === 0) {
      setGameMessage(arabicText.noTilesLeft);
      
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
            messageBlocked = `${game.players?.player1?.name} ${arabicText.winsLowPoints}`;
          } else if (p2Points < p1Points) {
            winnerBlocked = "player2";
            messageBlocked = `${game.players?.player2?.name} ${arabicText.winsLowPoints}`;
          } else {
            winnerBlocked = "tie";
            messageBlocked = arabicText.gameTied;
          }
          await update(ref(database, `games/${roomId}/gameState`), {
            winner: winnerBlocked,
            status: "finished",
            message: messageBlocked
          });
        } else {
          await update(ref(database, `games/${roomId}/gameState`), {
            currentPlayerIndex: nextPlayerIndex,
            message: `${game.players?.[playerNumber]?.name} ${arabicText.hasNoPlayable}`
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
      `${game.players?.[playerNumber]?.name} ${arabicText.canPlay}` :
      `${game.players?.[playerNumber]?.name} ${arabicText.passes}`;

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

  const startNewGame = async () => {
    try {
      navigate('/');
    } catch (error) {
      console.error("Error starting new game:", error);
      setError("Failed to start new game");
    }
  };

  if (loading) {
    return <div className="loading arabic-text">{arabicText.loading}</div>;
  }

  if (error) {
    return <div className="error arabic-text">{error}</div>;
  }

  if (!game) {
    return <div className="error arabic-text">{arabicText.gameNotFound}</div>;
  }

  // Check if game is in waiting state
  const isWaiting = game.gameState.status === 'waiting';
  const isFinished = game.gameState.status === 'finished';
  const isAiMode = game.gameState.gameMode === 'ai';

  return (
    <div className="game-room" dir="rtl">
      <button onClick={() => navigate('/')} className="return-home-button button-with-logo arabic-text" style={{marginBottom: '10px'}}>
        <img src="/logo.png" alt="" className="logo-in-button" /> {/* Logo inside button */}
        <span>العودة إلى الصفحة الرئيسية</span> {/* Wrap text in span */}
      </button>
      <div className="logo-container logo-container-large"> {/* Added class */}
        <img src="/logo.png" alt="Domino Game Logo" className="game-logo" />
      </div>
      <h1 className="arabic-text">{arabicText.gameTitle}</h1>
      <div className="game-info">
        <p className="arabic-text room-id-display">{arabicText.roomId}: {roomId}</p> {/* Added class */}
        {!isAiMode && (
          <button onClick={copyGameLink} className="copy-link-button arabic-text">{arabicText.copyLink}</button>
        )}
        {isAiMode && (
          <span className="ai-mode-indicator arabic-text">{arabicText.aiModeActive} ({arabicText[game.gameState.aiDifficulty]})</span>
        )}
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
          <p className="game-link">https://elhabdomino.fun/#/room/{roomId}</p>
          <button onClick={copyGameLink} className="copy-link-button arabic-text">{arabicText.copyLink}</button>
        </div>
      ) : (
        <div className="game-board">
          <div className="players-info">
            <PlayerInfo
              player={{
                ...game.players?.player1,
                winCount: game.gameState.scores?.player1 || 0
              }}
              isActive={game.gameState.currentPlayerIndex === 0}
              isYou={playerNumber === 'player1'}
              isAi={false}
              aiThinking={false}
            />
            <PlayerInfo
              player={{
                ...game.players?.player2,
                winCount: game.gameState.scores?.player2 || 0
              }}
              isActive={game.gameState.currentPlayerIndex === 1}
              isYou={playerNumber === 'player2'}
              isAi={isAiMode}
              aiThinking={aiThinking}
            />
          </div>

          <div className="board-area" ref={boardAreaRef}>
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

          {!isFinished && playerNumber && game.players?.[playerNumber] && (
            <div className="player-controls">
              {directionChoice && (
                <div className="direction-choice-buttons" style={{ textAlign: 'center', margin: '10px 0' }}>
                  <button className="play-button arabic-text" style={{marginLeft: '10px'}} onClick={() => handleDirectionChoice('right')}>اليمين</button>
                  <button className="play-button arabic-text" onClick={() => handleDirectionChoice('left')}>اليسار</button>
                </div>
              )}
              <div className="player-hand">
                <h3 className="arabic-text">{arabicText.yourTiles}</h3>
                <div className="tiles">
                  {(game.players?.[playerNumber]?.tiles || []).map((tile, index) => {
                    let flipped = false;
                    if (selectedTile && selectedTile.index === index) {
                      const board = game.gameState.board || [];
                      const { canPlay, needsFlip } = canPlayTile(tile, board);
                      flipped = !!needsFlip;
                    }
                    return (
                      <div
                        key={`hand-${index}`}
                        className={`hand-tile ${selectedTile && selectedTile.index === index ? 'selected' : ''}`}
                        onClick={() => handleTileSelect(tile, index)}
                      >
                        <div className={`domino${flipped ? ' flipped' : ''}`}>
                          <div className="domino-half">
                            <DominoDots value={tile.left} />
                          </div>
                          <div className="domino-half">
                            <DominoDots value={tile.right} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                  disabled={!isMyTurn() || !game.gameState.boneyard || game.gameState.boneyard.length === 0}
                  className={`draw-button arabic-text ${!isMyTurn() || !game.gameState.boneyard || game.gameState.boneyard.length === 0 ? 'disabled' : ''}`}
                >
                  {arabicText.drawTile} ({game.gameState.boneyard ? game.gameState.boneyard.length : 0})
                </button>
              </div>
            </div>
          )}

          {isFinished && game.gameState.winner && (
            <WinnerDisplay 
              winner={game.gameState.winner === 'tie' ? 'tie' : game.players[game.gameState.winner]} 
              onNewGame={startNewGame}
              isTie={game.gameState.winner === 'tie'}
            />
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

export default GameRoom;