"use client";
import { useEffect, useMemo, useState } from "react";

type Item = { videoId: string; title: string; channel: string; thumb: string };

export default function MusicPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const [meta, setMeta] = useState("加载中…");

  const activeId = useMemo(() => items[active]?.videoId, [items, active]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/playlist");
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "API error");
        setItems(data.items || []);
        setMeta(data.fetchedAt ? `最后更新：${new Date(data.fetchedAt).toLocaleString()}` : "已加载");
      } catch (e: any) {
        setMeta(`加载失败：${String(e?.message || e)}`);
      }
    })();
  }, []);

  return (
    <main style={{ minHeight: "100vh", padding: "22px 12px", maxWidth: 1200, margin: "0 auto" }}>
      <style>{`
        .grid{display:grid;gap:12px;grid-template-columns:1.45fr .85fr;align-items:start;}
        @media (max-width:900px){.grid{grid-template-columns:1fr;}}
        .card{background:linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.03));
          border:1px solid rgba(255,255,255,.10);border-radius:18px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.55);}
        .playerWrap{position:relative;width:100%;padding-top:56.25%;background:#000;}
        .playerWrap iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;}
        .head{display:flex;justify-content:space-between;gap:10px;padding:12px 12px 10px;border-bottom:1px solid rgba(255,255,255,.08)}
        .list{max-height:min(70vh,720px);overflow:auto;}
        @media (max-width:900px){.list{max-height:52vh;}}
        .row{display:grid;grid-template-columns:110px 1fr;gap:10px;padding:10px 12px;border-top:1px solid rgba(255,255,255,.06);cursor:pointer;}
        .row:hover{background:rgba(255,255,255,.04)}
        .row.active{background:rgba(106,169,255,.12)}
        .thumb{width:110px;height:62px;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.08);background:#111}
        .thumb img{width:100%;height:100%;object-fit:cover;display:block}
        .t{font-size:13px;line-height:1.35;font-weight:650;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
        .s{font-size:12px;color:rgba(255,255,255,.60);margin-top:6px}
      `}</style>

      <header style={{ textAlign: "center", paddingBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 30 }}>四海颂扬｜音乐事工</h1>
        <div style={{ marginTop: 10, fontSize: 12, letterSpacing: 4, color: "#6aa9ff" }}>FOUR SEAS PRAISE</div>
      </header>

      <div className="grid">
        <section className="card">
          <div className="playerWrap">
            {activeId ? (
              <iframe
                key={activeId}
                src={`https://www.youtube.com/embed/${activeId}?rel=0&modestbranding=1`}
                title="Four Seas Praise Player"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : null}
          </div>
        </section>

        <aside className="card">
          <div className="head">
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>播放列表</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginTop: 4 }}>{meta}</div>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)" }}>{items.length ? `${items.length} 首` : ""}</div>
          </div>

          <div className="list">
            {items.map((it, idx) => (
              <div key={it.videoId} className={"row" + (idx === active ? " active" : "")} onClick={() => setActive(idx)}>
                <div className="thumb"><img src={it.thumb} alt="" /></div>
                <div>
                  <div className="t">{it.title}</div>
                  <div className="s">{it.channel}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
