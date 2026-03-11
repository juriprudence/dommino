import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchLeaderboard, auth, db, generateDominoTiles, shuffleTiles } from './Util';
import { ref, push, set } from 'firebase/database';

const Profile = ({ user, coins, text, language }) => {
    const { uid } = useParams();
    const [profileData, setProfileData] = useState(null);
    const [totalWins, setTotalWins] = useState(0);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const isOwnProfile = !uid || uid === user.uid;

    useEffect(() => {
        setLoading(true);
        fetchLeaderboard((data) => {
            if (data && typeof data === 'object') {
                const entries = Object.entries(data);
                const targetUid = uid || user.uid;

                const userEntry = entries.find(([name, info]) => info.uid === targetUid);

                if (userEntry) {
                    setTotalWins(userEntry[1].points || 0);
                    setProfileData({
                        displayName: userEntry[0],
                        uid: targetUid,
                    });
                } else if (isOwnProfile) {
                    setProfileData({
                        displayName: user.displayName,
                        uid: user.uid,
                    });
                }
            }
            setLoading(false);
        });
    }, [uid, user.uid, user.displayName, isOwnProfile]);

    const handleChallenge = async () => {
        if (!profileData || isOwnProfile) return;

        try {
            const gamesRef = ref(db, 'games');
            const newGameRef = push(gamesRef);
            const gameId = newGameRef.key;

            const tiles = generateDominoTiles();
            const shuffledTiles = shuffleTiles(tiles);

            const player1Tiles = shuffledTiles.slice(0, 7);
            const player2Tiles = shuffledTiles.slice(7, 14);
            const boneyard = shuffledTiles.slice(14);

            const gameData = {
                players: {
                    player1: {
                        name: user.displayName,
                        uid: user.uid,
                        tiles: player1Tiles,
                        connected: true
                    },
                    player2: {
                        name: profileData.displayName,
                        uid: profileData.uid,
                        tiles: player2Tiles,
                        connected: false
                    }
                },
                gameState: {
                    status: 'waiting',
                    currentPlayerIndex: 0,
                    board: [],
                    boneyard: boneyard,
                    timestamp: Date.now(),
                    winner: null,
                    message: language === 'ar' ? `تحدي إلى ${profileData.displayName}` : `Challenge to ${profileData.displayName}`,
                    gameMode: 'multiplayer',
                    scores: { player1: 0, player2: 0 },
                    betAmount: 0
                }
            };

            await set(newGameRef, gameData);
            navigate(`/room/${gameId}`);
        } catch (error) {
            console.error("Challenge error:", error);
            alert("Failed to create challenge.");
        }
    };

    if (loading) return <div className="loading-container">{text.loading}</div>;

    return (
        <div className={`profile-container ${language === 'ar' ? 'rtl' : ''}`}>
            <div className="profile-card">
                <div className="profile-header">
                    <div className="profile-avatar">
                        {isOwnProfile && user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName} />
                        ) : (
                            <div className="avatar-placeholder">
                                {isOwnProfile ? (user.displayName ? user.displayName.charAt(0).toUpperCase() : 'P') : (profileData?.displayName ? profileData.displayName.charAt(0).toUpperCase() : 'P')}
                            </div>
                        )}
                    </div>
                    <h2>{isOwnProfile ? (user.displayName || text.guest) : profileData?.displayName}</h2>
                    {isOwnProfile && <p className="user-email">{user.email}</p>}
                </div>

                <div className="profile-stats">
                    <div className="stat-item">
                        <span className="stat-label">{text.totalWins}</span>
                        <span className="stat-value">{totalWins}</span>
                    </div>
                    {isOwnProfile && (
                        <div className="stat-item">
                            <span className="stat-label">{text.coins}</span>
                            <div className="stat-value coin-val">
                                <svg className="coin-icon" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="256" cy="256" r="240" fill="#FFC107" stroke="#F57C00" strokeWidth="20" />
                                    <path d="M280 348V164c30 5 47 24 47 45h42c0-45-35-76-89-85v-26h-44v26c-54 9-89 40-89 85 0 46 35 72 89 81v84c-30-5-47-24-47-45h-42c0 45 35 76 89 85v26h44v-26c54-9 89-40 89-85 0-46-35-72-89-81zm-44-124c-30-9-45-23-45-46 0-21 17-40 45-45v91zm44 124v-91c30 9 45 23 45 46 0 21-17 40-45 45z" fill="#FFD54F" />
                                </svg>
                                <span>{coins}</span>
                            </div>
                        </div>
                    )}
                </div>

                {!isOwnProfile && profileData && (
                    <button className="start-game-button" onClick={handleChallenge} style={{ marginBottom: '15px' }}>
                        {text.challenge}
                    </button>
                )}

                <button className="return-home-button" onClick={() => navigate(-1)} style={{ marginBottom: '10px', background: 'var(--secondary-color)', color: 'var(--dark-color)' }}>
                    {text.back}
                </button>

                <button className="return-home-button" onClick={() => navigate('/')}>
                    {text.returnHome}
                </button>
            </div>
        </div>
    );
};

export default Profile;
