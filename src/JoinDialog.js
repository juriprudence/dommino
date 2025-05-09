import React from 'react';

const JoinDialog = ({ newPlayerName, setNewPlayerName, joinGame, text }) => (
  <div className="join-dialog">
    <h2 className="arabic-text">{text.joinGame}</h2>
    <input
      type="text"
      placeholder={text.enterName}
      value={newPlayerName}
      onChange={(e) => setNewPlayerName(e.target.value)}
      className="player-name-input arabic-input"
      dir="rtl"
    />
    <button onClick={joinGame} className="join-button arabic-text">{text.joinGame}</button>
  </div>
);

export default JoinDialog;
