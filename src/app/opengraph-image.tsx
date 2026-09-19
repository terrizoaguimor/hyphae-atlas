import {ImageResponse} from "next/og";

export const alt = "Hyphae Atlas — know if a technical claim is true before you act on it";
export const size = {width: 1200, height: 630};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "58px 64px", color: "#10211d", background: "radial-gradient(circle at 86% 12%, #a8d6c4 0, transparent 300px), #f2f2e9"}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}><div style={{display: "flex", alignItems: "center", gap: 16, fontSize: 28}}><span style={{display: "flex", width: 50, height: 50, alignItems: "center", justifyContent: "center", borderRadius: 25, color: "#f2f2e9", background: "#10211d", fontWeight: 800}}>H</span><span>Hyphae <b>Atlas</b></span></div><span style={{fontSize: 17, letterSpacing: 3, color: "#315b4c"}}>SANITY CONTEXT × GROK</span></div>
      <div style={{display: "flex", flexDirection: "column"}}><span style={{fontSize: 18, letterSpacing: 4, color: "#315b4c", fontWeight: 800}}>PROOF-AWARE TECHNICAL DECISIONS</span><div style={{display: "flex", marginTop: 24, maxWidth: 1010, fontFamily: "serif", fontSize: 82, lineHeight: .96, letterSpacing: -4}}>Know if a claim is true before you act on it.</div></div>
      <div style={{display: "flex", gap: 18, fontSize: 18, color: "#52675f"}}><span>21 Knowledge Base entries</span><span>•</span><span>12/12 strict evaluation</span><span>•</span><span>Commit + SHA-256 provenance</span></div>
    </div>,
    size,
  );
}
