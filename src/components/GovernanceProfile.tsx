import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface GovernanceProfileProps {
  daoContract: ethers.Contract | null;
  account: string | null;
  onBalanceUpdate?: () => void;
}

export default function GovernanceProfile({ daoContract, account, onBalanceUpdate }: GovernanceProfileProps) {
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [hasClaimed, setHasClaimed] = useState<boolean>(false);
  const [claiming, setClaiming] = useState<boolean>(false);
  const [recipient, setRecipient] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const TOTAL_SUPPLY = 5000; // Updated to match your actual 5k token distribution parameters

  const fetchGovernanceData = async () => {
    if (!daoContract || !account) {
      setTokenBalance(0);
      setHasClaimed(false);
      setLoading(false);
      return;
    }

    try {
      // Fetch user balance directly from the public mapping
      const rawBalance = await daoContract.userBalances(account);
      
      // Convert raw BigInt base units safely using formatUnits
      const formattedBalance = parseFloat(ethers.formatUnits(rawBalance, 18));
      setTokenBalance(formattedBalance);

      // Fetch whether the user has claimed starter tokens
      const claimed = await daoContract.hasClaimed(account);
      setHasClaimed(claimed);

      setLoading(false);
    } catch (err) {
      console.error("Error fetching governance profile:", err);
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!daoContract || !account) return;

    setClaiming(true);
    setStatusMessage(null);
    try {
      setStatusMessage({ text: "Initiating faucet claim transaction...", isError: false });
      const tx = await daoContract.claim();
      setStatusMessage({ text: "Claim transaction processing. Waiting for block confirmation...", isError: false });
      
      await tx.wait();
      setStatusMessage({ text: "Successfully claimed 5,000 starter GOV tokens!", isError: false });
      
      // Refresh local component data
      await fetchGovernanceData();

      // Trigger global state refresh if parent callback exists
      if (onBalanceUpdate) {
        onBalanceUpdate();
      }
    } catch (err: any) {
      console.error("Faucet claim failed:", err);
      setStatusMessage({ text: err.reason || err.message || "Claim transaction failed.", isError: true });
    } finally {
      setClaiming(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!daoContract || !account) return;

    if (!ethers.isAddress(recipient)) {
      setStatusMessage({ text: "Invalid recipient address.", isError: true });
      return;
    }

    const amountNum = parseFloat(transferAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setStatusMessage({ text: "Amount must be greater than 0.", isError: true });
      return;
    }

    if (amountNum > tokenBalance) {
      setStatusMessage({ text: "Insufficient governance balance.", isError: true });
      return;
    }

    setStatusMessage(null);
    try {
      // Parse token amounts up into full BigInt values (18 decimals) before sending to your contract
      const parsedAmount = ethers.parseUnits(transferAmount, 18);
      
      const tx = await daoContract.transferTokens(recipient, parsedAmount);
      setStatusMessage({ text: "Processing token transfer on-chain...", isError: false });
      
      await tx.wait();
      setStatusMessage({ text: `Successfully sent ${transferAmount} voting tokens!`, isError: false });
      setRecipient("");
      setTransferAmount("");
      fetchGovernanceData(); // Refresh metrics

      // Trigger global state refresh if parent callback exists
      if (onBalanceUpdate) {
        onBalanceUpdate();
      }
    } catch (err: any) {
      console.error("Transfer failed:", err);
      setStatusMessage({ text: err.reason || "Transaction failed.", isError: true });
    }
  };

  useEffect(() => {
    fetchGovernanceData();

    if (!daoContract) return;

    const handleVote = () => fetchGovernanceData();
    daoContract.on("VoteCast", handleVote);

    return () => {
      daoContract.off("VoteCast", handleVote);
    };
  }, [daoContract, account]);

  const votingPowerPercentage = TOTAL_SUPPLY > 0 ? ((tokenBalance / TOTAL_SUPPLY) * 100).toFixed(2) : "0.00";

  return (
    <div className="w-full bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-2xl hover:border-slate-700/50 transition-all duration-300 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      
      <div className="mb-5">
        <h3 className="text-xs font-bold text-slate-300 tracking-wider uppercase">Governance Profile</h3>
        <p className="text-[11px] text-slate-500 mt-1">Monitor personal voting power allocations and distribute assets.</p>
      </div>

      {/* Stats Display */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-4 shadow-inner">
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">Voting Weight</span>
          <span className="text-xl font-mono font-black text-emerald-400 mt-1 block">
            {loading ? "..." : `${tokenBalance.toLocaleString()} GOV`}
          </span>
        </div>
        <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-4 shadow-inner">
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">Network Control</span>
          <span className="text-xl font-mono font-black text-indigo-400 mt-1 block">
            {loading ? "..." : `${votingPowerPercentage}%`}
          </span>
        </div>
      </div>

      {/* Claim Faucet Section */}
      <div className="mb-5">
        {hasClaimed || tokenBalance > 0 ? (
          <button
            disabled
            className="w-full bg-slate-950 border border-slate-800/60 text-slate-500 font-bold py-2.5 px-4 rounded-xl text-xs tracking-wider uppercase cursor-not-allowed text-center opacity-60"
          >
            Tokens Claimed
          </button>
        ) : (
          <button
            onClick={handleClaim}
            disabled={claiming || loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-extrabold py-2.5 px-4 rounded-xl text-xs tracking-wider uppercase shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-all duration-300 disabled:opacity-50"
          >
            {claiming ? "Claiming..." : "Claim Starter Tokens"}
          </button>
        )}
      </div>

      {/* Transfer Tokens Section */}
      <div className="border-t border-slate-800/60 pt-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Delegate / Transfer Weight</h4>
        <form onSubmit={handleTransfer} className="space-y-3">
          <input 
            type="text"
            required
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Recipient address (0x...)"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/30 transition-all shadow-inner"
          />
          <div className="flex gap-2">
            <input 
              type="text"
              required
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              placeholder="Amount"
              className="w-2/5 bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/30 transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={!daoContract || tokenBalance === 0}
              className="w-3/5 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-cyan-500 hover:to-teal-400 text-slate-300 hover:text-slate-950 disabled:opacity-20 transition-all duration-500 font-bold py-2 px-4 rounded-xl text-xs tracking-wider uppercase shadow-lg"
            >
              Transfer Units
            </button>
          </div>
        </form>
      </div>

      {statusMessage && (
        <div className={`mt-4 p-3 rounded-xl text-[11px] font-mono border ${
          statusMessage.isError 
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
            : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
        }`}>
          {statusMessage.text}
        </div>
      )}
    </div>
  );
}