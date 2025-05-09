import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDatabase, ref, onValue, update, get } from 'firebase/database';

const Lobby = ({ user, coins, text }) => {
  const [openGames, setOpenGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingJoin, setPendingJoin] = useState(null); // {roomId, betAmount}
  const navigate = useNavigate();
  const database = getDatabase();

  useEffect(() => {
    setLoading(true);
    const gamesRef = ref(database, 'games');
    const now = Date.now();
    const THIRTY_MINUTES = 30 * 60 * 1000;
    const unsubscribe = onValue(gamesRef, (snapshot) => {
      const games = [];
      snapshot.forEach(childSnap => {
        const val = childSnap.val();
        if (
          val &&
          val.gameState &&
          val.gameState.status === 'waiting' &&
          val.players &&
          val.players.player2 &&
          !val.players.player2.connected &&
          val.gameState.timestamp &&
          now - val.gameState.timestamp <= THIRTY_MINUTES
        ) {
          games.push({ id: childSnap.key, ...val });
        }
      });
      setOpenGames(games);
      setLoading(false);
    }, (err) => {
      setError(text.gameNotFound);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [database, text]);

  const actuallyJoinGame = async (roomId) => {
    try {
      const gameRef = ref(database, `games/${roomId}`);
      const snapshot = await get(gameRef);
      const game = snapshot.val();
      if (!game) {
        setError(text.gameNotFound);
        return;
      }
      const player1 = game.players?.player1;
      if (!player1) {
        setError(text.playerInfoMissing);
        return;
      }
      if (player1.uid === user.uid || player1.email === user.email) {
        setError(text.cannotJoinOwnGame);
        return;
      }
      const betAmount = game.gameState?.betAmount || 0;
      if (betAmount > 0 && coins < betAmount) {
        setError(`${text.needMoreCoins} ${betAmount} ${text.coins}. ${text.yourBalance}: ${coins}.`);
        return;
      }
      const playerName = user.displayName || user.email?.split('@')[0] || text.guest;
      await update(ref(database, `games/${roomId}/players/player2`), {
        name: playerName,
        uid: user.uid,
        email: user.email || null,
        connected: true
      });
      await update(ref(database, `games/${roomId}/gameState`), {
        status: 'playing',
        lastActive: Date.now()
      });
      navigate(`/room/${roomId}`);
    } catch (err) {
      console.error("Error joining game:", err);
      setError(text.joinFailed);
    }
  };

  const handleJoinGame = async (roomId) => {
    if (!user) {
      setError(text.needLogin);
      navigate('/login');
      return;
    }
    try {
      const gameRef = ref(database, `games/${roomId}`);
      const snapshot = await get(gameRef);
      const game = snapshot.val();
      if (!game) {
        setError(text.gameNotFound);
        return;
      }
      const betAmount = game.gameState?.betAmount || 0;
      if (betAmount > 0) {
        setPendingJoin({ roomId, betAmount });
        return;
      }
      await actuallyJoinGame(roomId);
    } catch (err) {
      console.error("Error joining game:", err);
      setError(text.joinFailed);
    }
  };

  if (loading) {
    return <div className="loading-message">{text.loading}...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="lobby-container">
      <h1>{text.lobbyTitle}</h1>
      {openGames.length === 0 ? (
        <p>{text.noOpenGames}</p>
      ) : (
        <ul className="game-list">
          {openGames.map((game) => (
            <li key={game.id} className="game-list-item">
              <span>
                {text.gameHost}: {game.players?.player1?.name || '...'}
                {game.gameState?.betAmount > 0 && (
                    <span style={{ marginLeft: '15px', color: 'gold', fontWeight: 'bold' }}>
                        {text.bet}: {game.gameState.betAmount} <i className="fas fa-coins"></i>
                    </span>
                )}
              </span>
              <button
                onClick={() => handleJoinGame(game.id)}
                className="join-button small-join-button"
                style={{ minWidth: '120px' }}
              >
                {text.joinGame}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button onClick={() => navigate('/')} className="return-home-button">
        {text.returnHome}
      </button>
      {pendingJoin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <p>
              {text.bet}: {pendingJoin.betAmount} {text.coins}.<br />
              {text.confirmJoinBet || "This game has a bet. Do you want to continue?"}
            </p>
            <button onClick={async () => {
              await actuallyJoinGame(pendingJoin.roomId);
              setPendingJoin(null);
            }}>
              {text.continue || "Continue"}
            </button>
            <button onClick={() => {
              setPendingJoin(null);
              navigate('/');
            }}>
              {text.cancel || "Cancel"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lobby;