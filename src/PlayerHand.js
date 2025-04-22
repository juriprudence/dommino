import React from 'react';
import DominoDots from './DominoDots';
import { canPlayTile } from './util';

const PlayerHand = ({ tiles, selectedTile, onTileSelect, board, arabicText }) => (
  <div className="player-hand">
    <h3 className="arabic-text">{arabicText.yourTiles}</h3>
    <div className="tiles">
      {(tiles || []).map((tile, index) => {
        let flipped = false;
        if (selectedTile && selectedTile.index === index) {
          const { needsFlip } = canPlayTile(tile, board);
          flipped = !!needsFlip;
        }
        return (
          <div
            key={`hand-${index}`}
            className={`hand-tile ${selectedTile && selectedTile.index === index ? 'selected' : ''}`}
            onClick={() => onTileSelect(tile, index)}
          >
            <div className={`domino${flipped ? ' flipped' : ''}`}>
              <div className="domino-half">
                <DominoDots value={tile.left} />
              </div>
              <div className="domino-half">
                <DominoDots value={tile.right} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default PlayerHand;
