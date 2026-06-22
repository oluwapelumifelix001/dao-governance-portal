# Real Component Migration Examples

Here are specific examples showing how to migrate your actual components to use the new Web3 system.

## TreasuryDashboard Component

### Current Implementation (with props)
```tsx
interface TreasuryDashboardProps {
  daoContract: ethers.Contract | null;
}

export default function TreasuryDashboard({ daoContract }: TreasuryDashboardProps) {
  const [balance, setBalance] = useState<string>("0.0000");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchVaultBalance = async () => {
    if (!daoContract || !daoContract.runner || !daoContract.runner.provider) {
      setBalance("0.0000");
      setLoading(false);
      return;
    }

    try {
      const provider = daoContract.runner.provider;
      const targetAddress = await daoContract.getAddress();
      const rawBalance = await provider.getBalance(targetAddress);
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
      setBalance("0.0000");
      setLoading(false);
    }

    if (!daoContract) return;

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
```

### New Implementation (with hooks)
```tsx
import { useWeb3, useProposalExecutedEvents } from '../context';
import { ethers } from 'ethers';

export default function TreasuryDashboard() {
  const { provider, isConnected } = useWeb3();
  const [balance, setBalance] = useState<string>("0.0000");
  const [loading, setLoading] = useState<boolean>(true);
  const { CONTRACT_ADDRESS } = useConstants(); // You'd import this or use a constant

  // Listen for execution events to trigger balance refresh
  const { events } = useProposalExecutedEvents(() => {
    fetchVaultBalance(); // Refetch when proposals execute
  });

  const fetchVaultBalance = async () => {
    if (!provider || !isConnected) {
      setBalance("0.0000");
      setLoading(false);
      return;
    }

    try {
      const rawBalance = await provider.getBalance(CONTRACT_ADDRESS);
      const formattedEther = ethers.formatEther(rawBalance);
      setBalance(parseFloat(formattedEther).toFixed(4));
    } catch (err) {
      console.error("Error fetching vault balance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaultBalance();
  }, [provider, isConnected]);

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 px-4 py-1.5 rounded-xl shadow-inner max-w-xs group hover:border-slate-700/50 transition-all duration-300">
      <div className="flex flex-col text-right">
        <span className="text-[9px] font-semibold text-slate-500 tracking-widest uppercase">
          Vault Allocation
        </span>
        <span className="text-sm font-mono font-black text-emerald-400 mt-0.5">
          {loading ? (
            <span className="animate-pulse text-slate-400">Syncing...</span>
          ) : !isConnected ? (
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
```

**Benefits:**
- No prop drilling
- Event listeners managed by hook
- Cleaner code
- Automatic cleanup

---

## ProposalCreation Component

### Current Implementation (with props)
```tsx
interface ProposalCreationProps {
  daoContract: ethers.Contract | null;
  onProposalCreated?: () => void;
}

export default function ProposalCreation({ daoContract, onProposalCreated }: ProposalCreationProps) {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!daoContract) {
      setStatusMessage({ text: "Please connect your wallet first.", isError: true });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const completeDescription = `[${title}] ${description}`;
      const tx = await daoContract.propose(completeDescription);
      
      setStatusMessage({ text: "Broadcasting proposal transaction...", isError: false });
      await tx.wait();

      setStatusMessage({ text: "Proposal successfully recorded on-chain!", isError: false });
      setTitle("");
      setDescription("");

      if (onProposalCreated) onProposalCreated();
    } catch (err: any) {
      console.error("Proposal creation failed:", err);
      setStatusMessage({ 
        text: err.reason || err.message || "Transaction rejected or execution failed.", 
        isError: true 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 shadow-xl hover:border-slate-800 transition-all duration-300">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-slate-100 tracking-tight">Create Governance Proposal</h3>
        <p className="text-xs text-slate-400 mt-1">Submit a new discussion topic or decision path to the DAO simulation ledger.</p>
      </div>

      <form onSubmit={handleSubmitProposal} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Proposal Title</label>
          <input 
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Launch Marketing Campaign v1"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-sans text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Proposal Details</label>
          <textarea 
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Outline the rules, criteria, or core intent for token holders to vote on..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-sans text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
          />
        </div>

        <button 
          type="submit"
          disabled={isSubmitting || !daoContract}
          className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl transition-all duration-300 uppercase text-xs tracking-wider disabled:opacity-50"
        >
          {isSubmitting ? "Broadcasting..." : "Submit Proposal"}
        </button>

        {statusMessage && (
          <div className={`p-3 rounded-lg text-xs ${
            statusMessage.isError 
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-green-500/20 text-green-400 border border-green-500/30'
          }`}>
            {statusMessage.text}
          </div>
        )}
      </form>
    </div>
  );
}
```

### New Implementation (with hooks)
```tsx
import { useWeb3, useCreateProposal, useAllProposals } from '../context';
import toast from 'react-hot-toast';

export default function ProposalCreation() {
  const { isConnected } = useWeb3();
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  
  const { refetch: refetchProposals } = useAllProposals();
  
  const {
    createProposal,
    isLoading,
    isConfirming,
    error,
  } = useCreateProposal(() => {
    // On success: clear form and refetch proposals
    setTitle("");
    setDescription("");
    refetchProposals();
  });

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      toast.error("Please connect your wallet first.");
      return;
    }

    const completeDescription = `[${title}] ${description}`;
    await createProposal(completeDescription);
  };

  return (
    <div className="w-full max-w-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 shadow-xl hover:border-slate-800 transition-all duration-300">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-slate-100 tracking-tight">Create Governance Proposal</h3>
        <p className="text-xs text-slate-400 mt-1">Submit a new discussion topic or decision path to the DAO simulation ledger.</p>
      </div>

      <form onSubmit={handleSubmitProposal} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Proposal Title</label>
          <input 
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Launch Marketing Campaign v1"
            disabled={isLoading || isConfirming}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-sans text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Proposal Details</label>
          <textarea 
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Outline the rules, criteria, or core intent for token holders to vote on..."
            disabled={isLoading || isConfirming}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-sans text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none disabled:opacity-50"
          />
        </div>

        <button 
          type="submit"
          disabled={isLoading || isConfirming || !isConnected || !title.trim() || !description.trim()}
          className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl transition-all duration-300 uppercase text-xs tracking-wider disabled:opacity-50"
        >
          {isLoading 
            ? "Broadcasting..." 
            : isConfirming 
            ? "Confirming..." 
            : "Submit Proposal"}
        </button>

        {error && (
          <div className="p-3 rounded-lg text-xs bg-red-500/20 text-red-400 border border-red-500/30">
            {error.message}
          </div>
        )}
      </form>
    </div>
  );
}
```

**Changes:**
- ✅ Removed prop drilling (`daoContract`, `onProposalCreated`)
- ✅ Using `useCreateProposal` hook
- ✅ Automatic error handling and display
- ✅ Toast notifications instead of status messages
- ✅ Hook manages loading states
- ✅ Automatic refetch of proposals

---

## Usage in App.tsx

### Before
```tsx
function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  
  // ... setup code ...

  return (
    <>
      <TreasuryDashboard daoContract={contract} />
      <ProposalCreation 
        daoContract={contract} 
        onProposalCreated={() => fetchData()}
      />
    </>
  );
}
```

### After
```tsx
function App() {
  const { account, isConnected } = useWeb3();
  
  return (
    <>
      <TreasuryDashboard />
      <ProposalCreation />
    </>
  );
}
```

Much cleaner! 🎉

---

## GovernanceProfile Component

Would use similar pattern:

```tsx
import { useWeb3, useUserBalance, useAllProposals } from '../context';

export default function GovernanceProfile() {
  const { account, isConnected } = useWeb3();
  const { data: userBalance, isLoading: balanceLoading } = useUserBalance(account);
  const { data: allProposals, isLoading: proposalsLoading } = useAllProposals();

  if (!isConnected) {
    return <div>Connect wallet to view your profile</div>;
  }

  const userProposals = allProposals?.filter(
    (p: any) => p.proposer.toLowerCase() === account?.toLowerCase()
  );

  return (
    <div>
      <div>Balance: {balanceLoading ? "Loading..." : userBalance?.toString()} GOV</div>
      <div>Your Proposals: {userProposals?.length || 0}</div>
    </div>
  );
}
```

---

## Migration Checklist

- [ ] Install Web3Provider in main.tsx
- [ ] Update TreasuryDashboard to use useWeb3 and useProposalExecutedEvents
- [ ] Update ProposalCreation to use useCreateProposal
- [ ] Update GovernanceProfile to use useUserBalance, useAllProposals
- [ ] Remove prop drilling from App.tsx
- [ ] Test all functionality
- [ ] Remove old manual transaction logic
- [ ] Deploy and verify on testnet

Each component becomes simpler and more maintainable! 🚀
