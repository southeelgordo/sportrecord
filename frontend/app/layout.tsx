import "./globals.css";
import { ReactNode } from "react";
import { NavBar } from "@/components/NavBar";
import { WalletProvider } from "@/providers/WalletProvider";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <div className="min-h-screen flex flex-col">
            <NavBar />
            
            <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-8">
              {children}
            </main>
            
            <footer className="border-t border-[#1a1a2e] bg-[#0f0f1a]/90 backdrop-blur-lg mt-12">
              <div className="mx-auto max-w-7xl px-6 py-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#666]">
                  <div className="flex items-center gap-2">
                    <span>🔐</span>
                    <span>Privacy-protected record system powered by ZAMA FHE</span>
                  </div>
                  <div>© {new Date().getFullYear()} SportsRecord. All rights reserved.</div>
                </div>
              </div>
            </footer>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
