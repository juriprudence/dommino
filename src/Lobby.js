import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { arabicText } from './util'; // Assuming arabicText is needed for UI text

const Lobby = () => {
  const [openGames, setOpenGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const database = getDatabase();

  useEffect(() => {
    setLoading(true);
    const gamesRef = ref(database, 'games');
    const unsubscribe = onValue(gamesRef, (snapshot) => {
      const games = [];
      snapshot.forEach(childSnap => {
        const val = childSnap.val();
        // Only show games where player2 is not connected (waiting for player)
        if (
          val &&
          val.gameState &&
          val.gameState.status === 'waiting' &&
          val.players &&
          val.players.player2 &&
          !val.players.player2.connected
        ) {
          games.push({ id: childSnap.key, ...val });
        }
      });
      setOpenGames(games);
      setLoading(false);
    }, (err) => {
      setError('فشل تحميل قائمة الغرف');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [database]);

  const handleJoinGame = async (roomId) => {
    try {
      const playerName = localStorage.getItem('playerName') || prompt('أدخل اسمك للانضمام');
      if (!playerName) return;
      // Fetch the game to check player1's name
      const gameRef = ref(database, `games/${roomId}`);
      import('firebase/database').then(({ get }) => {
        get(gameRef).then(snapshot => {
          const game = snapshot.val();
          if (game && game.players && game.players.player1 && game.players.player1.name === playerName) {
            // If joining with the same name as player1, set as player1
            localStorage.setItem('playerName', playerName);
            localStorage.setItem('playerNumber', 'player1');
            navigate(`/room/${roomId}`);
          } else {
            // Otherwise, join as player2
            update(ref(database, `games/${roomId}/players/player2`), {
              name: playerName,
              connected: true
            });
            update(ref(database, `games/${roomId}/gameState`), {
              status: 'playing'
            });
            localStorage.setItem('playerName', playerName);
            localStorage.setItem('playerNumber', 'player2');
            navigate(`/room/${roomId}`);
          }
        });
      });
    } catch (err) {
      setError('فشل الانضمام للغرفة');
    }
  };

  if (loading) {
    return <div className="loading-message arabic-text">{arabicText.loading}...</div>;
  }

  if (error) {
    return <div className="error-message arabic-text">{error}</div>;
  }

  return (
    <div className="lobby-container arabic-text">
      <h1>{arabicText.lobbyTitle || 'اللوبي'}</h1>
      {openGames.length === 0 ? (
        <p>{arabicText.noOpenGames || 'لا توجد ألعاب مفتوحة حالياً.'}</p>
      ) : (
        <ul className="game-list">
          {openGames.map((game) => (
            <li key={game.id} className="game-list-item">
              <span>
                {arabicText.gameHost || 'المضيف'}: {game.players?.player1?.name || '...'}
              </span>
              <button
                onClick={() => handleJoinGame(game.id)}
                className="join-button small-join-button"
              >
                {arabicText.join || 'انضم'}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button onClick={() => navigate('/')} className="return-home-button">
        {arabicText.returnHome || 'العودة للرئيسية'}
      </button>
    </div>
  );
};

export default Lobby;