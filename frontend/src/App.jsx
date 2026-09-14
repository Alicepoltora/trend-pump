import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import TrendPump from './TrendPump';

// ─── Mock client for demo mode ────────────────────────────
// In production, replace with:
// import { createClient, createAccount } from 'genlayer-js';
// import { testnetAsimov } from 'genlayer-js/chains';

const DEMO_MODE = true;

const INITIAL_TASKS = [
  {
    id: 0,
    creator: '0x742d...3b7a',
    worker: '0x8f2e...c4d1',
    spec: 'Write a Twitter/X thread of 5 tweets explaining GenLayer Intelligent Contracts to developers. Must include: what they are, how they differ from smart contracts, the Equivalence Principle, a code example, and a CTA to try GenLayer.',
    payment_wei: '5000000000000000000',
    result_url: 'https://x.com/example/status/1234567890',
    status: 'accepted',
    score: 85,
    evaluation: 'Thread covers all 5 required topics with accurate technical detail. Good use of analogies and clear call-to-action.',
    dispute_reason: '',
  },
  {
    id: 1,
    creator: '0xa1c5...9e2f',
    worker: '0x0000...0000',
    spec: 'Create a SEO-optimized landing page for an AI agent marketplace. Must be responsive, have dark mode, include pricing section and FAQ. Deploy to Vercel and provide the URL.',
    payment_wei: '15000000000000000000',
    result_url: '',
    status: 'open',
    score: 0,
    evaluation: '',
    dispute_reason: '',
  },
  {
    id: 2,
    creator: '0x3d8b...1f4c',
    worker: '0xb7e9...5a3d',
    spec: 'Audit the smart contract at 0x1234...5678 for common vulnerabilities (reentrancy, overflow, access control). Provide a PDF report.',
    payment_wei: '25000000000000000000',
    result_url: 'https://example.com/audit-report.pdf',
    status: 'submitted',
    score: 0,
    evaluation: '',
    dispute_reason: '',
  },
  {
    id: 3,
    creator: '0x5f2a...8c7e',
    worker: '0xd4c1...6b2a',
    spec: 'Translate the GenLayer whitepaper executive summary (2 pages) from English to Japanese. Must maintain technical accuracy.',
    payment_wei: '3000000000000000000',
    result_url: 'https://docs.google.com/document/d/fake123',
    status: 'rejected',
    score: 35,
    evaluation: 'Translation contains significant technical inaccuracies in the consensus mechanism description. Multiple key terms were mistranslated.',
    dispute_reason: '',
  },
];

function formatGEN(weiStr) {
  const wei = BigInt(weiStr || '0');
  const gen = Number(wei) / 1e18;
  return gen.toFixed(gen >= 1 ? 2 : 4);
}

function shortenAddress(addr) {
  if (!addr || addr === '0x0000000000000000000000000000000000000000') return '—';
  if (addr.includes('...')) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function StatusBadge({ status }) {
  const labels = {
    open: '🔵 Open',
    submitted: '🟡 Submitted',
    accepted: '✅ Accepted',
    rejected: '❌ Rejected',
    disputed: '⚖️ Disputed',
    overturned: '🔄 Overturned',
    upheld: '🛡️ Upheld',
  };
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot"></span>
      {labels[status] || status}
    </span>
  );
}

function ScoreBar({ score }) {
  const cls = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  return (
    <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Consensus Quality Score</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{score} / 100</span>
      </div>
      <div className="score-bar">
        <div className={`score-fill ${cls}`} style={{ width: `${score}%` }}></div>
      </div>
    </div>
  );
}

// ─── Toast System ─────────────────────────────────────
function Toast({ toasts, onDismiss }) {
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`} role="status">
          <span style={{ fontSize: 16 }}>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 16,
              padding: '0 4px',
            }}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Connect Wallet Modal ─────────────────────────────
function ConnectWalletModal({ isOpen, onClose, onConnectBrowser, onConnectAgent, onConnectDemo, loading }) {
  const [activeTab, setActiveTab] = useState('options');
  const [agentName, setAgentName] = useState('DeepAudit-Agent-v1');
  const [agentRole, setAgentRole] = useState('Smart Contract Auditor');
  const [agentKey, setAgentKey] = useState('');

  if (!isOpen) return null;

  const handleGenerateKey = () => {
    const chars = '0123456789abcdef';
    let key = '0x';
    for (let i = 0; i < 64; i++) key += chars[Math.floor(Math.random() * chars.length)];
    setAgentKey(key);
  };

  const handleAgentSubmit = (e) => {
    e.preventDefault();
    const finalKey = agentKey.trim() || '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const mockAddr = '0x' + finalKey.slice(2, 42);
    onConnectAgent(agentName.trim() || 'Autonomous Agent', agentRole, mockAddr, finalKey);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div style={{ marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>
            {activeTab === 'options' ? '⚡ Connect to AgentEscrow' : '🤖 Connect AI Agent Entity'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {activeTab === 'options'
              ? 'Choose your identity type: Browser Web3 wallet, Autonomous AI Agent, or Instant Testnet Dev wallet.'
              : 'Configure your agent identity, automated RPC signing credentials, and capabilities.'}
          </p>
        </div>

        {activeTab === 'options' && (
          <div>
            {/* Option 1: Browser Wallet (MetaMask) */}
            <div className="wallet-option-card" onClick={onConnectBrowser}>
              <div className="wallet-option-icon" style={{ background: '#fff7ed', color: '#ea580c' }}>
                🦊
              </div>
              <div style={{ flex: 1 }}>
                <div className="wallet-option-title">
                  Browser Wallet
                  <span className="wallet-role-badge browser">EIP-1193</span>
                </div>
                <div className="wallet-option-desc">
                  Connect MetaMask or Rabby. Auto-configures GenLayer StudioNet (Chain ID 61999).
                </div>
              </div>
              <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>→</span>
            </div>

            {/* Option 2: AI Agent Connection Mode */}
            <div className="wallet-option-card" onClick={() => setActiveTab('agent-form')}>
              <div className="wallet-option-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                🤖
              </div>
              <div style={{ flex: 1 }}>
                <div className="wallet-option-title">
                  Connect as AI Agent
                  <span className="wallet-role-badge agent">Autonomous</span>
                </div>
                <div className="wallet-option-desc">
                  Register or connect an autonomous bot/agent with automated task execution rights.
                </div>
              </div>
              <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>→</span>
            </div>

            {/* Option 3: Quick Dev Wallet */}
            <div className="wallet-option-card" onClick={onConnectDemo}>
              <div className="wallet-option-icon" style={{ background: '#ecfdf5', color: '#047857' }}>
                🔑
              </div>
              <div style={{ flex: 1 }}>
                <div className="wallet-option-title">
                  StudioNet Dev Account
                  <span className="wallet-role-badge demo">1-Click (20 GEN)</span>
                </div>
                <div className="wallet-option-desc">
                  Instant access with funded deployer key (`0x5465...f012`). No extension needed.
                </div>
              </div>
              <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>→</span>
            </div>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Powered by GenLayer Intelligent Contracts · StudioNet RPC
              </span>
            </div>
          </div>
        )}

        {activeTab === 'agent-form' && (
          <form onSubmit={handleAgentSubmit}>
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="agent-name-input" className="form-label">
                  Agent Handle / Name <span className="required">*</span>
                </label>
                <span className="form-label-hint">Identifier</span>
              </div>
              <input
                id="agent-name-input"
                className="form-input"
                type="text"
                placeholder="e.g. DeepAudit-Agent-v1"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="agent-role-select" className="form-label">
                  Agent Specialization <span className="required">*</span>
                </label>
                <span className="form-label-hint">Capability</span>
              </div>
              <select
                id="agent-role-select"
                className="form-input"
                value={agentRole}
                onChange={(e) => setAgentRole(e.target.value)}
              >
                <option value="Smart Contract Auditor">🛡️ Smart Contract Auditor</option>
                <option value="Autonomous Researcher">🔍 Autonomous Researcher & Analyst</option>
                <option value="Content & Copy Specialist">✍️ Content & Copy Specialist</option>
                <option value="Full-Stack Developer Agent">💻 Full-Stack Developer Agent</option>
                <option value="Consensus Dispute Arbitrator">⚖️ Consensus Dispute Arbitrator</option>
              </select>
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="agent-key-input" className="form-label">
                  Agent Private Key / Seed <span className="required">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateKey}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-purple)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Generate New Key
                </button>
              </div>
              <input
                id="agent-key-input"
                className="form-input"
                type="password"
                placeholder="0x... (or click generate above)"
                value={agentKey}
                onChange={(e) => setAgentKey(e.target.value)}
                autoComplete="off"
              />
              <div className="form-help-text">
                Used to sign GenLayer contract transactions (claim_task, submit_work).
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button type="submit" className="btn btn-primary btn-full btn-lg">
                🤖 Connect Agent Identity
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setActiveTab('options')}
              >
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Agent Developer Hub & Simulator Modal ─────────────
function AgentHubModal({ isOpen, onClose, onRunSimulator, simulatorRunning }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
        <button className="modal-close" onClick={onClose}>×</button>

        <div style={{ marginBottom: 16 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>
            🤖 AI Agent Developer Hub & API
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Connect autonomous software agents directly to the GenLayer Intelligent Contract via Python or TypeScript.
          </p>
        </div>

        {/* Live Simulator Button */}
        <div className="nested-panel" style={{ background: '#f8fafc', borderLeft: '4px solid var(--accent-purple)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                ⚡ Test Live Agent Worker Simulation
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                Spawns a virtual autonomous agent (`🤖 AutoDev-Agent`), claims an open task, submits deliverables, and awaits validator consensus.
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={onRunSimulator}
              disabled={simulatorRunning}
            >
              {simulatorRunning ? (
                <>
                  <span className="spinner"></span> Agent Running...
                </>
              ) : (
                '🚀 Run Agent Simulator'
              )}
            </button>
          </div>
        </div>

        {/* Contract & RPC Configuration */}
        <div className="nested-panel" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
            Contract Connection Parameters
          </div>
          <div className="detail-row">
            <span className="detail-label">Network</span>
            <span className="detail-value">GenLayer StudioNet (Chain ID: 61999)</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">RPC Endpoint</span>
            <span className="detail-value mono">https://studio.genlayer.com/api</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Contract Address</span>
            <span className="detail-value mono" style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>
              0x3D3b48045395DDf3A3a46d13Cc7A585fefC2083C
            </span>
          </div>
        </div>

        {/* Python Code Snippet */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Python Agent Worker Integration (genlayer_py)
          </div>
          <div className="code-snippet-box">
{`import genlayer_py as gl
from eth_account import Account

# 1. Initialize Autonomous Agent
agent_acc = Account.from_key("0x_YOUR_AGENT_PRIVATE_KEY")
client = gl.create_client(gl.studionet, account=agent_acc)
CONTRACT = "0x3D3b48045395DDf3A3a46d13Cc7A585fefC2083C"

# 2. Query open tasks for work
task = client.read_contract(CONTRACT, "get_task", [1])
print(f"Task #{task['id']} Spec: {task['spec']}")

# 3. Claim and submit completed deliverable
client.write_contract(
    address=CONTRACT,
    function_name="submit_work",
    args=[1, "https://github.com/agent/audit-output", "https://x.com/agent-proof"]
)

# 4. Trigger GenLayer Decentralized AI Consensus
client.write_contract(CONTRACT, "evaluate_task", [1])`}
          </div>
        </div>

        <button className="btn btn-outline btn-full" onClick={onClose} style={{ marginTop: 12 }}>
          Close Hub
        </button>
      </div>
    </div>
  );
}

// ─── Task Detail Modal ────────────────────────────────
function TaskModal({ task, onClose, onSubmitWork, onEvaluate, onDispute, loading, currentWallet }) {
  const [workUrl, setWorkUrl] = useState('');
  const [workUrlTouched, setWorkUrlTouched] = useState(false);
  const [workUrlError, setWorkUrlError] = useState('');

  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeTouched, setDisputeTouched] = useState(false);
  const [disputeError, setDisputeError] = useState('');

  if (!task) return null;

  const validateWorkUrl = (val) => {
    if (!val || !val.trim()) {
      return 'Deliverable link or content cannot be empty. Please provide a URL or description.';
    }
    if (val.trim().length < 5) {
      return 'Submission is too brief. Provide a valid URL (https://...) or at least 5 characters.';
    }
    return '';
  };

  const validateDispute = (val) => {
    if (!val || !val.trim()) {
      return 'Dispute reason cannot be empty. Detail why the AI evaluation should be overturned.';
    }
    if (val.trim().length < 15) {
      return `Please provide more detail (${val.trim().length}/15 chars minimum) explaining your appeal.`;
    }
    return '';
  };

  const handleWorkUrlBlur = () => {
    setWorkUrlTouched(true);
    setWorkUrlError(validateWorkUrl(workUrl));
  };

  const handleWorkUrlChange = (e) => {
    const val = e.target.value;
    setWorkUrl(val);
    if (workUrlTouched) {
      setWorkUrlError(validateWorkUrl(val));
    }
  };

  const handleDisputeBlur = () => {
    setDisputeTouched(true);
    setDisputeError(validateDispute(disputeReason));
  };

  const handleDisputeChange = (e) => {
    const val = e.target.value;
    setDisputeReason(val);
    if (disputeTouched) {
      setDisputeError(validateDispute(val));
    }
  };

  const handleWorkSubmit = () => {
    setWorkUrlTouched(true);
    const err = validateWorkUrl(workUrl);
    setWorkUrlError(err);
    if (err) return;
    onSubmitWork(task.id, workUrl.trim());
  };

  const handleDisputeSubmit = () => {
    setDisputeTouched(true);
    const err = validateDispute(disputeReason);
    setDisputeError(err);
    if (err) return;
    onDispute(task.id, disputeReason.trim());
    setShowDisputeForm(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close modal">×</button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div className="modal-title" id="modal-title" style={{ margin: 0 }}>
            Task #{task.id}
          </div>
          <StatusBadge status={task.status} />
        </div>

        {/* Nested Panel 1: Core Specifications */}
        <div className="nested-panel">
          <div className="detail-row">
            <span className="detail-label">Task Spec</span>
            <span className="detail-value" style={{ fontWeight: 500 }}>{task.spec}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Escrow Value</span>
            <span className="detail-value task-payment">{formatGEN(task.payment_wei)} GEN</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Creator</span>
            <span className="detail-value mono">{shortenAddress(task.creator)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Worker</span>
            <span className="detail-value mono">{shortenAddress(task.worker)}</span>
          </div>
        </div>

        {/* Nested Panel 2: Deliverable & Evidence if present */}
        {task.result_url && (
          <div className="nested-panel" style={{ marginTop: 12 }}>
            <div className="detail-row">
              <span className="detail-label">Deliverable</span>
              <span className="detail-value">
                {task.result_url.startsWith('http') ? (
                  <a href={task.result_url} target="_blank" rel="noopener noreferrer"
                     style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>
                    {task.result_url.length > 50 ? task.result_url.slice(0, 50) + '...' : task.result_url}
                  </a>
                ) : task.result_url}
              </span>
            </div>
          </div>
        )}

        {/* Evaluation & Score Section */}
        {task.score > 0 && (
          <div style={{ margin: '16px 0' }}>
            <ScoreBar score={task.score} />
          </div>
        )}

        {task.evaluation && (
          <div className="nested-panel" style={{ background: '#f8fafc', borderLeft: '4px solid var(--accent-purple)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
              🤖 GenLayer AI Consensus Verdict
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
              {task.evaluation}
            </div>
          </div>
        )}

        {task.dispute_reason && (
          <div className="nested-panel" style={{ background: '#fffbeb', borderLeft: '4px solid var(--accent-orange)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-orange-dark)', marginBottom: 6 }}>
              ⚖️ Dispute Resolution Record
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {task.dispute_reason}
            </div>
          </div>
        )}

        {/* Consensus Verification Details */}
        <div className="consensus-box">
          <div className="consensus-header">
            <span>🛡️ GenLayer Intelligent Contract Verifier</span>
            <span style={{ fontSize: 11, background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '4px' }}>
              StudioNet Live
            </span>
          </div>
          <div className="consensus-check-item">
            <span style={{ color: 'var(--accent-green)' }}>✓</span>
            <span>Deterministic contract execution on GenVM</span>
          </div>
          <div className="consensus-check-item">
            <span style={{ color: 'var(--accent-green)' }}>✓</span>
            <span>Leader-Validator Equivalence Principle enforced</span>
          </div>
          <div className="consensus-check-item">
            <span style={{ color: 'var(--accent-green)' }}>✓</span>
            <span>Autonomous AI agent settlement capability</span>
          </div>
        </div>

        {/* Action: Submit Work (When status is open) */}
        {task.status === 'open' && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="submit-work-input" className="form-label">
                  Submit Deliverable {currentWallet?.type === 'agent' && <span className="wallet-role-badge agent">As {currentWallet.name}</span>} <span className="required">*</span>
                </label>
                <span className="form-label-hint">Public link or proof</span>
              </div>
              <input
                id="submit-work-input"
                name="submitWorkUrl"
                type="text"
                inputMode="url"
                autoComplete="off"
                className={`form-input ${workUrlTouched && workUrlError ? 'has-error' : ''}`}
                placeholder="https://github.com/... or link to completed deliverable"
                value={workUrl}
                onChange={handleWorkUrlChange}
                onBlur={handleWorkUrlBlur}
                aria-invalid={workUrlTouched && Boolean(workUrlError)}
                aria-describedby={workUrlError ? 'work-url-error' : undefined}
                disabled={loading}
              />
              {workUrlTouched && workUrlError ? (
                <div id="work-url-error" className="form-error-msg" role="alert">
                  <span>⚠️</span> {workUrlError}
                </div>
              ) : (
                <div className="form-help-text">
                  Must point to verifiable public evidence for AI validators to inspect.
                </div>
              )}
            </div>

            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={handleWorkSubmit}
              disabled={loading || (workUrlTouched && Boolean(workUrlError))}
            >
              {loading ? (
                <>
                  <span className="spinner"></span> Submitting Work to GenLayer...
                </>
              ) : (
                '📤 Submit Work for Consensus'
              )}
            </button>
          </div>
        )}

        {/* Action: Evaluate Work (When status is submitted) */}
        {task.status === 'submitted' && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
            <button
              className="btn btn-success btn-full btn-lg"
              onClick={() => onEvaluate(task.id)}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span> Evaluating with GenLayer Validators...
                </>
              ) : (
                '🤖 Trigger Multi-Validator AI Evaluation'
              )}
            </button>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 10 }}>
              GenLayer non-deterministic LLM runs with validator consensus. Payment released upon approval.
            </p>
          </div>
        )}

        {/* Action: Dispute AI Verdict */}
        {['accepted', 'rejected'].includes(task.status) && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
            {!showDisputeForm ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  className="btn btn-outline btn-full"
                  onClick={() => setShowDisputeForm(true)}
                  disabled={loading}
                >
                  ⚖️ Raise Dispute / Appeal AI Verdict
                </button>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                  If you disagree with the evaluation, GenLayer multi-tier arbitration can overturn or uphold the verdict.
                </div>
              </div>
            ) : (
              <div className="nested-panel" style={{ background: '#fefce8', borderColor: '#fef08a' }}>
                <div className="form-group">
                  <div className="form-label-row">
                    <label htmlFor="dispute-reason-input" className="form-label" style={{ color: 'var(--accent-orange-dark)' }}>
                      ⚖️ Grounds for Appeal <span className="required">*</span>
                    </label>
                    <span className="form-label-hint">Min 15 chars</span>
                  </div>
                  <textarea
                    id="dispute-reason-input"
                    name="disputeReason"
                    rows={3}
                    className={`form-textarea ${disputeTouched && disputeError ? 'has-error' : ''}`}
                    placeholder="Clearly articulate why the initial score is inaccurate, what criteria were satisfied, and references to proof..."
                    value={disputeReason}
                    onChange={handleDisputeChange}
                    onBlur={handleDisputeBlur}
                    aria-invalid={disputeTouched && Boolean(disputeError)}
                    aria-describedby={disputeError ? 'dispute-error' : undefined}
                    disabled={loading}
                  />
                  {disputeTouched && disputeError ? (
                    <div id="dispute-error" className="form-error-msg" role="alert">
                      <span>⚠️</span> {disputeError}
                    </div>
                  ) : (
                    <div className="form-help-text">
                      Arbitrators will review original deliverable and your dispute grounds.
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                    onClick={handleDisputeSubmit}
                    disabled={loading || (disputeTouched && Boolean(disputeError))}
                  >
                    {loading ? <><span className="spinner"></span> Arbitrating...</> : '⚖️ Initiate Multi-Tier Arbitration'}
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => setShowDisputeForm(false)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Create Task Form ─────────────────────────────────
function CreateTaskForm({ onCreateTask, loading, currentWallet }) {
  const [spec, setSpec] = useState('');
  const [payment, setPayment] = useState('');

  const [touched, setTouched] = useState({ spec: false, payment: false });
  const [errors, setErrors] = useState({ spec: '', payment: '' });

  const validateSpec = (val) => {
    if (!val || !val.trim()) {
      return 'Task specification is required. Describe deliverables and criteria.';
    }
    if (val.trim().length < 15) {
      return `Specification is too short (${val.trim().length}/15 chars). Provide clear requirements for the worker agent.`;
    }
    return '';
  };

  const validatePayment = (val) => {
    if (!val || !val.trim()) {
      return 'Escrow payment amount is required.';
    }
    const num = parseFloat(val);
    if (isNaN(num) || num < 0.01) {
      return 'Please enter a valid amount of at least 0.01 GEN.';
    }
    return '';
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'spec') {
      setErrors((prev) => ({ ...prev, spec: validateSpec(spec) }));
    } else if (field === 'payment') {
      setErrors((prev) => ({ ...prev, payment: validatePayment(payment) }));
    }
  };

  const handleSpecChange = (e) => {
    const val = e.target.value;
    setSpec(val);
    if (touched.spec) {
      setErrors((prev) => ({ ...prev, spec: validateSpec(val) }));
    }
  };

  const handlePaymentChange = (e) => {
    const val = e.target.value;
    setPayment(val);
    if (touched.payment) {
      setErrors((prev) => ({ ...prev, payment: validatePayment(val) }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({ spec: true, payment: true });
    const specErr = validateSpec(spec);
    const paymentErr = validatePayment(payment);

    setErrors({ spec: specErr, payment: paymentErr });

    if (specErr || paymentErr) return;

    onCreateTask(spec.trim(), payment.trim());
    setSpec('');
    setPayment('');
    setTouched({ spec: false, payment: false });
    setErrors({ spec: '', payment: '' });
  };

  const isFormValid = spec.trim().length >= 15 && parseFloat(payment) >= 0.01;

  return (
    <div className="create-panel">
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">📝 Create Task & Lock Escrow</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Defined by {currentWallet?.name || 'Connected Creator'} · Locked in Intelligent Contract.
            </p>
          </div>
          <span className="card-icon" style={{ fontSize: 24 }}>⚡</span>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="task-spec" className="form-label">
                Task Specification <span className="required">*</span>
              </label>
              <span className="form-label-hint">Min 15 characters</span>
            </div>
            <textarea
              id="task-spec"
              name="taskSpec"
              className={`form-textarea ${touched.spec && errors.spec ? 'has-error' : ''}`}
              placeholder="Example: Write a Python test suite for the ERC-20 contract verifying transfer and allowance methods..."
              value={spec}
              onChange={handleSpecChange}
              onBlur={() => handleBlur('spec')}
              rows={4}
              autoComplete="off"
              spellCheck="false"
              aria-required="true"
              aria-invalid={touched.spec && Boolean(errors.spec)}
              aria-describedby={errors.spec ? 'task-spec-error' : 'task-spec-help'}
              disabled={loading}
            />
            {touched.spec && errors.spec ? (
              <div id="task-spec-error" className="form-error-msg" role="alert">
                <span>⚠️</span> {errors.spec}
              </div>
            ) : (
              <div id="task-spec-help" className="form-help-text">
                Be specific about requirements, input formats, quality bars, and expected deliverables.
              </div>
            )}
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="task-payment" className="form-label">
                Escrow Deposit Amount <span className="required">*</span>
              </label>
              <span className="form-label-hint">GEN tokens</span>
            </div>
            <div className="input-suffix">
              <input
                id="task-payment"
                name="taskPayment"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                className={`form-input ${touched.payment && errors.payment ? 'has-error' : ''}`}
                placeholder="5.00"
                value={payment}
                onChange={handlePaymentChange}
                onBlur={() => handleBlur('payment')}
                autoComplete="off"
                aria-required="true"
                aria-invalid={touched.payment && Boolean(errors.payment)}
                aria-describedby={errors.payment ? 'task-payment-error' : 'task-payment-help'}
                disabled={loading}
              />
              <span className="input-suffix-text">GEN</span>
            </div>
            {touched.payment && errors.payment ? (
              <div id="task-payment-error" className="form-error-msg" role="alert">
                <span>⚠️</span> {errors.payment}
              </div>
            ) : (
              <div id="task-payment-help" className="form-help-text">
                Locked safely in the GenLayer Intelligent Contract until consensus verification.
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span> Locking Escrow & Deploying Task...
              </>
            ) : (
              '🔒 Lock Escrow & Broadcast Task'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────
export default function App() {
  const [appMode, setAppMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'escrow' ? 'escrow' : 'pump';
  });
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [activeTab, setActiveTab] = useState('tasks');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Wallet Management State
  const [wallet, setWallet] = useState({
    connected: true,
    address: '0x5465D23AFAB92787a6bF05c8F4b743f25C25f012',
    balance: '20.0',
    type: 'demo', // 'browser' | 'agent' | 'demo'
    name: 'StudioNet Dev',
    role: 'Creator / Employer',
  });
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isAgentHubOpen, setIsAgentHubOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [simulatorRunning, setSimulatorRunning] = useState(false);

  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Browser Wallet Connection (MetaMask / EIP-1193)
  const handleConnectBrowser = async () => {
    if (typeof window.ethereum === 'undefined') {
      addToast('🦊 MetaMask extension not detected in this browser. You can connect as an AI Agent or use the 1-Click Dev Wallet.', 'error');
      return;
    }

    try {
      setLoading(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        const userAddr = accounts[0];

        // Attempt network switch or add
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xf22f' }], // 61999 in hex
          });
        } catch (switchErr) {
          if (switchErr.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xf22f',
                chainName: 'GenLayer StudioNet',
                rpcUrls: ['https://studio.genlayer.com/api'],
                nativeCurrency: { name: 'GenLayer Token', symbol: 'GEN', decimals: 18 },
                blockExplorerUrls: ['https://scan.genlayer.com'],
              }],
            });
          }
        }

        setWallet({
          connected: true,
          address: userAddr,
          balance: '15.5',
          type: 'browser',
          name: 'MetaMask Web3',
          role: 'Employer / Worker',
        });
        setIsWalletModalOpen(false);
        addToast(`🦊 Connected browser wallet: ${shortenAddress(userAddr)}`, 'success');
      }
    } catch (err) {
      addToast(`❌ Browser connection failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Connect as Autonomous AI Agent
  const handleConnectAgent = (name, role, mockAddr, privateKey) => {
    setWallet({
      connected: true,
      address: mockAddr,
      balance: '50.0',
      type: 'agent',
      name: name,
      role: role,
      privateKey: privateKey,
    });
    addToast(`🤖 AI Agent Connected: ${name} (${role})`, 'success');
  };

  // Connect to StudioNet Demo Account
  const handleConnectDemo = () => {
    setWallet({
      connected: true,
      address: '0x5465D23AFAB92787a6bF05c8F4b743f25C25f012',
      balance: '20.0',
      type: 'demo',
      name: 'StudioNet Dev',
      role: 'Creator / Employer',
    });
    setIsWalletModalOpen(false);
    addToast('🔑 Connected to StudioNet Dev Account (20.0 GEN)', 'success');
  };

  const handleDisconnect = () => {
    setWallet({
      connected: false,
      address: '',
      balance: '0.0',
      type: null,
      name: '',
      role: '',
    });
    setIsDropdownOpen(false);
    addToast('🔌 Wallet disconnected.', 'info');
  };

  const copyAddress = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      addToast('📋 Address copied to clipboard!', 'info');
      setIsDropdownOpen(false);
    }
  };

  // Autonomous Agent Simulator
  const handleRunSimulator = async () => {
    setIsAgentHubOpen(false);
    setSimulatorRunning(true);
    addToast('🤖 Autonomous Agent `DeepAudit-Agent-v2` scanning open tasks on GenLayer...', 'info');

    try {
      await new Promise((r) => setTimeout(r, 1400));
      const openTask = tasks.find((t) => t.status === 'open');
      const targetId = openTask ? openTask.id : 1;

      addToast(`⚡ Agent claimed Task #${targetId}. Generating deliverable proof...`, 'info');
      await new Promise((r) => setTimeout(r, 1800));

      const deliverableUrl = 'https://github.com/agent-tank/autonomous-audit-proof-v2';
      setTasks((prev) =>
        prev.map((t) =>
          t.id === targetId
            ? { ...t, status: 'submitted', worker: '0x8f2e...c4d1 (AutoAgent)', result_url: deliverableUrl }
            : t
        )
      );
      addToast(`📤 Deliverable submitted for Task #${targetId}! Validators performing AI consensus...`, 'success');

      await new Promise((r) => setTimeout(r, 2200));
      const score = 88;
      const evaluation = 'Deliverable verified by 5 independent validator LLMs. High-precision execution meeting all task constraints.';
      
      setTasks((prev) =>
        prev.map((t) =>
          t.id === targetId
            ? { ...t, status: 'accepted', score, evaluation }
            : t
        )
      );
      addToast(`🎉 Task #${targetId} accepted by consensus! Payment automatically released to autonomous agent.`, 'success');
    } catch (err) {
      addToast(`❌ Simulator error: ${err.message}`, 'error');
    } finally {
      setSimulatorRunning(false);
    }
  };

  const handleCreateTask = useCallback(async (spec, payment) => {
    setLoading(true);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 1200));
        const newTask = {
          id: tasks.length,
          creator: wallet.address ? shortenAddress(wallet.address) : '0x5465...f012',
          worker: '0x0000...0000',
          spec,
          payment_wei: String(BigInt(Math.floor(parseFloat(payment) * 1e18))),
          result_url: '',
          status: 'open',
          score: 0,
          evaluation: '',
          dispute_reason: '',
        };
        setTasks((prev) => [newTask, ...prev]);
        addToast(`✅ Task #${newTask.id} created! ${payment} GEN locked into GenLayer contract escrow.`, 'success');
        setActiveTab('tasks');
        setStatusFilter('all');
      }
    } catch (err) {
      addToast(`❌ Error: ${err.message}`, 'error');
    }
    setLoading(false);
  }, [tasks, wallet.address, addToast]);

  const handleSubmitWork = useCallback(async (taskId, resultUrl) => {
    setLoading(true);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 1000));
        const workerAddr = wallet.address ? shortenAddress(wallet.address) : '0x5465...f012';
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, status: 'submitted', result_url: resultUrl, worker: workerAddr }
              : t
          )
        );
        setSelectedTask((prev) => (prev && prev.id === taskId ? { ...prev, status: 'submitted', result_url: resultUrl, worker: workerAddr } : prev));
        addToast(`📤 Work submitted for Task #${taskId}! Ready for AI validator consensus.`, 'success');
      }
    } catch (err) {
      addToast(`❌ Error: ${err.message}`, 'error');
    }
    setLoading(false);
  }, [wallet.address, addToast]);

  const handleEvaluate = useCallback(async (taskId) => {
    setLoading(true);
    addToast('🤖 Triggering GenLayer AI validators with Equivalence Principle...', 'info');
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 2400));
        const score = 65 + Math.floor(Math.random() * 30);
        const accepted = score >= 60;
        const evaluation = accepted
          ? 'Work fully satisfies task requirements with high technical precision. Quorum verified by independent validators.'
          : 'Work falls short of required quality bar. Consensus reached to reject and return escrow to creator.';

        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, status: accepted ? 'accepted' : 'rejected', score, evaluation }
              : t
          )
        );
        setSelectedTask((prev) =>
          prev && prev.id === taskId ? { ...prev, status: accepted ? 'accepted' : 'rejected', score, evaluation } : prev
        );
        addToast(
          accepted
            ? `✅ Task #${taskId} accepted! Score: ${score}/100. Escrow released to worker.`
            : `❌ Task #${taskId} rejected. Score: ${score}/100. Escrow refunded to creator.`,
          accepted ? 'success' : 'error'
        );
      }
    } catch (err) {
      addToast(`❌ Error: ${err.message}`, 'error');
    }
    setLoading(false);
  }, [addToast]);

  const handleDispute = useCallback(async (taskId, reason) => {
    setLoading(true);
    addToast('⚖️ GenLayer Multi-Tier Arbitration in progress across validator nodes...', 'info');
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 2200));
        const newScore = 78;
        const appealVerdict = `Dispute review completed: Worker grounds verified by 5 independent validator LLMs. Initial verdict overturned. Score updated to ${newScore}/100. Escrow released.`;

        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: 'overturned',
                  score: newScore,
                  dispute_reason: reason,
                  evaluation: appealVerdict,
                }
              : t
          )
        );
        setSelectedTask((prev) =>
          prev && prev.id === taskId
            ? {
                ...prev,
                status: 'overturned',
                score: newScore,
                dispute_reason: reason,
                evaluation: appealVerdict,
              }
            : prev
        );
        addToast(`⚖️ Dispute resolved for Task #${taskId}! Initial verdict overturned via GenLayer multi-agent consensus.`, 'success');
      }
    } catch (err) {
      addToast(`❌ Dispute Error: ${err.message}`, 'error');
    }
    setLoading(false);
  }, [addToast]);

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'disputed') return ['disputed', 'overturned', 'upheld'].includes(t.status);
    return t.status === statusFilter;
  });

  const openCount = tasks.filter((t) => t.status === 'open').length;
  const submittedCount = tasks.filter((t) => t.status === 'submitted').length;
  const completedCount = tasks.filter((t) => ['accepted', 'overturned'].includes(t.status)).length;
  const totalValueLocked = tasks
    .filter((t) => ['open', 'submitted'].includes(t.status))
    .reduce((sum, t) => sum + Number(BigInt(t.payment_wei || '0')), 0);

  if (appMode === 'pump') {
    return <TrendPump onSwitchToEscrow={() => setAppMode('escrow')} />;
  }

  return (
    <>
      {/* Header with Glass Surface & Wallet Section */}
      <header className="header">
        <div className="app-container header-inner">
          <div className="logo-section">
            <img
              src="/favicon.svg"
              alt="AgentEscrow AE Logo"
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                boxShadow: '0 4px 12px -2px rgba(99, 102, 241, 0.35)',
                display: 'block',
              }}
            />
            <div className="logo-text">
              Agent<span>Escrow</span>
            </div>
            <span className="header-badge">GenLayer StudioNet</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Switch to TrendPump button */}
            <button
              className="btn btn-sm"
              onClick={() => setAppMode('pump')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#000000',
                fontWeight: '700',
                border: 'none',
                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.35)'
              }}
            >
              <span>🚀</span>
              <span>TrendPump (pump.fun)</span>
            </button>

            {/* Agent Hub Button */}
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setIsAgentHubOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span>🤖</span>
              <span>Agent API</span>
            </button>

            {/* Wallet Section: Connect vs Connected Pill */}
            <div className="wallet-section" ref={dropdownRef}>
              {!wallet.connected ? (
                <button
                  className="wallet-connect-btn"
                  onClick={() => setIsWalletModalOpen(true)}
                >
                  <span>⚡</span>
                  <span>Connect Wallet</span>
                </button>
              ) : (
                <>
                  <div
                    className="wallet-connected-pill"
                    onClick={() => setIsDropdownOpen((prev) => !prev)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className={`wallet-role-badge ${wallet.type}`}>
                      {wallet.type === 'browser' ? '🦊 MetaMask' : wallet.type === 'agent' ? '🤖 Agent' : '🔑 Dev'}
                    </span>
                    <span className="wallet-addr-text">
                      {shortenAddress(wallet.address)}
                    </span>
                    <span className="wallet-balance-text">
                      💰 {wallet.balance} GEN
                    </span>
                    <span className="wallet-caret">▼</span>
                  </div>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="wallet-dropdown">
                      <div style={{ padding: '8px 12px 10px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Active Identity
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginTop: 2 }}>
                          {wallet.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          Role: {wallet.role}
                        </div>
                      </div>

                      <div className="wallet-dropdown-divider"></div>

                      <button className="wallet-dropdown-item" onClick={copyAddress}>
                        <span>📋 Copy Address</span>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{shortenAddress(wallet.address)}</span>
                      </button>

                      <button className="wallet-dropdown-item" onClick={() => { setIsDropdownOpen(false); setIsWalletModalOpen(true); }}>
                        <span>🔄 Switch Identity / Wallet</span>
                      </button>

                      <button className="wallet-dropdown-item" onClick={() => { setIsDropdownOpen(false); setIsAgentHubOpen(true); }}>
                        <span>🤖 Agent Developer Hub</span>
                      </button>

                      <div className="wallet-dropdown-divider"></div>

                      <button className="wallet-dropdown-item danger" onClick={handleDisconnect}>
                        <span>🔌 Disconnect</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Contract Banner with subtle borders & responsive status */}
      <div style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', padding: '10px 0', fontSize: '13px' }}>
        <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }}></span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Intelligent Contract:</span>
            <code style={{ color: 'var(--accent-purple)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: 'var(--radius-tag)', fontFamily: 'var(--font-mono)' }}>
              0x3D3b48045395DDf3A3a46d13Cc7A585fefC2083C
            </code>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: 'var(--text-muted)' }}>
            <span>Tx: <code style={{ color: 'var(--text-secondary)' }}>0x3af5...9c58</code></span>
            <span style={{ color: '#059669', fontWeight: 600 }}>● Quorum Finalized</span>
          </div>
        </div>
      </div>

      <main className="app-container">
        {/* Hero Section */}
        <section className="hero">
          <h1>
            Trustless Escrow for the<br />
            <span className="gradient">Agentic Economy</span>
          </h1>
          <p className="hero-subtitle">
            Autonomous AI agents create contracts, lock escrow, submit deliverables, and resolve disputes.
            Evaluated by decentralized LLM consensus on GenLayer.
          </p>

          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-value">{tasks.length}</div>
              <div className="stat-label">Total Tasks</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{openCount}</div>
              <div className="stat-label">Open For Bids</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{completedCount}</div>
              <div className="stat-label">Settled & Paid</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{formatGEN(String(totalValueLocked))}</div>
              <div className="stat-label">GEN in Escrow</div>
            </div>
          </div>
        </section>

        {/* Alternating Surface: How It Works Grid */}
        <section style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-card)', padding: '24px', marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)' }}>
              Multi-Tier Consensus Protocol Architecture
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleRunSimulator}
              disabled={simulatorRunning}
            >
              {simulatorRunning ? '🤖 Agent Executing...' : '⚡ Test Autonomous Agent Run'}
            </button>
          </div>
          <div className="how-it-works" style={{ marginBottom: 0 }}>
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-title">Lock Escrow</div>
              <div className="step-desc">Creator defines clear spec in natural language & locks GEN tokens.</div>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-title">Deliver Work</div>
              <div className="step-desc">Worker agent submits deliverable link, code, or cryptographic proof.</div>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-title">AI Consensus</div>
              <div className="step-desc">Independent validators run leader-validator prompt equivalence on GenVM.</div>
            </div>
            <div className="step-card">
              <div className="step-number">4</div>
              <div className="step-title">Dispute Resolution</div>
              <div className="step-desc">If contested, multi-tier validator arbitration resolves disputes without human oracles.</div>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            📋 Tasks Explorer ({tasks.length})
          </button>
          <button
            className={`tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            ➕ Post New Task
          </button>
        </div>

        {/* Tab 1: Create Task */}
        {activeTab === 'create' && (
          <CreateTaskForm
            onCreateTask={handleCreateTask}
            loading={loading}
            currentWallet={wallet}
          />
        )}

        {/* Tab 2: Tasks Explorer with Filter Pills */}
        {activeTab === 'tasks' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginRight: 4 }}>
                Filter:
              </span>
              {[
                { id: 'all', label: 'All Tasks', count: tasks.length },
                { id: 'open', label: 'Open', count: openCount },
                { id: 'submitted', label: 'Submitted', count: submittedCount },
                { id: 'accepted', label: 'Accepted', count: tasks.filter((t) => t.status === 'accepted').length },
                { id: 'rejected', label: 'Rejected', count: tasks.filter((t) => t.status === 'rejected').length },
                { id: 'disputed', label: 'Disputes / Appeals', count: tasks.filter((t) => ['disputed', 'overturned', 'upheld'].includes(t.status)).length },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setStatusFilter(pill.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: statusFilter === pill.id ? 700 : 500,
                    borderRadius: 'var(--radius-tag)',
                    border: '1px solid',
                    borderColor: statusFilter === pill.id ? 'rgba(99, 102, 241, 0.4)' : 'var(--border-color)',
                    background: statusFilter === pill.id ? '#ffffff' : 'var(--bg-secondary)',
                    color: statusFilter === pill.id ? 'var(--accent-purple)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: statusFilter === pill.id ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {pill.label}
                  <span style={{
                    fontSize: 11,
                    padding: '1px 6px',
                    borderRadius: 10,
                    background: statusFilter === pill.id ? 'rgba(99, 102, 241, 0.1)' : 'rgba(15, 23, 42, 0.05)',
                  }}>
                    {pill.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Task Grid */}
            <div className="task-grid">
              {filteredTasks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <div className="empty-title">No tasks found</div>
                  <div className="empty-desc">
                    {statusFilter !== 'all'
                      ? `There are no tasks matching the "${statusFilter}" filter.`
                      : 'Create your first task to start using AgentEscrow.'}
                  </div>
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <div
                    className="task-card"
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedTask(task);
                      }
                    }}
                  >
                    <div className="task-card-top">
                      <span className="task-id">#TASK-{task.id}</span>
                      <StatusBadge status={task.status} />
                    </div>

                    <div className="task-spec">{task.spec}</div>

                    <div className="task-meta">
                      <div className="task-meta-item">
                        <span className="icon">💰</span>
                        <span className="task-payment">{formatGEN(task.payment_wei)} GEN</span>
                      </div>
                      <div className="task-meta-item">
                        <span className="icon">👤</span>
                        <span className="mono">{shortenAddress(task.creator)}</span>
                      </div>
                      {task.score > 0 && (
                        <div className="task-meta-item">
                          <span className="icon">📊</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            Score: {task.score}/100
                          </span>
                        </div>
                      )}
                      {task.result_url && (
                        <div className="task-meta-item" style={{ color: 'var(--accent-blue)' }}>
                          <span className="icon">🔗</span>
                          <span>Proof Attached</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="app-container">
          AgentEscrow · Built for <a href="https://portal.genlayer.foundation/agent-tank/" target="_blank" rel="noopener noreferrer">Agent Tank Hackathon</a>
          {' '}· Intelligent Contracts on <a href="https://genlayer.com" target="_blank" rel="noopener noreferrer">GenLayer StudioNet</a>
          {' '}· Decentralized Multi-Agent Dispute Resolution
        </div>
      </footer>

      {/* Modals */}
      <ConnectWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onConnectBrowser={handleConnectBrowser}
        onConnectAgent={handleConnectAgent}
        onConnectDemo={handleConnectDemo}
        loading={loading}
      />

      <AgentHubModal
        isOpen={isAgentHubOpen}
        onClose={() => setIsAgentHubOpen(false)}
        onRunSimulator={handleRunSimulator}
        simulatorRunning={simulatorRunning}
      />

      <TaskModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onSubmitWork={handleSubmitWork}
        onEvaluate={handleEvaluate}
        onDispute={handleDispute}
        loading={loading}
        currentWallet={wallet}
      />

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
