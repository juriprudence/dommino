import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from "firebase/auth"; // Removed unused getAuth
// Database related imports might be needed elsewhere, but not for auth setup here.
import Home from './Home';
import GameRoom from './GameRoom';
import Lobby from './Lobby';
import BestPlayer from './BestPlayer';
import Login from './Login';
import Footer from './Footer';
import AboutUs from './AboutUs';
import ContactUs from './ContactUs';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfService from './TermsOfService';
import { auth, subscribeToUserCoins, getText } from './Util'; // Import getText, remove arabicText and fetchUserCoins
import './App.css';
// Removed Login.css import as styles are now in App.css or inline

function App() {
  const [user, setUser] = useState(null); // State for Firebase user object
  const [isLoading, setIsLoading] = useState(true); // State to handle initial auth check
  const [coins, setCoins] = useState(0); // State for user coins
  const [language, setLanguage] = useState('en'); // State for current language ('ar', 'en', 'fr'), default 'en'

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => { // Remove async
      if (firebaseUser) {
        setUser(firebaseUser);
        // No initial fetch needed here, subscription will handle it
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

  // Get the current text object based on the selected language
  const text = getText(language);

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
      return <Login language={language} text={text} />; // Pass language and text
    }

    // If user is logged in, show the main application routes
    return (
      <>
        <header className="main-header" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <div className="header-content">
            <span className="header-user-info">{text.welcome}, {user.displayName || user.email || text.guest}! {text.coins}: {coins}</span>
            <div className="coin-display">
              <svg className="coin-icon" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                <circle cx="256" cy="256" r="240" fill="#FFC107" stroke="#F57C00" strokeWidth="20" />
                <path d="M280 348V164c30 5 47 24 47 45h42c0-45-35-76-89-85v-26h-44v26c-54 9-89 40-89 85 0 46 35 72 89 81v84c-30-5-47-24-47-45h-42c0 45 35 76 89 85v26h44v-26c54-9 89-40 89-85 0-46-35-72-89-81zm-44-124c-30-9-45-23-45-46 0-21 17-40 45-45v91zm44 124v-91c30 9 45 23 45 46 0 21-17 40-45 45z" fill="#FFD54F" />
              </svg>

              <span>{coins}</span>
            </div>
            <div className="header-actions">
              {/* Language Switcher */}
              <div className="language-switcher">
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  aria-label="Select language"
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="ar">العربية</option>
                </select>
              </div>
              <button className="logout-button" onClick={handleLogout}>{text.logout}</button>
              <button className="logout-button" onClick={() => navigate('/')}>{text.returnHome}</button>
            </div>
          </div>
        </header>
        <main className="main-content">
          <Routes>
            {/* Pass user, coins, language, and text to Home */}
            <Route path="/" element={<Home user={user} coins={coins} language={language} text={text} onLanguageChange={setLanguage} />} />
            {/* Pass user, coins, language, and text to GameRoom */}
            <Route path="/room/:roomId" element={<GameRoom user={user} coins={coins} language={language} text={text} onLanguageChange={setLanguage} />} />
            {/* Pass user, coins, language, and text to Lobby */}
            <Route path="/lobby" element={<Lobby user={user} coins={coins} language={language} text={text} onLanguageChange={setLanguage} />} />
            {/* Pass user, coins, language, and text to BestPlayer */}
            <Route path="/best-player" element={<BestPlayer user={user} coins={coins} language={language} text={text} onLanguageChange={setLanguage} />} />

            {/* New routes for AdSense fix */}
            <Route path="/about" element={<AboutUs text={text} language={language} />} />
            <Route path="/contact" element={<ContactUs text={text} language={language} />} />
            <Route path="/privacy" element={<PrivacyPolicy text={text} language={language} />} />
            <Route path="/terms" element={<TermsOfService text={text} language={language} />} />

            {/* Redirect any other path to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer text={text} language={language} />
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