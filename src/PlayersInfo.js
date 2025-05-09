import React from 'react';
import PlayerInfo from './PlayerInfo';

const PlayersInfo = ({ game, playerNumber, isAiMode, aiThinking, text }) => (
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
      text={text}
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
      text={text}
    />
  </div>
);

export default PlayersInfo;
