import React from 'react';

const PrivacyPolicy = ({ text, language }) => {
    return (
        <div className="page-container" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <h1>{text.privacyTitle}</h1>
            <div className="content-section">
                <p>This Privacy Policy describes how your personal information is collected, used, and shared when you visit or play at our Domino Game.</p>
                <h2>PERSONAL INFORMATION WE COLLECT</h2>
                <p>When you register, we collect certain information from you, including your name, email address, and optional profile data. We also use Firebase for authentication and database management.</p>
                <h2>HOW DO WE USE YOUR PERSONAL INFORMATION?</h2>
                <p>We use the information we collect to maintain your game account, track your scores on the leaderboard, and manage your coin balance.</p>
                <h2>DATA RETENTION</h2>
                <p>When you register through the game, we will maintain your Registration Information for our records unless and until you ask us to delete this information.</p>
            </div>
            <style>{`
        .page-container {
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
          line-height: 1.6;
        }
        h1 { color: var(--primary-color); border-bottom: 2px solid #eee; padding-bottom: 0.5rem; }
        h2 { margin-top: 1.5rem; font-size: 1.2rem; }
        .content-section { background: #fff; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      `}</style>
        </div>
    );
};

export default PrivacyPolicy;
