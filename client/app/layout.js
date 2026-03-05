import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { WorkspaceProvider } from "@/contexts/workspace-context";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "YN Project Manager",
  description: "Platform manajemen proyek kolaboratif berbasis web",
  manifest: "/manifest.json",
  themeColor: "#1a73e8",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ProjManager",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <WorkspaceProvider>
            <TooltipProvider>
              {children}
              <Toaster position="top-right" richColors />
            </TooltipProvider>
          </WorkspaceProvider>
        </AuthProvider>

        <script
          dangerouslySetInnerHTML={{
            __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').then(
                      function(registration) {
                        console.log('ServiceWorker registration successful');
                      },
                      function(err) {
                        console.log('ServiceWorker registration failed: ', err);
                      }
                    );
                  });
                }

                // PWA Install Prompt Logic
                window.addEventListener('beforeinstallprompt', (e) => {
                  // Prevent the mini-infobar from appearing on mobile
                  e.preventDefault();
                  // Stash the event so it can be triggered later.
                  window.deferredPrompt = e;
                  // Optionally, notify the UI that the install button can be shown
                  window.dispatchEvent(new CustomEvent('pwa-installable'));
                });

                window.addEventListener('appinstalled', () => {
                  window.deferredPrompt = null;
                  console.log('PWA was installed');
                });
              `,
          }}
        />
      </body>
    </html>
  );
}
