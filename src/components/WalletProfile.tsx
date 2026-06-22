import { useWeb3, useUserBalance } from "../context";

export default function WalletProfile() {
  const { account, isConnected } = useWeb3();
  const { data: balanceData, isLoading, error } = useUserBalance(account);

  if (!isConnected || !account) {
    return (
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-slate-400 text-xs font-mono">
        No active node connected.
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-slate-100 flex flex-col gap-1 font-mono text-xs">
      <span className="text-slate-500 uppercase tracking-wider text-[9px] font-bold">Node Address</span>
      <span className="text-cyan-400 truncate mb-2">{account}</span>
      
      <span className="text-slate-500 uppercase tracking-wider text-[9px] font-bold">DAO Token Balance</span>
      <span className="text-lg font-black text-emerald-400">
        {isLoading ? "Querying..." : error ? "Sync Error" : `${balanceData?.toString() || "0"} GOV`}
      </span>
    </div>
  );
}
