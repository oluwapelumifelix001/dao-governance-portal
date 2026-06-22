import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface TreasuryDashboardProps {
  daoContract: ethers.Contract | null;
}

export default function TreasuryDashboard({ daoContract }: TreasuryDashboardProps) {
  const [balance, setBalance] = useState<string>("0.0000");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchVaultBalance = async () => {
    // Safety check: ensure contract, runner, and provider exist before fetching
    if (!daoContract || !daoContract.runner || !daoContract.runner.provider) {
      setBalance("0.0000");
      setLoading(false);
      return;
    }

    try {
      const provider = daoContract.runner.provider;
      const targetAddress = await daoContract.getAddress();
      const rawBalance = await provider.getBalance(targetAddress);

      // Smooth parsing for clean decimal precision layout
      const formattedEther = ethers.formatEther(rawBalance);
      setBalance(parseFloat(formattedEther).toFixed(4));
      setLoading(false);
    } catch (err) {
      console.error("Error fetching vault balance:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (daoContract) {
      fetchVaultBalance();
    } else {
      // Instantly drop the loading state if no wallet/contract is connected
      setBalance("0.0000");
      setLoading(false);
    }

    if (!daoContract) return;

    // Listen for live execution signals from contract events
    const handleExecution = () => {
      fetchVaultBalance();
    };

    daoContract.on("ProposalExecuted", handleExecution);

    return () => {
      daoContract.off("ProposalExecuted", handleExecution);
    };
  }, [daoContract]);

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 px-4 py-1.5 rounded-xl shadow-inner max-w-xs group hover:border-slate-700/50 transition-all duration-300">
      <div className="flex flex-col text-right">
        <span className="text-[9px] font-semibold text-slate-500 tracking-widest uppercase">
          Vault Allocation
        </span>
        <span className="text-sm font-mono font-black text-emerald-400 mt-0.5">
          {loading ? (
            <span className="animate-pulse text-slate-400">Syncing...</span>
          ) : !daoContract ? (
            <span className="text-slate-500 flex items-center justify-end gap-1 text-xs font-sans font-medium">
              🔌 Disconnected
            </span>
          ) : (
            `${balance} ETH`
          )}
        </span>
      </div>
    </div>
  );
}