import React from 'react';
import { Link } from 'react-router-dom';

const PlayerInfo = ({ player, isActive, isYou, isAi, aiThinking, text }) => (
  <div className={`player ${isActive ? 'active' : ''}`}>
    <h3 className="arabic-text">
      {(!isAi && player.uid) ? (
        <Link to={`/profile/${player.uid}`} style={{ color: 'inherit', textDecoration: 'underline' }}>
          {player.name}
        </Link>
      ) : (
        player.name
      )}
      {isYou ? ` ${text.you}` : ''} {isAi && <span className="ai-indicator">{text.aiIndicator}</span>}
    </h3>

    <p className="arabic-text">{text.tiles}: {player.tiles ? player.tiles.length : 0}</p>
    {aiThinking && <div className="ai-thinking arabic-text">{text.aiThinking}...</div>}
  </div>
);

export default PlayerInfo;
