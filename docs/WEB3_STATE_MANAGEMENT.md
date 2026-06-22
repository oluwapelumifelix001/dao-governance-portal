# Web3 State Management Architecture Guide

## Overview

This guide covers the new Web3 state management system for your DAO Simulator. It consists of:

1. **Web3Context** - Global state for wallet and contract
2. **useWeb3 hook** - Access wallet/contract state anywhere
3. **useContractRead hooks** - Read data from contract
4. **useContractWrite hooks** - Execute state-changing transactions
5. **useContractEvents hooks** - Listen to contract events

## Setup

### 1. Wrap your app with Web3Provider

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

## Core Concepts

### Web3 Context (Global State)

Access wallet and contract instance anywhere:

```tsx
import { useWeb3 } from './context'

function MyComponent() {
  const {
    account,           // User's wallet address (string | null)
    isConnected,       // Boolean flag
    isConnecting,      // Boolean while connecting
    contract,          // ethers.Contract instance
    provider,          // ethers.BrowserProvider
    signer,            // ethers.Signer
    chainId,           // Network chain ID
    networkName,       // Network name
    connectWallet,     // Async function to connect
    disconnectWallet,  // Function to disconnect
    switchNetwork,     // Async function to switch networks
  } = useWeb3()

  return (
    <button onClick={connectWallet} disabled={isConnecting}>
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  )
}
```

---

## Reading Data from Contract

### Basic Pattern

```tsx
import { useContractRead } from './context'

function MyComponent() {
  const { data, isLoading, error, refetch } = useContractRead(
    'functionName',        // Contract function name
    [arg1, arg2],          // Function arguments
    {
      skip: false,         // Skip execution if true
      refetchInterval: 0,  // Auto-refetch interval (ms)
      onError: (error) => console.error(error),
    }
  )

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && <p>Data: {JSON.stringify(data)}</p>}
      <button onClick={refetch}>Refresh</button>
    </div>
  )
}
```

### Specialized Read Hooks

#### User Balance

```tsx
import { useUserBalance } from './context'

function BalanceComponent() {
  const { data: balance, isLoading } = useUserBalance(account, 10000)
  // Refetches every 10 seconds

  return <div>Balance: {balance?.toString()} GOV</div>
}
```

#### All Proposals

```tsx
import { useAllProposals } from './context'

function ProposalsComponent() {
  const { data: proposals, isLoading } = useAllProposals(15000)
  // Auto-refetches every 15 seconds

  return (
    <div>
      {proposals?.map((p) => (
        <div key={p.id}>{p.description}</div>
      ))}
    </div>
  )
}
```

#### Single Proposal

```tsx
import { useProposalDetails } from './context'

function ProposalComponent({ proposalId }) {
  const { data: proposal } = useProposalDetails(proposalId, 10000)

  return <div>{proposal?.description}</div>
}
```

#### Check if User Voted

```tsx
import { useHasVoted } from './context'

function VoteCheckComponent({ account, proposalId }) {
  const { data: hasVoted } = useHasVoted(account, proposalId)

  return <div>{hasVoted ? "You voted" : "You haven't voted"}</div>
}
```

#### Proposal Duration

```tsx
import { useProposalDuration } from './context'

function DurationComponent() {
  const { data: duration } = useProposalDuration()
  return <div>Duration: {duration?.toString()} seconds</div>
}
```

---

## Writing to Contract (Transactions)

### Basic Pattern

```tsx
import { useContractWrite } from './context'

function MyComponent() {
  const {
    write,           // Function to call contract
    isLoading,       // Loading while executing
    isConfirming,    // Waiting for confirmation
    data,            // Transaction hash
    error,           // Error object
    reset,           // Reset state
  } = useContractWrite({
    gasMultiplier: 1.2,  // Gas limit multiplier
    onSuccess: (txHash) => console.log('Success!', txHash),
    onError: (error) => console.error('Error!', error),
    showToast: true,     // Show toast notifications
  })

  const handleSubmit = async () => {
    await write('functionName', [arg1, arg2])
  }

  return (
    <button onClick={handleSubmit} disabled={isLoading || isConfirming}>
      {isLoading ? 'Executing...' : isConfirming ? 'Confirming...' : 'Submit'}
    </button>
  )
}
```

### Specialized Write Hooks

#### Create Proposal

```tsx
import { useCreateProposal } from './context'

function ProposalCreator() {
  const { createProposal, isLoading, isConfirming } = useCreateProposal(
    (txHash) => {
      console.log('Proposal created:', txHash)
      // Refetch proposals
    }
  )

  const handleCreate = async () => {
    await createProposal("My proposal description")
  }

  return (
    <button onClick={handleCreate} disabled={isLoading || isConfirming}>
      {isLoading ? 'Executing...' : isConfirming ? 'Confirming...' : 'Create'}
    </button>
  )
}
```

#### Vote on Proposal

```tsx
import { useCastVote } from './context'

function VoteComponent({ proposalId }) {
  const { vote, isLoading, isConfirming } = useCastVote(
    (txHash) => console.log('Voted:', txHash)
  )

  const handleVote = async (support: boolean) => {
    await vote(proposalId, support)
  }

  return (
    <>
      <button onClick={() => handleVote(true)} disabled={isLoading || isConfirming}>
        Vote For
      </button>
      <button onClick={() => handleVote(false)} disabled={isLoading || isConfirming}>
        Vote Against
      </button>
    </>
  )
}
```

#### Execute Proposal

```tsx
import { useExecuteProposal } from './context'

function ExecutorComponent({ proposalId }) {
  const { execute, isLoading, isConfirming } = useExecuteProposal(
    (txHash) => console.log('Executed:', txHash)
  )

  const handleExecute = async () => {
    await execute(proposalId)
  }

  return (
    <button onClick={handleExecute} disabled={isLoading || isConfirming}>
      {isLoading ? 'Executing...' : isConfirming ? 'Confirming...' : 'Execute'}
    </button>
  )
}
```

#### Distribute Tokens (Owner only)

```tsx
import { useDistributeTokens } from './context'

function DistributorComponent() {
  const { distribute, isLoading } = useDistributeTokens(
    (txHash) => console.log('Distributed:', txHash)
  )

  const handleDistribute = async () => {
    await distribute("0x...", "1000")
  }

  return (
    <button onClick={handleDistribute} disabled={isLoading}>
      Distribute
    </button>
  )
}
```

#### Transfer Tokens

```tsx
import { useTransferTokens } from './context'

function TransferComponent() {
  const { transfer, isLoading } = useTransferTokens(
    (txHash) => console.log('Transferred:', txHash)
  )

  const handleTransfer = async () => {
    await transfer("0x...", "500")
  }

  return (
    <button onClick={handleTransfer} disabled={isLoading}>
      Transfer
    </button>
  )
}
```

---

## Listening to Events

### Basic Pattern

```tsx
import { useContractEvents } from './context'

function EventListener() {
  const { events, isListening, clear } = useContractEvents(
    'VoteCast',  // Event name
    (event) => {
      console.log('Event received:', event)
    },
    50  // Max events to keep
  )

  return (
    <div>
      {events.map((event) => (
        <div key={event.transactionHash}>
          {event.name}: {JSON.stringify(event.args)}
        </div>
      ))}
    </div>
  )
}
```

### Specialized Event Hooks

#### Vote Cast Events

```tsx
import { useVoteCastEvents } from './context'

function VoteListener() {
  const { events } = useVoteCastEvents((event) => {
    const voter = event.args[0]
    const proposalId = event.args[1]
    const support = event.args[2]
    console.log(`Vote by ${voter} on proposal ${proposalId}: ${support}`)
  })

  return <div>Last 100 votes: {events.length}</div>
}
```

#### Proposal Executed Events

```tsx
import { useProposalExecutedEvents } from './context'

function ExecutionListener() {
  const { events } = useProposalExecutedEvents((event) => {
    const proposalId = event.args[0]
    console.log(`Proposal ${proposalId} executed!`)
  })

  return <div>Last 50 executions: {events.length}</div>
}
```

#### Multiple Events

```tsx
import { useMultipleContractEvents } from './context'

function MultiListener() {
  const { allEvents } = useMultipleContractEvents(
    ['VoteCast', 'ProposalExecuted'],
    (eventName, event) => {
      console.log(`${eventName}:`, event)
    }
  )

  return (
    <div>
      <p>Votes: {allEvents.VoteCast?.length || 0}</p>
      <p>Executions: {allEvents.ProposalExecuted?.length || 0}</p>
    </div>
  )
}
```

---

## Complete Example: Proposal Component

```tsx
import React, { useState } from 'react'
import toast from 'react-hot-toast'
import {
  useWeb3,
  useAllProposals,
  useUserBalance,
  useHasVoted,
  useCastVote,
  useExecuteProposal,
  useProposalDuration,
} from '../context'

function ProposalList() {
  const { account, isConnected } = useWeb3()
  const { data: proposals } = useAllProposals(15000)  // Refetch every 15s
  const { data: userBalance } = useUserBalance(account)
  const { vote, isLoading: voteLoading } = useCastVote()
  const { execute, isLoading: executeLoading } = useExecuteProposal()
  const { data: duration } = useProposalDuration()

  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000))

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  if (!isConnected) {
    return <div>Please connect your wallet</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2>Proposals</h2>
        <div>Your Balance: {userBalance?.toString()} GOV</div>
      </div>

      {proposals?.map((proposal) => {
        const { data: hasVoted } = useHasVoted(account, proposal.id)
        const isActive = currentTime < proposal.deadline
        const totalVotes = proposal.forVotes + proposal.againstVotes

        return (
          <div key={proposal.id} className="border p-4 rounded">
            <h3>Proposal #{proposal.id}</h3>
            <p>{proposal.description}</p>

            {/* Vote Progress */}
            <div className="mt-4 space-y-2">
              <div>
                <div>For: {proposal.forVotes}</div>
                <div className="w-full bg-gray-200 rounded h-2">
                  <div
                    className="bg-green-500 h-2"
                    style={{
                      width: `${
                        totalVotes > 0
                          ? (proposal.forVotes / totalVotes) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div>Against: {proposal.againstVotes}</div>
                <div className="w-full bg-gray-200 rounded h-2">
                  <div
                    className="bg-red-500 h-2"
                    style={{
                      width: `${
                        totalVotes > 0
                          ? (proposal.againstVotes / totalVotes) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              {isActive && !hasVoted && (
                <>
                  <button
                    onClick={() => vote(proposal.id, true)}
                    disabled={voteLoading}
                  >
                    Vote For
                  </button>
                  <button
                    onClick={() => vote(proposal.id, false)}
                    disabled={voteLoading}
                  >
                    Vote Against
                  </button>
                </>
              )}

              {!proposal.executed && currentTime >= proposal.deadline && (
                <button
                  onClick={() => execute(proposal.id)}
                  disabled={executeLoading}
                >
                  Execute
                </button>
              )}

              {proposal.executed && <div className="text-green-600">Executed</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ProposalList
```

---

## Error Handling

The hooks handle common errors automatically:

- **User rejection**: Shows "Transaction rejected by user"
- **Insufficient gas**: Shows "Insufficient balance for gas"
- **Contract revert**: Extracts and shows revert reason
- **Network errors**: Shows clear error messages

Custom error handling:

```tsx
const { write, error } = useContractWrite({
  onError: (error) => {
    if (error.message.includes('insufficient funds')) {
      // Handle low balance
    } else if (error.message.includes('reverted')) {
      // Handle contract revert
    }
  },
})
```

---

## Best Practices

1. **Always wrap your app with `<Web3Provider>`** at the root level
2. **Use specialized hooks** (e.g., `useAllProposals`) instead of generic `useContractRead`
3. **Set appropriate `refetchInterval`** values:
   - Balance: 10,000ms (10s)
   - Proposals: 15,000ms (15s)
   - Votes: 5,000ms (5s)
4. **Handle loading and error states** in your UI
5. **Use `onSuccess` callback** to refetch related data
6. **Enable toasts** for user feedback (`showToast: true`)

---

## Migration Guide

To migrate your existing components:

### Before (Old Way)
```tsx
const [balance, setBalance] = useState(null)
const [loading, setLoading] = useState(false)

useEffect(() => {
  const fetchBalance = async () => {
    setLoading(true)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const contract = new ethers.Contract(ADDRESS, ABI, provider)
      const bal = await contract.userBalances(account)
      setBalance(bal)
    } finally {
      setLoading(false)
    }
  }
  fetchBalance()
}, [account])

if (loading) return <div>Loading...</div>
return <div>{balance?.toString()}</div>
```

### After (New Way)
```tsx
const { data: balance, isLoading } = useUserBalance(account)

if (isLoading) return <div>Loading...</div>
return <div>{balance?.toString()}</div>
```

Much cleaner! 🎉
