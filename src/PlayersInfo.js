import React from 'react';
import PlayerInfo from './PlayerInfo';

const PlayersInfo = ({ game, playerNumber, isAiMode, aiThinking, text }) => {
  const player3ExistsAndConnected = game.players?.player3 && game.players.player3.connected;

  return (
    <div className="players-info">
      <PlayerInfo
        player={{
          ...game.players?.player1,
          winCount: game.gameState.scores?.player1 || 0
        }}
        isActive={game.gameState.currentPlayerIndex === 0}
        isYou={playerNumber === 'player1'}
        isAi={false} // Assuming player1 is never AI in this setup
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
        isAi={isAiMode && !player3ExistsAndConnected} // AI is player2 only if player3 doesn't exist or isn't connected
        aiThinking={isAiMode && !player3ExistsAndConnected && aiThinking}
        text={text}
      />
      {player3ExistsAndConnected && (
        <PlayerInfo
          player={{
            ...game.players.player3,
            winCount: game.gameState.scores?.player3 || 0
          }}
          isActive={game.gameState.currentPlayerIndex === 2}
          isYou={playerNumber === 'player3'}
          isAi={isAiMode && game.gameState.playerCount === 2} // Or some other logic if P3 can be AI
          aiThinking={isAiMode && game.gameState.playerCount === 2 && aiThinking} // Adjust if P3 can be AI
          text={text}
        />
      )}
    </div>
  );
};

export default PlayersInfo;
