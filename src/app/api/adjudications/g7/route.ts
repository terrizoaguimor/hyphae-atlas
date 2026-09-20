import {NextResponse} from "next/server";
import {getG7Adjudication} from "@/server/g7-adjudication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET(request: Request) {
  try {
    const adjudication = await getG7Adjudication(request.signal);
    if (!adjudication) return NextResponse.json({available: false, error: "G7 adjudication is not available in the published dataset yet."}, {status: 404, headers: {"Cache-Control": "no-store"}});
    return NextResponse.json({available: true, adjudication}, {headers: {"Cache-Control": "no-store"}});
  } catch (error) {
    console.error("G7 adjudication route failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({available: false, error: "G7 adjudication is temporarily unavailable."}, {status: 503, headers: {"Cache-Control": "no-store"}});
  }
}
