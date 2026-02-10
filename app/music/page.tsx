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
  const [meta, setMeta] = useState("加载中…");
  const [q, setQ] = useState("");

  const itemsRef = useRef<Item[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

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
        setMeta(data.fetchedAt ? `最后更新：${new Date(data.fetchedAt).toLocaleString()}` : "已加载");
      } catch (e: any) {
        setMeta(`加载失败：${String(e?.message || e)}`);
      }
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
        height: "100%",
        width: "100%",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, origin: typeof window !== "undefined" ? window.location.origin : "" },
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
          onError: (err: any) => {
            setActive((prev) => {
              const len = itemsRef.current.length;
              const next = prev + 1;
              return next < len ? next : prev;
            });
          },
        },
      });
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!activeId) return;
    if (!playerReadyRef.current) {
      pendingVideoIdRef.current = activeId;
      return;
    }
    const p = playerRef.current;
    if (p?.loadVideoById) p.loadVideoById(activeId);
  }, [activeId]);

  return (
    <main className="page">
      <style>{`
        :root{
          --bg0:#F6F7FB; --bg1:#EEF1F8; --card:#FFFFFF; --line:rgba(20, 24, 40, .10);
          --text:#111827; --soft:rgba(17,24,39,.62); --accent:#6D28D9; --accent2:#8B5CF6;
        }

        .page{
          min-height:100vh; padding:26px 12px 34px; color:var(--text);
          background: radial-gradient(900px 520px at 20% -10%, rgba(109,40,217,.12), transparent 60%), radial-gradient(820px 520px at 90% 10%, rgba(139,92,246,.10), transparent 60%), linear-gradient(180deg, var(--bg0), var(--bg1));
        }
        .container{max-width:1180px;margin:0 auto;}

        .hero{ border-radius:18px; background:rgba(255,255,255,.72); border:1px solid var(--line); box-shadow:0 18px 60px rgba(17,24,39,.08); backdrop-filter: blur(10px); }
        .heroInner{ padding:16px 16px 14px; display:flex; align-items:center; justify-content:space-between; gap:20px; }

        .brand{ display:flex; align-items:center; gap:16px; min-width:0; }
        .logoBox{ flex:0 0 auto; display:flex; align-items:center; height:54px; }
        .logoImg{ height:100%; width:auto; display:block; object-fit:contain; filter: drop-shadow(0 6px 15px rgba(17,24,39,.12)); }

        .hgroup{ display:flex; flex-direction:column; justify-content:center; min-width:0; }
        .title{ margin:0; font-size:clamp(20px, 2.2vw, 28px); font-weight:850; letter-spacing:.5px; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .sub{ margin:0; margin-top:2px; font-size:11px; letter-spacing:3px; color:var(--soft); line-height:1; }

        .right{ display:flex; flex-direction:column; gap:10px; align-items:flex-end; flex:0 0 auto; }
        .pill{ font-size:12px; color:rgba(17,24,39,.72); padding:8px 12px; border-radius:999px; border:1px solid var(--line); background:rgba(255,255,255,.9); white-space:nowrap; }

        .search{ width:min(340px, 62vw); display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:14px; border:1px solid var(--line); background:rgba(255,255,255,.92); }
        .searchDot{ width:10px;height:10px;border-radius:999px; background:linear-gradient(180deg,var(--accent2),var(--accent)); flex:0 0 auto; }
        .search input{ width:100%; border:0; outline:none; background:transparent; color:var(--text); font-size:13px; }

        @media (max-width:720px){ .heroInner{flex-direction:column; align-items:stretch;} .right{align-items:flex-start;} .brand{gap:12px;} .logoBox{height:46px;} }

        .grid{ display:grid; grid-template-columns:1.45fr .85fr; gap:14px; margin-top:14px; align-items:start; }
        @media (max-width:920px){.grid{grid-template-columns:1fr;}}

        .card{ border-radius:18px; overflow:hidden; border:1px solid var(--line); background:var(--card); box-shadow:0 18px 60px rgba(17,24,39,.08); }

        .playerWrap{ position:relative; width:100%; padding-top:56.25%; background:#000; }
        .playerInner{position:absolute; inset:0;}

        .panelHead{ padding:12px 12px 10px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:flex-end; gap:10px; }
        .panelTitle{font-size:14px;font-weight:850;margin:0;color:var(--text);}
        .panelSub{margin-top:6px;font-size:12px;color:var(--soft);}

        .now{ padding:10px 12px; border-bottom:1px solid rgba(17,24,39,.08); display:flex; gap:10px; align-items:center; background:rgba(109,40,217,.06); }
        .nowThumb{ width:58px;height:38px;border-radius:12px;overflow:hidden; border:1px solid rgba(17,24,39,.12); background:#111; flex:0 0 auto; }
        .nowThumb img{width:100%;height:100%;object-fit:cover;display:block;}
        .nowText{min-width:0;}
        .nowLabel{font-size:11px;color:var(--soft);letter-spacing:2px;}
        .nowTitle{ margin-top:4px; font-size:13px; font-weight:800; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

        .list{ max-height:min(70vh, 720px); overflow:auto; background: #fff; }
        @media (max-width:920px){.list{max-height:52vh;}}

        .row{
          display:grid; grid-template-columns: 28px 96px 1fr; gap:12px;
          padding:12px; border-top:1px solid rgba(17,24,39,.06);
          cursor:pointer; align-items:center;
          background: transparent;
          transition: background 0.2s;
        }
        /* ✅ 核心修正：移除第一行的边框干扰 */
        .row:first-of-type { border-top: none !important; }

        .row:hover{background:rgba(17,24,39,.02);}
        .row.active{ background:rgba(109,40,217,.08); }

        .idx{ font-size:12px; color:rgba(17,24,39,.4); text-align:right; font-variant-numeric: tabular-nums; }
        .playDot{ display:inline-block; width:7px; height:7px; border-radius:999px; background:linear-gradient(180deg,var(--accent2),var(--accent)); margin-left:6px; transform: translateY(-1px); }

        /* ✅ 核心修正：缩略图容器和图片的渲染 */
        .thumb{ 
          width:96px; height:54px; border-radius:12px; overflow:hidden; 
          border:1px solid rgba(17,24,39,.08); 
          background:#000; 
          flex-shrink: 0;
          position: relative;
          z-index: 1;
        }
        .thumb img{ 
          width:100%; height:100%; object-fit:cover; display:block; 
          opacity: 1 !important; /* 强制 100% 不透明 */
          filter: none !important; /* 移除任何可能的滤镜 */
        }

        .t{ font-size:13px; font-weight:850; line-height:1.3; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .s{ margin-top:6px; font-size:12px; color:var(--soft); display:flex; justify-content:space-between; gap:10px; }

        @media (max-width:520px){ .row{grid-template-columns: 24px 80px 1fr;} .thumb{width:80px;height:45px;} }

        .footer{ margin-top:14px; text-align:center; color:var(--soft); font-size:11px; letter-spacing:1px; }
        .footer a{ color:inherit; text-decoration:none; border-bottom:1px solid rgba(17,24,39,.18); }
      `}</style>

      <div className="container">
        <section className="hero">
          <div className="heroInner">
            <div className="brand">
              <div className="logoBox"><img className="logoImg" src="/logo.png" alt="Logo" /></div>
              <div className="hgroup">
                <h1 className="title">四海颂扬｜音乐事工</h1>
                <div className="sub">FOUR SEAS PRAISE</div>
              </div>
            </div>
            <div className="right">
              <div className="pill">{meta}</div>
              <div className="search">
                <span className="searchDot" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索歌曲 / 频道…" />
              </div>
            </div>
          </div>
        </section>

        <section className="grid">
          <div className="card">
            <div className="playerWrap">
              <div className="playerInner" ref={playerHostRef} />
            </div>
          </div>

          <aside className="card">
            <div className="panelHead">
              <div>
                <div className="panelTitle">播放列表</div>
                <div className="panelSub">{items.length ? `${items.length} 首` : ""} {q.trim() ? `· 已筛选 ${filtered.length} 首` : ""}</div>
              </div>
            </div>

            {now && (
              <div className="now">
                <div className="nowThumb"><img src={now.thumb} alt="" /></div>
                <div className="nowText">
                  <div className="nowLabel">NOW PLAYING</div>
                  <div className="nowTitle">{now.title}</div>
                </div>
              </div>
            )}

            <div className="list">
              {filtered.map(({ it, idx }, i) => {
                const isActive = idx === active;
                return (
                  <div key={it.videoId} className={"row" + (isActive ? " active" : "")} onClick={() => setActive(idx)} role="button">
                    <div className="idx">{(i + 1).toString().padStart(2, "0")}{isActive ? <span className="playDot" /> : null}</div>
                    <div className="thumb"><img src={it.thumb} alt={it.title} /></div>
                    <div>
                      <div className="t">{it.title}</div>
                      <div className="s">
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.channel}</span>
                        {isActive && <span style={{ color: "var(--accent)", fontWeight: "bold" }}>播放中</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </section>

        <div className="footer"><a href="/">首页</a> · <a href="/music">音乐</a></div>
      </div>
    </main>
  );
}
