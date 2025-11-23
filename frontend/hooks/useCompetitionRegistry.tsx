"use client";

import { useCallback, useMemo, useState } from "react";
import { ethers } from "ethers";
import { CompetitionRegistryABI } from "@/abi/CompetitionRegistryABI";
import { CompetitionRegistryAddresses } from "@/abi/CompetitionRegistryAddresses";
import { userDecrypt } from "@/fhevm/crypto";

export function useCompetitionRegistry(params: {
  instance: any | undefined;
  signer: ethers.Signer | null;
  chainId: number | null;
}) {
  const { instance, signer, chainId } = params;
  const [message, setMessage] = useState<string>("");
  
  type CompetitionInfo = {
    competitionId: bigint;
    host: string;
    metadataCID: string;
    beginTime: bigint;
    finishTime: bigint;
    isActive: boolean;
    requiredConfirmations: number;
  };

  type RecordView = {
    recordId: bigint;
    competitionId: bigint;
    participantId: string;
    participantWallet: string;
    recorder: string;
    recordCID: string;
    state: number; // enum
    createdAt: bigint;
    validationCount: number;
    encryptedTime: string; // handle bytes32
    encryptedRank: string; // handle bytes32
  };

  const contractInfo = useMemo(() => {
    if (!chainId) return undefined;
    const entry = CompetitionRegistryAddresses[String(chainId)];
    if (!entry) return undefined;
    return { address: entry.address, abi: CompetitionRegistryABI.abi } as const;
  }, [chainId]);

  const contract = useMemo(() => {
    if (!contractInfo || !signer) return undefined;
    return new ethers.Contract(contractInfo.address, contractInfo.abi, signer);
  }, [contractInfo, signer]);

  // ---------- Views / Reads ----------
  const getNextCompetitionId = useCallback(async (): Promise<number> => {
    if (!contract) return 0;
    const n: bigint = await contract.nextCompetitionId();
    return Number(n);
  }, [contract]);

  const getCompetitionById = useCallback(async (competitionId: number): Promise<CompetitionInfo | null> => {
    if (!contract) return null;
    try {
      const c = await contract.competitionsById(competitionId);
      return {
        competitionId: c.competitionId,
        host: c.host,
        metadataCID: c.metadataCID,
        beginTime: c.beginTime,
        finishTime: c.finishTime,
        isActive: c.isActive,
        requiredConfirmations: Number(c.requiredConfirmations)
      } as CompetitionInfo;
    } catch {
      return null;
    }
  }, [contract]);

  const listCompetitions = useCallback(async (): Promise<CompetitionInfo[]> => {
    const arr: CompetitionInfo[] = [];
    const max = await getNextCompetitionId();
    for (let id = 1; id < max; id++) {
      const comp = await getCompetitionById(id);
      if (comp) arr.push(comp);
    }
    return arr.sort((a, b) => Number(b.competitionId - a.competitionId));
  }, [getNextCompetitionId, getCompetitionById]);

  const fetchRecordsByCompetition = useCallback(async (competitionId: number, start = 0, count = 50): Promise<RecordView[]> => {
    if (!contract) return [];
    const list = await contract.fetchRecordsByCompetition(competitionId, start, count);
    return (list as any[]).map((r) => ({
      recordId: r.recordId,
      competitionId: r.competitionId,
      participantId: r.participantId,
      participantWallet: r.participantWallet,
      recorder: r.recorder,
      recordCID: r.recordCID,
      state: Number(r.state),
      createdAt: r.createdAt,
      validationCount: Number(r.validationCount),
      encryptedTime: r.encryptedTime as string,
      encryptedRank: r.encryptedRank as string
    }));
  }, [contract]);

  const uploadEncrypted = useCallback(async (args: {
    competitionId: number;
    participantId: string;
    participantWallet: `0x${string}`;
    timeValue: bigint; // milliseconds or microseconds
    rankValue: number;
    recordCID: string;
  }) => {
    if (!instance || !contract || !signer) return;
    setMessage("Encrypting inputs...");

    const addr = contractInfo!.address;

    // time
    const inputTime = instance.createEncryptedInput(addr, await signer.getAddress());
    inputTime.add64(args.timeValue);
    const encTime = await inputTime.encrypt();

    // rank
    const inputRank = instance.createEncryptedInput(addr, await signer.getAddress());
    inputRank.add32(args.rankValue);
    const encRank = await inputRank.encrypt();

    setMessage("Submitting encrypted record...");

    const tx = await contract.uploadRecord(
      args.competitionId,
      args.participantId,
      args.participantWallet,
      encTime.handles[0],
      encTime.inputProof,
      encRank.handles[0],
      encRank.inputProof,
      args.recordCID
    );
    setMessage("Waiting tx " + tx.hash);
    await tx.wait();
    setMessage("Uploaded");
  }, [instance, contract, signer, contractInfo]);

  const validateRecord = useCallback(async (recordId: number, approved: boolean, evidenceCID: string) => {
    if (!contract) return;
    const tx = await contract.validateRecord(recordId, approved, evidenceCID);
    setMessage("Waiting tx " + tx.hash);
    await tx.wait();
    setMessage("Validated");
  }, [contract]);

  const fetchAndDecryptRecord = useCallback(async (recordId: number) => {
    if (!contract || !instance || !signer) return null;
    const res = await contract.fetchRecord(recordId);
    // enc fields are returned as handles (hex strings)
    const addr = contractInfo!.address as `0x${string}`;
    const handles = [res.encryptedTime as string, res.encryptedRank as string];
    const decoded = await userDecrypt(instance, signer, addr, handles);
    return {
      raw: res,
      clear: {
        time: decoded[handles[0]],
        rank: decoded[handles[1]]
      }
    };
  }, [contract, instance, signer, contractInfo]);

  return {
    contractAddress: contractInfo?.address,
    message,
    // writes
    uploadEncrypted,
    validateRecord,
    // reads
    fetchAndDecryptRecord,
    getNextCompetitionId,
    getCompetitionById,
    listCompetitions,
    fetchRecordsByCompetition
  };
}







