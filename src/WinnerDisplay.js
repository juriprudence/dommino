import React, { useEffect, useState } from 'react';
import { arabicText } from './Util'; // Corrected casing
import DominoDots from './DominoDots';

const WinnerDisplay = ({ winner, onNewGame, isTie }) => {
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
        <h2 className="arabic-text">{arabicText.gameOver}</h2>
        
        {isTie ? (
          <div className="tie-message">
            <p className="arabic-text">{arabicText.gameTied}</p>
          </div>
        ) : (
          <div className="winner-info">
            <p className="arabic-text">{winner.name} {arabicText.wins}</p>
            
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
          {arabicText.newGame}
        </button>
      </div>
    </div>
  );
};

export default WinnerDisplay;