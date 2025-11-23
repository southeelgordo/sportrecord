"use client";

import { useState } from "react";
import { useWallet } from "@/providers/WalletProvider";
import { useFhevm } from "@/fhevm/useFhevm";
import { useCompetitionRegistry } from "@/hooks/useCompetitionRegistry";
import { useCertificate } from "@/hooks/useCertificate";
import { MediaUploader } from "@/components/MediaUploader";

export function Dashboard() {
  const { provider, signer, chainId, eip1193 } = useWallet();
  const raw = eip1193 || (provider as any)?._provider || (provider as any)?.provider || undefined;
  const { instance, status, error } = useFhevm({ provider: raw, chainId: chainId ?? undefined });
  const registry = useCompetitionRegistry({ instance, signer: signer as any, chainId: chainId ?? null });
  const cert = useCertificate({ signer: signer as any, chainId: chainId ?? null });

  const [activeTab, setActiveTab] = useState<"competition" | "record" | "validator" | "decrypt" | "certificate">("competition");
  
  // 创建比赛表单
  const [competitionTitle, setCompetitionTitle] = useState("");
  const [competitionDescription, setCompetitionDescription] = useState("");
  const [metadataCID, setMetadataCID] = useState("");
  const [beginLocal, setBeginLocal] = useState("");
  const [finishLocal, setFinishLocal] = useState("");
  const [requiredConfirmations, setRequiredConfirmations] = useState(2);
  const [validators, setValidators] = useState("");

  // 上传记录表单
  const [competitionId, setCompetitionId] = useState<number>(0);
  const [participantId, setParticipantId] = useState("");
  const [participantWallet, setParticipantWallet] = useState("");
  const [timeValue, setTimeValue] = useState("0");
  const [rankValue, setRankValue] = useState("0");
  const [recordCID, setRecordCID] = useState("");
  
  // 比赛列表和详情
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<any | null>(null);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);
  const [showCompetitionDetail, setShowCompetitionDetail] = useState(false);
  
  // 验证/解密/证书
  const [recordId, setRecordId] = useState("0");
  
  // 验证记录相关状态
  const [validatorCompetitions, setValidatorCompetitions] = useState<any[]>([]);
  const [selectedCompetitionForValidation, setSelectedCompetitionForValidation] = useState<any | null>(null);
  const [competitionRecords, setCompetitionRecords] = useState<any[]>([]);
  const [selectedRecordForValidation, setSelectedRecordForValidation] = useState<any | null>(null);
  const [loadingValidatorCompetitions, setLoadingValidatorCompetitions] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [showRecordDetail, setShowRecordDetail] = useState(false);

  const getStatusBadge = () => {
    switch (status) {
      case "idle": return <span className="badge-neon-yellow">Disconnected</span>;
      case "loading": return <span className="badge-neon-yellow animate-pulse-glow">Loading...</span>;
      case "ready": return <span className="badge-neon animate-pulse-glow">✓ Ready</span>;
      case "error": return <span className="badge-neon-red">✗ Error</span>;
      default: return null;
    }
  };

  const menuItems = [
    { id: "competition", label: "Register Competition", icon: "⚡", desc: "Create new competition" },
    { id: "record", label: "Submit Record", icon: "🔒", desc: "Encrypt and upload" },
    { id: "validator", label: "Validate Record", icon: "✅", desc: "Review and confirm" },
    { id: "decrypt", label: "Decrypt Record", icon: "👁️", desc: "View encrypted data" },
    { id: "certificate", label: "Issue Certificate", icon: "🎖️", desc: "Generate SBT" },
  ];

  return (
    <div className="flex gap-6 min-h-[calc(100vh-200px)]">
      {/* 左侧边栏 */}
      <aside className="w-64 flex-shrink-0">
        <div className="dark-card p-4 sticky top-24">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-2">Function Menu</h3>
            <div className="h-px bg-gradient-to-r from-transparent via-[#00ff96] to-transparent"></div>
          </div>
          
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={activeTab === item.id ? "sidebar-item-active" : "sidebar-item"}
              >
                <span className="text-xl">{item.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-[#666]">{item.desc}</div>
                </div>
              </div>
            ))}
          </nav>

          {/* FHEVM 状态卡片 */}
          <div className="mt-6 dark-card p-4">
            <div className="text-xs text-[#666] mb-2">FHEVM Status</div>
            {getStatusBadge()}
            <div className="mt-3 space-y-2">
              <div>
                <div className="text-xs text-[#666] mb-1">Contract Address</div>
                <div className="text-xs font-mono text-[#00ff96] truncate">
                  {registry.contractAddress ? `${registry.contractAddress.slice(0, 10)}...` : "N/A"}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#666] mb-1">Message</div>
                <div className="text-xs text-[#aaa]">
                  {status === "error" ? (error?.message?.slice(0, 20) || "Error") : (registry.message || "Standby")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1">
        {/* 创建比赛 */}
        {activeTab === "competition" && (
          <div className="dark-card-hover p-8 grid-pattern">
            <div className="mb-8">
              <h2 className="text-3xl font-bold gradient-text mb-3">Register Competition</h2>
              <p className="text-[#aaa]">Configure competition parameters, time window, and validator team</p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#00ff96] mb-2">Competition Title *</label>
                  <input 
                    className="input-dark" 
                    placeholder="e.g., 2024 Summer Marathon Championship" 
                    value={competitionTitle} 
                    onChange={e => setCompetitionTitle(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#00ff96] mb-2">Minimum Validator Confirmations</label>
                  <input 
                    className="input-dark" 
                    type="number"
                    placeholder="e.g., 2" 
                    value={requiredConfirmations} 
                    onChange={e => setRequiredConfirmations(Number(e.target.value || "0"))} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#00ff96] mb-2">Competition Description</label>
                <textarea 
                  className="input-dark min-h-[120px] resize-y" 
                  placeholder="Enter detailed description of the competition, rules, location, and other relevant information..."
                  value={competitionDescription} 
                  onChange={e => setCompetitionDescription(e.target.value)} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#00ff96] mb-2">Competition Metadata IPFS CID (Optional)</label>
                <input 
                  className="input-dark" 
                  placeholder="ipfs://Qm... (if you have pre-uploaded metadata)" 
                  value={metadataCID} 
                  onChange={e => setMetadataCID(e.target.value)} 
                />
                <p className="text-xs text-[#666] mt-2">
                  💡 If you upload metadata file below, the CID will be automatically filled. Otherwise, you can manually enter a CID.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#00ff96] mb-2">Registration Start Time</label>
                  <input
                    className="input-dark"
                    type="datetime-local"
                    value={beginLocal}
                    onChange={(e) => setBeginLocal(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#00ff96] mb-2">Registration End Time</label>
                  <input
                    className="input-dark"
                    type="datetime-local"
                    value={finishLocal}
                    onChange={(e) => setFinishLocal(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#00ff96] mb-2">Validator Wallet Addresses (comma-separated)</label>
                <input 
                  className="input-dark" 
                  placeholder="0xABC...,0xDEF..." 
                  value={validators} 
                  onChange={e => setValidators(e.target.value)} 
                />
              </div>

              <div className="border-t border-[#2a2a3e] pt-6">
                <div className="mb-4">
                  <p className="text-sm text-[#aaa] mb-2">
                    💡 <strong>Tip:</strong> You can upload a JSON file containing competition details (title, description, rules, etc.) to IPFS. 
                    The uploaded file should include the title and description you entered above, or you can create a complete metadata file.
                  </p>
                </div>
                <MediaUploader label="📤 Upload Competition Metadata File (JSON recommended)" onCID={setMetadataCID} />
              </div>

              <button 
                className="btn-neon w-full text-lg" 
                onClick={async () => {
                  if (!signer) return alert("Please connect wallet first");
                  if (!competitionTitle.trim()) return alert("Please enter a competition title");
                  try {
                    const toUnix = (v: string) => (v ? Math.floor(new Date(v).getTime() / 1000) : 0);
                    const beginTs = beginLocal ? toUnix(beginLocal) : 0;
                    const finishTs = finishLocal ? toUnix(finishLocal) : 0;
                    
                    // Use metadataCID if provided, otherwise use empty string
                    // Title and description will be stored in the uploaded metadata file
                    const finalCID = metadataCID || "";
                    
                    if (!finalCID) {
                      alert("⚠️ Please upload a metadata file or provide an IPFS CID");
                      return;
                    }
                    
                    const { ethers } = await import("ethers");
                    const c = new ethers.Contract(
                      registry.contractAddress!,
                      (await import("@/abi/CompetitionRegistryABI")).CompetitionRegistryABI.abi,
                      signer as any
                    );
                    const list = validators.split(",").map(s => s.trim()).filter(Boolean);
                    const tx = await c.registerCompetition(finalCID, BigInt(beginTs), BigInt(finishTs), requiredConfirmations, list);
                    await tx.wait();
                    alert("✅ Competition registered successfully!");
                  } catch (e: any) {
                    alert("❌ Registration failed: " + (e?.message || e));
                  }
                }}
              >
                ⚡ Submit Registration
              </button>
            </div>
          </div>
        )}

        {/* 上传记录 */}
        {activeTab === "record" && (
          <div className="dark-card-hover p-8 grid-pattern">
            <div className="mb-8">
              <h2 className="text-3xl font-bold gradient-text mb-3">Submit Competition Record</h2>
              <p className="text-[#aaa]">Protect score privacy with FHE encryption technology</p>
            </div>

            {/* 比赛列表查询区域 */}
            <div className="mb-8 dark-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Competition List</h3>
                <button
                  onClick={async () => {
                    setLoadingCompetitions(true);
                    try {
                      const list = await registry.listCompetitions();
                      setCompetitions(list);
                    } catch (e: any) {
                      alert("Failed to load competitions: " + (e?.message || e));
                    } finally {
                      setLoadingCompetitions(false);
                    }
                  }}
                  className="btn-neon-blue"
                  disabled={loadingCompetitions}
                >
                  {loadingCompetitions ? "Loading..." : "🔍 Query Competitions"}
                </button>
              </div>

              {competitions.length > 0 && (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {competitions.map((comp: any) => (
                    <div
                      key={Number(comp.competitionId)}
                      onClick={() => {
                        setSelectedCompetition(comp);
                        setShowCompetitionDetail(true);
                      }}
                      className="dark-card p-4 hover:border-[#00ff96] cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-white">
                            Competition #{Number(comp.competitionId)}
                          </div>
                          <div className="text-xs text-[#666] mt-1">
                            Host: {comp.host.slice(0, 10)}...{comp.host.slice(-8)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {comp.isActive ? (
                            <span className="badge-neon">Active</span>
                          ) : (
                            <span className="badge-neon-yellow">Inactive</span>
                          )}
                          <span className="text-[#00ff96]">→</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {competitions.length === 0 && !loadingCompetitions && (
                <p className="text-[#666] text-center py-4">Click "Query Competitions" to load the list</p>
              )}
            </div>

            {/* 比赛详情模态框 */}
            {showCompetitionDetail && selectedCompetition && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="dark-card-hover p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold gradient-text">Competition Details</h3>
                    <button
                      onClick={() => {
                        setShowCompetitionDetail(false);
                        setSelectedCompetition(null);
                      }}
                      className="text-[#666] hover:text-white text-2xl"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-[#666] mb-1">Competition ID</div>
                        <div className="text-white font-mono">#{Number(selectedCompetition.competitionId)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#666] mb-1">Status</div>
                        {selectedCompetition.isActive ? (
                          <span className="badge-neon">Active</span>
                        ) : (
                          <span className="badge-neon-yellow">Inactive</span>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-[#666] mb-1">Start Time</div>
                        <div className="text-white">
                          {new Date(Number(selectedCompetition.beginTime) * 1000).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[#666] mb-1">End Time</div>
                        <div className="text-white">
                          {new Date(Number(selectedCompetition.finishTime) * 1000).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[#666] mb-1">Required Confirmations</div>
                        <div className="text-white">{selectedCompetition.requiredConfirmations}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#666] mb-1">Host Address</div>
                        <div className="text-[#00ff96] font-mono text-xs truncate">
                          {selectedCompetition.host}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-[#666] mb-1">Metadata CID</div>
                      <div className="text-[#00ff96] font-mono text-xs break-all">
                        {selectedCompetition.metadataCID || "N/A"}
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-[#2a2a3e]">
                      <button
                        onClick={() => {
                          setCompetitionId(Number(selectedCompetition.competitionId));
                          setShowCompetitionDetail(false);
                          // Scroll to form
                          setTimeout(() => {
                            const formElement = document.getElementById("record-form");
                            formElement?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }, 100);
                        }}
                        className="btn-neon flex-1"
                      >
                        ✓ Use This Competition
                      </button>
                      <button
                        onClick={() => {
                          setShowCompetitionDetail(false);
                          setSelectedCompetition(null);
                        }}
                        className="bg-[#2a2a3e] hover:bg-[#3a3a4e] text-white px-6 py-3 rounded-lg transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 提交表单 */}
            {competitionId > 0 && (
              <div id="record-form" className="mb-6 p-4 bg-[#00ff96]/10 border border-[#00ff96]/30 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[#00ff96] font-medium">Selected Competition: #{competitionId}</div>
                    <div className="text-xs text-[#666] mt-1">You can now submit a record for this competition</div>
                  </div>
                  <button
                    onClick={() => setCompetitionId(0)}
                    className="text-xs text-[#666] hover:text-white"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            <div className="mb-6 neon-border-blue rounded-xl p-6 bg-[#1a1a2e]/50">
              <div className="flex items-start gap-4">
                <span className="text-4xl">🔒</span>
                <div className="flex-1">
                  <h4 className="font-bold text-[#0096ff] mb-2 text-lg">Fully Homomorphic Encryption (FHE)</h4>
                  <p className="text-sm text-[#aaa]">
                    Score data is encrypted using ZAMA FHE technology, stored as ciphertext on-chain, and only authorized users can decrypt and view
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {competitionId === 0 && (
                <div className="text-center py-12 border border-[#2a2a3e] rounded-xl bg-[#1a1a2e]/50">
                  <div className="text-4xl mb-4">📋</div>
                  <div className="text-white font-medium mb-2">No Competition Selected</div>
                  <div className="text-[#666] text-sm">
                    Please query competitions above and select one to submit a record
                  </div>
                </div>
              )}

              {competitionId > 0 && (
                <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#00ff96] mb-2">Competition ID</label>
                  <input 
                    className="input-dark" 
                    type="number"
                    placeholder="e.g., 1" 
                    value={competitionId} 
                    readOnly
                    disabled
                  />
                  <p className="text-xs text-[#666] mt-1">Selected from competition list</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#00ff96] mb-2">Participant ID</label>
                  <input 
                    className="input-dark" 
                    placeholder="ID or nickname" 
                    value={participantId} 
                    onChange={e => setParticipantId(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#00ff96] mb-2">Participant Wallet</label>
                  <input 
                    className="input-dark" 
                    placeholder="0x..." 
                    value={participantWallet} 
                    onChange={e => setParticipantWallet(e.target.value)} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#00ff96] mb-2">⏱️ Competition Time (milliseconds)</label>
                  <input 
                    className="input-dark" 
                    type="number"
                    placeholder="e.g., 125000" 
                    value={timeValue} 
                    onChange={e => setTimeValue(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#00ff96] mb-2">🏅 Final Ranking (integer)</label>
                  <input 
                    className="input-dark" 
                    type="number"
                    placeholder="e.g., 1" 
                    value={rankValue} 
                    onChange={e => setRankValue(e.target.value)} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#00ff96] mb-2">Record Metadata IPFS CID</label>
                <input 
                  className="input-dark" 
                  placeholder="ipfs://Qm..." 
                  value={recordCID} 
                  onChange={e => setRecordCID(e.target.value)} 
                />
              </div>

              <div className="border-t border-[#2a2a3e] pt-6">
                <MediaUploader label="📤 Upload Record/Media Files" onCID={setRecordCID} />
              </div>

              <button 
                className="btn-neon-blue w-full text-lg" 
                disabled={!instance || !signer || competitionId === 0}
                onClick={async () => {
                  if (!instance || !signer) return;
                  if (competitionId === 0) {
                    alert("Please select a competition first");
                    return;
                  }
                  try {
                    await registry.uploadEncrypted({
                      competitionId,
                      participantId,
                      participantWallet: participantWallet as any,
                      timeValue: BigInt(timeValue || "0"),
                      rankValue: Number(rankValue || "0"),
                      recordCID
                    });
                    alert("✅ Record submitted successfully! (Encrypted on-chain)");
                    // Reset form
                    setParticipantId("");
                    setParticipantWallet("");
                    setTimeValue("0");
                    setRankValue("0");
                    setRecordCID("");
                    setCompetitionId(0);
                  } catch (e: any) {
                    alert("❌ Submission failed: " + (e?.message || e));
                  }
                }}
              >
                🔒 Submit Encrypted Record
              </button>
              </>
              )}
            </div>
          </div>
        )}

        {/* 验证记录 */}
        {activeTab === "validator" && (
          <div className="dark-card-hover p-8 grid-pattern">
            <div className="mb-8">
              <h2 className="text-3xl font-bold gradient-text mb-3">Validator Confirmation</h2>
              <p className="text-[#aaa]">Review and confirm records, auto-certified when threshold is reached</p>
            </div>

            {/* Step 1: 选择比赛 */}
            <div className="mb-8 dark-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Step 1: Select Competition</h3>
                <button
                  onClick={async () => {
                    setLoadingValidatorCompetitions(true);
                    try {
                      const list = await registry.listCompetitions();
                      setValidatorCompetitions(list);
                    } catch (e: any) {
                      alert("Failed to load competitions: " + (e?.message || e));
                    } finally {
                      setLoadingValidatorCompetitions(false);
                    }
                  }}
                  className="btn-neon-blue"
                  disabled={loadingValidatorCompetitions}
                >
                  {loadingValidatorCompetitions ? "Loading..." : "🔍 Query Competitions"}
                </button>
              </div>

              {validatorCompetitions.length > 0 && (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {validatorCompetitions.map((comp: any) => (
                    <div
                      key={Number(comp.competitionId)}
                      onClick={() => {
                        setSelectedCompetitionForValidation(comp);
                        setCompetitionRecords([]);
                        setSelectedRecordForValidation(null);
                        setRecordId("0");
                      }}
                      className={`dark-card p-4 cursor-pointer transition-all ${
                        selectedCompetitionForValidation?.competitionId === comp.competitionId
                          ? "border-[#00ff96] border-2"
                          : "hover:border-[#00ff96]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-white">
                            Competition #{Number(comp.competitionId)}
                          </div>
                          <div className="text-xs text-[#666] mt-1">
                            Required: {comp.requiredConfirmations} confirmations
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {comp.isActive ? (
                            <span className="badge-neon">Active</span>
                          ) : (
                            <span className="badge-neon-yellow">Inactive</span>
                          )}
                          {selectedCompetitionForValidation?.competitionId === comp.competitionId && (
                            <span className="text-[#00ff96]">✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {validatorCompetitions.length === 0 && !loadingValidatorCompetitions && (
                <p className="text-[#666] text-center py-4">Click "Query Competitions" to load the list</p>
              )}
            </div>

            {/* Step 2: 选择记录 */}
            {selectedCompetitionForValidation && (
              <div className="mb-8 dark-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">Step 2: Select Record</h3>
                    <p className="text-xs text-[#666] mt-1">
                      Competition #{Number(selectedCompetitionForValidation.competitionId)} selected
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      setLoadingRecords(true);
                      try {
                        const records = await registry.fetchRecordsByCompetition(
                          Number(selectedCompetitionForValidation.competitionId)
                        );
                        setCompetitionRecords(records);
                      } catch (e: any) {
                        alert("Failed to load records: " + (e?.message || e));
                      } finally {
                        setLoadingRecords(false);
                      }
                    }}
                    className="btn-neon-blue"
                    disabled={loadingRecords}
                  >
                    {loadingRecords ? "Loading..." : "🔍 Load Records"}
                  </button>
                </div>

                {competitionRecords.length > 0 && (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {competitionRecords.map((rec: any) => {
                      const statusMap: Record<number, { label: string; color: string }> = {
                        0: { label: "Pending", color: "badge-neon-yellow" },
                        1: { label: "Verified", color: "badge-neon" },
                        2: { label: "Challenged", color: "badge-neon-red" },
                        3: { label: "Revoked", color: "badge-neon-red" },
                      };
                      const status = statusMap[rec.state] || statusMap[0];
                      
                      return (
                        <div
                          key={Number(rec.recordId)}
                          onClick={() => {
                            setSelectedRecordForValidation(rec);
                            setRecordId(String(rec.recordId));
                            setShowRecordDetail(true);
                          }}
                          className="dark-card p-4 hover:border-[#00ff96] cursor-pointer transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-white">
                                Record #{Number(rec.recordId)}
                              </div>
                              <div className="text-xs text-[#666] mt-1">
                                Participant: {rec.participantId} | Validations: {rec.validationCount}/{selectedCompetitionForValidation.requiredConfirmations}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={status.color}>{status.label}</span>
                              <span className="text-[#00ff96]">→</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {competitionRecords.length === 0 && !loadingRecords && (
                  <p className="text-[#666] text-center py-4">Click "Load Records" to view records for this competition</p>
                )}
              </div>
            )}

            {/* 记录详情模态框 */}
            {showRecordDetail && selectedRecordForValidation && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="dark-card-hover p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold gradient-text">Record Details</h3>
                    <button
                      onClick={() => {
                        setShowRecordDetail(false);
                      }}
                      className="text-[#666] hover:text-white text-2xl"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-[#666] mb-1">Record ID</div>
                        <div className="text-white font-mono">#{Number(selectedRecordForValidation.recordId)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#666] mb-1">Competition ID</div>
                        <div className="text-white">#{Number(selectedRecordForValidation.competitionId)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#666] mb-1">Participant ID</div>
                        <div className="text-white">{selectedRecordForValidation.participantId}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#666] mb-1">Status</div>
                        {selectedRecordForValidation.state === 0 && <span className="badge-neon-yellow">Pending</span>}
                        {selectedRecordForValidation.state === 1 && <span className="badge-neon">Verified</span>}
                        {selectedRecordForValidation.state === 2 && <span className="badge-neon-red">Challenged</span>}
                        {selectedRecordForValidation.state === 3 && <span className="badge-neon-red">Revoked</span>}
                      </div>
                      <div>
                        <div className="text-xs text-[#666] mb-1">Validations</div>
                        <div className="text-white">
                          {selectedRecordForValidation.validationCount}/{selectedCompetitionForValidation?.requiredConfirmations || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[#666] mb-1">Created At</div>
                        <div className="text-white text-xs">
                          {new Date(Number(selectedRecordForValidation.createdAt) * 1000).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-[#666] mb-1">Participant Wallet</div>
                      <div className="text-[#00ff96] font-mono text-xs break-all">
                        {selectedRecordForValidation.participantWallet}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-[#666] mb-1">Metadata CID</div>
                      <div className="text-[#00ff96] font-mono text-xs break-all">
                        {selectedRecordForValidation.recordCID || "N/A"}
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-[#2a2a3e]">
                      <button
                        onClick={() => {
                          setShowRecordDetail(false);
                        }}
                        className="btn-neon flex-1"
                      >
                        ✓ Use This Record
                      </button>
                      <button
                        onClick={() => {
                          setShowRecordDetail(false);
                          setSelectedRecordForValidation(null);
                          setRecordId("0");
                        }}
                        className="bg-[#2a2a3e] hover:bg-[#3a3a4e] text-white px-6 py-3 rounded-lg transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: 验证操作 */}
            {selectedRecordForValidation && (
              <div className="space-y-6">
                <div className="p-4 bg-[#00ff96]/10 border border-[#00ff96]/30 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-[#00ff96] font-medium">
                        Selected Record: #{Number(selectedRecordForValidation.recordId)}
                      </div>
                      <div className="text-xs text-[#666] mt-1">
                        Competition #{Number(selectedRecordForValidation.competitionId)} | 
                        Status: {selectedRecordForValidation.state === 0 ? "Pending" : 
                                 selectedRecordForValidation.state === 1 ? "Verified" :
                                 selectedRecordForValidation.state === 2 ? "Challenged" : "Revoked"}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedRecordForValidation(null);
                        setRecordId("0");
                      }}
                      className="text-xs text-[#666] hover:text-white"
                    >
                      Change
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button 
                    className="btn-neon text-lg flex items-center justify-center gap-3"
                    onClick={async () => {
                      if (!selectedRecordForValidation) return;
                      try {
                        await registry.validateRecord(Number(selectedRecordForValidation.recordId), true, "");
                        alert("✅ Confirmation successful");
                        // Refresh records
                        const records = await registry.fetchRecordsByCompetition(
                          Number(selectedCompetitionForValidation?.competitionId)
                        );
                        setCompetitionRecords(records);
                        setSelectedRecordForValidation(null);
                        setRecordId("0");
                      } catch (e: any) {
                        alert("❌ Operation failed: " + (e?.message || e));
                      }
                    }}
                  >
                    <span>✓</span>
                    <span>Approve</span>
                  </button>
                  
                  <button 
                    className="bg-[#ff0066] hover:bg-[#ff0066]/80 text-white font-bold px-6 py-3 rounded-lg shadow-[0_0_20px_rgba(255,0,102,0.5)] transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3 text-lg"
                    onClick={async () => {
                      if (!selectedRecordForValidation) return;
                      try {
                        await registry.validateRecord(Number(selectedRecordForValidation.recordId), false, "");
                        alert("⚠️ Rejected");
                        // Refresh records
                        const records = await registry.fetchRecordsByCompetition(
                          Number(selectedCompetitionForValidation?.competitionId)
                        );
                        setCompetitionRecords(records);
                        setSelectedRecordForValidation(null);
                        setRecordId("0");
                      } catch (e: any) {
                        alert("❌ Operation failed: " + (e?.message || e));
                      }
                    }}
                  >
                    <span>✗</span>
                    <span>Reject</span>
                  </button>
                </div>

                <div className="neon-border-yellow rounded-xl p-6 bg-[#1a1a2e]/50">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl">⚠️</span>
                    <div className="flex-1">
                      <h4 className="font-bold text-[#ffaa00] mb-2 text-lg">Validator Permissions</h4>
                      <p className="text-sm text-[#aaa]">
                        Only validator addresses authorized by the competition organizer can sign. Records are automatically set to "Verified" status when the threshold is reached.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!selectedRecordForValidation && (
              <div className="text-center py-12 border border-[#2a2a3e] rounded-xl bg-[#1a1a2e]/50">
                <div className="text-4xl mb-4">✅</div>
                <div className="text-white font-medium mb-2">No Record Selected</div>
                <div className="text-[#666] text-sm">
                  Please select a competition and then choose a record to validate
                </div>
              </div>
            )}
          </div>
        )}

        {/* 解密查看 */}
        {activeTab === "decrypt" && (
          <div className="dark-card-hover p-8 grid-pattern">
            <div className="mb-8">
              <h2 className="text-3xl font-bold gradient-text mb-3">Decrypt and View Record</h2>
              <p className="text-[#aaa]">Authorized users can decrypt and view encrypted record data</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#00ff96] mb-2">Record ID</label>
                <input 
                  className="input-dark" 
                  type="number"
                  placeholder="Enter recordId to decrypt" 
                  value={recordId} 
                  onChange={e => setRecordId(e.target.value)} 
                />
              </div>

              <button 
                className="btn-neon-purple w-full text-lg"
                disabled={!instance || !signer}
                onClick={async () => {
                  if (!instance || !signer) return;
                  try {
                    const r = await registry.fetchAndDecryptRecord(Number(recordId || "0"));
                    if (r?.clear) {
                      alert(
                        `🔓 Decryption successful!\n\n` +
                        `⏱️ Time: ${r.clear.time}\n` +
                        `🏅 Ranking: ${r.clear.rank}`
                      );
                    } else {
                      alert("⚠️ Unable to decrypt or record does not exist");
                    }
                  } catch (e: any) {
                    alert("❌ Decryption failed: " + (e?.message || e));
                  }
                }}
              >
                🔓 Decrypt Record
              </button>

              <div className="neon-border-purple rounded-xl p-6 bg-[#1a1a2e]/50">
                <div className="flex items-start gap-4">
                  <span className="text-4xl">🔑</span>
                  <div className="flex-1">
                    <h4 className="font-bold text-[#9600ff] mb-2 text-lg">Decryption Permissions</h4>
                    <p className="text-sm text-[#aaa]">
                      Only authorized addresses (participant, recorder, organizer) can decrypt and view. FHE technology ensures data is always stored as ciphertext on-chain.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 颁发证书 */}
        {activeTab === "certificate" && (
          <div className="dark-card-hover p-8 grid-pattern">
            <div className="mb-8">
              <h2 className="text-3xl font-bold gradient-text mb-3">Issue Achievement Certificate</h2>
              <p className="text-[#aaa]">Issue non-transferable Soulbound Token certificates for verified records</p>
            </div>

            <div className="space-y-6">
              <div className="dark-card p-4">
                <div className="text-xs text-[#666] mb-1 font-medium">Certificate Contract Address</div>
                <div className="text-sm font-mono text-[#00ff96] truncate">
                  {cert.address || "N/A"}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#00ff96] mb-2">Record ID</label>
                  <input 
                    className="input-dark" 
                    type="number"
                    placeholder="Enter recordId" 
                    value={recordId} 
                    onChange={e => setRecordId(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#00ff96] mb-2">Recipient Address</label>
                  <input 
                    className="input-dark" 
                    placeholder="0x..." 
                    value={participantWallet} 
                    onChange={e => setParticipantWallet(e.target.value)} 
                  />
                </div>
              </div>

              <button 
                className="btn-neon w-full text-lg"
                onClick={async () => {
                  if (!participantWallet) return alert("Please enter recipient address");
                  try {
                    const receipt = await cert.issue(Number(recordId || "0"), participantWallet as any);
                    alert("✅ Certificate issued successfully!\nTx: " + receipt?.transactionHash);
                  } catch (e: any) {
                    alert("❌ Issue failed: " + (e?.message || e));
                  }
                }}
              >
                🎖️ Issue Certificate NFT
              </button>

              <div className="neon-border rounded-xl p-6 bg-[#1a1a2e]/50">
                <div className="flex items-start gap-4">
                  <span className="text-4xl">🎖️</span>
                  <div className="flex-1">
                    <h4 className="font-bold text-[#00ff96] mb-2 text-lg">Soulbound Token (SBT)</h4>
                    <p className="text-sm text-[#aaa]">
                      Certificates follow ERC-721 standard but are non-transferable (Soulbound), permanently bound to the participant address, serving as on-chain proof of achievement.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
