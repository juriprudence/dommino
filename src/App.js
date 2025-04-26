import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth"; // Import auth and signOut functions
// Database related imports might be needed elsewhere, but not for auth setup here.
import Home from './Home';
import GameRoom from './GameRoom';
import Lobby from './Lobby';
import BestPlayer from './BestPlayer';
import Login from './Login';
import { auth } from './Util'; // Corrected import casing
import './App.css';
// Removed Login.css import as styles are now in App.css or inline

// Define initial free coins (can be adjusted)
const INITIAL_COINS = 100;

function App() {
  const [user, setUser] = useState(null); // State for Firebase user object
  const [isLoading, setIsLoading] = useState(true); // State to handle initial auth check
  const [coins, setCoins] = useState(0); // State for user coins

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in (anonymously in this case)
        console.log('User is signed in:', firebaseUser);
        setUser(firebaseUser);
        // TODO: Fetch coins from database or set initial coins
        setCoins(INITIAL_COINS); // Set initial coins for now
      } else {
        // User is signed out
        console.log('User is signed out');
        setUser(null);
        setCoins(0);
      }
      setIsLoading(false); // Finished initial auth check
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Logout handler
  const handleLogout = () => {
    signOut(auth).then(() => {
      console.log('User signed out successfully');
      // The onAuthStateChanged listener will handle setting user to null
    }).catch((error) => {
      console.error('Sign out error:', error);
      // Handle errors here, such as displaying a notification
    });
  };

  // Show loading indicator while checking auth state
  if (isLoading) {
    // Optional: Add a loading spinner or message here
    return <div>Loading...</div>;
  }

  // Wrap the main application logic in a component to use hooks
  const MainApp = () => {
    const location = useLocation();

    // If user is not logged in
    if (!user) {
      // If trying to access a game room, redirect to login with room info
      if (location.pathname.startsWith('/room/')) {
        const roomId = location.pathname.split('/')[2];
        return <Navigate to={`/login?joinRoom=${roomId}`} replace />;
      }
      // Otherwise, show the standard login page
      return <Login />;
    }

    // If user is logged in, show the main application routes
    return (
      <div className="App">
        {/* Display user info and logout button */}
        <div style={{ padding: '10px', borderBottom: '1px solid #ccc', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Welcome, {user.displayName || user.email || 'User'}! Coins: {coins}</span>
          <button onClick={handleLogout} style={{ padding: '5px 10px' }}>Logout</button>
        </div>
        <Routes>
          {/* Pass user and coins to Home */}
          <Route path="/" element={<Home user={user} coins={coins} />} />
          {/* Pass user and coins to GameRoom */}
          <Route path="/room/:roomId" element={<GameRoom user={user} coins={coins} />} />
           {/* Pass user and coins to Lobby */}
          <Route path="/lobby" element={<Lobby user={user} coins={coins} />} />
           {/* Pass user and coins to BestPlayer */}
          <Route path="/best-player" element={<BestPlayer user={user} coins={coins} />} />
          {/* Redirect any other path to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    );
  };

  // Render the Router and the MainApp component
  return (
    <Router>
      <MainApp />
    </Router>
  );
}

export default App;