import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import Home from './Home';
import GameRoom from './GameRoom';
import { firebaseConfig } from './util';
import './App.css';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

function App() {
  useEffect(() => {
    // Test Firebase connection
    console.log("Firebase initialized");
    const connectionRef = ref(database, '.info/connected');
    onValue(connectionRef, (snap) => {
      if (snap.val() === true) {
        console.log('Connected to Firebase');
      } else {
        console.log('Not connected to Firebase');
      }
    });
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomId" element={<GameRoom />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;