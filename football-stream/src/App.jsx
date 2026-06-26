import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

export default function App() {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  // Cloudflare Stream Live HLS Link အမှန်
  const liveStreamUrl = "https://customer-r5hepnmxap6rosu0.cloudflarestream.com/953ec3120a2c0bd9dcf35859df031fcb/manifest/video.m3u8";

  useEffect(() => {
    // Component စပွင့်ချိန်မှာ Player မရှိသေးရင် အသစ်ဆောက်မယ်
    if (videoRef.current && !playerRef.current) {
      const videoElement = document.createElement('video');
      videoElement.className = 'video-js vjs-big-play-centered vjs-theme-city';
      // iOS/Safari အတွက် Inline Play အလုပ်လုပ်စေရန်
      videoElement.setAttribute('playsinline', 'true');
      videoRef.current.appendChild(videoElement);

      const player = playerRef.current = videojs(videoElement, {
        autoplay: true,
        controls: true,
        responsive: true,
        fluid: true,
        preload: 'auto',
        liveui: true, // Live ပွဲစဉ်များအတွက် Time UI ကို ပိုမိုကောင်းမွန်စေရန်
        html5: {
          vhs: {
            overrideNative: true, // Browser တိုင်းမှာ Cloudflare HLS ကို မထစ်ဘဲ ဖတ်နိုင်ရန်
            fastQualityChange: true
          }
        },
        sources: [{
          src: liveStreamUrl,
          type: 'application/x-mpegURL'
        }]
      });

      // Error တက်ခဲ့ရင် Auto ပြန်ချိတ်ဆက်ပေးမည့် လုပ်ငန်းသုံး Error Handling စနစ်
      player.on('error', () => {
        console.log("Stream matching link testing or recovering...");
        setTimeout(() => {
          player.src({ src: liveStreamUrl, type: 'application/x-mpegURL' });
          player.load();
          player.play().catch(err => console.log("Autoplay waiting for user click"));
        }, 5000); // ၅ စက္ကန့်နေရင် လိုင်းပြန်ဆွဲမည်
      });
    }

    // CRITICAL CLEANUP: Component ပိတ်သွားရင် သို့မဟုတ် Refresh ဖြစ်ရင် Player Memory ကို သေချာဖျက်ပေးခြင်း
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [liveStreamUrl]);

  // သေသပ်လှပပြီး စနစ်ကျသော CSS Styles
  const styles = {
    container: { minHeight: '100vh', backgroundColor: '#020617', color: '#ffffff', fontFamily: 'sans-serif', margin: 0, padding: 0 },
    header: { backgroundColor: '#0f172a', padding: '20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    logo: { color: '#10b981', fontSize: '24px', fontWeight: 'bold', margin: 0 },
    badge: { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#34d399', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' },
    main: { maxWidth: '1200px', margin: '0 auto', padding: '20px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' },
    videoBox: { backgroundColor: '#000000', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e293b', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' },
    adBox: { background: 'linear-gradient(to right, #059669, #0d9488)', minHeight: '96px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginTop: '16px', cursor: 'pointer', padding: '10px', textAlign: 'center' },
    sidebar: { display: 'flex', flexDirection: 'column', gap: '16px' },
    infoBox: { backgroundColor: '#0f172a', borderRadius: '12px', padding: '20px', border: '1px solid #1e293b', height: '260px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
    sideAd: { backgroundColor: '#0f172a', borderRadius: '12px', padding: '20px', border: '1px solid #1e293b', height: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' },
    dashedBox: { width: '100%', height: '100%', border: '1px dashed #334155', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.logo}>LIVE FOOTBALL</h1>
        <div style={styles.badge}>● SERVER ONLINE</div>
      </header>

      <main style={styles.main}>
        <div>
          <div style={styles.videoBox}>
            {/* Video JS Player ကို ဝေ့ဝိုက်မသွားဘဲ ကွက်တိ Render ချမည့်နေရာ */}
            <div ref={videoRef} />
          </div>
          <div style={styles.adBox}>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#d1fae5' }}>Sponsored Advertisement</p>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '18px', color: '#ffffff' }}>သင့်လုပ်ငန်းကြော်ငြာများကို ဤနေရာတွင် ထည့်သွင်းနိုင်ပါသည်</h2>
          </div>
        </div>

        <div style={styles.sidebar}>
          <div style={styles.infoBox}>
            <div>
              <h3 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>Live Match Info</h3>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>လက်ရှိပြသနေသည့်ပွဲစဉ်- <span style={{ color: '#fff', fontWeight: 'bold' }}>စမ်းသပ်ထုတ်လွှင့်မှု</span></p>
            </div>
            <div style={{ backgroundColor: '#020617', padding: '10px', borderRadius: '8px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
              Live Chat စနစ်အား ဤနေရာတွင် ထည့်သွင်းပါမည်။
            </div>
          </div>

          <div style={styles.sideAd}>
            <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 8px 0' }}>ADVERTISEMENT</p>
            <div style={styles.dashedBox}>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>Side Banner Ads</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}