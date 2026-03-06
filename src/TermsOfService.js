import React from 'react';

const TermsOfService = ({ text, language }) => {
    return (
        <div className="page-container" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <h1>{text.termsTitle}</h1>
            <div className="content-section">
                <h2>1. OVERVIEW</h2>
                <p>This website is operated by Domino Game Team. Throughout the site, the terms “we”, “us” and “our” refer to the Domino Game Team.</p>
                <h2>2. ONLINE GAME TERMS</h2>
                <p>By agreeing to these Terms of Service, you represent that you are at least the age of majority in your state or province of residence.</p>
                <h2>3. ACCURACY, COMPLETENESS AND TIMELINESS OF INFORMATION</h2>
                <p>We are not responsible if information made available on this site is not accurate, complete or current. The material on this site is provided for general information only.</p>
                <h2>4. MODIFICATIONS TO THE SERVICE AND PRICES</h2>
                <p>Prices for our game items (coins) are subject to change without notice.</p>
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

export default TermsOfService;
