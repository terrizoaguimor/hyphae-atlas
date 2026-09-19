import type {MetadataRoute} from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hyphae Atlas",
    short_name: "Atlas",
    description: "Proof-aware migration, capability, and claim analysis for Hyphae.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f2e9",
    theme_color: "#10211d",
    lang: "en",
    icons: [{src: "/icon.svg", sizes: "any", type: "image/svg+xml"}],
  };
}
