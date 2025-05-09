import React from 'react';
import DominoDots from './DominoDots';

const BoardArea = React.forwardRef(({ board, text }, ref) => (
  <div className="board-area" ref={ref}>
    {board && board.length > 0 ? (
      <div className="board-tiles">
        {board.map((tile, index) => (
          <div key={`board-${index}`} className="board-tile">
            <div className={`domino ${tile.orientation} ${tile.flipped ? 'flipped' : ''}`}>
              <div className="domino-half">
                <DominoDots value={tile.left} />
              </div>
              <div className="domino-half">
                <DominoDots value={tile.right} />
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="arabic-text">{text.noTiles}</p>
    )}
  </div>
));

export default BoardArea;
