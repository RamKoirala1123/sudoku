import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sudoku Online - Real-Time Multiplayer Race & Solo Puzzles",
  description: "Play classic Sudoku online with real-time multiplayer WebRTC racing, custom mistake rules, auto-clearing pencil notes, and instant share links.",
  keywords: ["sudoku", "multiplayer sudoku", "sudoku race", "online sudoku", "sudoku p2p"],
  authors: [{ name: "Sudoku Master" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4f46e5",
};

const themeScript = `
(function() {
  try {
    var saved = localStorage.getItem('sudoku_theme') || sessionStorage.getItem('sudoku_theme');
    var theme = saved;
    if (!theme) {
      var sess = localStorage.getItem('sudoku_active_session') || sessionStorage.getItem('sudoku_active_session');
      if (sess) {
        var parsed = JSON.parse(sess);
        if (parsed && parsed.theme) theme = parsed.theme;
      }
    }
    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    var isDark = theme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col transition-colors">
        {children}
      </body>
    </html>
  );
}
