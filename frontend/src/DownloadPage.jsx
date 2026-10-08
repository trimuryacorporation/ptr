import React from 'react';
import { Download, Globe, Smartphone, FileDown, FolderOpen, LogIn } from 'lucide-react';
import BrandLogo from './BrandLogo';
import './DownloadPage.css';

const steps = [
  { icon: FileDown, title: 'Download the app', text: 'Tap Download APK and save the file to your Android phone.' },
  { icon: FolderOpen, title: 'Open & install', text: 'Open Trimurya-Participant.apk from Downloads. If prompted, allow your browser to install the app.' },
  { icon: LogIn, title: 'Sign in to your workspace', text: 'Open Trimurya Participant and sign in with your registered email address or mobile number.' }
];

export default function DownloadPage() {
  return <div className="download-page">
    <header className="download-header">
      <a href="/" className="download-brand" aria-label="Trimurya Corporation home"><BrandLogo/></a>
      <span className="download-header-divider" aria-hidden="true"/>
      <span className="download-header-label">Participant workspace</span>
      <a className="download-web-link" href="/login"><Globe size={17} aria-hidden="true"/>Open web workspace</a>
    </header>
    <main className="download-main">
      <div className="download-section-label"><span aria-hidden="true"/>APPLICATION DOWNLOAD</div>
      <section className="download-hero" aria-labelledby="download-heading">
        <div className="download-intro">
          <span className="download-platform"><Smartphone size={15} aria-hidden="true"/>FOR ANDROID</span>
          <h1 id="download-heading">Your recording<br/>workspace.<br/><span>Ready to go.</span></h1>
          <p>Download Trimurya Participant to access your recording workspace from your Android phone.</p>
          <div className="download-corporate-line"><span aria-hidden="true"/>Built for Trimurya participants</div>
        </div>
        <section className="download-app-card" aria-labelledby="download-app-title">
          <div className="download-card-heading"><span>ANDROID APPLICATION</span><Smartphone size={18} aria-hidden="true"/></div>
          <div className="download-app-identity"><img src="/images/trimurya-icon.png" alt="Trimurya Corporation app logo" width="96" height="96"/><div><h2 id="download-app-title">Trimurya<br/>Participant</h2><p>By Trimurya Corporation</p></div></div>
          <dl className="download-file-details"><div><dt>Platform</dt><dd>Android</dd></div><div><dt>File format</dt><dd>APK</dd></div><div><dt>Access</dt><dd>Participants</dd></div></dl>
          <a className="download-primary" href="/downloads/Trimurya-Participant.apk" download="Trimurya-Participant.apk"><Download size={20} aria-hidden="true"/>Download APK</a>
          <div className="download-other-device"><Globe size={18} aria-hidden="true"/><p>Using an iPhone or a computer?<br/><a href="/login">Continue in your browser</a></p></div>
        </section>
      </section>
      <section className="download-training" aria-labelledby="download-training-title">
        <div className="download-training-copy">
          <span className="download-overline">PARTICIPANT TRAINING</span>
          <h2 id="download-training-title">Hindi training video</h2>
          <p>Watch the Hindi training video before you begin. Press play to watch here. English captions are requested when available; use the player settings to select or auto-translate captions.</p>
          <span className="download-training-language">Hindi audio</span>
          <a href="https://www.youtube.com/watch?v=oc1vT63Prd0" target="_blank" rel="noopener noreferrer" className="download-training-link">Watch on YouTube</a>
        </div>
        <div className="download-training-player">
          <iframe
            src="https://www.youtube-nocookie.com/embed/oc1vT63Prd0?hl=en&rel=0&playsinline=1&cc_lang_pref=en&cc_load_policy=1"
            title="Trimurya Participant - Hindi training video"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </section>
      <section className="download-install" aria-labelledby="download-install-title">
        <div className="download-install-heading"><div><span className="download-overline">GETTING STARTED</span><h2 id="download-install-title">Set up in three simple steps.</h2></div><span className="download-install-subtitle">Download. Install. Sign in.</span></div>
        <ol className="download-steps">{steps.map(({icon: Icon, title, text}, index) => <li key={title}><div className="download-step-top"><span className="download-step-number">0{index + 1}</span><Icon size={23} aria-hidden="true"/></div><h3>{title}</h3><p>{text}</p></li>)}</ol>
      </section>
    </main>
    <footer className="download-footer"><span>Trimurya Corporation</span><span>Create Â· Preserve Â· Transform</span><a href="/login">Website login</a></footer>
  </div>;
}
