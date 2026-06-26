'use client';
import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

export default function Home() {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  // စမ်းသပ်ရန် အသုံးပြုထားသော Live Stream Link ဖြစ်သည်။ 
  // နောက်ပိုင်းတွင် မိမိပြသလိုသည့် ပွဲစဉ် Live `.m3u8` Link ဖြင့် လဲလှယ်နိုင်သည်။
  const liveStreamUrl = "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8";

  useEffect(() => {
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement('video-js');
      videoElement.classList.add('vjs-big-play-centered', 'vjs-theme-city');
      videoRef.current.appendChild(videoElement);

      const player = playerRef.current = videojs(videoElement, {
        autoplay: true,
        controls: true,
        responsive: true,
        fluid: true,
        sources: [{
          src: liveStreamUrl,
          type: 'application/x-mpegURL'
        }]
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-emerald-500 tracking-wider">LIVE FOOTBALL</h1>
          <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold animate-pulse">
            ● SERVER ONLINE
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Video Player & Ad Space */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video Player Box */}
          <div className="bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800">
            <div ref={videoRef} />
          </div>

          {/* Banner Ad Space (လုပ်ငန်းကြော်ငြာရန် နေရာ) */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 h-24 rounded-xl flex items-center justify-center p-4 shadow-lg">
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest text-emerald-100 font-bold">Sponsored Advertisement</p>
              <h2 className="text-lg md:text-xl font-black text-white">သင့်လုပ်ငန်းကြော်ငြာများကို ဤနေရာတွင် စျေးနှုန်းချိုသာစွာဖြင့် ထည့်သွင်းနိုင်ပါသည်</h2>
            </div>
          </div>
        </div>

        {/* Right Side: Match Info & Live Chat */}
        <div className="space-y-4">
          {/* Match Info Box */}
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 h-[300px] flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold border-b border-slate-800 pb-2 text-slate-300">Live Match Info</h3>
              <p className="text-sm text-slate-400 mt-2">လက်ရှိပြသနေသည့်ပွဲစဉ်- <span className="text-white font-semibold">စမ်းသပ်ထုတ်လွှင့်မှု</span></p>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center text-xs text-slate-500">
              Live Chat စနစ်အား ဤနေရာတွင် ထည့်သွင်းပါမည်။
            </div>
          </div>

          {/* Side Ad Box */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 text-center flex flex-col justify-center items-center h-[180px]">
            <p className="text-slate-500 text-xs mb-2">ADVERTISEMENT</p>
            <div className="w-full h-full bg-slate-800/50 rounded-lg flex items-center justify-center border border-dashed border-slate-700">
              <span className="text-sm text-slate-400">Side Banner Ads</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}