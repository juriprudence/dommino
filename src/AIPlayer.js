// AI Player implementation for Domino game
import { canPlayTile } from './util';

class AIPlayer {
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty; // 'easy', 'medium', 'hard'
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
  
  // Hard AI: uses strategy to maximize likelihood of winning
  makeHardMove(tiles, board, boneyard) {
    // Count how many of each number are already on the board
    const numberCounts = this.countBoardNumbers(board);
    
    // First, try to play a tile that matches a common value on the board
    // This increases chances that opponent will be blocked
    let bestTileIndex = -1;
    let bestPosition = null;
    let bestScore = -1;
    
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const { canPlay, position } = canPlayTile(tile, board);
      
      if (canPlay) {
        // Score based on how common the values are and total pip count
        // Higher score = better play
        const leftCount = numberCounts[tile.left] || 0;
        const rightCount = numberCounts[tile.right] || 0;
        const isDouble = tile.left === tile.right;
        const pipCount = tile.left + tile.right;
        
        // For hard difficulty, prioritize:
        // 1. Getting rid of doubles (they're harder to play later)
        // 2. Tiles with high pip counts (reduce points if we lose)
        // 3. Values that are already common on the board (block opponent)
        let score = pipCount + (leftCount + rightCount) * 2;
        if (isDouble) score += 5; // Bonus for doubles
        
        if (score > bestScore) {
          bestScore = score;
          bestTileIndex = i;
          bestPosition = position;
        }
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
}

export default AIPlayer;