import React from 'react';
import { arabicText } from './Util'; // Corrected casing

const PlayerInfo = ({ player, isActive, isYou, isAi, aiThinking }) => (
  <div className={`player ${isActive ? 'active' : ''}`}> 
    <h3 className="arabic-text">
      {player.name} {isYou ? arabicText.you : ''} {isAi && <span className="ai-indicator">{arabicText.aiIndicator}</span>}
      <span className="score">{` | ${arabicText.wins}: ${player.winCount || 0}`}</span>
    </h3>
    <p className="arabic-text">{arabicText.tiles}: {player.tiles ? player.tiles.length : 0}</p>
    {aiThinking && <div className="ai-thinking arabic-text">{arabicText.aiThinking}...</div>}
  </div>
);

export default PlayerInfo;
