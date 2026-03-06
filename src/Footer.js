import React from 'react';
import { useNavigate } from 'react-router-dom';

const Footer = ({ text, language }) => {
    const navigate = useNavigate();

    return (
        <footer className="main-footer" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="footer-content">
                <div className="footer-links">
                    <button onClick={() => navigate('/')}>{text.footerHome}</button>
                    <button onClick={() => navigate('/about')}>{text.footerAbout}</button>
                    <button onClick={() => navigate('/contact')}>{text.footerContact}</button>
                    <button onClick={() => navigate('/privacy')}>{text.footerPrivacy}</button>
                    <button onClick={() => navigate('/terms')}>{text.footerTerms}</button>
                </div>
                <p className="copyright-text">{text.copyright}</p>
            </div>
            <style>{`
        .main-footer {
          background-color: #1a1a1a;
          color: #ffffff;
          padding: 2rem 1rem;
          margin-top: 3rem;
          text-align: center;
        }
        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
        }
        .footer-links {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }
        .footer-links button {
          background: none;
          border: none;
          color: #aaa;
          cursor: pointer;
          font-size: 0.9rem;
          transition: color 0.3s;
        }
        .footer-links button:hover {
          color: #fff;
        }
        .copyright-text {
          color: #666;
          font-size: 0.8rem;
          margin: 0;
        }
      `}</style>
        </footer>
    );
};

export default Footer;
