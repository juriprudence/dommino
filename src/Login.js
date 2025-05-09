import React, { useState, useEffect } from 'react';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  updateProfile
} from "firebase/auth";
import { auth, getUserCoins, setUserCoins } from './Util'; // Removed arabicText import
import './App.css'; // Use App.css for styling
import { useNavigate, useLocation } from 'react-router-dom';

function Login(props) {
  const [isLoginMode, setIsLoginMode] = useState(true); // true for login, false for register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [anonymousName, setAnonymousName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { text } = props; // Destructure text from props
  const location = useLocation();

  // Helper to get joinRoom param from URL
  function getJoinRoomId() {
    const params = new URLSearchParams(location.search);
    return params.get('joinRoom');
  }

  // --- Email/Password Handlers ---
  const handleEmailPasswordSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      let userCredential;
      if (isLoginMode) {
        // Login
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Signed in with email/password");
        // Auth state change will be handled by App.js
      } else {
        // Register
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters long.");
        }
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Set display name (using email part before '@' as default)
        const nameFromEmail = email.split('@')[0];
        await updateProfile(userCredential.user, {
          displayName: nameFromEmail
        });
        // Initialize coins for new registered user
        await setUserCoins(userCredential.user.uid, 100);
        console.log("Registered and signed in with email/password. Name set to:", nameFromEmail);
        // Auth state change will be handled by App.js
      }
      // After successful login, check for joinRoom param
      const joinRoomId = getJoinRoomId();
      if (joinRoomId) {
        navigate(`/room/${joinRoomId}`);
      }
    } catch (err) {
      console.error("Email/Password Auth Error:", err);
      setError(err.message || "Failed to authenticate. Please check your details.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Anonymous Login Handler ---
  const handleAnonymousSubmit = async (e) => {
    e.preventDefault();
    if (!anonymousName.trim()) {
      setError("Please enter a name to play anonymously.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await signInAnonymously(auth);
      await updateProfile(userCredential.user, {
        displayName: anonymousName.trim()
      });
      // Initialize coins for new anonymous user
      await setUserCoins(userCredential.user.uid, 100);
      console.log("Signed in anonymously. Name set to:", anonymousName.trim());
      // Auth state change will be handled by App.js

      // After successful anonymous login, check for joinRoom param
      const joinRoomId = getJoinRoomId();
      if (joinRoomId) {
        navigate(`/room/${joinRoomId}`);
      }
    } catch (err) {
      console.error("Anonymous Sign-in Error:", err);
      setError(err.message || "Failed to sign in anonymously. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Using home-container style for centering and background
    <div className="home-container">
      {/* Logo */}
      <div className="domino-logo" style={{ marginBottom: '30px' }}>
        <img src="/logo.png" alt="Domino Logo" className="login-logo" style={{ width: '120px', height: '120px' }} />
      </div>
<h1>{isLoginMode ? text.login : text.register} {text.or} {text.playAnonymously}</h1>

{error && <p className="error-message arabic-text">{error}</p>}


      {/* --- Email/Password Form --- */}
      <form onSubmit={handleEmailPasswordSubmit} className="start-game-form" style={{ marginBottom: '20px' }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={text.emailPlaceholder || "Email"} // Added placeholder text key
          required
          className="player-name-input" // Reusing input style
          aria-label="Email"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={text.passwordPlaceholder || "Password (min 6 chars for register)"} // Added placeholder text key
          required
          className="player-name-input" // Reusing input style
          aria-label="Password"
        />
        <button type="submit" className="start-game-button" disabled={isLoading}>
          {isLoading ? text.processing : (isLoginMode ? text.login : text.register)}
        </button>
        <button
          type="button"
          onClick={() => setIsLoginMode(!isLoginMode)}
          disabled={isLoading}
          style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', marginTop: '10px', fontSize: '0.9rem' }}
        >
          {isLoginMode ? text.needAccount : text.haveAccount}
        </button>
      </form>

      {/* Divider */}
      <p style={{ margin: '20px 0', fontWeight: 'bold', color: 'var(--dark-color)' }}>{text.or}</p>

      {/* --- Anonymous Login Form --- */}
      <form onSubmit={handleAnonymousSubmit} className="start-game-form">
         <input
          type="text"
          value={anonymousName}
          onChange={(e) => setAnonymousName(e.target.value)}
          placeholder={text.enterNamePlaceholder || "Enter Your Name"} // Added placeholder text key
          required
          className="player-name-input arabic-input" // Reusing input style + arabic alignment
          aria-label="Your Name for Anonymous Play"
        />
        <button type="submit" className="start-game-button" disabled={isLoading}>
          {isLoading ? text.joining : text.playAnonymously}
        </button>
      </form>
    </div>
  );
}

export default Login;