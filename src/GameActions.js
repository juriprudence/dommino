import React from 'react';

const GameActions = ({ onPlayTile, onDrawTile, selectedTile, isMyTurn, boneyard, arabicText }) => (
  <div className="game-actions">
    <button 
      onClick={onPlayTile} 
      disabled={!selectedTile || !isMyTurn()}
      className={`play-button arabic-text ${!selectedTile || !isMyTurn() ? 'disabled' : ''}`}
    >
      {arabicText.playTile}
    </button>
    <button 
      onClick={onDrawTile}
      disabled={!isMyTurn() || !boneyard || boneyard.length === 0}
      className={`draw-button arabic-text ${!isMyTurn() || !boneyard || boneyard.length === 0 ? 'disabled' : ''}`}
    >
      {arabicText.drawTile} ({boneyard ? boneyard.length : 0})
    </button>
  </div>
);

export default GameActions;
