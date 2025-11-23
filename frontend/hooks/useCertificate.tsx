"use client";

import { useMemo } from "react";
import { ethers } from "ethers";
import { RecordCertificateABI } from "@/abi/RecordCertificateABI";
import { RecordCertificateAddresses } from "@/abi/RecordCertificateAddresses";

export function useCertificate(params: { signer: ethers.Signer | null; chainId: number | null; }) {
  const { signer, chainId } = params;

  const info = useMemo(() => {
    if (!chainId) return undefined;
    const entry = RecordCertificateAddresses[String(chainId)];
    if (!entry) return undefined;
    return { address: entry.address, abi: RecordCertificateABI.abi } as const;
  }, [chainId]);

  const contract = useMemo(() => {
    if (!info || !signer) return undefined;
    return new ethers.Contract(info.address, info.abi, signer);
  }, [info, signer]);

  const issue = async (recordId: number, to: `0x${string}`) => {
    if (!contract) throw new Error("Certificate not ready");
    const tx = await contract.issueCertificate(recordId, to);
    return await tx.wait();
  };

  const findByRecordId = async (recordId: number): Promise<number | null> => {
    if (!contract) return null;
    const tid: bigint = await contract.tokenIdByRecordId(recordId);
    const n = Number(tid);
    return n === 0 ? null : n;
  };

  return { address: info?.address, issue, findByRecordId };
}







