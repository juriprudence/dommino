import React from 'react';
import { arabicText } from './util';

const JoinDialog = ({ newPlayerName, setNewPlayerName, joinGame }) => (
  <div className="join-dialog">
    <h2 className="arabic-text">{arabicText.joinGame}</h2>
    <input
      type="text"
      placeholder={arabicText.enterName}
      value={newPlayerName}
      onChange={(e) => setNewPlayerName(e.target.value)}
      className="player-name-input arabic-input"
      dir="rtl"
    />
    <button onClick={joinGame} className="join-button arabic-text">{arabicText.joinGame}</button>
  </div>
);

export default JoinDialog;
