export const RecordCertificateAddresses: Record<string, { address: `0x${string}`, chainId: number, chainName?: string }> = (() => {
  const cid = process.env.NEXT_PUBLIC_CHAIN_ID;
  const addr = process.env.NEXT_PUBLIC_RECORD_CERTIFICATE_ADDRESS as `0x${string}` | undefined;
  const map: Record<string, { address: `0x${string}`, chainId: number, chainName?: string }> = {};
  if (cid && addr) {
    map[cid] = { address: addr, chainId: Number(cid), chainName: "sepolia" };
  }
  return map;
})();





