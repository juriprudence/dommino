import React, { useEffect, useState } from 'react';
import DominoDots from './DominoDots';

const WinnerDisplay = ({ winner, onNewGame, isTie, text, onShare, onShareMessenger }) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Show confetti when component mounts
    setShowConfetti(true);

    // Clean up confetti after 5 seconds
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="winner-display">
      {showConfetti && !isTie && (
        <div className="confetti-container">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                backgroundColor: `hsl(${Math.random() * 360}, 100%, 50%)`
              }}
            />
          ))}
        </div>
      )}

      <div className="winner-card">
        <h2 className="arabic-text">{text.gameOver}</h2>

        {isTie ? (
          <div className="tie-message">
            <p className="arabic-text">{text.gameTied}</p>
          </div>
        ) : (
          <div className="winner-info">
            <p className="arabic-text">{winner.name} {text.wins}</p>

            <div className="trophy-animation">
              <div className="trophy">
                <div className="domino-vertical">
                  <div className="domino-half">
                    <DominoDots value={6} />
                  </div>
                  <div className="domino-half">
                    <DominoDots value={6} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <button onClick={onNewGame} className="new-game-button arabic-text">
          {text.newGame}
        </button>
        <button
          onClick={onShare}
          className="facebook-share-button arabic-text"
          style={{
            backgroundColor: '#1877f2',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            marginTop: '10px',
            width: '100%',
            display: 'block'
          }}
        >
          {text.facebookShare || 'Share on Facebook'}
        </button>
        <button
          onClick={onShareMessenger}
          className="messenger-share-button arabic-text"
          style={{
            backgroundColor: '#0084ff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            marginTop: '10px',
            width: '100%',
            display: 'block'
          }}
        >
          {text.messengerShare || 'Share via Messenger'}
        </button>
      </div>
    </div>
  );
};

export default WinnerDisplay;