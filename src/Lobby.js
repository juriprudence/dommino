import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDatabase, ref, onValue, update, get } from 'firebase/database';
import { arabicText } from './Util'; // Corrected casing

// Accept user and coins as props
const Lobby = ({ user, coins }) => {
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
    // Check if user is authenticated
    if (!user) {
      setError('يجب تسجيل الدخول للانضمام إلى اللعبة');
      navigate('/login');
      return;
    }

    try {
      // Get current game data
      const gameRef = ref(database, `games/${roomId}`);
      const snapshot = await get(gameRef);
      const game = snapshot.val();
      
      if (!game) {
        setError('اللعبة غير موجودة أو تمت إزالتها');
        return;
      }

      // Get player1's information
      const player1 = game.players?.player1;
      if (!player1) {
        setError('معلومات اللاعب الأول غير موجودة');
        return;
      }

      // Check if player1 and current user have the same email (or UID as fallback)
      if (player1.uid === user.uid || player1.email === user.email) {
        setError('لا يمكنك الانضمام إلى لعبتك الخاصة');
        return;
      }

      const betAmount = game.gameState?.betAmount || 0;

      // Check bet requirements if applicable
      if (betAmount > 0 && coins < betAmount) {
        setError(`تحتاج على الأقل ${betAmount} عملات للانضمام إلى هذه اللعبة. رصيدك: ${coins}.`);
        return;
      }

      // All checks passed, join as player2
      const playerName = user.displayName || user.email?.split('@')[0] || 'لاعب';
      
      // Update player2 information
      await update(ref(database, `games/${roomId}/players/player2`), {
        name: playerName,
        uid: user.uid,
        email: user.email || null, // Store email for future reference
        connected: true
      });
      
      // Update game state
      await update(ref(database, `games/${roomId}/gameState`), {
        status: 'playing',
        lastActive: Date.now()
      });
      
      // Navigate to game room
      navigate(`/room/${roomId}`);
      
    } catch (err) {
      console.error("Error joining game:", err);
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
                {/* Display bet amount if greater than 0 */}
                {game.gameState?.betAmount > 0 && (
                    <span style={{ marginLeft: '15px', color: 'gold', fontWeight: 'bold' }}>
                        الرهان: {game.gameState.betAmount} <i className="fas fa-coins"></i>
                    </span>
                )}
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