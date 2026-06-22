import { useWeb3 } from "../context";

export default function ConnectWallet() {
  const { account, isConnected, isConnecting, connectWallet, disconnectWallet } = useWeb3();

  return (
    <div className="p-5 border border-slate-800/80 rounded-2xl bg-slate-900/40 text-slate-100 max-w-sm backdrop-blur-xl shadow-2xl relative overflow-hidden hover:border-slate-700/50 transition-all duration-300">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3">
        DAO Portal Auth
      </h3>

      {isConnected && account ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Node Status</span>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 shadow-[0_0_8px_rgba(16,185,129,0.1)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
              Connected
            </span>
          </div>
          
          <div className="text-xs text-slate-400 bg-slate-950/80 border border-slate-900 p-3 rounded-xl break-all font-mono shadow-inner">
            {account}
          </div>

          <button
            onClick={disconnectWallet}
            className="w-full mt-1 bg-gradient-to-r from-slate-950 to-slate-900 hover:from-rose-950/20 hover:to-rose-900/10 text-slate-400 hover:text-rose-400 border border-slate-800/60 hover:border-rose-900/30 font-bold py-2 rounded-xl text-xs tracking-wider uppercase transition-all duration-300 shadow-md"
          >
            Disconnect Wallet
          </button>
        </div>
      ) : (
        <div>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Link your MetaMask wallet node to load parameters and execute governance allocations.
          </p>
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="w-full bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-extrabold py-2.5 px-4 rounded-xl text-xs tracking-wider uppercase disabled:opacity-50 transition-all duration-300 shadow-lg shadow-cyan-500/20"
          >
            {isConnecting ? "Establishing Sync..." : "Connect MetaMask"}
          </button>
        </div>
      )}
    </div>
  );
}
