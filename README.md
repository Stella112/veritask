# VeriTask 🛡️ | AI-Verified Freelance Escrow

**Built for the Aleph Hackathon on the GenLayer Network (Bradbury Testnet)**

## The Problem
Traditional freelance marketplaces rely on centralized, slow, and often biased human arbitration to resolve disputes. When a freelancer submits a deliverable, proving that the "Proof of Work" meets the exact criteria of the bounty is entirely subjective and prone to friction.

## The Solution
**VeriTask** is a decentralized, two-sided escrow marketplace that replaces human middlemen with **GenLayer Intelligent Contracts**. By utilizing Optimistic Democracy and the Equivalence Principle, VeriTask programmatically evaluates off-chain web deliverables and releases funds only when a decentralized network of AI validator nodes reaches consensus.

---

## ⚙️ How It Works

1. **Host a Task:** Clients deploy a bounty with specific criteria and lock the reward (plus a 10 GEN verification fee) into the VeriTask escrow contract.
2. **Submit Work:** Freelancers submit a URL pointing to their completed deliverable (e.g., a GitHub repo, a Figma file, or a published article).
3. **Decentralized AI Verification:** * The Intelligent Contract fetches the live web content using GenLayer's `gl.nondet.web` module.
   * Multiple validator nodes independently evaluate the content against the original task description using an LLM.
   * GenLayer's `gl.eq_principle` evaluates the outputs to ensure Semantic Equivalence.
4. **Automated Payout:** If the validator network reaches a `PASS` consensus, the UI updates instantly, and the smart contract authorizes the release of the funds.

---

## 🔗 Smart Contract Details

The core verification logic is deployed live on the GenLayer Bradbury Testnet. 

| Contract Detail | Value |
| :--- | :--- |
| **Network** | GenLayer Bradbury Testnet |
| **Contract Address** | `0x67b43beE35a9C2e52f81bAB1a9bCCAfD4e162E16` |
| **Core SDK Modules** | `gl.nondet.web`, `gl.eq_principle` |
| **Language** | Python (GenVM v0.15+) |

---

## 💻 Frontend Architecture

VeriTask features a production-ready, highly responsive SPA built to enterprise fintech standards.

* **Tech Stack:** React, Vite, Tailwind CSS, Ethers.js.
* **Web3 Integration:** Full MetaMask connectivity for paying hosting fees and triggering GenLayer contract verifications.
* **State Management:** Dual-sided dashboard tracking both freelancer submissions and client-hosted tasks, persisted via browser storage.
* **Theming:** Seamless toggle between a stark, professional "Fintech Minimalist" Light Mode and a deep, developer-focused "Neural Midnight" Dark Mode.
* **Live Consensus Terminal:** Real-time visual feedback simulating the Optimistic Democracy validator logs for complete Explainable AI transparency.

---

## 🏗️ About the Architecture
VeriTask bridges the gap between clean, intuitive design and bleeding-edge Web3 intelligence. It was designed from the ground up by an AI Application Specialist to demonstrate that complex, multi-node AI consensus can be packaged into a frictionless, consumer-ready platform.
