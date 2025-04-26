import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLeaderboard, arabicText } from './Util';

// Accept user and coins as props for consistency
const BestPlayer = ({ user, coins }) => {
  const [bestPlayer, setBestPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeaderboard((data) => {
      if (data) {
        // Find player with max points (excluding AI)
        const entries = Object.entries(data).filter(([name]) => name !== arabicText.aiPlayerName);
        if (entries.length > 0) {
          const sorted = entries.sort((a, b) => (b[1].points || 0) - (a[1].points || 0));
          setBestPlayer({ name: sorted[0][0], points: sorted[0][1].points || 0 });
        }
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="arabic-text">{arabicText.loading || 'جاري التحميل...'}</div>;

  return (
    <div className="best-player-screen arabic-text" style={{textAlign: 'center', marginTop: '40px'}}>
      <h1>{arabicText.bestPlayerTitle || 'أفضل لاعب'}</h1>
      {bestPlayer ? (
        <div style={{fontSize: '1.5em', margin: '30px 0'}}>
          <span>{bestPlayer.name}</span>
          <br />
          <span>{arabicText.wins || 'فوز'}: {bestPlayer.points}</span>
        </div>
      ) : (
        <div>{arabicText.noPlayers || 'لا يوجد لاعبون بعد.'}</div>
      )}
      <button className="return-home-button" onClick={() => navigate('/')}>{arabicText.returnHome || 'العودة للرئيسية'}</button>
    </div>
  );
};

export default BestPlayer;
