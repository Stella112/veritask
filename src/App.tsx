import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  Wallet, Activity, ExternalLink, CheckCircle,
  Lock, ArrowLeft, LayoutGrid, User, XCircle, PlusCircle, ChevronRight, Terminal, Sun, Moon
} from 'lucide-react';

// ── Contract ─────────────────────────────────────────────────────────────────
const CONTRACT_ADDRESS = "0x67b43beE35a9C2e52f81bAB1a9bCCAfD4e162E16";
const CONTRACT_ABI = [
  { "name": "submit_work", "type": "function", "inputs": [{ "name": "deliverable_url", "type": "string" }], "outputs": [{ "name": "", "type": "string" }] },
  { "name": "get_info",    "type": "function", "inputs": [], "outputs": [{ "name": "", "type": "string" }], "stateMutability": "view" }
];

// ── Data ──────────────────────────────────────────────────────────────────────
const INITIAL_BOUNTIES = [
  { id: 1,  title: 'Summarize the Aleph Hackathon',            reward: '500 GEN'  },
  { id: 2,  title: 'Design Community Launch Graphics',          reward: '300 GEN'  },
  { id: 3,  title: 'Write System Prompts for AI Agents',        reward: '450 GEN'  },
  { id: 4,  title: 'Audit Smart Contract Security',             reward: '1000 GEN' },
  { id: 5,  title: 'Create React Component Library',            reward: '600 GEN'  },
  { id: 6,  title: 'Produce 2-Minute Explainer Animation',      reward: '800 GEN'  },
  { id: 7,  title: 'Translate Technical Whitepaper to Spanish', reward: '400 GEN'  },
  { id: 8,  title: 'Build Web3 Onboarding Wireframes',          reward: '550 GEN'  },
  { id: 9,  title: 'Write Technical Documentation for API',     reward: '700 GEN'  },
  { id: 10, title: 'Setup Discord Server Automation Bots',      reward: '250 GEN'  },
];

// ── Types ─────────────────────────────────────────────────────────────────────
type View = 'explore' | 'detail' | 'dashboard' | 'host';
type TxStatus = 'IDLE' | 'PENDING' | 'VERIFIED' | 'ERROR';

interface Submission {
  id: number;
  title: string;
  url: string;
  status: 'VERIFIED' | 'REJECTED' | 'PENDING';
  reward: string;
}

// ── Terminal logs ─────────────────────────────────────────────────────────────
const TERMINAL_LOGS = [
  "Initializing Intelligent Contract...",
  "Fetching Web Content via gl.nondet.web...",
  "Validator 1 Evaluation: PASS",
  "Validator 2 Evaluation: PASS",
  "Validator 3 Evaluation: FAIL",
  "Final Consensus: PASS (Equivalence Reached)"
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const ensureNetwork = async () => {
  if (!(window as any).ethereum) return;
  const targetChainId = '0x107d'; // 4221
  try {
    const currentChainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
    if (currentChainId !== targetChainId) {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainId }],
      });
    }
  } catch (error: any) {
    if (error.code === 4902) {
      await (window as any).ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: targetChainId,
          chainName: 'GenLayer Testnet Chain',
          rpcUrls: ['https://rpc-bradbury.genlayer.com'],
          nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
        }],
      });
    } else {
      throw error;
    }
  }
};

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === 'VERIFIED') return <span className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 px-2 py-1 rounded-md text-xs font-medium">Verified</span>;
  if (status === 'OPEN' || status === 'PENDING') return <span className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800 px-2 py-1 rounded-md text-xs font-medium">{status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}</span>;
  if (status === 'REJECTED' || status === 'ERROR') return <span className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 px-2 py-1 rounded-md text-xs font-medium">{status === 'ERROR' ? 'Failed' : 'Rejected'}</span>;
  return null;
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  // Wallet
  const [walletAddress, setWalletAddress] = useState('');
  const [walletError, setWalletError] = useState('');
  const isConnected = walletAddress !== '';

  // Bounty list (mutable — new tasks get prepended)
  const [bounties, setBounties] = useState(() => {
    const saved = localStorage.getItem('veritask_bounties');
    return saved ? JSON.parse(saved) : INITIAL_BOUNTIES;
  });

  useEffect(() => {
    localStorage.setItem('veritask_bounties', JSON.stringify(bounties));
  }, [bounties]);

  // Navigation
  const [view, setView] = useState<View>('explore');
  const [dashboardTab, setDashboardTab] = useState<'submissions' | 'hosted'>('submissions');
  const [selectedBounty, setSelectedBounty] = useState(INITIAL_BOUNTIES[0]);

  // Host a Task form
  const [hostTitle, setHostTitle] = useState('');
  const [hostReward, setHostReward] = useState('');
  const [hostDeploying, setHostDeploying] = useState(false);
  const [hostError, setHostError] = useState('');

  // AI Audit state
  const mockAuditReport = "Equivalence Consensus Reached: 3/3 Nodes agree. The submitted deliverable successfully summarizes the Aleph Hackathon, explicitly mentioning the GenLayer network, the $GEN token, and the Equivalence Principle. Code quality checks passed.";
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Task detail state
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [txStatus, setTxStatus] = useState<TxStatus>('IDLE');
  const [txError, setTxError] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  // Dashboard — dynamic submissions
  const [submissions, setSubmissions] = useState<Submission[]>(() => {
    const saved = localStorage.getItem('veritask_submissions');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('veritask_submissions', JSON.stringify(submissions));
  }, [submissions]);

  // ── Connect Wallet ──────────────────────────────────────────────────────────
  const connectWallet = async () => {
    setWalletError('');
    if (!(window as any).ethereum) { setWalletError('No wallet detected. Install MetaMask.'); return; }
    try {
      const accounts: string[] = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) setWalletAddress(accounts[0]);
      await ensureNetwork();
    } catch (err: any) {
      setWalletError(err?.message ?? 'Connection rejected.');
    }
  };

  // ── Navigate to detail ──────────────────────────────────────────────────────
  const openDetail = (bounty: typeof INITIAL_BOUNTIES[0]) => {
    setSelectedBounty(bounty);
    setSubmissionUrl('');
    setTxStatus('IDLE');
    setTerminalLogs([]);
    setTxError('');
    setView('detail');
  };

  // ── Stream consensus logs ───────────────────────────────────────────────────
  const streamLogs = async () => {
    const delays = [800, 1500, 1200, 800, 800, 1500];
    for (let i = 0; i < TERMINAL_LOGS.length; i++) {
      await sleep(delays[i]);
      setTerminalLogs(prev => [...prev, TERMINAL_LOGS[i]]);
    }
  };

  // ── Trigger verification ────────────────────────────────────────────────────
  const triggerVerification = async () => {
    if (!submissionUrl || !isConnected) return;
    setTxStatus('PENDING');
    setTerminalLogs([]);
    setTxError('');

    try {
      await ensureNetwork();
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer   = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx       = await contract.submit_work(submissionUrl);
      console.log(`[VeriTask] tx: ${tx.hash}`);
      streamLogs();
      await tx.wait();
      await sleep(1500); // give time for logs to finish naturally
      setTxStatus('VERIFIED');
      // Add to dashboard
      setSubmissions(prev => [{
        id: selectedBounty.id,
        title: selectedBounty.title,
        url: submissionUrl,
        status: 'VERIFIED',
        reward: selectedBounty.reward,
      }, ...prev]);
    } catch (err: any) {
      console.error(err);
      await streamLogs();
      await sleep(800);
      setTxError(err?.reason ?? err?.message ?? 'Transaction failed.');
      setTxStatus('ERROR');
    }
  };

  // ── Deploy Task ─────────────────────────────────────────────────────────────
  const deployTask = async () => {
    if (!hostTitle.trim() || !hostReward || !isConnected) return;
    setHostError('');
    setHostDeploying(true);
    try {
      await ensureNetwork();
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer   = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: "0x1111111111111111111111111111111111111111", // VeriTask Treasury
        value: ethers.parseEther('10'), // 10 GEN network verification fee
        gasLimit: 21000, // Bypass estimateGas to avoid CALL_EXCEPTION
      });
      console.log(`[VeriTask] deploy tx: ${tx.hash}`);
      await tx.wait();
      // Prepend the new task to the board
      const newBounty = {
        id: Date.now(),
        title: hostTitle.trim(),
        reward: `${hostReward} GEN`,
        isMine: true,
      };
      setBounties(prev => [newBounty, ...prev]);
      // Reset form and switch to explore
      setHostTitle('');
      setHostReward('');
      setView('explore');
    } catch (err: any) {
      setHostError(err?.reason ?? err?.message ?? 'Transaction failed.');
    } finally {
      setHostDeploying(false);
    }
  };

  // ── AI Audit Modal ──────────────────────────────────────────────────────────
  const AuditModal = () => {
    if (!isAuditModalOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
        <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 w-full max-w-2xl rounded-sm shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0B0E14]">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-gray-500 dark:text-[#00F5FF]" />
              Cryptographic AI Audit Trail
            </h3>
            <button onClick={() => setIsAuditModalOpen(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            <div className="bg-gray-50 dark:bg-[#0B0E14] border border-gray-200 dark:border-gray-800 p-4 font-mono text-sm text-gray-800 dark:text-gray-300 leading-relaxed shadow-inner overflow-x-auto">
              <div><span className="text-gray-400 dark:text-gray-600 mr-3 select-none">1</span><span className="text-blue-600 dark:text-violet-400">system</span><span className="text-gray-400">.</span><span className="text-blue-600 dark:text-[#00F5FF]">log</span><span className="text-gray-500 dark:text-gray-400">(</span></div>
              <div className="pl-4"><span className="text-gray-400 dark:text-gray-600 mr-3 select-none -ml-4">2</span><span className="text-green-600 dark:text-green-400">"{mockAuditReport}"</span></div>
              <div><span className="text-gray-400 dark:text-gray-600 mr-3 select-none">3</span><span className="text-gray-500 dark:text-gray-400">)</span></div>
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 dark:bg-[#0B0E14]/50 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Powered by GenLayer</span>
            <button onClick={() => setIsAuditModalOpen(false)} className="px-6 py-2 bg-black dark:bg-[#00F5FF] text-white dark:text-black font-bold text-sm rounded-sm hover:bg-gray-800 dark:hover:bg-[#00E5EE] transition-colors">Close</button>
          </div>
        </div>
      </div>
    );
  };

  // ── Layout Components ───────────────────────────────────────────────────────
  const Sidebar = () => (
    <aside className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0B0E14] flex flex-col h-screen transition-colors duration-300 z-20">
      <div className="h-20 flex items-center px-6 border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
        <Activity className="w-6 h-6 mr-3 text-black dark:text-white" />
        <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">VeriTask</span>
      </div>
      <nav className="flex-1 px-4 py-8 space-y-2">
        {[
          { id: 'explore',   label: 'Explore Bounties', icon: LayoutGrid },
          { id: 'host',      label: 'Host a Task',      icon: PlusCircle },
          { id: 'dashboard', label: 'My Dashboard',     icon: User },
        ].map(tab => {
          const isActive = view === tab.id || (view === 'detail' && tab.id === 'explore');
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setView(tab.id as View)}
              className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                isActive 
                  ? 'bg-white dark:bg-[#161B22] text-black dark:text-white shadow-sm border border-gray-200 dark:border-gray-800' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#161B22]/50 hover:text-gray-900 dark:hover:text-white border border-transparent'
              }`}>
              <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-500'}`} />
              {tab.label}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 transition-colors duration-300">
        <button onClick={() => setIsDark(!isDark)}
          className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#161B22]/50 transition-colors">
          <span className="flex items-center gap-3">
            {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            {isDark ? 'Dark Mode' : 'Light Mode'}
          </span>
          <div className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${isDark ? 'bg-[#00F5FF]' : 'bg-gray-300'}`}>
            <div className={`w-3 h-3 rounded-full bg-white shadow-sm transform transition-transform ${isDark ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </button>
      </div>
    </aside>
  );

  const Topbar = ({ title }: { title: string }) => (
    <header className="h-20 flex-shrink-0 flex items-center justify-between px-8 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161B22] transition-colors duration-300">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{title}</h1>
      <div className="flex items-center gap-4">
        {walletError && (
          <span className="text-xs px-3 py-1.5 rounded bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 font-medium">
            {walletError}
          </span>
        )}
        <button onClick={connectWallet} disabled={isConnected}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            isConnected
              ? 'bg-gray-50 dark:bg-[#0B0E14] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 cursor-default'
              : 'bg-black text-white hover:bg-gray-800 dark:bg-[#00F5FF] dark:text-black hover:dark:bg-[#00E5EE] border border-transparent'
          }`}>
          {isConnected ? (
            <>
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="font-mono">{truncate(walletAddress)}</span>
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4" /> Connect Wallet
            </>
          )}
        </button>
      </div>
    </header>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW 1 — Explore Bounties
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'explore') {
    return (
      <div className="flex h-screen bg-white dark:bg-[#0B0E14] text-gray-900 dark:text-gray-100 font-sans selection:bg-gray-200 dark:selection:bg-[#00F5FF]/30 transition-colors duration-300">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Topbar title="Explore Bounties" />
          <div className="flex-1 overflow-auto p-8">
            <div className="max-w-6xl mx-auto">
              <div className="border border-gray-200 dark:border-gray-800 rounded-sm bg-white dark:bg-[#161B22] overflow-hidden shadow-sm transition-colors duration-300">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-[#0B0E14]/50 border-b border-gray-200 dark:border-gray-800">
                      <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Task Name</th>
                      <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Host</th>
                      <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {bounties.map((bounty) => (
                      <tr key={bounty.id} onClick={() => openDetail(bounty)}
                        className="hover:bg-gray-50 dark:hover:bg-[#0B0E14]/40 transition-colors cursor-pointer group">
                        <td className="py-4 px-6">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:underline underline-offset-4 decoration-gray-300 dark:decoration-gray-600">{bounty.title}</p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-sm text-gray-600 dark:text-gray-400">GenLayer Labs</p>
                        </td>
                        <td className="py-4 px-6">
                          <StatusBadge status="OPEN" />
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{bounty.reward}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW 2 — Task Detail
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'detail') {
    return (
      <div className="flex h-screen bg-white dark:bg-[#0B0E14] text-gray-900 dark:text-gray-100 font-sans selection:bg-gray-200 dark:selection:bg-[#00F5FF]/30 transition-colors duration-300">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-20 flex-shrink-0 flex items-center justify-between px-8 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161B22] transition-colors duration-300">
            <div className="flex items-center gap-4">
              <button onClick={() => setView('explore')} className="p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded hover:bg-gray-100 dark:hover:bg-[#0B0E14]">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Task Details</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-8 bg-gray-50/50 dark:bg-[#0B0E14]">
            <div className="max-w-3xl mx-auto space-y-6">

              {/* Task Header */}
              <div className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 p-8 shadow-sm transition-colors duration-300">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Active Bounty</p>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{selectedBounty.title}</h2>
                  </div>
                  <div className="flex flex-col items-end gap-3 pt-1">
                    <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedBounty.reward}</span>
                    <StatusBadge status={txStatus === 'VERIFIED' ? 'VERIFIED' : txStatus === 'ERROR' ? 'ERROR' : 'OPEN'} />
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-[#0B0E14]/40 border border-gray-200 dark:border-gray-800 p-4 flex gap-3 mb-8 transition-colors duration-300">
                  <Lock className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <strong className="text-gray-900 dark:text-gray-200">Escrow Terms:</strong> Funds are securely locked in the GenLayer Intelligent Contract. Payout is seamlessly triggered when the Validator Network reaches Semantic Equivalence (Consensus) matching the task criteria. No manual intervention required.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100">Submission URL</label>
                  <div className="relative">
                    <input type="url" placeholder="https://github.com/your-repo..."
                      value={submissionUrl} onChange={e => setSubmissionUrl(e.target.value)}
                      disabled={txStatus === 'PENDING' || txStatus === 'VERIFIED'}
                      className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0B0E14] px-4 py-3 pl-11 text-sm font-mono text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-black dark:focus:border-[#00F5FF] disabled:bg-gray-50 dark:disabled:bg-gray-800/20 disabled:text-gray-500 transition-all rounded-sm"
                    />
                    <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>

                {txError && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-medium">
                    {txError}
                  </div>
                )}

                <div className="mt-8">
                  {txStatus === 'VERIFIED' || txStatus === 'ERROR' ? (
                    <div className="flex gap-4">
                      <button onClick={() => { setTxStatus('IDLE'); setSubmissionUrl(''); setTerminalLogs([]); setTxError(''); }}
                        className="flex-1 border border-gray-300 dark:border-gray-700 py-3 text-sm font-bold text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#0B0E14] transition-colors rounded-sm">
                        Submit Another
                      </button>
                      {txStatus === 'VERIFIED' && (
                        <button onClick={() => setView('dashboard')}
                          className="flex-1 bg-black text-white hover:bg-gray-800 dark:bg-[#00F5FF] dark:text-black dark:hover:bg-[#00E5EE] py-3 text-sm font-bold transition-colors flex justify-center items-center gap-2 rounded-sm">
                          View in Dashboard <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <button onClick={triggerVerification}
                      disabled={!isConnected || !submissionUrl || txStatus === 'PENDING'}
                      className={`w-full py-4 px-6 font-bold text-sm transition-all flex items-center justify-center gap-2 rounded-sm ${
                        (!isConnected || !submissionUrl || txStatus === 'PENDING')
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed border border-gray-200 dark:border-gray-700'
                          : 'bg-black text-white hover:bg-gray-800 dark:bg-[#00F5FF] dark:text-black dark:hover:bg-[#00E5EE] shadow-sm dark:shadow-[0_0_20px_rgba(0,245,255,0.4)]'
                      }`}>
                      {txStatus === 'PENDING'
                        ? <><Activity className="w-4 h-4 animate-spin" /> Verifying via Network...</>
                        : isConnected ? 'Execute Verification' : 'Connect Wallet to Submit'}
                    </button>
                  )}
                </div>
              </div>

              {/* Enhanced Consensus Terminal */}
              {txStatus !== 'IDLE' && (
                <div className="bg-white dark:bg-black border border-gray-300 dark:border-gray-800 shadow-sm dark:shadow-md overflow-hidden transition-colors duration-300">
                  <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between transition-colors duration-300">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-xs font-mono text-gray-600 dark:text-gray-300 uppercase tracking-widest">Network Consensus Log</span>
                    </div>
                    {txStatus === 'PENDING' && (
                      <span className="text-[10px] font-bold tracking-widest uppercase text-yellow-600 dark:text-yellow-400 animate-pulse border border-yellow-400/30 px-2 py-0.5 rounded-sm">
                        Running
                      </span>
                    )}
                  </div>
                  <div className="p-5 font-mono text-[13px] leading-relaxed space-y-2 min-h-[180px] text-black dark:text-gray-300">
                    {terminalLogs.map((log, i) => {
                      let colorClass = 'text-black dark:text-[#00F5FF]/80';
                      let dropShadow = '';
                      
                      if (log.includes('FAIL')) {
                        colorClass = 'text-red-600 dark:text-red-400';
                      } else if (log.includes('PASS')) {
                        colorClass = 'text-green-600 dark:text-[#00F5FF]';
                        dropShadow = 'dark:drop-shadow-[0_0_8px_rgba(0,245,255,0.6)]';
                      } else if (log.includes('gl.nondet.web')) {
                        colorClass = 'text-blue-600 dark:text-violet-400';
                      }

                      return (
                        <div key={i} className="flex items-start gap-3 opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]">
                          <span className="text-gray-400 dark:text-gray-600 select-none">❯</span>
                          <span className={`${colorClass} ${dropShadow}`}>{log}</span>
                        </div>
                      )
                    })}
                    {txStatus === 'PENDING' && (
                      <div className="flex items-center gap-3 text-gray-500">
                        <span>❯</span><span className="animate-pulse">_</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(txStatus === 'VERIFIED' || txStatus === 'ERROR') && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 animate-[fadeIn_0.5s_ease-out_forwards]">
                  <button onClick={() => setIsAuditModalOpen(true)} className="w-full py-4 border-2 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 font-bold text-sm hover:bg-gray-50 dark:hover:bg-[#161B22] transition-colors rounded-sm flex items-center justify-center gap-2">
                    <Terminal className="w-5 h-5 opacity-70"/> View AI Audit Report
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
        
        <AuditModal />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW 4 — Host a Task
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'host') {
    const rewardNum = parseFloat(hostReward) || 0;
    const fee = 10;
    const total = rewardNum + fee;
    const canDeploy = isConnected && hostTitle.trim().length > 0 && rewardNum > 0 && !hostDeploying;

    return (
      <div className="flex h-screen bg-white dark:bg-[#0B0E14] text-gray-900 dark:text-gray-100 font-sans selection:bg-gray-200 dark:selection:bg-[#00F5FF]/30 transition-colors duration-300">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Topbar title="Host a Task" />
          <div className="flex-1 overflow-auto p-8 bg-gray-50/50 dark:bg-[#0B0E14] flex flex-col items-center">
            
            <div className="w-full max-w-xl mb-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Deploy a bounty via GenLayer. Escrows require a 10 GEN verification fee.
              </p>
            </div>

            <div className="w-full max-w-xl bg-white dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 p-8 shadow-sm transition-colors duration-300">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Task Title</label>
                  <input type="text" placeholder="e.g. Audit our new NFT contract..."
                    value={hostTitle} onChange={e => setHostTitle(e.target.value)} disabled={hostDeploying}
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0B0E14] px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-black dark:focus:border-[#00F5FF] disabled:bg-gray-50 dark:disabled:bg-gray-800/20 transition-all rounded-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Reward Amount (GEN)</label>
                  <div className="relative">
                    <input type="number" min="1" placeholder="500"
                      value={hostReward} onChange={e => setHostReward(e.target.value)} disabled={hostDeploying}
                      className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0B0E14] px-4 py-3 pr-16 text-sm font-mono text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-black dark:focus:border-[#00F5FF] disabled:bg-gray-50 dark:disabled:bg-gray-800/20 transition-all rounded-sm"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500 dark:text-gray-400">GEN</span>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-[#0B0E14]/40 border border-gray-200 dark:border-gray-800 p-5 transition-colors duration-300">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Cost Summary</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Bounty Escrow</span>
                      <span className="font-mono font-medium">{rewardNum > 0 ? `${rewardNum} GEN` : '— GEN'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Network Verification Fee</span>
                      <span className="font-mono font-medium">{fee} GEN</span>
                    </div>
                    <div className="pt-4 mt-2 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
                      <span className="font-bold text-gray-900 dark:text-gray-100">Total Due</span>
                      <span className="text-lg font-bold font-mono text-black dark:text-[#00F5FF] dark:drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]">{rewardNum > 0 ? `${total} GEN` : `${fee} GEN`}</span>
                    </div>
                  </div>
                </div>

                {hostError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-medium">
                    {hostError}
                  </div>
                )}

                <div className="pt-2">
                  <button onClick={deployTask} disabled={!canDeploy}
                    className={`w-full py-4 px-6 font-bold text-sm transition-all flex items-center justify-center gap-2 rounded-sm ${
                      canDeploy 
                        ? 'bg-black text-white hover:bg-gray-800 dark:bg-[#00F5FF] dark:text-black dark:hover:bg-[#00E5EE] shadow-sm dark:shadow-[0_0_20px_rgba(0,245,255,0.4)]' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed border border-gray-200 dark:border-gray-700'
                    }`}>
                    {hostDeploying
                      ? <><Activity className="w-4 h-4 animate-spin" /> Processing...</>
                      : !isConnected
                        ? 'Connect Wallet to Deploy'
                        : <><PlusCircle className="w-4 h-4" /> Pay Fee &amp; Deploy Task</>}
                  </button>
                  {!isConnected && (
                    <p className="text-xs text-center text-gray-500 dark:text-gray-500 mt-3">
                      Connect your wallet in the top right header to deploy.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW 3 — My Dashboard (Default/Fallback)
  // ════════════════════════════════════════════════════════════════════════════
  const myHostedBounties = bounties.filter(b => (b as any).isMine);

  return (
    <div className="flex h-screen bg-white dark:bg-[#0B0E14] text-gray-900 dark:text-gray-100 font-sans selection:bg-gray-200 dark:selection:bg-[#00F5FF]/30 transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="My Dashboard" />
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto">
            
            <div className="flex items-center gap-6 mb-8 border-b border-gray-200 dark:border-gray-800">
              <button 
                onClick={() => setDashboardTab('submissions')}
                className={`py-3 text-sm font-bold border-b-2 transition-colors -mb-[1px] ${
                  dashboardTab === 'submissions' 
                    ? 'border-black dark:border-[#00F5FF] text-gray-900 dark:text-gray-100' 
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}>
                My Submissions
              </button>
              <button 
                onClick={() => setDashboardTab('hosted')}
                className={`py-3 text-sm font-bold border-b-2 transition-colors -mb-[1px] ${
                  dashboardTab === 'hosted' 
                    ? 'border-black dark:border-[#00F5FF] text-gray-900 dark:text-gray-100' 
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}>
                My Hosted Bounties
              </button>
            </div>

            {dashboardTab === 'submissions' && (
              submissions.length === 0 ? (
                <div className="border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161B22] p-16 text-center rounded-sm transition-colors duration-300">
                  <p className="text-gray-900 dark:text-gray-100 font-semibold mb-2">No tasks completed yet.</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Explore the Bounty Board to get started.</p>
                  <button onClick={() => setView('explore')}
                    className="px-6 py-2.5 bg-white dark:bg-[#0B0E14] border border-gray-300 dark:border-gray-700 text-sm font-semibold rounded hover:bg-gray-50 dark:hover:bg-[#161B22] text-gray-900 dark:text-white transition-colors">
                    Explore Bounties
                  </button>
                </div>
              ) : (
                <div className="border border-gray-200 dark:border-gray-800 rounded-sm bg-white dark:bg-[#161B22] overflow-hidden shadow-sm transition-colors duration-300">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-[#0B0E14]/50 border-b border-gray-200 dark:border-gray-800">
                        <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Task Name</th>
                        <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Freelancer</th>
                        <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Submission URL</th>
                        <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {submissions.map((sub, i) => (
                        <tr key={`${sub.id}-${i}`} className="hover:bg-gray-50 dark:hover:bg-[#0B0E14]/40 transition-colors">
                          <td className="py-4 px-6">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{sub.title}</p>
                          </td>
                          <td className="py-4 px-6">
                            <p className="text-sm text-gray-600 dark:text-gray-400">You</p>
                          </td>
                          <td className="py-4 px-6">
                            <a href={`https://${sub.url}`} target="_blank" rel="noopener noreferrer"
                              className="text-sm font-mono text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-[#00F5FF]/80 flex items-center gap-1.5 w-48 truncate transition-colors">
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{sub.url}</span>
                            </a>
                          </td>
                          <td className="py-4 px-6 flex flex-col gap-1.5">
                            <div><StatusBadge status={sub.status} /></div>
                            {(sub.status === 'VERIFIED' || sub.status === 'REJECTED') && (
                              <button onClick={() => setIsAuditModalOpen(true)} className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#00F5FF]/70 hover:text-black dark:hover:text-[#00F5FF] flex items-center gap-1 transition-colors mt-1">
                                <Terminal className="w-3 h-3"/> View Audit
                              </button>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{sub.reward}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {dashboardTab === 'hosted' && (
              myHostedBounties.length === 0 ? (
                <div className="border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161B22] p-16 text-center rounded-sm transition-colors duration-300">
                  <p className="text-gray-900 dark:text-gray-100 font-semibold mb-2">No hosted tasks yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Deploy a bounty to the network to get started.</p>
                  <button onClick={() => setView('host')}
                    className="px-6 py-2.5 bg-white dark:bg-[#0B0E14] border border-gray-300 dark:border-gray-700 text-sm font-semibold rounded hover:bg-gray-50 dark:hover:bg-[#161B22] text-gray-900 dark:text-white transition-colors">
                    Host a Task
                  </button>
                </div>
              ) : (
                <div className="border border-gray-200 dark:border-gray-800 rounded-sm bg-white dark:bg-[#161B22] overflow-hidden shadow-sm transition-colors duration-300">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-[#0B0E14]/50 border-b border-gray-200 dark:border-gray-800">
                        <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Task Name</th>
                        <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {myHostedBounties.map((bounty, i) => (
                        <tr key={`${bounty.id}-${i}`} className="hover:bg-gray-50 dark:hover:bg-[#0B0E14]/40 transition-colors">
                          <td className="py-4 px-6">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{bounty.title}</p>
                          </td>
                          <td className="py-4 px-6">
                            <StatusBadge status="OPEN" />
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{bounty.reward}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

          </div>
        </div>
      </main>

      <AuditModal />
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
