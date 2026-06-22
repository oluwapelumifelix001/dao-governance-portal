# Web3 DAO Simulator - State Management System

A professional, production-ready Web3 state management system for your DAO Simulator built with React Context, custom hooks, and ethers.js v6.

## 🎯 What You Get

### Global State Management
- ✅ Wallet connection/disconnection
- ✅ Contract instance
- ✅ Provider and signer management
- ✅ Network detection and switching
- ✅ Account change detection

### Data Reading Hooks
- ✅ Generic `useContractRead()` for any contract function
- ✅ Specialized hooks for common patterns
- ✅ Automatic refetching at intervals
- ✅ Loading and error states
- ✅ Built-in error handling

### Transaction Hooks
- ✅ Generic `useContractWrite()` for state-changing transactions
- ✅ Automatic gas estimation
- ✅ Gas limit calculation with multiplier
- ✅ Confirmation waiting
- ✅ Toast notifications
- ✅ Error extraction and formatting

### Event Hooks
- ✅ Listen to contract events in real-time
- ✅ Event history management
- ✅ Custom callbacks on events
- ✅ Multiple event listeners

## 📁 Files Created

```
src/context/
├── Web3Context.tsx           # Main context provider
├── useWeb3.ts                # Access context anywhere
├── useContractRead.ts        # Read hooks
├── useContractWrite.ts       # Write hooks
├── useContractEvents.ts      # Event listeners
└── index.ts                  # Clean exports

docs/
├── README.md                 # This file
├── QUICK_REFERENCE.md        # Quick lookup (START HERE)
├── WEB3_STATE_MANAGEMENT.md  # Full documentation
├── COMPONENT_MIGRATION.md    # General migration patterns
├── REAL_COMPONENT_MIGRATION.md # Examples with your components
└── IMPLEMENTATION_ROADMAP.md # Step-by-step implementation plan
```

## 🚀 Quick Start

### 1. Wrap Your App with Web3Provider
In `src/main.tsx`:
```tsx
import { Web3Provider } from './context'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Web3Provider>
      <App />
    </Web3Provider>
  </StrictMode>,
)
```

### 2. Use Hooks in Components
```tsx
import { useWeb3, useUserBalance, useCreateProposal } from './context'

function MyComponent() {
  const { account, isConnected, connectWallet } = useWeb3()
  const { data: balance } = useUserBalance(account)
  const { createProposal, isLoading } = useCreateProposal()

  return (
    <div>
      {isConnected ? (
        <>
          <p>Balance: {balance} GOV</p>
          <button onClick={() => createProposal("My proposal")}>
            Create Proposal
          </button>
        </>
      ) : (
        <button onClick={connectWallet}>Connect Wallet</button>
      )}
    </div>
  )
}
```

## 📖 Documentation

### For Quick Learning
1. **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - 5 minute overview of all hooks
2. **[REAL_COMPONENT_MIGRATION.md](REAL_COMPONENT_MIGRATION.md)** - See your actual components migrated

### For Deep Understanding
1. **[WEB3_STATE_MANAGEMENT.md](WEB3_STATE_MANAGEMENT.md)** - Complete API documentation
2. **[COMPONENT_MIGRATION.md](COMPONENT_MIGRATION.md)** - Migration patterns
3. **[IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md)** - Step-by-step implementation

### For Code Examples
- **`src/App-new.tsx`** - Full app example using all hooks

## 🎯 Hooks Overview

### Web3 Connection
```tsx
const { account, isConnected, connectWallet, disconnectWallet } = useWeb3()
```

### Reading Data
```tsx
const { data: balance } = useUserBalance(account)
const { data: proposals } = useAllProposals()
const { data: proposal } = useProposalDetails(proposalId)
const { data: hasVoted } = useHasVoted(account, proposalId)
```

### Writing Transactions
```tsx
const { createProposal, isLoading } = useCreateProposal()
const { vote, isLoading, isConfirming } = useCastVote()
const { execute, isLoading, isConfirming } = useExecuteProposal()
```

### Listening to Events
```tsx
const { events } = useVoteCastEvents()
const { events } = useProposalExecutedEvents()
```

## 🔄 Automatic Features

### Error Handling
- Catches all transaction errors
- Extracts and formats error messages
- Shows user-friendly error toasts
- Logs detailed errors to console

### Gas Estimation
- Automatically estimates gas for transactions
- Applies 1.2x multiplier for safety
- Handles estimation failures gracefully
- Customizable multiplier via options

### Loading States
- `isLoading` - While transaction is executing
- `isConfirming` - While waiting for block confirmation
- Combined with UI to disable buttons

### Automatic Refetching
- Set refetch intervals on read hooks
- Recommended: 10s for balance, 15s for proposals
- Configurable per hook

### Event Listening
- Automatically sets up listeners
- Manages event history
- Cleans up on unmount
- Real-time UI updates

## 💡 Key Features

### 1. No Prop Drilling
Before:
```tsx
<Component daoContract={contract} account={account} {...} />
```

After:
```tsx
<Component /> {/* Uses useWeb3() and hooks internally */}
```

### 2. Automatic State Management
Before:
```tsx
const [balance, setBalance] = useState(null)
const [loading, setLoading] = useState(false)
// ... manual fetching and error handling
```

After:
```tsx
const { data: balance, isLoading } = useUserBalance(account)
// ... that's it!
```

### 3. Clean Error Handling
Before:
```tsx
try {
  await contract.vote(id, support, { gasLimit })
} catch (err) {
  if (err.code === 4001) { /* ... */ }
  else if (err.reason) { /* ... */ }
  // ... complex error logic
}
```

After:
```tsx
const { vote, error } = useCastVote()
await vote(id, support)
// Hook handles everything automatically
```

### 4. Built-in Toast Notifications
```tsx
// Automatic toasts for:
// - Transaction broadcasting
// - Waiting for confirmation
// - Success messages
// - Error messages
```

## 🧪 Testing

Each hook has been built with testing in mind:
- Hooks are pure and testable
- State management is centralized
- Easy to mock for unit tests
- Clear error messages for debugging

## 🔐 Security

- ✅ Uses ethers.js v6 (latest secure version)
- ✅ No private keys handled in frontend
- ✅ Uses wallet signer for security
- ✅ Proper error handling
- ✅ Gas estimation prevents under-execution

## ⚙️ Configuration

### Network Settings
Edit `Web3Context.tsx`:
```tsx
const CHAIN_ID = 11155111  // Sepolia
const NETWORK_NAME = "Sepolia"
```

### Gas Settings
Edit transaction hooks:
```tsx
const { write } = useContractWrite({
  gasMultiplier: 1.2  // Adjust safety multiplier
})
```

### Refetch Intervals
```tsx
useUserBalance(account, 10000)    // Refetch every 10s
useAllProposals(15000)            // Refetch every 15s
```

## 🚀 Performance Optimization

### Refetch Intervals
- Balance: 10 seconds (frequent user checks)
- Proposals: 15 seconds (less frequent)
- Votes: 5 seconds (important updates)

### Lazy Loading
```tsx
const { data, refetch } = useContractRead(
  'expensive_function',
  [],
  { skip: !shouldFetch }  // Skip loading until needed
)
```

### Event History Limits
```tsx
const { events } = useContractEvents(
  'VoteCast',
  callback,
  50  // Max 50 events in history
)
```

## 🐛 Troubleshooting

### Common Issues

**"useWeb3 must be used within a Web3Provider"**
- Solution: Wrap your app with `<Web3Provider>` in main.tsx

**Data not updating**
- Solution: Set appropriate `refetchInterval` values

**Wallet not connecting**
- Solution: Ensure MetaMask is installed and user approves connection

**Transaction fails**
- Solution: Check console for error details, verify contract function signature

See [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md#-common-issues--fixes) for more issues.

## 📚 Additional Resources

- [ethers.js Documentation](https://docs.ethers.org/)
- [React Hooks Documentation](https://react.dev/reference/react)
- [Context API Documentation](https://react.dev/reference/react/createContext)

## 🤝 Integration with Existing Code

The new Web3 system is **100% backward compatible**:
- Old components continue to work
- New components use hooks
- Gradual migration possible
- Mix old and new patterns

## 📝 Example: Complete Migration

See [REAL_COMPONENT_MIGRATION.md](REAL_COMPONENT_MIGRATION.md) for before/after examples of migrating your actual components.

## 🎓 Learning Path

1. Read [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - 5 minutes
2. Read [REAL_COMPONENT_MIGRATION.md](REAL_COMPONENT_MIGRATION.md) - 15 minutes
3. Migrate first component - 20 minutes
4. Repeat for other components - 20 minutes each
5. Simplify App.tsx - 20 minutes
6. Test everything - 30 minutes

**Total: ~2-4 hours for complete migration**

## ✅ Checklist for Implementation

- [ ] Read QUICK_REFERENCE.md
- [ ] Review REAL_COMPONENT_MIGRATION.md
- [ ] Update main.tsx with Web3Provider (already done)
- [ ] Migrate TreasuryDashboard
- [ ] Migrate ProposalCreation
- [ ] Migrate GovernanceProfile
- [ ] Remove prop drilling from App.tsx
- [ ] Test wallet connection
- [ ] Test data fetching
- [ ] Test transaction execution
- [ ] Test event listeners
- [ ] Deploy to testnet

## 🎉 Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Code Lines** | ~400 lines of boilerplate | ~80 lines of hook usage |
| **State Management** | Manual useState everywhere | Centralized context |
| **Error Handling** | Complex try-catch logic | Automatic error handling |
| **Loading States** | Manual isLoading flags | Built-in isLoading/isConfirming |
| **Gas Estimation** | Manual estimation | Automatic with multiplier |
| **Prop Drilling** | Deep prop passing | Direct hook usage |
| **Refetching** | Manual intervals | Automatic with configurable intervals |
| **Type Safety** | Partial types | Full TypeScript support |
| **Maintainability** | Difficult | Easy |
| **Testing** | Hard to mock | Easy to mock |

## 📞 Questions?

1. Check [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
2. Look at [REAL_COMPONENT_MIGRATION.md](REAL_COMPONENT_MIGRATION.md)
3. Review [App-new.tsx](src/App-new.tsx) for complete examples
4. Read full docs in [WEB3_STATE_MANAGEMENT.md](WEB3_STATE_MANAGEMENT.md)

---

**Start with:** [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

Happy coding! 🚀
