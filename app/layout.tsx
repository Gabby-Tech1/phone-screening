import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Remotown — Phone Screening Platform",
    template: "%s · Remotown",
  },
  description:
    "Structured phone screenings for modern recruiting teams. Create, share, and review candidate responses in one place.",
  applicationName: "Remotown",
  authors: [{ name: "Aihrly Hiring Team" }],
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1316" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* Material Symbols Outlined — referenced throughout the design.
            We use `display=swap` to prevent FOIT and load it via a plain
            <link> on every page (the icons appear in every layout). */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="min-h-full bg-background text-on-surface antialiased">
        {/* Inline theme bootstrap — runs before paint to avoid a flash of the
            wrong color scheme. Reads the persisted preference from localStorage
            (set by <ThemeProvider />) or falls back to the OS preference. */}
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {`(() => {
              try {
                const stored = localStorage.getItem('remotown.theme');
                const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const dark = stored === 'dark' || (!stored && sysDark);
                if (dark) document.documentElement.classList.add('dark');
              } catch {}
            })();`}
        </Script>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
