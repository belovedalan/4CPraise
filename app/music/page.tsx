"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";

type Item = { videoId: string; title: string; channel: string; thumb: string };

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadYouTubeIFrameAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT?.Player) return resolve();
    const existing = document.getElementById("yt-iframe-api");
    if (existing) {
      const t = setInterval(() => {
        if (window.YT?.Player) { clearInterval(t); resolve(); }
      }, 50);
      return;
    }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.id = "yt-iframe-api";
    document.body.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => resolve();
  });
}

type PlayMode = "LIST_LOOP" | "SINGLE_LOOP" | "SHUFFLE";

export default function MusicPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const [meta, setMeta] = useState("");
  const [q, setQ] = useState("");
  const [playMode, setPlayMode] = useState<PlayMode>("LIST_LOOP");
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const stateRef = useRef({ active, playMode, filtered: [] as { it: Item; idx: number }[] });
  const playerRef = useRef<any>(null);
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerReadyRef = useRef(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const mapped = items.map((it, idx) => ({ it, idx }));
    if (!s) return mapped;
    return mapped.filter(({ it }) => (it.title + " " + it.channel).toLowerCase().includes(s));
  }, [items, q]);

  const now = items[active];
  const activeId = now?.videoId;

  // ✅ 获取 YouTube 高清封面逻辑
  const highResThumb = useMemo(() => {
    if (!activeId) return "";
    return `https://i.ytimg.com/vi/${activeId}/maxresdefault.jpg`;
  }, [activeId]);

  useEffect(() => {
    stateRef.current = { active, playMode, filtered };
  }, [active, playMode, filtered]);

  const handlePlayNext = () => {
    const { active: curActive, playMode: curMode, filtered: curFiltered } = stateRef.current;
    if (curMode === "SINGLE_LOOP") {
      playerRef.current?.seekTo(0);
      playerRef.current?.playVideo();
      return;
    }
    if (curFiltered.length === 0) return;
    const currentInFilteredIdx = curFiltered.findIndex(f => f.idx === curActive);
    let nextIdx = (currentInFilteredIdx + 1) % curFiltered.length;
    if (curMode === "SHUFFLE") nextIdx = Math.floor(Math.random() * curFiltered.length);
    const nextItem = curFiltered[nextIdx];
    if (nextItem) setActive(nextItem.idx);
  };

  const handlePlayPrev = () => {
    const { active: curActive, filtered: curFiltered } = stateRef.current;
    if (curFiltered.length === 0) return;
    const currentInFilteredIdx = curFiltered.findIndex(f => f.idx === curActive);
    let prevIdx = (currentInFilteredIdx - 1 + curFiltered.length) % curFiltered.length;
    const prevItem = curFiltered[prevIdx];
    if (prevItem) setActive(prevItem.idx);
  };

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!playerReadyRef.current) return;
    const state = playerRef.current?.getPlayerState();
    if (state === 1) {
      playerRef.current?.pauseVideo();
    } else {
      playerRef.current?.playVideo();
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/playlist");
        const data = await r.json();
        const list = data.items || [];
        setItems(list);
        if (data.fetchedAt) setMeta(`最后更新：${new Date(data.fetchedAt).toLocaleString()}`);
        if (playerReadyRef.current && list.length > 0) playerRef.current?.cueVideoById(list[0].videoId);
      } catch (e) { setMeta(`数据同步中…`); }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!playerHostRef.current) return;
      await loadYouTubeIFrameAPI();
      if (cancelled || playerRef.current) return;

      playerRef.current = new window.YT.Player(playerHostRef.current, {
        height: "100%", width: "100%",
        playerVars: { 
          rel: 0, modestbranding: 1, controls: 0, 
          disablekb: 1, fs: 0, iv_load_policy: 3,
          autohide: 1, playsinline: 1, 
          origin: typeof window !== 'undefined' ? window.location.origin : '' 
        },
        events: {
          onReady: () => {
            playerReadyRef.current = true;
            const currentId = stateRef.current.filtered[0]?.it.videoId;
            if (currentId) playerRef.current.cueVideoById(currentId);
          },
          onStateChange: (event: any) => { 
            if (event.data === 0) handlePlayNext();
            if (event.data === 1) setTimeout(() => setVideoReady(true), 150); // 稍微延迟揭幕防止闪烁
            if (event.data === 3) setVideoReady(false);
            setIsPlaying(event.data === 1);
          }
        },
      });
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (activeId && playerReadyRef.current) {
      setVideoReady(false);
      playerRef.current?.loadVideoById(activeId);
    }
  }, [activeId]);

  return (
    <>
      <Head>
        <title>四海颂扬｜音乐事工</title>
        <link rel="icon" href="/logo.png" />
      </Head>

      <main className="page" onClick={() => {
        if (playerReadyRef.current && playerRef.current?.getPlayerState() !== 1) playerRef.current?.playVideo();
      }}>
        <style>{`
          :root{
            --line: rgba(255, 255, 255, 0.4);
            --accent: #6D28D9; --text: #111827;
            --font-display: "SF Pro Display", "PingFang SC", "Inter", system-ui, sans-serif;
            --mac-radius: 36px;
          }
          .page{ 
            min-height:100vh; padding: 24px; color:var(--text); 
            font-family: var(--font-display); -webkit-font-smoothing: antialiased;
            background: #F3F4F6;
          }
          .container{ max-width:1440px; margin:0 auto; display: flex; flex-direction: column; gap: 24px; }
          .glass { 
            position: relative;
            background: linear-gradient(135deg, rgba(255,255,255,0.65), rgba(255,255,255,0.4)),
                        radial-gradient(at 0% 0%, rgba(109,40,217,0.25), transparent 50%),
                        radial-gradient(at 100% 100%, rgba(224,231,255,0.5), transparent 50%);
            backdrop-filter: blur(45px) saturate(200%); 
            -webkit-backdrop-filter: blur(45px) saturate(200%); 
            border: 1px solid var(--line); border-radius: var(--mac-radius); box-shadow: 0 10px 40px rgba(0,0,0,0.02); overflow: hidden;
          }

          .playerWrapper { position: relative; width: 100%; padding-top: 56.25%; background: #000; overflow: hidden; }
          .videoOverlay {
            position: absolute; inset: 0; z-index: 10;
            background-size: cover; background-position: center;
            transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1); pointer-events: none;
          }
          .videoOverlay.hidden { opacity: 0; }
          /* ✅ 移除遮罩上的模糊滤镜，保持封面清晰 */

          .header{ padding:20px 32px; display:flex; align-items:center; }
          .logoWrap{ display:flex; align-items:center; gap:20px; }
          .brandTitle { font-size: 26px; font-weight: 900; letter-spacing: -1.2px; background: linear-gradient(180deg, #111827, #4B5563); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .sub{ margin:0; margin-top:4px; font-size:10px; letter-spacing:6px; color:var(--accent); opacity: 0.6; line-height:1; font-weight: 800; text-transform: uppercase; }
          .mainGrid{ display:grid; grid-template-columns: 2.1fr 0.9fr; gap:24px; align-items: start; margin-bottom: 8px; }
          .playerInner{ position:absolute; inset:0; z-index: 1; }
          .nowPlayingArea{ padding: 22px 28px; border-top: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: nowrap; }
          .titleContent { flex: 1; min-width: 0; }
          .nowLabel { font-size: 10px; font-weight: 900; color: var(--accent); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; opacity: 0.8; }
          .nowPlayingTitle { font-size: 20px; font-weight: 850; letter-spacing: -0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #111; }
          .playerControls { display: flex; align-items: center; gap: 24px; flex-shrink: 0; }
          .controlBtn { background: none; border: none; cursor: pointer; color: rgba(0,0,0,0.3); display: flex; align-items: center; transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1); }
          .controlBtn:hover { color: var(--accent); transform: scale(1.15); }
          .listHeaderArea{ padding: 18px 28px 14px; border-bottom: 1px solid var(--line); }
          .listTitleRow{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
          .listTitleInfo { display: flex; align-items: center; gap: 10px; }
          .listMainTitle { font-size: 18px; font-weight: 900; letter-spacing: -0.5px; }
          .listCounter { font-size: 11px; font-weight: 800; color: var(--accent); padding-top: 2px; }
          .toolbarInTitle{ display: flex; align-items: center; gap: 14px; }
          .iconBtn{ background: none; border: none; cursor: pointer; color: rgba(0,0,0,0.2); transition: all 0.3s ease; }
          .iconBtn.active{ color: var(--accent); transform: scale(1.1); }
          .searchInside{ display:flex; align-items:center; gap:12px; padding:10px 18px; border-radius:16px; background:rgba(255,255,255,0.4); border: 1px solid var(--line); }
          .searchInside input { border: none; outline: none; background: transparent; width: 100%; font-size: 14px; font-weight: 600; color: #111; }
          .scroll{ max-height: calc(100vh - 380px); min-height: 480px; overflow-y:auto; }
          .scroll::-webkit-scrollbar { width:4px; }
          .scroll::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.05); border-radius:10px; }
          .item{ display:grid; grid-template-columns: 36px 110px 1fr; gap:18px; padding:16px 28px; cursor:pointer; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); align-items:center; }
          .item:hover { background: rgba(255,255,255,0.2); transform: translateX(8px); }
          .item.active{ position:relative; background: transparent; }
          .item.active::before{ content:""; position:absolute; left:0; height:30%; width:5px; background:var(--accent); border-radius:0 10px 10px 0; }
          .trackIdx { font-size: 12px; font-weight: 800; color: rgba(0,0,0,0.15); font-variant-numeric: tabular-nums; transition: color 0.3s ease; }
          .item:hover .trackIdx { color: var(--accent); opacity: 0.8; }
          .item.active .trackIdx { color: var(--accent); opacity: 1; }
          .itemThumb{ width:110px; min-width:110px; height:62px; border-radius:14px; overflow:hidden; border: 1px solid rgba(0,0,0,0.03); background:#000; flex-shrink: 0; }
          .itemThumb img{ width: 100%; height: 100%; object-fit: cover; }
          .itemTitle { font-size: 14px; font-weight: 800; line-height: 1.45; color: #1f2937; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; letter-spacing: -0.2px; }
          .itemSub { font-size: 11px; color: rgba(0,0,0,0.3); font-weight: 700; margin-top: 4px; text-transform: uppercase; }
          @media (max-width:1024px){ 
            .page { padding: 12px 8px 30px; }
            .mainGrid { grid-template-columns: 1fr; margin-bottom: 12px; } 
            .glass { border-radius: 24px; }
            .nowPlayingArea { padding: 16px 20px; }
            .item { grid-template-columns: 30px 90px 1fr; padding: 12px 16px; gap: 14px; } 
            .itemThumb { width: 90px; min-width: 90px; height: 50px; }
          }
          .footer{ margin-top:20px; text-align:center; color:rgba(0,0,0,0.2); font-size:11px; font-weight: 700; letter-spacing: 1px; }
        `}</style>

        <div className="container" onClick={(e) => e.stopPropagation()}>
          <header className="header glass">
            <div className="logoWrap">
              <img src="/logo.png" style={{height:'48px'}} alt="Logo" />
              <div>
                <div className="brandTitle">四海颂扬｜音乐事工</div>
                <div className="sub">FOUR SEAS PRAISE</div>
              </div>
            </div>
          </header>

          <div className="mainGrid">
            <section className="glass flex flex-col">
              <div className="playerWrapper">
                {/* ✅ 使用高清地址显示封面，不再模糊 */}
                <div 
                  className={`videoOverlay ${videoReady ? 'hidden' : ''}`} 
                  style={{ backgroundImage: highResThumb ? `url(${highResThumb})` : 'none' }}
                />
                <div className="playerInner" ref={playerHostRef} />
              </div>
              {now && (
                <div className="nowPlayingArea">
                  <div className="titleContent">
                    <div className="nowLabel">正在播放</div>
                    <h2 className="nowPlayingTitle">{now.title}</h2>
                  </div>
                  <div className="playerControls">
                    <button className="controlBtn" onClick={(e) => { e.stopPropagation(); handlePlayPrev(); }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
                    </button>
                    <button className="controlBtn" onClick={togglePlay}>
                      {isPlaying ? (
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                      ) : (
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                      )}
                    </button>
                    <button className="controlBtn" onClick={(e) => { e.stopPropagation(); handlePlayNext(); }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                    </button>
                  </div>
                </div>
              )}
            </section>

            <aside className="glass flex flex-col">
              <div className="listHeaderArea">
                <div className="listTitleRow">
                  <div className="listTitleInfo">
                    <div className="listMainTitle">播放列表</div>
                    <div className="listCounter">{(active + 1)}/{items.length}</div>
                  </div>
                  <div className="toolbarInTitle">
                    <button className={`iconBtn ${playMode === 'SHUFFLE' ? 'active' : ''}`} onClick={() => setPlayMode('SHUFFLE')}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>
                    </button>
                    <button className={`iconBtn ${playMode === 'LIST_LOOP' ? 'active' : ''}`} onClick={() => setPlayMode('LIST_LOOP')}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
                    </button>
                    <button className={`iconBtn ${playMode === 'SINGLE_LOOP' ? 'active' : ''}`} onClick={() => setPlayMode('SINGLE_LOOP')}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m17 2 4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="m7 22-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path><path d="M11 10h1v4"></path></svg>
                    </button>
                  </div>
                </div>
                <div className="searchInside">
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="在曲库中搜索歌曲…" />
                </div>
              </div>
              <div className="scroll">
                {filtered.map(({ it, idx }, i) => {
                  const isActive = idx === active;
                  return (
                    <div key={it.videoId} className={"item" + (isActive ? " active" : "")} onClick={() => setActive(idx)}>
                      <div className="trackIdx">{isActive ? "▶" : (i + 1).toString().padStart(2, "0")}</div>
                      <div className="itemThumb"><img src={it.thumb} alt={it.title} /></div>
                      <div className="min-w-0">
                        <div className="itemTitle">{it.title}</div>
                        <div className="itemSub">{it.channel}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>

          <footer className="footer">
            <div>© {new Date().getFullYear()} 四海颂扬 FOUR SEAS PRAISE MUSIC MINISTRIES</div>
            <div className="mt-2 opacity-50 uppercase tracking-widest">{meta}</div>
          </footer>
        </div>
      </main>
    </>
  );
}
