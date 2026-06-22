import React, { useState } from 'react';
import { ethers } from 'ethers';

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
      // Merge title and description cleanly into your contract's single string parameter
      const completeDescription = `[${title}] ${description}`;

      // Calls your exact function: propose(string)
      const tx = await daoContract.propose(completeDescription);
      
      setStatusMessage({ text: "Broadcasting proposal transaction...", isError: false });
      await tx.wait(); // Wait for block confirmation

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

        {statusMessage && (
          <div className={`p-3 rounded-xl text-xs font-medium border ${
            statusMessage.isError 
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            {statusMessage.text}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !daoContract}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold text-sm py-3 px-4 rounded-xl transition-all duration-200 shadow-md shadow-emerald-500/10 active:scale-[0.99]"
        >
          {isSubmitting ? "Submitting to Blockchain..." : "Submit Proposal"}
        </button>
      </form>
    </div>
  );
}