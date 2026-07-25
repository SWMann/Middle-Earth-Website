import { NextResponse, type NextRequest } from "next/server";

/**
 * Public proxy for the mod's CANONICAL world-gen map tiles (the biome/height
 * pyramid the mod generates terrain from). Unlike /api/map/tile (live rendered
 * blocks, per dimension), this is a fixed image pyramid covering all of
 * Middle-earth: layer=biomes|heights, level 0..3, grid 2^level per axis, 3000px
 * tiles. Served off the bridge's on-disk cache. The X-Mod-Token is added
 * server-side and never reaches the browser. Canonical + static → cache hard.
 */
export const dynamic = "force-dynamic";

const LAYER_RE = /^(biomes|heights)$/;
const INT_RE = /^\d{1,3}$/;

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const layer = p.get("layer") ?? "";
  const level = p.get("level") ?? "";
  const col = p.get("col") ?? "";
  const row = p.get("row") ?? "";
  if (!LAYER_RE.test(layer) || !INT_RE.test(level) || !INT_RE.test(col) || !INT_RE.test(row)) {
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
      `${base}/api/v1/worldmap/tile?layer=${layer}&level=${level}&col=${col}&row=${row}`,
      { headers: { "X-Mod-Token": token }, cache: "no-store" },
    );
  } catch {
    return new NextResponse("Bridge unreachable", { status: 502 });
  }

  if (res.status === 404) {
    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": "public, s-maxage=300, max-age=300" },
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
      // Canonical, static imagery — cache for a day.
      "Cache-Control": "public, s-maxage=86400, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
