"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
        if (window.YT?.Player) {
          clearInterval(t);
          resolve();
        }
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

export default function MusicPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const [meta, setMeta] = useState("");
  const [q, setQ] = useState("");

  const itemsRef = useRef<Item[]>([]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef(false);
  const pendingVideoIdRef = useRef<string | null>(null);

  const activeId = useMemo(() => items[active]?.videoId, [items, active]);
  const now = items[active];

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const mapped = items.map((it, idx) => ({ it, idx }));
    if (!s) return mapped;
    return mapped.filter(({ it }) => (it.title + " " + it.channel).toLowerCase().includes(s));
  }, [items, q]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/playlist");
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "API error");
        const list: Item[] = data.items || [];
        setItems(list);
        setActive((prev) => (prev >= list.length ? 0 : prev));
        if (data.fetchedAt) setMeta(`最后更新：${new Date(data.fetchedAt).toLocaleString()}`);
      } catch (e: any) { setMeta(`数据同步中…`); }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!playerHostRef.current) return;
      await loadYouTubeIFrameAPI();
      if (cancelled) return;
      if (playerRef.current) return;
      playerRef.current = new window.YT.Player(playerHostRef.current, {
        height: "100%", width: "100%",
        playerVars: { rel: 0, modestbranding: 1, controls: 1, playsinline: 1, origin: typeof window !== "undefined" ? window.location.origin : "" },
        events: {
          onReady: () => {
            playerReadyRef.current = true;
            const toPlay = pendingVideoIdRef.current || activeId || null;
            pendingVideoIdRef.current = null;
            if (toPlay && playerRef.current?.loadVideoById) playerRef.current.loadVideoById(toPlay);
          },
          onStateChange: (event: any) => {
            if (event?.data === 0) {
              setActive((prev) => {
                const len = itemsRef.current.length;
                if (len === 0) return prev;
                const next = prev + 1;
                return next < len ? next : prev;
              });
            }
          },
        },
      });
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!activeId) return;
    if (!playerReadyRef.current) { pendingVideoIdRef.current = activeId; return; }
    const p = playerRef.current;
    if (p?.loadVideoById) p.loadVideoById(activeId);
  }, [activeId]);

  return (
    <main className="page">
      <style>{`
        :root{
          --glass: rgba(255, 255, 255, 0.45);
          --line: rgba(255, 255, 255, 0.4);
          --accent: #6D28D9;
          --text: #111827;
        }

        .page{
          min-height:100vh; padding:20px 12px 60px; color:var(--text);
          background: 
            radial-gradient(circle at 15% -15%, rgba(109,40,217,0.2), transparent 45%),
            radial-gradient(circle at 85% 15%, rgba(139,92,246,0.15), transparent 45%),
            #f2f4f8;
        }
        .container{ max-width:1200px; margin:0 auto; }

        .glass {
          background: var(--glass);
          backdrop-filter: blur(25px) saturate(180%);
          -webkit-backdrop-filter: blur(25px) saturate(180%);
          border: 1px solid var(--line);
          box-shadow: 0 12px 40px rgba(0,0,0,0.06);
          border-radius: 24px;
        }

        /* 顶部导航 */
        .header{ padding:16px 20px; display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
        .logoWrap{ display:flex; align-items:center; gap:16px; }
        .logoImg{ height:48px; width:auto; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.1)); }
        .titleGroup h1{ margin:0; font-size:clamp(18px, 4vw, 24px); font-weight:900; letter-spacing:-0.5px; }
        .titleGroup span{ font-size:10px; letter-spacing:3px; color:rgba(0,0,0,0.4); text-transform:uppercase; font-weight:700; }

        .search{ 
          width:min(300px, 45vw); display:flex; align-items:center; gap:10px; padding:10px 16px; 
          border-radius:14px; background:rgba(255,255,255,0.4); border:1px solid var(--line);
        }
        .search input{ background:transparent; border:none; outline:none; width:100%; font-size:13px; }

        /* 响应式布局：PC端1.45:1，手机端单列 */
        .mainGrid{ display:grid; grid-template-columns:1.45fr 1fr; gap:16px; align-items:start; }
        @media (max-width:1024px){ .mainGrid{ grid-template-columns:1fr; } }

        /* 播放器 */
        .playerCard{ overflow:hidden; }
        .playerBox{ position:relative; width:100%; padding-top:56.25%; background:#000; }
        .playerInner{ position:absolute; inset:0; }
        .nowInfo{ padding:20px; }
        .nowLabel{ font-size:10px; font-weight:800; color:var(--accent); letter-spacing:1px; margin-bottom:4px; }
        .nowTitle{ font-size:18px; font-weight:800; line-height:1.4; color:#111; }

        /* 列表 */
        .listCard{ display:flex; flex-direction:column; overflow:hidden; }
        .listHead{ padding:16px 20px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center; }
        .listTitle{ font-size:15px; font-weight:850; }
        
        .scroll{ max-height:720px; overflow-y:auto; padding:8px 0; }
        .scroll::-webkit-scrollbar { width:4px; }
        .scroll::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.1); border-radius:10px; }

        .item{
          display:grid; grid-template-columns: 32px 100px 1fr; gap:12px;
          padding:12px 16px; cursor:pointer; transition:0.2s cubic-bezier(0.4, 0, 0.2, 1);
          align-items:center;
        }
        .item:hover{ background:rgba(255,255,255,0.25); }
        .item.active{ background:rgba(109,40,217,0.08); position:relative; }
        .item.active::before{ content:""; position:absolute; left:0; height:40%; width:4px; background:var(--accent); border-radius:0 4px 4px 0; }

        .itemIdx{ font-size:12px; color:rgba(0,0,0,0.3); font-weight:700; text-align:right; }
        .itemThumb{ width:100px; height:56px; border-radius:12px; overflow:hidden; border:1px solid rgba(0,0,0,0.05); background:#000; }
        .itemThumb img{ width:100%; height:100%; object-fit:cover; }

        .itemTitle{ font-size:13px; font-weight:800; line-height:1.4; margin-bottom:4px; color:#222; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .itemSub{ font-size:11px; color:rgba(0,0,0,0.45); display:flex; justify-content:space-between; }

        @media (max-width:640px){
          .header{ flex-direction:column; align-items:stretch; gap:16px; padding:16px; }
          .search{ width:100%; }
          .item{ grid-template-columns: 24px 84px 1fr; padding:10px 12px; gap:10px; }
          .itemThumb{ width:84px; height:47px; }
          .scroll{ max-height: 55vh; }
        }

        .footer{ margin-top:40px; text-align:center; padding-bottom:40px; color:rgba(0,0,0,0.4); font-size:12px; }
      `}</style>

      <div className="container">
        <header className="header glass">
          <div className="logoWrap">
            <img src="/logo.png" className="logoImg" alt="Logo" />
            <div className="titleGroup">
              <h1>四海颂扬｜音乐事工</h1>
              <span>Four Seas Praise</span>
            </div>
          </div>
          <div className="search">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="快速查找歌曲…" />
          </div>
        </header>

        <div className="mainGrid">
          <section className="playerSection">
            <div className="playerCard glass">
              <div className="playerBox">
                <div className="playerInner" ref={playerHostRef} />
              </div>
              {now && (
                <div className="nowInfo">
                  <div className="nowLabel">NOW PLAYING</div>
                  <h2 className="nowTitle">{now.title}</h2>
                </div>
              )}
            </div>
          </section>

          <aside className="listCard glass">
            <div className="listHead">
              <div className="listTitle">播放列表 <span style={{opacity:0.3, fontWeight:400, fontSize:'12px', marginLeft:'8px'}}>{items.length}</span></div>
            </div>
            <div className="scroll">
              {filtered.map(({ it, idx }, i) => {
                const isActive = idx === active;
                return (
                  <div key={it.videoId} className={"item" + (isActive ? " active" : "")} onClick={() => setActive(idx)}>
                    <div className="itemIdx">{isActive ? "▶" : (i + 1).toString().padStart(2, "0")}</div>
                    <div className="itemThumb"><img src={it.thumb} alt="" /></div>
                    <div>
                      <div className="itemTitle">{it.title}</div>
                      <div className="itemSub">
                        <span>{it.channel}</span>
                        {isActive && <span style={{color:'var(--accent)', fontWeight:900}}>播放中</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>

        <footer className="footer">
          <div>© {new Date().getFullYear()} 四海颂扬 Four Seas Praise · All Rights Reserved.</div>
          <div style={{marginTop:'8px', opacity:0.6}}>{meta}</div>
        </footer>
      </div>
    </main>
  );
}
