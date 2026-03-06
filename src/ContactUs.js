import React from 'react';

const ContactUs = ({ text, language }) => {
    return (
        <div className="page-container" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <h1>{text.contactTitle}</h1>
            <section className="content-section">
                <p>If you have any questions, feedback, or need support with your account or game experience, feel free to contact us.</p>
                <address className="contact-info" style={{ fontStyle: 'normal' }}>
                    <h3>Email Support</h3>
                    <p><a href="mailto:support@elhabdomino.fun">support@elhabdomino.fun</a></p>
                    <h3>Response Time</h3>
                    <p>We typically respond within 24-48 hours during business days.</p>
                </address>
            </section>
            <style>{`
        .page-container {
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
          line-height: 1.6;
        }
        h1 { color: var(--primary-color); border-bottom: 2px solid #eee; padding-bottom: 0.5rem; }
        h3 { color: var(--primary-color); margin-bottom: 0.5rem; }
        .content-section { background: #fff; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .contact-info { margin-top: 1.5rem; padding: 1rem; background: #f9f9f9; border-left: 4px solid var(--primary-color); }
      `}</style>
        </div>
    );
};

export default ContactUs;
