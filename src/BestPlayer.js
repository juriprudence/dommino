import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLeaderboard } from './Util';

// Accept user and coins as props for consistency
const BestPlayer = ({ user, coins, text }) => {
  const [topPlayers, setTopPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeaderboard((data) => {
      if (data && typeof data === 'object') {
        const entries = Object.entries(data).filter(([name]) => name !== text.aiPlayerName);
        entries.sort((a, b) => (b[1].points || 0) - (a[1].points || 0));
        setTopPlayers(entries.slice(0, 3));
      } else {
        setTopPlayers([]);
      }
      setLoading(false);
    });
  }, [text.aiPlayerName]);

  if (loading) return <div className="arabic-text">{text.loading}</div>;

  return (
    <div className="best-player-screen arabic-text" style={{textAlign: 'center', marginTop: '40px'}}>
      <h1>{text.bestPlayer}</h1>
      {topPlayers.length > 0 ? (
        <div style={{fontSize: '1.2em', margin: '30px 0'}}>
          {topPlayers.map(([name, info], idx) => (
            <div key={name} style={{margin: '12px 0', fontWeight: idx === 0 ? 'bold' : 'normal'}}>
              <span style={{fontSize: '1.1em'}}>
                #{idx + 1} {name}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div>{text.noPlayers}</div>
      )}
      <button className="return-home-button" onClick={() => navigate('/')}>{text.returnHome}</button>
    </div>
  );
};

export default BestPlayer;
