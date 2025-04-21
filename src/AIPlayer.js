// AI Player implementation for Domino game
import { canPlayTile } from './util';

class AIPlayer {
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty; // 'easy', 'medium', 'hard'
    this.lastGameState = null; // Track game state for learning
  }

  // Main function to determine AI's move
  makeMove(tiles, board, boneyard) {
    if (this.difficulty === 'easy') {
      return this.makeEasyMove(tiles, board, boneyard);
    } else if (this.difficulty === 'hard') {
      return this.makeHardMove(tiles, board, boneyard);
    } else {
      return this.makeMediumMove(tiles, board, boneyard);
    }
  }

  // Easy AI: just plays the first valid tile or draws
  makeEasyMove(tiles, board, boneyard) {
    // Try to play any valid tile
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const { canPlay, position } = canPlayTile(tile, board);
      
      if (canPlay) {
        return {
          action: 'play',
          tileIndex: i,
          position: position
        };
      }
    }

    // If no valid tile, draw from boneyard if possible
    if (boneyard && boneyard.length > 0) {
      return { action: 'draw' };
    }

    // If can't play or draw, pass
    return { action: 'pass' };
  }

  // Medium AI: prefers to play doubles and high-value tiles first
  makeMediumMove(tiles, board, boneyard) {
    // First check if we can play a double
    const doubleTiles = tiles.filter(tile => tile.left === tile.right);
    
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const { canPlay, position } = canPlayTile(tile, board);
      
      // If it's a double and can be played, play it
      if (canPlay && tile.left === tile.right) {
        return {
          action: 'play',
          tileIndex: i,
          position: position
        };
      }
    }
    
    // Otherwise, play the highest value tile that's valid
    let highestValue = -1;
    let bestTileIndex = -1;
    let bestPosition = null;
    
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const { canPlay, position } = canPlayTile(tile, board);
      const tileValue = tile.left + tile.right;
      
      if (canPlay && tileValue > highestValue) {
        highestValue = tileValue;
        bestTileIndex = i;
        bestPosition = position;
      }
    }
    
    if (bestTileIndex !== -1) {
      return {
        action: 'play',
        tileIndex: bestTileIndex,
        position: bestPosition
      };
    }
    
    // If no valid tile, draw from boneyard if possible
    if (boneyard && boneyard.length > 0) {
      return { action: 'draw' };
    }
    
    // If can't play or draw, pass
    return { action: 'pass' };
  }
  
  // Hard AI: uses advanced strategy to maximize likelihood of winning
  makeHardMove(tiles, board, boneyard) {
    // Count how many of each number are already on the board
    const numberCounts = this.countBoardNumbers(board);
    const openEnds = this.getOpenEnds(board);
    
    // Track playable tiles for decisions
    const playableTiles = [];
    
    // Analyze all playable tiles
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const { canPlay, position } = canPlayTile(tile, board);
      
      if (canPlay) {
        // Calculate various factors for strategy
        const leftCount = numberCounts[tile.left] || 0;
        const rightCount = numberCounts[tile.right] || 0;
        const isDouble = tile.left === tile.right;
        const pipCount = tile.left + tile.right;
        
        // Check if playing this tile would create a favorable board state
        const willCreateEndValue = this.predictEndValue(tile, position, board, openEnds);
        
        // Check if we have other tiles with the same numbers (for strategic play)
        const hasSimilarTiles = tiles.some((t, idx) => 
          idx !== i && (t.left === tile.left || t.left === tile.right || 
                        t.right === tile.left || t.right === tile.right)
        );
        
        // Calculate a comprehensive score based on multiple factors
        let score = pipCount;  // Base: higher pip count is better to get rid of
        
        // Strategic adjustments
        if (isDouble) score += 8; // Prioritize doubles even more in hard mode
        if (hasSimilarTiles) score -= 3; // Keep similar values for future plays
        score += (leftCount + rightCount) * 2; // Common numbers block opponents
        
        // Favor moves that create ends with numbers we have more of
        if (willCreateEndValue !== null) {
          const endValueCount = tiles.filter(t => 
            t.left === willCreateEndValue || t.right === willCreateEndValue
          ).length;
          score += endValueCount * 4;
        }
        
        // Penalize playing tiles that make ends with numbers 0 or 6 if we don't have more
        if (willCreateEndValue === 0 || willCreateEndValue === 6) {
          const endValueCount = tiles.filter(t => 
            t.left === willCreateEndValue || t.right === willCreateEndValue
          ).length;
          if (endValueCount === 0) score -= 5;
        }
        
        playableTiles.push({
          tileIndex: i,
          position,
          score
        });
      }
    }
    
    // Sort by score (highest first)
    playableTiles.sort((a, b) => b.score - a.score);
    
    // Play the highest scoring tile if any
    if (playableTiles.length > 0) {
      return {
        action: 'play',
        tileIndex: playableTiles[0].tileIndex,
        position: playableTiles[0].position
      };
    }
    
    // If no valid tile, draw from boneyard if possible
    if (boneyard && boneyard.length > 0) {
      return { action: 'draw' };
    }
    
    // If can't play or draw, pass
    return { action: 'pass' };
  }
  
  // Helper method to count occurrences of each number on the board
  countBoardNumbers(board) {
    const counts = {};
    if (!board || board.length === 0) return counts;
    
    // Count first tile's values
    counts[board[0].left] = 1;
    if (board[0].left !== board[0].right) {
      counts[board[0].right] = 1;
    } else {
      counts[board[0].right] = 2;
    }
    
    // Count middle values only once (as they are connected)
    for (let i = 1; i < board.length; i++) {
      const tile = board[i];
      counts[tile.left] = (counts[tile.left] || 0) + 1;
      if (tile.left !== tile.right) {
        counts[tile.right] = (counts[tile.right] || 0) + 1;
      } else {
        counts[tile.right] += 1;  // For doubles
      }
    }
    
    return counts;
  }
  
  // Get the open end values on the board
  getOpenEnds(board) {
    if (!board || board.length === 0) return [];
    
    // For a non-empty board, we have two open ends: left of first tile, right of last tile
    return [board[0].left, board[board.length - 1].right];
  }
  
  // Predict what end value would result from playing a tile
  predictEndValue(tile, position, board, openEnds = null) {
    if (!board || board.length === 0) return null;
    if (!openEnds) openEnds = this.getOpenEnds(board);
    
    // If playing to the left end of the board
    if (position === 'left') {
      const leftEndValue = openEnds[0];
      if (tile.right === leftEndValue) return tile.left;
      if (tile.left === leftEndValue) return tile.right;
    }
    // If playing to the right end of the board
    else if (position === 'right') {
      const rightEndValue = openEnds[1];
      if (tile.left === rightEndValue) return tile.right;
      if (tile.right === rightEndValue) return tile.left;
    }
    
    return null;
  }
  
  // Update the AI with the last game state (for potential future learning)
  updateGameState(gameState) {
    this.lastGameState = gameState;
  }
}

export default AIPlayer;