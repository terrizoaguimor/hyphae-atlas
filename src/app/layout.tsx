import type {Metadata} from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: "Hyphae Atlas — Evidence before assertion",
  description: "A model-agnostic, version-aware migration, capability, and product-claim agent powered by Sanity Context.",
  openGraph: {title: "Hyphae Atlas", description: "Ask what is true. See why it applies.", type: "website"},
};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
