import { useState, useEffect } from "react";
import { useWeb3 } from "../context";

export default function NetworkBlockReader() {
  const { provider, isConnected } = useWeb3();
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!provider) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Fetch initial block number
    provider.getBlockNumber()
      .then((num) => {
        setBlockNumber(num);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching block number:", err);
        setLoading(false);
      });

    // Listen to live new block events on Sepolia
    const handleNewBlock = (num: number) => {
      setBlockNumber(num);
    };

    provider.on("block", handleNewBlock);

    return () => {
      provider.off("block", handleNewBlock);
    };
  }, [provider]);

  if (!isConnected) {
    return null;
  }

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 font-mono text-[11px] backdrop-blur-xl hover:border-slate-700/50 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
          <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold">Sepolia Node Stream</span>
        </div>
        <span className="text-slate-600 text-[9px] uppercase font-bold">Live Blocks</span>
      </div>
      <div className="mt-2.5 flex justify-between items-baseline">
        <span className="text-slate-500">Current Block Height:</span>
        <span className="text-xs font-bold text-cyan-400">
          {loading ? "Fetching..." : blockNumber !== null ? `#${blockNumber.toLocaleString()}` : "Offline"}
        </span>
      </div>
    </div>
  );
}
