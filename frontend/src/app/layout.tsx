import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "sonner";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Footer from "@/components/Footer";
import SpotlightModal from "@/components/SpotlightModal";
import AuthModal from "@/components/AuthModal";
import FloatingCommunityChat from "@/components/FloatingCommunityChat";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "NoteLagbe — Southeast University",
    template: "%s | NoteLagbe",
  },
  description: "One-stop academic hub for Southeast University. Access verified lecture notes, past exam question bank, faculty directory, and curriculum resources.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark w-full max-w-full overflow-x-hidden" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('notelagbe_theme');
                if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 antialiased`}>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <Navbar />
              <main className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden pb-20 sm:pb-24 lg:pb-0">
                {children}
              </main>
              <Footer />
              <MobileBottomNav />
              <SpotlightModal />
              <AuthModal />
              <FloatingCommunityChat />
              <Toaster position="top-right" richColors closeButton />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
