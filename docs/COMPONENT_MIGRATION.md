# Component Integration Examples

This guide shows how to update your existing components (TreasuryDashboard, ProposalCreation, GovernanceProfile) to use the new Web3 state management system.

## TreasuryDashboard Component

### Before (Prop Drilling)
```tsx
// Props passed down from App
interface TreasuryDashboardProps {
  daoContract: ethers.Contract | null;
}

function TreasuryDashboard({ daoContract }: TreasuryDashboardProps) {
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!daoContract) return;
    
    const fetchOwner = async () => {
      setIsLoading(true);
      try {
        const owner = await daoContract.owner();
        setOwnerAddress(owner);
      } catch (err) {
        console.error("Error fetching owner:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOwner();
  }, [daoContract]);

  return (
    <div>
      {isLoading ? "Loading..." : `Owner: ${ownerAddress}`}
    </div>
  );
}
```

### After (Using Web3 Context)
```tsx
import { useWeb3, useContractRead } from '../context';

function TreasuryDashboard() {
  const { account } = useWeb3();
  const { data: ownerAddress, isLoading } = useContractRead(
    'owner',
    [],
    { refetchInterval: 30000 } // Refetch every 30s
  );

  return (
    <div>
      {isLoading ? "Loading..." : `Owner: ${ownerAddress}`}
    </div>
  );
}
```

**Benefits:**
- No prop drilling
- Automatic error handling
- Built-in refetching
- Cleaner code

---

## ProposalCreation Component

### Before (Manual Transaction Handling)
```tsx
interface ProposalCreationProps {
  contract: ethers.Contract | null;
  account: string | null;
  onSuccess: () => void;
}

function ProposalCreation({ contract, account, onSuccess }: ProposalCreationProps) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || !account || !description.trim()) return;

    setTxLoading(true);
    const toastId = toast.loading("Creating proposal...");

    try {
      const gasEstimate = await contract.propose.estimateGas(description);
      const gasLimit = (gasEstimate * 120n) / 100n;

      const tx = await contract.propose(description, { gasLimit });
      toast.loading("Waiting for confirmation...", { id: toastId });
      
      const receipt = await tx.wait();
      
      toast.success("Proposal created!", { id: toastId });
      setDescription("");
      onSuccess();
    } catch (err: any) {
      const reason = err.reason || err.message;
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        toast.error("Transaction rejected", { id: toastId });
      } else if (reason?.includes("reverted")) {
        const cleanReason = reason.match(/'([^']+)'/)?.[1] || "Error";
        toast.error(`Error: ${cleanReason}`, { id: toastId });
      } else {
        toast.error("Failed to create proposal", { id: toastId });
      }
    } finally {
      setTxLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Proposal description..."
        disabled={!account || txLoading}
      />
      <button type="submit" disabled={!account || txLoading || !description.trim()}>
        {txLoading ? "Creating..." : "Create Proposal"}
      </button>
    </form>
  );
}
```

### After (Using useCreateProposal Hook)
```tsx
import { useCreateProposal, useAllProposals } from '../context';

function ProposalCreation() {
  const [description, setDescription] = useState("");
  const { refetch: refetchProposals } = useAllProposals();
  const { createProposal, isLoading, isConfirming } = useCreateProposal(() => {
    setDescription("");
    refetchProposals();
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    await createProposal(description);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Proposal description..."
        disabled={isLoading || isConfirming}
      />
      <button 
        type="submit" 
        disabled={isLoading || isConfirming || !description.trim()}
      >
        {isLoading ? "Executing..." : isConfirming ? "Confirming..." : "Create Proposal"}
      </button>
    </form>
  );
}
```

**What the hook handles:**
- Gas estimation
- Gas limit calculation
- Transaction sending
- Confirmation waiting
- Error handling
- Toast notifications

---

## GovernanceProfile Component

### Before (Multiple State Managers)
```tsx
interface GovernanceProfileProps {
  account: string | null;
  contract: ethers.Contract | null;
}

function GovernanceProfile({ account, contract }: GovernanceProfileProps) {
  const [userBalance, setUserBalance] = useState<string>("0");
  const [votingPower, setVotingPower] = useState<string>("0");
  const [proposalCount, setProposalCount] = useState<number>(0);
  const [hasVoted, setHasVoted] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!account || !contract) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const [balance, total, allProposals] = await Promise.all([
          contract.userBalances(account),
          contract.totalProposalsCount(),
          contract.getAllProposals(),
        ]);

        setUserBalance(balance.toString());
        setVotingPower(balance.toString());
        setProposalCount(Number(total));

        // Check which proposals user voted on
        const votedStatus = await Promise.all(
          allProposals.map((p: any) => contract.hasVoted(account, p.id))
        );
        setHasVoted(votedStatus);
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    const interval = setInterval(fetchProfile, 10000);
    return () => clearInterval(interval);
  }, [account, contract]);

  if (!account) return <div>Connect wallet first</div>;

  return (
    <div className="space-y-4">
      <div>Balance: {userBalance} GOV</div>
      <div>Voting Power: {votingPower}</div>
      <div>Total Proposals: {proposalCount}</div>
      <div>Proposals Voted: {hasVoted.filter(Boolean).length}</div>
    </div>
  );
}
```

### After (Using Specialized Hooks)
```tsx
import {
  useWeb3,
  useUserBalance,
  useAllProposals,
  useTotalProposalsCount,
} from '../context';

function GovernanceProfile() {
  const { account, isConnected } = useWeb3();
  
  // All these hooks handle refetching automatically
  const { data: userBalance } = useUserBalance(account, 10000);
  const { data: allProposals } = useAllProposals(15000);
  const { data: proposalCount } = useTotalProposalsCount(15000);

  if (!isConnected) {
    return <div>Connect wallet first</div>;
  }

  // Count how many proposals this user voted on
  const votedCount = allProposals?.filter((p: any) => {
    // You would use useHasVoted for each proposal to check
    // For now, just demonstrate the structure
    return false;
  }).length || 0;

  return (
    <div className="space-y-4">
      <div>Balance: {userBalance?.toString()} GOV</div>
      <div>Voting Power: {userBalance?.toString()}</div>
      <div>Total Proposals: {proposalCount?.toString()}</div>
      <div>Proposals: {allProposals?.length || 0}</div>
    </div>
  );
}
```

**Benefits:**
- Cleaner code
- Automatic refetching
- Better state management
- Easier to test

---

## Voting Component

### Before (Manual Implementation)
```tsx
interface VotingProps {
  proposalId: number;
  contract: ethers.Contract | null;
  account: string | null;
  onVoteSuccess: () => void;
}

function Voting({ proposalId, contract, account, onVoteSuccess }: VotingProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    if (!contract || !account) return;

    const checkVote = async () => {
      const voted = await contract.hasVoted(account, proposalId);
      setHasVoted(voted);
    };

    checkVote();
  }, [contract, account, proposalId]);

  const handleVote = async (support: boolean) => {
    if (!contract || !account) return;

    setVoting(true);
    const toastId = toast.loading(`Voting ${support ? "for" : "against"}...`);

    try {
      const gasEstimate = await contract.vote.estimateGas(proposalId, support);
      const gasLimit = (gasEstimate * 120n) / 100n;

      const tx = await contract.vote(proposalId, support, { gasLimit });
      toast.loading("Waiting for confirmation...", { id: toastId });
      
      await tx.wait();

      toast.success("Vote submitted!", { id: toastId });
      setHasVoted(true);
      onVoteSuccess();
    } catch (err: any) {
      console.error("Voting error:", err);
      toast.error("Voting failed", { id: toastId });
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button 
        onClick={() => handleVote(true)} 
        disabled={hasVoted || voting}
      >
        {voting ? "..." : "Vote For"}
      </button>
      <button 
        onClick={() => handleVote(false)} 
        disabled={hasVoted || voting}
      >
        {voting ? "..." : "Vote Against"}
      </button>
    </div>
  );
}
```

### After (Using Specialized Hooks)
```tsx
import { useWeb3, useHasVoted, useCastVote } from '../context';

function Voting({ proposalId }) {
  const { account } = useWeb3();
  const { data: hasVoted } = useHasVoted(account, proposalId);
  const { vote, isLoading, isConfirming } = useCastVote();

  return (
    <div className="flex gap-2">
      <button 
        onClick={() => vote(proposalId, true)} 
        disabled={hasVoted || isLoading || isConfirming}
      >
        {isLoading ? "Voting..." : isConfirming ? "Confirming..." : "Vote For"}
      </button>
      <button 
        onClick={() => vote(proposalId, false)} 
        disabled={hasVoted || isLoading || isConfirming}
      >
        {isLoading ? "Voting..." : isConfirming ? "Confirming..." : "Vote Against"}
      </button>
    </div>
  );
}
```

---

## Proposal Execution Component

### Before (Complex Transaction)
```tsx
interface ExecutorProps {
  proposalId: number;
  contract: ethers.Contract | null;
  account: string | null;
  onExecuteSuccess: () => void;
}

function Executor({ proposalId, contract, account, onExecuteSuccess }: ExecutorProps) {
  const [executing, setExecuting] = useState(false);

  const handleExecute = async () => {
    if (!contract || !account) return;

    setExecuting(true);
    const toastId = toast.loading("Executing proposal...");

    try {
      const tx = await contract.execute(proposalId);
      toast.loading("Waiting for confirmation...", { id: toastId });
      
      const receipt = await tx.wait();

      toast.success("Proposal executed!", { id: toastId });
      onExecuteSuccess();
    } catch (err: any) {
      console.error("Execution error:", err);
      toast.error("Execution failed", { id: toastId });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <button onClick={handleExecute} disabled={executing}>
      {executing ? "Executing..." : "Execute"}
    </button>
  );
}
```

### After (Using Hook)
```tsx
import { useExecuteProposal } from '../context';

function Executor({ proposalId }) {
  const { execute, isLoading, isConfirming } = useExecuteProposal();

  return (
    <button 
      onClick={() => execute(proposalId)} 
      disabled={isLoading || isConfirming}
    >
      {isLoading ? "Executing..." : isConfirming ? "Confirming..." : "Execute"}
    </button>
  );
}
```

---

## Real-time Event Listener Component

### Before (Manual Setup)
```tsx
function EventLog() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!window.ethereum) return;

    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    const handleVoteCast = (...args: any[]) => {
      const eventData = args[args.length - 1];
      const event = {
        type: "Vote",
        voter: args[0],
        proposalId: args[1],
        support: args[2],
        txHash: eventData.transactionHash,
      };
      setEvents((prev) => [event, ...prev].slice(0, 50));
    };

    contract.on("VoteCast", handleVoteCast);

    return () => {
      contract.off("VoteCast", handleVoteCast);
    };
  }, []);

  return (
    <div>
      {events.map((event) => (
        <div key={event.txHash}>{event.type}: {event.proposalId}</div>
      ))}
    </div>
  );
}
```

### After (Using Hook)
```tsx
import { useVoteCastEvents } from '../context';

function EventLog() {
  const { events } = useVoteCastEvents((event) => {
    console.log("New vote cast:", event);
  });

  return (
    <div>
      {events.map((event) => (
        <div key={event.transactionHash}>
          Vote on Proposal #{event.args[1]}
        </div>
      ))}
    </div>
  );
}
```

---

## Summary of Migration Steps

1. **Remove prop drilling**: Instead of passing `contract`, `account`, use `useWeb3()` directly
2. **Replace manual data fetching**: Use `useContractRead` and specialized hooks
3. **Replace manual transaction logic**: Use `useContractWrite` and specialized hooks
4. **Replace manual event listeners**: Use `useContractEvents` hooks
5. **Remove manual loading states**: Hooks provide `isLoading` and `isConfirming`
6. **Remove manual error handling**: Hooks handle errors with toasts

This will significantly reduce boilerplate code and make your components more maintainable!
