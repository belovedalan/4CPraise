export const runtime = "edge";

const PLAYLIST_ID = "PL_DvPl8vaxH7kAHtuZMZpOCUyACY-8hls";

async function fetchAllItems(apiKey: string) {
  const all: any[] = [];
  let pageToken = "";

  while (true) {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("playlistId", PLAYLIST_ID);
    url.searchParams.set("key", apiKey);

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const res = await fetch(url.toString());

    // 🔴 关键：把 Google 返回的真实错误吐出来
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`YouTube API ${res.status}: ${text}`);
    }

    const data = await res.json();

    const rows = (data.items || [])
      .map((x: any) => ({
        videoId: x?.contentDetails?.videoId,
        title: x?.snippet?.title || "",
        channel:
          x?.snippet?.videoOwnerChannelTitle ||
          x?.snippet?.channelTitle ||
          "",
        thumb:
          x?.snippet?.thumbnails?.medium?.url ||
          x?.snippet?.thumbnails?.default?.url ||
          "",
      }))
      .filter(
        (x: any) =>
          x.videoId &&
          x.title !== "Private video" &&
          x.title !== "Deleted video"
      );

    all.push(...rows);

    pageToken = data.nextPageToken || "";
    if (!pageToken) break;
  }

  return all;
}

export async function GET() {
  const apiKey = process.env.YT_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Missing YT_API_KEY in environment variables" }),
      { status: 500 }
    );
  }

  try {
    const items = await fetchAllItems(apiKey);

    return new Response(
      JSON.stringify({
        items,
        fetchedAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          // ✅ 核心：CDN 缓存 5 分钟，后台自动刷新
          "cache-control": "s-maxage=300, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: "Upstream YouTube API error",
        detail: String(err?.message || err),
      }),
      { status: 502 }
    );
  }
}
