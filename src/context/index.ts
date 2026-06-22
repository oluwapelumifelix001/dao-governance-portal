// Context
export { Web3Provider, Web3Context } from "./Web3Context";
export type { Web3ContextType } from "./Web3Context";

// Hooks
export { useWeb3 } from "./useWeb3";
export {
  useContractRead,
  useUserBalance,
  useAllProposals,
  useProposalDetails,
  useHasVoted,
  useProposalDuration,
  useTotalProposalsCount,
} from "./useContractRead";
export type { UseContractReadOptions } from "./useContractRead";

export {
  useContractWrite,
  useCreateProposal,
  useCastVote,
  useExecuteProposal,
  useDistributeTokens,
  useTransferTokens,
} from "./useContractWrite";
export type { TransactionOptions, WriteContractOptions } from "./useContractWrite";

export {
  useContractEvents,
  useVoteCastEvents,
  useProposalExecutedEvents,
  useMultipleContractEvents,
} from "./useContractEvents";
export type { ContractEvent } from "./useContractEvents";
