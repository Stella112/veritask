# VeriTask 🛡️ | AI-Verified Web3 Bounty & Escrow Protocol

**Built for the Aleph Hackathon on the GenLayer Network (Bradbury Testnet)**

## The Vision
Traditional freelance platforms and DAO bounty boards suffer from slow, subjective, and centralized arbitration. **VeriTask** is a decentralized, two-sided escrow marketplace that replaces human middlemen with GenLayer Intelligent Contracts. 

By utilizing Optimistic Democracy and the Equivalence Principle, VeriTask programmatically evaluates off-chain web deliverables—from technical documentation to design files. It automatically releases locked crypto bounties only when a decentralized network of AI validator nodes reaches a semantic consensus that the submitted work matches the original criteria. 

## 🌟 What Sets VeriTask Apart (Key Features)

While basic escrows just lock and release funds, VeriTask introduces infrastructure for long-term trust:

* **Explainable AI (Audit Trails):** Decentralized AI shouldn't be a black box. If a submission is rejected, VeriTask provides an "AI Audit Report" detailing exactly why the validator nodes failed the equivalence check, providing transparent feedback to contributors.
* **Immutable AI Reputation:** VeriTask calculates an **"AI Reliability Score"** for every connected wallet based on their historical success rate with GenLayer verifications. Clients can instantly gauge a contributor's trust level before funding a task.
* **Dual-Sided Dashboard:** A persistent, unified interface tracking both hosted bounties and submitted work, dynamically updated via local storage and on-chain state.
* **Enterprise-Grade UX:** Designed with a flawless Light/Dark mode toggle, bridging the gap between raw Web3 capability and frictionless, consumer-grade fintech aesthetics.

## ⚙️ How It Works

1. **Host a Task:** Communities or clients deploy a bounty listing, locking the reward and a fixed 10 GEN verification fee into the Intelligent Contract escrow.
2. **Submit Work:** Contributors complete the task and submit a URL pointing to their deliverable (e.g., a GitHub repository, Twitter thread, or Figma prototype).
3. **Decentralized AI Verification:**
   * The Intelligent Contract fetches the live web content using GenLayer's `gl.nondet.web` module.
   * Multiple validator nodes independently evaluate the content against the original task description using an LLM.
   * GenLayer's `gl.eq_principle` evaluates the validator outputs to ensure Semantic Equivalence.
4. **Automated Payout:** If the validator network reaches a `PASS` consensus, the UI updates instantly, and the smart contract authorizes the release of the escrowed funds.

## 🔗 Live Application & Smart Contracts

* **Live Platform:** https://veritask-pi.vercel.app/
* **Contract Address (Bradbury Testnet):** `0x67b43beE35a9C2e52f81bAB1a9bCCAfD4e162E16`
* **GitHub Repository:** https://github.com/Stella112/veritask
* **Core SDK Modules:** `gl.nondet.web`, `gl.eq_principle` (Python GenVM v0.15+)

## 🏗️ Architecture & Approach
As an AI Application Specialist, my core objective with VeriTask was to demonstrate that complex, multi-node decentralized AI consensus can be packaged into a seamless, intuitive product. VeriTask proves that the GenLayer Equivalence Principle is the missing layer needed to automate real-world trust systems in the global gig economy.
