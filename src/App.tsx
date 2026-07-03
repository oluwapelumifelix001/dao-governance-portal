import React, { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import { ethers } from "ethers"; // Added to handle balance parsing
import {
  useWeb3,
  useAllProposals,
  useUserBalance,
  useCreateProposal,
  useCastVote,
  useExecuteProposal,
  useVoteCastEvents,
  useProposalExecutedEvents,
} from "./context";
import TreasuryDashboard from "./components/TreasuryDashboard";
import ConnectWallet from "./components/ConnectWallet";
import NetworkBlockReader from "./components/NetworkBlockReader";
import GovernanceProfile from "./components/GovernanceProfile";

interface Proposal {
  id: number;
  proposer: string;
  description: string;
  forVotes: number;
  againstVotes: number;
  startTime: number;
  deadline: number;
  executed: boolean;
  canceled: boolean;
}

interface GovernanceEvent {
  type: "Proposal" | "Vote" | "Execution";
  txHash: string;
  message: string;
  timestamp: number;
}

function App() {
  // Web3 Context
  const {
    account,
    isConnected,
    connectWallet,
    contract,
    isWrongNetwork,
    switchNetwork,
  } = useWeb3();

  // Component States
  const [newDescription, setNewDescription] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<number>(Math.floor(Date.now() / 1000));
  const [eventHistory, setEventHistory] = useState<GovernanceEvent[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false); // Mobile Menu State

  // Contract Read Hooks
  const { data: userBalanceData, refetch: refetchBalance } = useUserBalance(account);
  const { data: proposalsData, isLoading: proposalsLoading, refetch: refetchProposals } = useAllProposals(15000);

  // Contract Write Hooks
  const {
    createProposal,
    isLoading: createLoading,
    isConfirming: createConfirming,
  } = useCreateProposal(() => {
    setNewDescription("");
    refetchBalance();
    refetchProposals();
  });

  const {
    vote,
    isLoading: voteLoading,
    isConfirming: voteConfirming,
  } = useCastVote(() => {
    refetchBalance();
    refetchProposals();
  });

  const {
    execute,
    isLoading: executeLoading,
    isConfirming: executeConfirming,
  } = useExecuteProposal(() => {
    refetchBalance();
    refetchProposals();
  });

  // Event Listeners for Live Stream
  useVoteCastEvents((event) => {
    const proposalId = event.args[0] !== undefined ? String(event.args[0]) : "N/A";
    const voter = event.args[1] || "Unknown";
    const support = event.args[2] ? "FOR" : "AGAINST";
    const weight = event.args[3] !== undefined ? String(event.args[3]) : "0";

    const newMessage: GovernanceEvent = {
      type: "Vote",
      txHash: event.transactionHash,
      message: `${String(voter).slice(0, 6)}...${String(voter).slice(-4)} voted ${support} Proposal #${proposalId} (${weight} GOV)`,
      timestamp: event.timestamp,
    };

    setEventHistory((prev) => [newMessage, ...prev].slice(0, 10));
    toast(`🗳️ New Vote Cast: Proposal #${proposalId}`, { icon: "📊" });
    refetchBalance();
    refetchProposals();
  });

  useProposalExecutedEvents((event) => {
    const proposalId = event.args[0] || "N/A";

    const newMessage: GovernanceEvent = {
      type: "Execution",
      txHash: event.transactionHash,
      message: `Proposal #${proposalId} has been officially executed on-chain.`,
      timestamp: event.timestamp,
    };

    setEventHistory((prev) => [newMessage, ...prev].slice(0, 10));
    toast.success(`🏛️ Proposal #${proposalId} Finalized On-Chain!`);
    refetchBalance();
    refetchProposals();
  });

  // Format proposals when they load or refresh
  useEffect(() => {
    if (proposalsData && Array.isArray(proposalsData)) {
      const formatted: Proposal[] = proposalsData.map((p: any) => ({
        id: Number(p.id),
        proposer: p.proposer,
        description: p.description,
        forVotes: Number(p.forVotes),
        againstVotes: Number(p.againstVotes),
        startTime: Number(p.startTime),
        deadline: Number(p.deadline),
        executed: p.executed,
        canceled: p.canceled,
      }));
      setProposals(formatted);
    } else {
      setProposals([]);
    }
  }, [proposalsData]);

  // Keep system clock ticking for real-time countdown updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim()) return;
    await createProposal(newDescription);
  };

  const handleVote = async (proposalId: number, support: boolean) => {
    await vote(proposalId, support);
  };

  const handleExecute = async (proposalId: number) => {
    await execute(proposalId);
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // PATCH: Safely parses raw blockchain BigInt base units down to readable standard numbers
  const userBalance = (() => {
    if (userBalanceData === null || userBalanceData === undefined) return "0";
    try {
      const raw = BigInt(userBalanceData.toString());
      // Fallback for raw integer balances (non-scaled)
      if (raw > 0n && raw < 1000000000000n) {
        return Number(raw).toLocaleString();
      }
      return parseFloat(ethers.formatUnits(userBalanceData, 18)).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      });
    } catch (e) {
      return userBalanceData.toString();
    }
  })();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased relative overflow-x-hidden">

      {/* LIVE NETWORK safety BANNER GUARD */}
      {isWrongNetwork && (
        <div className="sticky top-0 z-[100] w-full bg-gradient-to-r from-rose-950/95 via-red-900/90 to-amber-950/95 backdrop-blur-md border-b border-rose-800/40 px-4 py-3 text-center flex flex-col sm:flex-row items-center justify-center gap-3 text-xs font-mono tracking-wide shadow-2xl transition-all">
          <span className="flex items-center gap-2 text-center">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
            ⚠️ NETWORK MISMATCH: Connected node is not targeted to the live Sepolia Ledger.
          </span>
          <button
            onClick={() => switchNetwork("0xaa36a7")} // Hex representation of Sepolia Chain ID: 11155111
            className="bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-sans font-extrabold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-all shadow-md shadow-cyan-500/10"
          >
            Force Switch to Sepolia
          </button>
        </div>
      )}

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#0f172a",
            color: "#f8fafc",
            border: "1px solid #1e293b",
            fontSize: "12px",
            fontFamily: "monospace",
            borderRadius: "12px",
          },
          success: {
            iconTheme: { primary: "#06b6d4", secondary: "#0f172a" },
          },
          error: {
            iconTheme: { primary: "#f43f5e", secondary: "#0f172a" },
          }
        }}
      />

      {/* Atmospheric Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full bg-cyan-500/5 blur-[80px] sm:blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full bg-indigo-500/5 blur-[100px] sm:blur-[150px] pointer-events-none" />

      {/* STICKY MAIN NAVBAR CONTAINER */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
              DAO Simulator
            </h1>
            <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 tracking-widest uppercase mt-0.5">
              DAO Simulator Governance Portal
            </p>
          </div>

          {/* Desktop Navigation Blocks */}
          <div className="hidden lg:flex items-center gap-6">
            <TreasuryDashboard daoContract={contract} />

            <div className="flex items-center gap-4">
              {isConnected && (
                <div className="bg-slate-900/90 border border-slate-800/80 px-4 py-2 rounded-xl text-xs font-mono text-slate-300 shadow-inner">
                  VOTING POWER: <span className="font-bold text-cyan-400 ml-1">{userBalance} GOV</span>
                </div>
              )}

              {isConnected && account ? (
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/50 px-4 py-2 rounded-xl text-xs font-mono text-emerald-400 flex items-center gap-2.5 shadow-lg shadow-black/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse" />
                  {formatAddress(account)}
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 transition-all duration-300 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-cyan-500/20 tracking-wider uppercase"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>

          {/* Mobile Burger Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-100 transition-colors focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Dropdown Panel Menu */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-slate-900 bg-slate-950 px-4 py-5 space-y-4 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/40">
              <TreasuryDashboard daoContract={contract} />
            </div>

            {isConnected && (
              <div className="bg-slate-900/90 border border-slate-800/80 px-4 py-3 rounded-xl text-xs font-mono text-slate-300 text-center">
                VOTING POWER: <span className="font-bold text-cyan-400 ml-1">{userBalance} GOV</span>
              </div>
            )}

            {isConnected && account ? (
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/50 px-4 py-3 rounded-xl text-xs font-mono text-emerald-400 flex items-center justify-center gap-2.5 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
                {formatAddress(account)}
              </div>
            ) : (
              <button
                onClick={() => {
                  connectWallet();
                  setIsMenuOpen(false);
                }}
                className="w-full bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-extrabold py-3 rounded-xl text-xs tracking-wider uppercase text-center shadow-lg"
              >
                Connect Wallet
              </button>
            )}
          </div>
        )}
      </header>

      {/* MAIN LAYOUT GRID */}
      <div className="p-4 sm:p-6 max-w-6xl mx-auto flex flex-col gap-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* SIDEBAR COL */}
          <section className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-slate-900/40 border border-slate-800/80 p-5 sm:p-6 rounded-2xl backdrop-blur-xl shadow-2xl relative overflow-hidden group hover:border-slate-700/50 transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

              <h2 className="text-xs font-bold text-slate-300 tracking-wider uppercase mb-1">
                Create Governance Track
              </h2>
              <p className="text-[11px] text-slate-500 mb-5">
                Propose on-chain consensus allocations or framework configurations.
              </p>

              <form onSubmit={handleCreateProposal} className="flex flex-col gap-4">
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Enter proposal context or framework execution script details..."
                  disabled={!isConnected || createLoading || createConfirming}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/30 min-h-[120px] resize-none disabled:opacity-30 transition-all duration-300 placeholder-slate-600 shadow-inner"
                />

                <button
                  type="submit"
                  disabled={!isConnected || createLoading || createConfirming || !newDescription.trim()}
                  className="w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-cyan-500 hover:to-teal-400 text-slate-300 hover:text-slate-950 transition-all duration-500 font-bold py-3 rounded-xl text-xs tracking-wider uppercase disabled:opacity-20 shadow-lg"
                >
                  {createLoading ? "Estimating Gas..." : createConfirming ? "Confirming Block..." : "Submit to Ledger"}
                </button>
              </form>
            </div>

            {/* Direct Connect Wallet Card in Sidebar when disconnected */}
            {!isConnected && <ConnectWallet />}

            <NetworkBlockReader />

            {/* Governance Profile Panel */}
            {isConnected && (
              <div className="transition-all duration-500 animate-in fade-in slide-in-from-bottom-3">
                <GovernanceProfile daoContract={contract} account={account} onBalanceUpdate={refetchBalance} />
              </div>
            )}
          </section>

          {/* MAIN PROPOSALS COL */}
          <section className="lg:col-span-2 flex flex-col gap-5">
            <div className="flex justify-between items-center px-1">
              <div>
                <h2 className="text-sm font-bold text-slate-300 tracking-wider uppercase">
                  Active Proposals Pipeline
                </h2>
                <p className="text-[10px] text-slate-500 mt-0.5">Live on-chain parameters</p>
              </div>
              {isConnected && (
                <button
                  onClick={() => {
                    refetchProposals();
                    refetchBalance();
                  }}
                  className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-500/5 px-3 py-1.5 rounded-lg border border-cyan-500/10 hover:border-cyan-500/20"
                >
                  Sync Nodes
                </button>
              )}
            </div>

            {!isConnected ? (
              <div className="bg-slate-900/20 border border-dashed border-slate-800/80 p-12 text-center rounded-2xl text-xs text-slate-500 backdrop-blur-sm">
                Please link your authenticated wallet node to load ongoing governance tracks.
              </div>
            ) : proposalsLoading ? (
              <div className="text-center p-12 text-xs text-slate-400 font-mono animate-pulse bg-slate-900/20 border border-slate-800/40 rounded-2xl">
                ⏳ Querying active ledger logs and loading blocks...
              </div>
            ) : proposals.length === 0 ? (
              <div className="bg-slate-900/20 border border-slate-800/40 p-12 text-center rounded-2xl text-xs text-slate-400 backdrop-blur-sm">
                No active governance proposals detected on this contract address.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {proposals.map((proposal) => {
                  const totalVotes = proposal.forVotes + proposal.againstVotes;
                  const forPercent = totalVotes > 0 ? Math.round((proposal.forVotes / totalVotes) * 100) : 0;
                  const againstPercent = totalVotes > 0 ? Math.round((proposal.againstVotes / totalVotes) * 100) : 0;

                  const timeLeft = proposal.deadline - currentTime;
                  const isExpired = timeLeft <= 0;

                  return (
                    <div
                      key={proposal.id}
                      className="bg-slate-900/30 border border-slate-800/60 p-5 rounded-2xl flex flex-col justify-between gap-5 backdrop-blur-xl relative group hover:border-slate-700/60 transition-all duration-300 shadow-xl"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-4 gap-2">
                          <span className="text-[9px] font-mono font-bold bg-slate-950 border border-slate-800 px-2 py-1 rounded text-slate-400 shrink-0">
                            BLOCK ID: #{proposal.id}
                          </span>

                          <span className={`text-[9px] tracking-wider uppercase font-extrabold px-2.5 py-1 rounded-full border text-center ${proposal.executed
                            ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10'
                            : isExpired
                              ? 'bg-rose-500/5 text-rose-400 border-rose-500/10'
                              : 'bg-cyan-500/5 text-cyan-400 border-cyan-500/10'
                            }`}>
                            {proposal.executed ? 'Executed' : isExpired ? 'Deadline Passed' : 'Voting Open'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed font-normal mb-3 min-h-[40px] break-words">
                          {proposal.description}
                        </p>

                        {!proposal.executed && (
                          <div className="mb-4 text-[10px] font-mono text-slate-500 bg-slate-950/40 p-2 rounded-lg border border-slate-900/50">
                            {isExpired ? (
                              <span className="text-amber-500/90 font-bold">⏱️ Window closed. Awaiting execution.</span>
                            ) : (
                              <span>
                                ⏱️ Closes in: <span className="text-cyan-400 font-bold">
                                  {Math.floor(timeLeft / 3600)}h {Math.floor((timeLeft % 3600) / 60)}m {timeLeft % 60}s
                                </span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="space-y-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-900/80 mb-4">
                          <div className="flex justify-between flex-wrap gap-1 text-[10px] font-mono text-slate-400">
                            <span className="text-cyan-400">For: {proposal.forVotes} GOV</span>
                            <span className="text-rose-400">Against: {proposal.againstVotes} GOV</span>
                          </div>

                          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex p-[1px]">
                            {totalVotes === 0 ? (
                              <div className="w-full h-full bg-slate-800 rounded-full" />
                            ) : (
                              <>
                                <div className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full rounded-l-full transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.4)]" style={{ width: `${forPercent}%` }} />
                                <div className="bg-gradient-to-r from-rose-500 to-pink-500 h-full rounded-r-full transition-all duration-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" style={{ width: `${againstPercent}%` }} />
                              </>
                            )}
                          </div>

                          <div className="flex justify-between text-[9px] text-slate-600 font-mono">
                            <span>{forPercent}% Weight</span>
                            <span>{againstPercent}% Weight</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-slate-800/60 pt-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[9px] font-mono text-slate-500 tracking-tight truncate">
                              By: {formatAddress(proposal.proposer)}
                            </div>

                            {!proposal.executed && !isExpired && (
                              <div className="flex gap-2 shrink-0">
                                <button
                                  onClick={() => handleVote(proposal.id, true)}
                                  disabled={voteLoading || voteConfirming}
                                  className="bg-slate-950 hover:bg-cyan-500 hover:text-slate-950 border border-slate-800 hover:border-cyan-400 px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition-all duration-300 disabled:opacity-30"
                                >
                                  {voteLoading || voteConfirming ? "..." : "For"}
                                </button>
                                <button
                                  onClick={() => handleVote(proposal.id, false)}
                                  disabled={voteLoading || voteConfirming}
                                  className="bg-slate-950 hover:bg-rose-500 hover:text-white border border-slate-800 hover:border-rose-500 px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition-all duration-300 disabled:opacity-30"
                                >
                                  {voteLoading || voteConfirming ? "..." : "Against"}
                                </button>
                              </div>
                            )}
                          </div>

                          {!proposal.executed && isExpired && (
                            <button
                              onClick={() => handleExecute(proposal.id)}
                              disabled={executeLoading || executeConfirming}
                              className="w-full mt-1 py-2 px-4 bg-gradient-to-r from-cyan-500/80 to-blue-600/80 hover:from-cyan-500 hover:to-blue-600 disabled:opacity-30 text-white font-mono font-bold rounded-xl text-[10px] tracking-wider uppercase transition-all duration-200 shadow-md shadow-cyan-500/5"
                            >
                              {executeLoading ? "Executing Allocations..." : executeConfirming ? "Settling Blocks..." : "🏛️ Execute Decision On-Chain"}
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* EVENT STREAM PANEL */}
        <section className="mt-4 bg-slate-900/20 border border-slate-800/80 rounded-2xl p-4 sm:p-5 font-mono backdrop-blur-xl relative overflow-hidden shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-900 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Live Contract Event Stream Logs
              </h3>
            </div>
            <span className="text-[9px] text-slate-600 uppercase font-bold tracking-widest">
              Node Status: Active Listening
            </span>
          </div>

          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
            {eventHistory.length === 0 ? (
              <p className="text-xs text-slate-600 italic">
                Listening for inbound block events... Cast a vote or execute a proposal to populate logs.
              </p>
            ) : (
              eventHistory.map((evt, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-[11px] py-2 sm:py-1 border-b border-slate-900/30 hover:bg-slate-900/40 px-2 rounded transition-colors">
                  <div className="flex items-start sm:items-center gap-3">
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${evt.type === "Vote" ? "bg-cyan-950 text-cyan-400 border border-cyan-900/50" : "bg-amber-950 text-amber-400 border border-amber-900/50"
                      }`}>
                      {evt.type}
                    </span>
                    <span className="text-slate-400 font-light break-words">{evt.message}</span>
                  </div>
                  <span className="text-[9px] text-slate-600 font-mono sm:self-center self-end">
                    tx: {evt.txHash.slice(0, 8)}...
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
      {/* MINIMAL FOOTER CONFIGURATION */}
      
      <footer className="mt-12 border-t border-slate-900/80 py-6 text-center text-[10px] font-mono tracking-wider text-slate-600 relative z-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-6xl mx-auto px-4">
          <p>© {new Date().getFullYear()} FLEXY | DEV. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-4 text-slate-500">
            <span className="hover:text-cyan-400 transition-colors cursor-pointer">LEDGER LOGS</span>
            <span>•</span>
            <span className="hover:text-cyan-400 transition-colors cursor-pointer">SYSTEM STATUS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;