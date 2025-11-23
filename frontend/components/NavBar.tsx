"use client";

import Link from "next/link";
import { useWallet } from "@/providers/WalletProvider";

export function NavBar() {
  const { isConnected, address, chainId, connect } = useWallet();

  const short = (a: string) => (a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "");
  const chainName = (id: number | null) =>
    id === 11155111 ? "Sepolia" : id === 1 ? "Mainnet" : id ? `Chain ${id}` : "Unknown";

  return (
    <header className="sticky top-0 z-50 border-b border-[#1a1a2e] bg-[#0f0f1a]/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00ff96] to-[#0096ff] flex items-center justify-center text-2xl font-bold text-[#0a0a14] shadow-[0_0_20px_rgba(0,255,150,0.5)]">
            ⚡
          </div>
          <div>
            <div className="text-2xl font-bold gradient-text">
              SportsRecord
            </div>
            <div className="text-xs text-[#666]">High-Performance Encrypted Record Platform</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/" className="text-[#aaa] hover:text-[#00ff96] transition-colors font-medium">
              Dashboard
            </Link>
            <Link href="/competitions" className="text-[#aaa] hover:text-[#00ff96] transition-colors font-medium">
              Competitions
            </Link>
            <Link href="/records" className="text-[#aaa] hover:text-[#00ff96] transition-colors font-medium">
              Records
            </Link>
          </nav>
          {isConnected && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1a2e] border border-[#2a2a3e]">
              <div className="w-2 h-2 bg-[#00ff96] rounded-full animate-pulse"></div>
              <span className="text-xs text-[#aaa]">{chainName(chainId)}</span>
            </div>
          )}

          {isConnected ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#00ff96] to-[#0096ff] text-[#0a0a14] font-bold shadow-[0_0_15px_rgba(0,255,150,0.5)]">
              <div className="w-2 h-2 bg-[#0a0a14] rounded-full"></div>
              {short(address)}
            </div>
          ) : (
            <button onClick={connect} className="btn-neon">
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
