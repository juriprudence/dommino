import React from 'react';

const GameActions = ({ onPlayTile, onDrawTile, selectedTile, isMyTurn, boneyard, text }) => (
  <div className="game-actions">
    <button
      className="play-button arabic-text"
      onClick={onPlayTile}
      disabled={!selectedTile || !isMyTurn()}
    >
      {text.play}
    </button>
    <button
      className="draw-button arabic-text"
      onClick={onDrawTile}
      disabled={!boneyard || boneyard.length === 0 || !isMyTurn()}
    >
      {text.draw}
    </button>
  </div>
);

export default GameActions;
