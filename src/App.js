import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from "firebase/auth"; // Removed unused getAuth
// Database related imports might be needed elsewhere, but not for auth setup here.
import Home from './Home';
import GameRoom from './GameRoom';
import Lobby from './Lobby';
import BestPlayer from './BestPlayer';
import Login from './Login';
import { auth, fetchUserCoins, subscribeToUserCoins, arabicText } from './Util'; // Add subscribeToUserCoins import
import './App.css';
// Removed Login.css import as styles are now in App.css or inline

function App() {
  const [user, setUser] = useState(null); // State for Firebase user object
  const [isLoading, setIsLoading] = useState(true); // State to handle initial auth check
  const [coins, setCoins] = useState(0); // State for user coins

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch coins from database (initial fetch)
        const userCoins = await fetchUserCoins(firebaseUser.uid);
        setCoins(userCoins);
      } else {
        setUser(null);
        setCoins(0);
      }
      setIsLoading(false); // Finished initial auth check
    });

    // Subscribe to real-time coin updates when user is logged in
    let unsubscribeCoins = null;
    if (user && user.uid) {
      unsubscribeCoins = subscribeToUserCoins(user.uid, (updatedCoins) => {
        setCoins(updatedCoins);
      });
    }

    // Cleanup subscriptions on unmount or user change
    return () => {
      unsubscribeAuth();
      if (unsubscribeCoins) unsubscribeCoins();
    };
  }, [user]); // Re-run effect if user changes

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
    const navigate = useNavigate();

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
      <>
          <header className="main-header" dir="rtl">
          <div className="header-content">
            <span className="header-user-info">{arabicText.welcome}, {user.displayName || user.email || arabicText.guest}! {arabicText.coins || 'النقاط'}: {coins}</span>
            <div className="coin-display">
              <svg className="coin-icon" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                <circle cx="256" cy="256" r="240" fill="#FFC107" stroke="#F57C00" strokeWidth="20"/>
                <path d="M280 348V164c30 5 47 24 47 45h42c0-45-35-76-89-85v-26h-44v26c-54 9-89 40-89 85 0 46 35 72 89 81v84c-30-5-47-24-47-45h-42c0 45 35 76 89 85v26h44v-26c54-9 89-40 89-85 0-46-35-72-89-81zm-44-124c-30-9-45-23-45-46 0-21 17-40 45-45v91zm44 124v-91c30 9 45 23 45 46 0 21-17 40-45 45z" fill="#FFD54F"/>
              </svg>
              <span>{coins}</span>
            </div> <div className="header-actions">
              <button className="logout-button" onClick={handleLogout}>{arabicText.logout || 'تسجيل الخروج'}</button>
              <button className="logout-button" onClick={() => navigate('/')}>{arabicText.returnHome || 'الرئيسية'}</button>
            </div>
          </div>
        </header>
        <main className="main-content">
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
        </main>
      </>
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