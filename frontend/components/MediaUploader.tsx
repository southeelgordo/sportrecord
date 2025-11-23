"use client";

import { useState } from "react";
import { pinFileToIPFS } from "@/lib/ipfs";

export function MediaUploader(props: { label?: string; onCID: (cid: string) => void; }) {
  const [cid, setCid] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jwt = process.env.NEXT_PUBLIC_PINATA_JWT as string | undefined;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!jwt) {
      setError("NEXT_PUBLIC_PINATA_JWT environment variable is missing");
      return;
    }
    setLoading(true);
    try {
      const c = await pinFileToIPFS(file, jwt);
      setCid(c);
      props.onCID(c);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dark-card p-5 neon-border-blue">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">📁</span>
        <div className="flex-1">
          <div className="text-sm font-medium text-white">
            {props.label || "Upload File to IPFS (Pinata)"}
          </div>
          {!jwt && (
            <div className="text-xs text-[#ffaa00] mt-1">
              ⚠️ PINATA_JWT not configured
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <input 
          type="file" 
          className="w-full text-sm text-[#aaa] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#0096ff] file:text-white hover:file:bg-[#0096ff]/80 file:cursor-pointer cursor-pointer" 
          onChange={onFile}
          disabled={loading || !jwt}
        />
      </div>

      {loading && (
        <div className="mt-3 flex items-center gap-2 text-[#0096ff] text-sm">
          <div className="w-4 h-4 border-2 border-[#0096ff] border-t-transparent rounded-full animate-spin"></div>
          <span>Uploading...</span>
        </div>
      )}

      {cid && (
        <div className="mt-3 bg-[#00ff96]/10 border border-[#00ff96]/30 rounded-lg p-3">
          <div className="text-xs text-[#00ff96] mb-1 flex items-center gap-2">
            <span>✓</span>
            <span>Upload successful</span>
          </div>
          <div className="text-xs font-mono text-white/80 truncate">{cid}</div>
        </div>
      )}

      {error && (
        <div className="mt-3 bg-[#ff0066]/10 border border-[#ff0066]/30 rounded-lg p-3">
          <div className="text-xs text-[#ff0066] flex items-center gap-2">
            <span>✗</span>
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
