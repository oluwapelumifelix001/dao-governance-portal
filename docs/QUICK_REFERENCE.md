# Web3 Hooks Quick Reference

## 🎣 Reading Data (useContractRead)

```tsx
// Specific hooks (recommended)
const { data: balance } = useUserBalance(account)
const { data: proposals } = useAllProposals()
const { data: proposal } = useProposalDetails(proposalId)
const { data: hasVoted } = useHasVoted(account, proposalId)
const { data: duration } = useProposalDuration()
const { data: count } = useTotalProposalsCount()

// Generic hook
const { data, isLoading, error, refetch } = useContractRead(
  'functionName',
  [arg1, arg2],
  { refetchInterval: 10000 }
)
```

## ✍️ Writing Data (useContractWrite)

```tsx
// Specific hooks (recommended)
const { createProposal, isLoading, isConfirming } = useCreateProposal()
const { vote, isLoading, isConfirming } = useCastVote()
const { execute, isLoading, isConfirming } = useExecuteProposal()
const { distribute, isLoading, isConfirming } = useDistributeTokens()
const { transfer, isLoading, isConfirming } = useTransferTokens()

// Generic hook
const { write, isLoading, isConfirming, data, error } = useContractWrite()
await write('functionName', [arg1, arg2])

// Usage
const { createProposal } = useCreateProposal(() => refetchProposals())
await createProposal("My proposal description")
```

## 📡 Listening to Events (useContractEvents)

```tsx
// Specific event hooks
const { events: votes } = useVoteCastEvents(
  (event) => console.log("New vote:", event)
)
const { events: executions } = useProposalExecutedEvents(
  (event) => console.log("Executed:", event)
)

// Generic hook
const { events, isListening, clear } = useContractEvents(
  'EventName',
  (event) => { /* callback */ },
  50 // max history
)

// Multiple events
const { allEvents } = useMultipleContractEvents(['VoteCast', 'ProposalExecuted'])
```

## 🔐 Wallet State (useWeb3)

```tsx
const {
  account,              // Wallet address or null
  isConnected,          // Boolean
  isConnecting,         // Boolean
  contract,             // ethers.Contract
  provider,             // ethers.BrowserProvider
  signer,               // ethers.Signer
  chainId,              // Network chain ID
  networkName,          // Network name
  connectWallet,        // Async function
  disconnectWallet,     // Function
  switchNetwork,        // Async function
} = useWeb3()
```

---

## Common Patterns

### 1. Load User Data on Mount
```tsx
function MyComponent() {
  const { account } = useWeb3()
  const { data: balance, isLoading } = useUserBalance(account)
  
  if (isLoading) return <div>Loading...</div>
  return <div>Balance: {balance}</div>
}
```

### 2. Create and Refresh
```tsx
function ProposalForm() {
  const { refetch: refetchProposals } = useAllProposals()
  const { createProposal, isLoading } = useCreateProposal(() => {
    refetchProposals() // Refresh list after creation
  })
  
  return (
    <button onClick={() => createProposal("desc")}>
      {isLoading ? "Creating..." : "Create"}
    </button>
  )
}
```

### 3. Transaction with Confirmation
```tsx
function VoteForm() {
  const { vote, isLoading, isConfirming } = useCastVote()
  
  return (
    <button disabled={isLoading || isConfirming}>
      {isLoading 
        ? "Executing..." 
        : isConfirming 
        ? "Confirming..." 
        : "Vote"}
    </button>
  )
}
```

### 4. Real-time Event Log
```tsx
function EventLog() {
  const { events } = useVoteCastEvents()
  
  return (
    <div>
      {events.map(event => (
        <div key={event.transactionHash}>
          Vote #{event.blockNumber}
        </div>
      ))}
    </div>
  )
}
```

### 5. Guard Against Wallet Not Connected
```tsx
function AdminPanel() {
  const { account, isConnected } = useWeb3()
  
  if (!isConnected) {
    return <div>Connect wallet to continue</div>
  }
  
  return <div>Logged in as {account}</div>
}
```

### 6. Conditional Refetch
```tsx
function ProposalDetails({ id }: { id: number }) {
  const { data: proposal } = useProposalDetails(
    id, 
    15000  // Refetch every 15 seconds
  )
  
  return <div>{proposal?.description}</div>
}
```

### 7. Error Handling
```tsx
function DataComponent() {
  const { data, isLoading, error } = useUserBalance(account)
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!data) return <div>No data</div>
  
  return <div>{data}</div>
}
```

### 8. Skip Loading Optionally
```tsx
function OptionalData({ shouldLoad }: { shouldLoad: boolean }) {
  const { data } = useUserBalance(account, 0, { skip: !shouldLoad })
  
  return shouldLoad ? <div>{data}</div> : <div>Not loaded</div>
}
```

---

## Refetch Intervals (Recommended)

```tsx
// Real-time updates
useHasVoted(account, proposalId, 3000)      // 3 seconds

// User balance updates
useUserBalance(account, 10000)                // 10 seconds

// Proposal data updates
useAllProposals(15000)                        // 15 seconds
useProposalDetails(id, 15000)                 // 15 seconds

// Less frequently updated
useProposalDuration(60000)                    // 60 seconds
useTotalProposalsCount(30000)                 // 30 seconds

// No refetch needed
useContractRead('function', [], { refetchInterval: 0 })
```

---

## Error Messages (Automatic)

The hooks automatically handle and format errors:

```
"Transaction rejected by user"
"Insufficient balance for gas"
"Contract Revert: Custom error message"
"Transaction nonce already used"
"Invalid transaction data"
"Network not found"
```

---

## Loading States

```tsx
// Reading data
const { isLoading } = useContractRead()

// Writing data
const { isLoading, isConfirming } = useContractWrite()

// Events
const { isListening } = useContractEvents()

// Web3 connection
const { isConnecting } = useWeb3()
```

---

## TypeScript Types

```tsx
// Web3Context
import type { Web3ContextType } from '../context'

// Contract read options
import type { UseContractReadOptions } from '../context'

// Contract write options
import type { TransactionOptions, WriteContractOptions } from '../context'

// Events
import type { ContractEvent } from '../context'
```

---

## Common Fixes

### "useWeb3 must be used within a Web3Provider"
✅ Wrap your app with `<Web3Provider>` in main.tsx

### Infinite refetching
✅ Check your refetchInterval is reasonable (not 0)

### Stale data
✅ Use appropriate refetch intervals or call `refetch()` after transactions

### Multiple transactions pending
✅ Use `isLoading` or `isConfirming` to disable buttons

### Contract not initialized
✅ Check `useWeb3().contract !== null` before using it

---

## Tips

💡 Always use specialized hooks when available
💡 Set realistic refetch intervals (3000-60000ms)
💡 Use `onSuccess` callback to refetch related data
💡 Enable toasts for better UX (`showToast: true`)
💡 Check `isConnected` before rendering protected components
💡 Use `skipProp` for conditional data fetching
