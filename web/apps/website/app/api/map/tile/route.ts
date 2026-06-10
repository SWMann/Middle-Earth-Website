import { NextResponse, type NextRequest } from "next/server";

/**
 * Public proxy for the mod's world-map tiles (the Xaero's-style live map).
 * The bridge serves tiles from its on-disk store — no world access — so this
 * is safe to expose publicly like the rest of /map. The X-Mod-Token is added
 * server-side and never reaches the browser. Tiles are CDN-cacheable briefly:
 * the map updates as chunks load, but staleness of a minute is fine.
 */
export const dynamic = "force-dynamic";

const DIM_RE = /^[a-z0-9_]+:[a-z0-9_]+$/;
const INT_RE = /^-?\d{1,5}$/;

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const dim = p.get("dim") ?? "";
  const scale = p.get("scale") ?? "";
  const tx = p.get("tx") ?? "";
  const tz = p.get("tz") ?? "";
  if (!DIM_RE.test(dim) || !INT_RE.test(scale) || !INT_RE.test(tx) || !INT_RE.test(tz)) {
    return new NextResponse("Bad tile params", { status: 400 });
  }

  const base = process.env.MOD_API_URL;
  const token = process.env.MOD_API_TOKEN;
  if (!base || !token) {
    return new NextResponse("Bridge not configured.", { status: 503 });
  }

  let res: Response;
  try {
    res = await fetch(
      `${base}/api/v1/map/tile?dim=${dim}&scale=${scale}&tx=${tx}&tz=${tz}`,
      { headers: { "X-Mod-Token": token }, cache: "no-store" },
    );
  } catch {
    return new NextResponse("Bridge unreachable", { status: 502 });
  }

  if (res.status === 404) {
    // Nothing mapped there yet — cache the miss briefly too.
    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": "public, s-maxage=30, max-age=30" },
    });
  }
  if (!res.ok) {
    return new NextResponse(`Tile failed (${res.status})`, { status: res.status });
  }

  const buf = await res.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, s-maxage=60, max-age=60, stale-while-revalidate=300",
    },
  });
}
