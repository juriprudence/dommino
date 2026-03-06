import React from 'react';

const AboutUs = ({ text, language }) => {
  return (
    <div className="page-container" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <h1>{text.aboutTitle}</h1>
      <article className="content-section">
        <p>{text.seoIntro}</p>
        <section>
          <h2>{text.seoHistoryTitle}</h2>
          <p>{text.seoHistoryDesc}</p>
        </section>
        <section>
          <h2>{text.seoRulesTitle}</h2>
          <p>{text.seoRulesDesc}</p>
        </section>
        <section>
          <h2>{text.seoVariationsTitle}</h2>
          <p>{text.seoVariationsDesc}</p>
        </section>
      </article>
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

export default AboutUs;
