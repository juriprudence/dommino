import React from 'react';

// Domino Dot Display Component
const DominoDots = ({ value }) => {
  const renderDots = () => {
    switch (value) {
      case 0:
        return <div className="dots-container empty"></div>;
      case 1:
        return (
          <div className="dots-container one">
            <span className="dot center"></span>
          </div>
        );
      case 2:
        return (
          <div className="dots-container two">
            <span className="dot top-right"></span>
            <span className="dot bottom-left"></span>
          </div>
        );
      case 3:
        return (
          <div className="dots-container three">
            <span className="dot top-right"></span>
            <span className="dot center"></span>
            <span className="dot bottom-left"></span>
          </div>
        );
      case 4:
        return (
          <div className="dots-container four">
            <span className="dot top-left"></span>
            <span className="dot top-right"></span>
            <span className="dot bottom-left"></span>
            <span className="dot bottom-right"></span>
          </div>
        );
      case 5:
        return (
          <div className="dots-container five">
            <span className="dot top-left"></span>
            <span className="dot top-right"></span>
            <span className="dot center"></span>
            <span className="dot bottom-left"></span>
            <span className="dot bottom-right"></span>
          </div>
        );
      case 6:
        return (
          <div className="dots-container six">
            <span className="dot top-left"></span>
            <span className="dot top-right"></span>
            <span className="dot middle-left"></span>
            <span className="dot middle-right"></span>
            <span className="dot bottom-left"></span>
            <span className="dot bottom-right"></span>
          </div>
        );
      default:
        return null;
    }
  };

  return renderDots();
};

export default DominoDots;