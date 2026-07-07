import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "B20Nation (NAT20)",
  description: "Mint the NAT20 B20 token on Base Sepolia",
  // Website ownership verification meta tag (TalentApp).
  other: {
    "talentapp:project_verification":
      "5bc8c90a97c55aee9bec5f5d7eb18ab424445ba69c6ba7b7fb59652108ced0d071a792087951e23cbc136d390c6d44dfb1c2ff1b64867b97a33937740a2502e7",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        {/*
          Browser wallet/dApp extensions inject scripts into every page and throw
          unhandled promise rejections (e.g. "source ... has not been authorized
          yet") that originate entirely in chrome-extension:// code, not this app.
          Next.js's dev error overlay surfaces any page-level rejection, so this
          runs at parse time — before the framework attaches its own listener —
          and swallows only extension-originated rejections. Real app errors,
          whose stacks point at app code, still surface normally.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){window.addEventListener('unhandledrejection',function(e){try{var r=e.reason||{};var s=(r&&r.stack)||'';var m=String((r&&r.message)||r||'');if(s.indexOf('chrome-extension://')>-1||m.indexOf('has not been authorized yet')>-1){e.preventDefault();e.stopImmediatePropagation();}}catch(_){}} ,true);})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
