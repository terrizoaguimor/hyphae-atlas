import type {NextConfig} from "next";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {key: "Content-Security-Policy", value: contentSecurityPolicy},
  {key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload"},
  {key: "X-Content-Type-Options", value: "nosniff"},
  {key: "X-Frame-Options", value: "DENY"},
  {key: "Referrer-Policy", value: "no-referrer"},
  {key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()"},
  {key: "Cross-Origin-Opener-Policy", value: "same-origin"},
  {key: "Cross-Origin-Resource-Policy", value: "same-origin"},
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {return [{source: "/(.*)", headers: securityHeaders}];},
};

export default nextConfig;
