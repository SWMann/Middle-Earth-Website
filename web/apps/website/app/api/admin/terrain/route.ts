import { NextResponse, type NextRequest } from "next/server";
import { safeAuth } from "@/lib/auth-helpers";
import { isAdmin } from "@/lib/data/wiki";

/**
 * Admin-gated proxy for the mod's top-down terrain render. The floorplanner
 * sets an <image> src to this route; we add the X-Mod-Token server-side and
 * stream the PNG back, so the bridge token never reaches the browser. Not a
 * cache target — terrain changes as players build.
 */
export const dynamic = "force-dynamic";

const PASS_PARAMS = ["dim", "minX", "minZ", "maxX", "maxZ"] as const;

export async function GET(req: NextRequest) {
  const session = await safeAuth();
  if (!isAdmin(session?.user?.discordId)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const base = process.env.MOD_API_URL;
  const token = process.env.MOD_API_TOKEN;
  if (!base || !token) {
    return new NextResponse("Bridge not configured (MOD_API_URL / MOD_API_TOKEN).", { status: 503 });
  }

  const qs = new URLSearchParams();
  for (const k of PASS_PARAMS) {
    const v = req.nextUrl.searchParams.get(k);
    if (v != null) qs.set(k, v);
  }

  let res: Response;
  try {
    res = await fetch(`${base}/api/v1/render/topdown?${qs.toString()}`, {
      headers: { "X-Mod-Token": token },
      cache: "no-store",
    });
  } catch (err) {
    return new NextResponse(
      `Bridge unreachable: ${err instanceof Error ? err.message : "unknown"}`,
      { status: 502 },
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return new NextResponse(detail || `Render failed (${res.status})`, { status: res.status });
  }

  const buf = await res.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
