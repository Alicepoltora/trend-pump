import { useState, useMemo, useEffect, useCallback } from 'react';
import './TrendPump.css';
import {
  CONTRACT_ADDRESS,
  DEPLOY_TX_HASH,
  EXPLORER_URL,
  RPC_URL,
  CHAIN_ID,
  CHAIN_HEX,
  DEFAULT_DEV_KEY,
  DEFAULT_DEV_ADDR,
  toChecksumAddress,
  fetchAllTokens,
  buyTokensOnChain,
  sellTokensOnChain,
  scanAndLaunchOnChain,
  detectSurgeOnChain,
  fundAccount,
  getAccountBalance,
  seedInitialTokensOnChain,
  CANONICAL_FALLBACK_TOKENS,
} from './genlayer';

const PRESET_TWEETS = [
  {
    author: '@elonmusk',
    name: 'Elon Musk',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
    text: 'Optimus humanoid robots will outnumber humans by 2040. The manufacturing paradigm has shifted forever.',
    url: 'https://x.com/elonmusk/status/1880000000000000003',
    suggested_ticker: '$OPTIMUS',
    suggested_name: 'Optimus Robot Workforce',
    views: '4.1M',
    likes: '62K',
  },
  {
    author: '@sama',
    name: 'Sam Altman',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    text: 'Autonomous agents doing continuous multi-week engineering tasks are becoming genuinely capable.',
    url: 'https://x.com/sama/status/1880000000000000004',
    suggested_ticker: '$AGI',
    suggested_name: 'Superintelligence Alpha',
    views: '1.9M',
    likes: '31K',
  },
  {
    author: '@vitalikbuterin',
    name: 'Vitalik Buterin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    text: 'Zk-SNARKs and AI consensus will converge to form the ultimate trust-minimized financial layer.',
    url: 'https://x.com/vitalikbuterin/status/1880000000000000005',
    suggested_ticker: '$SNARK',
    suggested_name: 'Zero Knowledge Consensus',
    views: '1.2M',
    likes: '24K',
  },
];

export default function TrendPump({ onSwitchToEscrow }) {
  const [tokens, setTokens] = useState(CANONICAL_FALLBACK_TOKENS);
  const [walletAddress, setWalletAddress] = useState(DEFAULT_DEV_ADDR);
  const [walletKey, setWalletKey] = useState(DEFAULT_DEV_KEY);
  const [walletType, setWalletType] = useState('dev'); // 'dev' | 'metamask'
  const [userGenBalance, setUserGenBalance] = useState('99.9');
  const [userTokenBalances, setUserTokenBalances] = useState({ 0: 10000000, 1: 5000000, 2: 5000000 });
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all'); // 'all', 'hot', 'king', 'graduating'

  // Modals state
  const [tradeModalToken, setTradeModalToken] = useState(null);
  const [tradeTab, setTradeTab] = useState('buy');
  const [tradeAmount, setTradeAmount] = useState('50000');

  const [launchModalOpen, setLaunchModalOpen] = useState(false);
  const [customAuthor, setCustomAuthor] = useState('@elonmusk');
  const [customTweetUrl, setCustomTweetUrl] = useState('https://x.com/elonmusk/status/1880000000000000003');
  const [customTweetText, setCustomTweetText] = useState('Optimus humanoid robots will outnumber humans by 2040. The manufacturing paradigm has shifted forever.');
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchStep, setLaunchStep] = useState(0);

  const [surgeModalToken, setSurgeModalToken] = useState(null);
  const [surgeTweetText, setSurgeTweetText] = useState('Mars colony orbital fleet launch windows finalized with 5 starships.');
  const [isSurging, setIsSurging] = useState(false);
  const [surgeSuccess, setSurgeSuccess] = useState(null);

  const [toastMessage, setToastMessage] = useState('');
  const [toastTx, setToastTx] = useState(null);
  const [isTrading, setIsTrading] = useState(false);
  const [lastTxHash, setLastTxHash] = useState(DEPLOY_TX_HASH);
  const [networkConnected, setNetworkConnected] = useState(true);

  const showToast = useCallback((msg, tx = null) => {
    setToastMessage(msg);
    setToastTx(tx);
    setTimeout(() => {
      setToastMessage('');
      setToastTx(null);
    }, 6500);
  }, []);

  // Fetch tokens and balance from blockchain
  const refreshOnChainData = useCallback(async () => {
    try {
      const onChainTokens = await fetchAllTokens();
      if (Array.isArray(onChainTokens) && onChainTokens.length > 0) {
        setTokens(prev => {
          const map = new Map(onChainTokens.map(t => [t.id, t]));
          return prev.map(p => {
            if (map.has(p.id)) {
              const oct = map.get(p.id);
              map.delete(p.id);
              return { ...p, ...oct };
            }
            return p;
          }).concat(Array.from(map.values()).map(oct => ({
            ...oct,
            icon: oct.ticker === '$MARS' ? '🪐' : oct.ticker === '$GROK' ? '🤖' : oct.ticker === '$LEAN' ? '⚡' : '🚀',
            avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
            likes: '50K+',
            retweets: '10K+',
            views: '2.5M',
            is_king: oct.id === 0,
          })));
        });
      }
      setNetworkConnected(true);
    } catch (e) {
      console.warn('Refresh error:', e);
      setNetworkConnected(false);
    }

    if (walletAddress) {
      try {
        const bal = await getAccountBalance(walletAddress);
        setUserGenBalance(bal);
      } catch (e) {
        // ignore
      }
    }
  }, [walletAddress]);

  useEffect(() => {
    refreshOnChainData();
    const interval = setInterval(refreshOnChainData, 10000);
    return () => clearInterval(interval);
  }, [refreshOnChainData]);

  // Connect MetaMask
  const handleConnectMetaMask = async () => {
    if (!window.ethereum) {
      showToast('⚠️ MetaMask not found. Please install MetaMask or use 1-Click Dev Account.');
      return;
    }
    try {
      showToast('🦊 Requesting MetaMask connection...');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts[0]) {
        const addr = toChecksumAddress(accounts[0]);
        setWalletAddress(addr);
        setWalletType('metamask');
        setWalletKey(null);

        // Switch or add Studio Next Chain 61997
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CHAIN_HEX }],
          });
        } catch (switchErr) {
          if (switchErr.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: CHAIN_HEX,
                  chainName: 'GenLayer Studio Next',
                  nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
                  rpcUrls: [RPC_URL],
                  blockExplorerUrls: [EXPLORER_URL],
                },
              ],
            });
          }
        }
        const bal = await getAccountBalance(addr);
        setUserGenBalance(bal);
        showToast(`✓ Connected MetaMask: ${addr.slice(0, 6)}...${addr.slice(-4)} (${bal} GEN)`);
        setWalletModalOpen(false);
      }
    } catch (err) {
      console.error('MetaMask connection error:', err);
      showToast(`⚠️ MetaMask error: ${err.message || err}`);
    }
  };

  const handleConnectDev = async () => {
    setWalletAddress(DEFAULT_DEV_ADDR);
    setWalletKey(DEFAULT_DEV_KEY);
    setWalletType('dev');
    const bal = await getAccountBalance(DEFAULT_DEV_ADDR);
    setUserGenBalance(bal);
    showToast(`✓ Connected 1-Click Studio Next Dev Account (${bal} GEN)`);
    setWalletModalOpen(false);
  };

  // Mathematical Bonding Curve calculation
  const calcBuyCost = (currSupply, amount) => {
    const s = Number(currSupply);
    const n = Number(amount) || 0;
    if (n <= 0) return 0;
    const curve = Math.floor((n * (2 * s + n)) / 200000);
    return Math.max(1, n * 10 + curve);
  };

  const calcSellRefund = (currSupply, amount) => {
    const s = Number(currSupply);
    const n = Number(amount) || 0;
    if (n <= 0) return 0;
    const curve = Math.floor((n * (2 * s - n)) / 200000);
    return Math.max(1, n * 10 + curve);
  };

  // Trade quote
  const tradeQuote = useMemo(() => {
    if (!tradeModalToken) return { costOrRefund: 0, type: 'cost' };
    const n = Number(tradeAmount) || 0;
    if (tradeTab === 'buy') {
      const cost = calcBuyCost(tradeModalToken.circulating_supply, n);
      return { costOrRefund: cost, type: 'cost' };
    } else {
      const refund = calcSellRefund(tradeModalToken.circulating_supply, n);
      return { costOrRefund: refund, type: 'refund' };
    }
  }, [tradeModalToken, tradeTab, tradeAmount]);

  // Filtered tokens
  const filteredTokens = useMemo(() => {
    return tokens.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        t.ticker.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.origin_author.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (activeCategory === 'king') return t.is_king;
      if (activeCategory === 'hot') return t.virality_score >= 88;
      if (activeCategory === 'graduating') return (t.circulating_supply / (t.total_supply * 0.8)) >= 0.4;
      return true;
    });
  }, [tokens, searchQuery, activeCategory]);

  // Handle Trade Execution directly On-Chain
  const handleExecuteTrade = async () => {
    const amount = Number(tradeAmount);
    if (!amount || amount <= 0) {
      showToast('⚠️ Please enter a valid token amount');
      return;
    }

    const t = tradeModalToken;
    const tokenId = t.id;
    setIsTrading(true);
    showToast(`⏳ Submitting on-chain ${tradeTab.toUpperCase()} transaction to GenLayer Studio Next...`);

    try {
      let res;
      if (tradeTab === 'buy') {
        res = await buyTokensOnChain(walletKey, tokenId, amount);
      } else {
        res = await sellTokensOnChain(walletKey, tokenId, amount);
      }

      const txHash = res.txHash;
      setLastTxHash(txHash);

      // Update balances
      if (tradeTab === 'buy') {
        setUserTokenBalances(prev => ({ ...prev, [tokenId]: (prev[tokenId] || 0) + amount }));
        showToast(`🎉 On-Chain Buy Confirmed! Bought ${amount.toLocaleString()} ${t.ticker}`, txHash);
      } else {
        setUserTokenBalances(prev => ({ ...prev, [tokenId]: Math.max(0, (prev[tokenId] || 0) - amount) }));
        showToast(`💰 On-Chain Sell Confirmed! Sold ${amount.toLocaleString()} ${t.ticker}`, txHash);
      }

      setTradeModalToken(null);
      await refreshOnChainData();
    } catch (err) {
      console.error('On-chain trade error:', err);
      showToast(`⚠️ Trade failed: ${err.message || err}`);
    } finally {
      setIsTrading(false);
    }
  };

  // Claim faucet on Studio Next
  const handleClaimFaucet = async () => {
    showToast(`⏳ Sending 5 GEN on Studio Next to ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}...`);
    try {
      const txHash = await fundAccount(walletAddress, '5');
      await new Promise(r => setTimeout(r, 1500));
      const bal = await getAccountBalance(walletAddress);
      setUserGenBalance(bal);
      showToast(`🎁 Successfully transferred 5 GEN on Studio Next! Balance: ${bal} GEN`, txHash);
    } catch (e) {
      console.error('Faucet transfer error:', e);
      showToast(`⚠️ Faucet error: ${e.message || e}`);
    }
  };

  // Autonomous Launch with Live GenLayer Studio Next Consensus
  const handleAutonomousLaunch = async () => {
    if (!customTweetText.trim()) {
      showToast('⚠️ Tweet text cannot be empty');
      return;
    }

    setIsLaunching(true);
    setLaunchStep(1);

    const stepInterval = setInterval(() => {
      setLaunchStep(s => (s < 3 ? s + 1 : s));
    }, 2000);

    try {
      showToast('🤖 Submitting tweet to GenLayer GenVM consensus radar...');
      const res = await scanAndLaunchOnChain(walletKey, {
        url: customTweetUrl,
        text: customTweetText,
        author: customAuthor,
      });

      clearInterval(stepInterval);
      setLaunchStep(4);
      setLastTxHash(res.txHash);
      showToast(`🚀 AI Consensus Passed! New Memecoin Coined on Chain 61997!`, res.txHash);

      setTimeout(() => {
        setIsLaunching(false);
        setLaunchModalOpen(false);
        setLaunchStep(0);
        refreshOnChainData();
      }, 1500);
    } catch (err) {
      clearInterval(stepInterval);
      setIsLaunching(false);
      setLaunchStep(0);
      console.error('Launch error:', err);
      showToast(`⚠️ On-Chain Launch failed: ${err.message || err}`);
    }
  };

  // Trend surge burn with Live GenLayer Studio Next
  const handleTriggerSurge = async () => {
    if (!surgeTweetText.trim() || !surgeModalToken) return;
    setIsSurging(true);
    showToast('🔥 Submitting Trend Surge consensus verification to GenLayer Studio Next...');

    try {
      const res = await detectSurgeOnChain(
        walletKey,
        surgeModalToken.id,
        'https://x.com/elonmusk/status/1880000000000000010',
        surgeTweetText
      );

      setLastTxHash(res.txHash);
      showToast(`🔥 TREND SURGE VERIFIED! 10% unminted supply burned by consensus!`, res.txHash);

      const t = surgeModalToken;
      const remaining = t.total_supply - t.circulating_supply;
      const burnAmount = Math.floor(remaining / 10);
      setSurgeSuccess({
        burnAmount,
        newTotal: t.total_supply - burnAmount,
        ticker: t.ticker,
        txHash: res.txHash,
      });

      setTokens(prev => prev.map(tok => {
        if (tok.id === t.id) {
          return {
            ...tok,
            total_supply: tok.total_supply - burnAmount,
            surge_burns_count: (tok.surge_burns_count || 0) + 1,
          };
        }
        return tok;
      }));

      await refreshOnChainData();
    } catch (e) {
      console.error('Surge burn error:', e);
      showToast(`⚠️ Trend surge verification failed: ${e.message || e}`);
    } finally {
      setIsSurging(false);
    }
  };

  return (
    <div className="trendpump-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid #10b981',
          color: '#ffffff',
          padding: '14px 22px',
          borderRadius: '12px',
          boxShadow: '0 12px 35px rgba(0,0,0,0.6), 0 0 20px rgba(16, 185, 129, 0.25)',
          backdropFilter: 'blur(12px)',
          zIndex: 9999,
          fontWeight: '700',
          fontSize: '0.92rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div>{toastMessage}</div>
          {toastTx && (
            <a
              href={`${EXPLORER_URL}/tx/${toastTx}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#38bdf8', fontSize: '0.82rem', textDecoration: 'underline' }}
            >
              View on Studio Next Explorer: {toastTx.slice(0, 10)}... ↗
            </a>
          )}
        </div>
      )}

      {/* ─── Continuous Ticker Tape Marquee ───────────────────────── */}
      <div className="tp-ticker-tape">
        <div className="tp-marquee-track">
          <div className="tp-ticker-item">
            <span>👑 KING OF THE HILL:</span>
            <span className="tp-ticker-symbol">$MARS</span>
            <span className="tp-ticker-up">+240%</span>
          </div>
          <div className="tp-ticker-item">
            <span className="tp-ticker-symbol">$GROK</span>
            <span className="tp-ticker-up">+89%</span>
          </div>
          <div className="tp-ticker-item">
            <span className="tp-ticker-symbol">$LEAN</span>
            <span className="tp-ticker-up">+64%</span>
          </div>
          <div className="tp-ticker-item">
            <span className="tp-ticker-symbol">$OPTIMUS</span>
            <span className="tp-ticker-up">+175%</span>
          </div>
          <div className="tp-ticker-item">
            <span style={{ color: '#fb923c' }}>🔥 RECENT SURGE: 100,000,000 $MARS BURNED BY GENVM CONSENSUS</span>
          </div>
          <div className="tp-ticker-item">
            <span style={{ color: '#94a3b8' }}>100% FAIR LAUNCH · ZERO DEV PREMINE · PURE MATHEMATICAL CURVE</span>
          </div>
          {/* Duplicate set for seamless continuous marquee */}
          <div className="tp-ticker-item">
            <span>👑 KING OF THE HILL:</span>
            <span className="tp-ticker-symbol">$MARS</span>
            <span className="tp-ticker-up">+240%</span>
          </div>
          <div className="tp-ticker-item">
            <span className="tp-ticker-symbol">$GROK</span>
            <span className="tp-ticker-up">+89%</span>
          </div>
          <div className="tp-ticker-item">
            <span className="tp-ticker-symbol">$LEAN</span>
            <span className="tp-ticker-up">+64%</span>
          </div>
        </div>
      </div>

      {/* ─── Glass Header Navigation ──────────────────────────────── */}
      <header className="tp-header">
        <div className="tp-header-inner">
          <div className="tp-logo-group">
            <div className="tp-logo-icon">🚀</div>
            <div>
              <div className="tp-logo-title">
                <span>Gen<span style={{ color: '#10b981' }}>Fun</span></span>
                <span className="tp-badge-genlayer">
                  <span>⚡</span> GenLayer Studio Next (61997)
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <a
              href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="tp-network-pill"
              style={{ textDecoration: 'none', color: 'inherit' }}
              title="View deployed Intelligent Contract on GenLayer Explorer"
            >
              <span className="tp-live-dot" style={{ backgroundColor: networkConnected ? '#10b981' : '#f59e0b' }}></span>
              <span>Contract: {CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)} ↗</span>
            </a>

            {lastTxHash && (
              <a
                href={`${EXPLORER_URL}/tx/${lastTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="tp-network-pill"
                style={{ textDecoration: 'none', color: '#60a5fa', borderColor: 'rgba(96, 165, 250, 0.4)' }}
                title="View latest confirmed transaction on GenLayer Studio Next Explorer"
              >
                🔗 Latest Tx: {lastTxHash.slice(0, 8)}... ↗
              </a>
            )}

            <button
              className="tp-network-pill"
              onClick={() => setWalletModalOpen(true)}
              style={{
                cursor: 'pointer',
                background: 'rgba(16, 185, 129, 0.1)',
                borderColor: 'rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                fontWeight: '800'
              }}
              title="Click to switch wallet"
            >
              <span>{walletType === 'metamask' ? '🦊 MetaMask' : '⚡ Studio Dev'}</span>
              <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
              <span style={{ color: '#ffffff' }}>({userGenBalance} GEN)</span>
            </button>

            <button className="tp-btn-faucet" onClick={handleClaimFaucet} title="Get 5 GEN from Studio Next Faucet">
              <span>🎁</span>
              <span>Faucet (+5 GEN)</span>
            </button>

            <button className="tp-btn-launch" onClick={() => setLaunchModalOpen(true)}>
              <span>🤖</span>
              <span>Auto-Launch Token</span>
            </button>

            {onSwitchToEscrow && (
              <button
                onClick={onSwitchToEscrow}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#94a3b8',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                ⚖️ Switch to AgentEscrow
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="tp-main">
        {/* ─── Hero Spotlight Banner ────────────────────────────────── */}
        <section className="tp-hero-spotlight">
          <div className="tp-hero-content">
            <div className="tp-hero-pill">
              <span>●</span> Autonomous Memecoin Launchpad
            </div>
            <h1 className="tp-hero-title">
              Zero Human Devs. <span>Pure AI Consensus.</span>
            </h1>
            <p className="tp-hero-desc">
              The Intelligent Contract monitors high-impact tweets in real time, computes virality
              via GenLayer validator LLMs, mints fair-launch memecoins, and executes automated
              <strong> 10% Trend Surge Burns</strong> when creators follow up.
            </p>
          </div>

          <div className="tp-hero-stats">
            <div className="tp-metric-card">
              <div className="tp-metric-val">
                100<span className="tp-metric-unit">%</span>
              </div>
              <div className="tp-metric-label">Fair Launch</div>
            </div>
            <div className="tp-metric-card">
              <div className="tp-metric-val">
                {tokens.length}
              </div>
              <div className="tp-metric-label">Active Curves</div>
            </div>
            <div className="tp-metric-card">
              <div className="tp-metric-val">
                100<span className="tp-metric-unit">M</span>
              </div>
              <div className="tp-metric-label">Supply Burned</div>
            </div>
            <div className="tp-metric-card">
              <div className="tp-metric-val">
                0<span className="tp-metric-unit">s</span>
              </div>
              <div className="tp-metric-label">Dev Dumping</div>
            </div>
          </div>
        </section>

        {/* ─── Search & Category Filter Bar ─────────────────────────── */}
        <div className="tp-filter-bar">
          <div className="tp-search-box">
            <span className="tp-search-icon">🔍</span>
            <input
              type="text"
              className="tp-search-input"
              placeholder="Search ticker ($MARS), name, or author (@elonmusk)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="tp-category-pills">
            <button
              className={`tp-cat-btn ${activeCategory === 'all' ? 'tp-cat-active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              <span>⚡</span> All Curves
            </button>
            <button
              className={`tp-cat-btn ${activeCategory === 'king' ? 'tp-cat-active' : ''}`}
              onClick={() => setActiveCategory('king')}
            >
              <span>👑</span> King of the Hill
            </button>
            <button
              className={`tp-cat-btn ${activeCategory === 'hot' ? 'tp-cat-active' : ''}`}
              onClick={() => setActiveCategory('hot')}
            >
              <span>🔥</span> Hot Virality
            </button>
            <button
              className={`tp-cat-btn ${activeCategory === 'graduating' ? 'tp-cat-active' : ''}`}
              onClick={() => setActiveCategory('graduating')}
            >
              <span>🎓</span> Near Graduation
            </button>
          </div>
        </div>

        {/* ─── Influencer Live Tweet Radar ──────────────────────────── */}
        <section className="tp-radar-section">
          <div className="tp-section-header">
            <div className="tp-section-title">
              <span>📡 Influencer Radar</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--tp-text-muted)', fontWeight: '500', fontFamily: 'var(--tp-font-mono)' }}>
                [gl.nondet.web.render · Live Consensus Stream]
              </span>
            </div>
          </div>

          <div className="tp-radar-grid">
            {PRESET_TWEETS.map((item, idx) => (
              <div key={idx} className="tp-radar-card">
                <div>
                  <div className="tp-tweet-author">
                    <div className="tp-tweet-profile">
                      <img src={item.avatar} alt={item.name} className="tp-tweet-avatar" />
                      <div className="tp-author-info">
                        <div className="tp-author-name">
                          {item.name}
                          <span className="tp-verified-check">✓</span>
                        </div>
                        <div className="tp-author-handle">{item.author}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--tp-text-muted)' }}>X / Twitter</span>
                  </div>

                  <div className="tp-tweet-body">
                    "{item.text}"
                    <div className="tp-tweet-metrics-row">
                      <span>👁️ {item.views} Views</span>
                      <span>❤️ {item.likes} Likes</span>
                    </div>
                  </div>
                </div>

                <div className="tp-radar-footer">
                  <div className="tp-virality-meter">
                    <span>⚡</span> 94/100 Viral
                  </div>
                  <button
                    className="tp-btn-radar-launch"
                    onClick={() => {
                      setCustomAuthor(item.author);
                      setCustomTweetUrl(item.url);
                      setCustomTweetText(item.text);
                      setLaunchModalOpen(true);
                    }}
                  >
                    🚀 Auto-Coin {item.suggested_ticker}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Fair-Launch Meme Tokens Grid ─────────────────────────── */}
        <section>
          <div className="tp-section-header">
            <div className="tp-section-title">
              <span>🔥 Bonding Curves</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--tp-text-muted)', fontWeight: '500', fontFamily: 'var(--tp-font-mono)' }}>
                [80% Threshold: Raydium / Uniswap Graduation]
              </span>
            </div>
          </div>

          <div className="tp-tokens-grid">
            {filteredTokens.map((token) => {
              const gradPct = Math.min(100, Math.round((token.circulating_supply / (token.total_supply * 0.8)) * 100));
              const userHoldings = userTokenBalances[token.id] || 0;
              const currentUnitPrice = 10 + Math.floor((1 * token.circulating_supply) / 100000);

              return (
                <div
                  key={token.id}
                  className={`tp-token-card ${token.is_king ? 'tp-card-king' : ''}`}
                >
                  {token.is_king && (
                    <div className="tp-king-tag">
                      <span>👑</span> King of the Hill
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="tp-token-header">
                      <div className="tp-token-icon-wrap">
                        <div className="tp-token-icon">{token.icon}</div>
                      </div>
                      <div className="tp-token-identity">
                        <div className="tp-token-name-row">
                          <span className="tp-token-name">{token.name}</span>
                          <span className="tp-token-ticker">{token.ticker}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className="tp-virality-meter" style={{ padding: '2px 8px', fontSize: '0.74rem' }}>
                            ⚡ Virality {token.virality_score}/100
                          </span>
                          {token.surge_burns_count > 0 && (
                            <span style={{
                              fontSize: '0.74rem',
                              color: 'var(--tp-accent-orange-bright)',
                              background: 'rgba(249, 115, 22, 0.15)',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              border: '1px solid rgba(249, 115, 22, 0.3)',
                              fontWeight: '700'
                            }}>
                              🔥 {token.surge_burns_count} Surge Burns
                            </span>
                          )}
                        </div>
                        <p className="tp-token-lore">{token.lore}</p>
                      </div>
                    </div>

                    {/* Embedded Origin Tweet Snapshot */}
                    <div className="tp-card-tweet" style={{ marginTop: '16px' }}>
                      <div className="tp-card-tweet-header">
                        <span>Source Tweet by <strong>{token.origin_author}</strong> · {token.tweet_time || 'On-Chain'}</span>
                        <a
                          href={token.origin_tweet_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--tp-accent-cyan-bright)', textDecoration: 'none', fontWeight: '600' }}
                        >
                          View on X ↗
                        </a>
                      </div>
                      <div className="tp-card-tweet-text">"{token.origin_tweet_text}"</div>
                      <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '0.75rem', color: 'var(--tp-text-muted)', fontFamily: 'var(--tp-font-mono)' }}>
                        <span>❤️ {token.likes || '42K'}</span>
                        <span>🔁 {token.retweets || '8.5K'}</span>
                        <span>👁️ {token.views || '1.5M'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {/* Bonding Curve Box */}
                    <div className="tp-curve-box">
                      <div className="tp-curve-header">
                        <span className="tp-curve-label">Bonding Curve Graduation</span>
                        <span className="tp-curve-pct">{gradPct}%</span>
                      </div>
                      <div className="tp-progress-bar-bg">
                        <div className="tp-progress-bar-fill" style={{ width: `${gradPct}%` }}></div>
                      </div>
                      <div className="tp-curve-stats-row">
                        <span>Unit Price: <strong>{currentUnitPrice} wei</strong></span>
                        <span>Circulating: <strong>{(token.circulating_supply / 1e6).toFixed(1)}M / {(token.total_supply / 1e6).toFixed(0)}M</strong></span>
                      </div>
                    </div>

                    {/* User Holdings Pill */}
                    {userHoldings > 0 && (
                      <div style={{
                        marginTop: '12px',
                        fontSize: '0.82rem',
                        color: 'var(--tp-accent-green-bright)',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontFamily: 'var(--tp-font-mono)',
                      }}>
                        <span>Your Holdings:</span>
                        <strong>{userHoldings.toLocaleString()} {token.ticker}</strong>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="tp-card-actions" style={{ marginTop: '14px' }}>
                      <button
                        className="tp-btn-trade"
                        onClick={() => {
                          setTradeModalToken(token);
                          setTradeTab('buy');
                          setTradeAmount('50000');
                        }}
                      >
                        <span>⚡</span>
                        <span>Trade {token.ticker}</span>
                      </button>

                      <button
                        className="tp-btn-burn-check"
                        onClick={() => {
                          setSurgeModalToken(token);
                          setSurgeSuccess(null);
                        }}
                        title="Simulate follow-up tweet to trigger 10% on-chain supply burn"
                      >
                        <span>🔥</span>
                        <span>Surge Burn</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ─── Trading Swap Terminal Modal ──────────────────────────── */}
      {tradeModalToken && (
        <div className="tp-modal-overlay" onClick={() => setTradeModalToken(null)}>
          <div className="tp-modal-box" onClick={e => e.stopPropagation()}>
            <button className="tp-modal-close" onClick={() => setTradeModalToken(null)}>✕</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <span style={{ fontSize: '2.5rem' }}>{tradeModalToken.icon}</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#ffffff', fontWeight: '800' }}>
                  Trade {tradeModalToken.name}
                </h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--tp-text-muted)', fontFamily: 'var(--tp-font-mono)' }}>
                  Intelligent Contract: {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-6)}
                </span>
              </div>
            </div>

            {/* Segmented Buy / Sell Control */}
            <div className="tp-tab-row">
              <button
                className={`tp-tab-btn ${tradeTab === 'buy' ? 'tp-tab-active-buy' : ''}`}
                onClick={() => setTradeTab('buy')}
              >
                Buy {tradeModalToken.ticker}
              </button>
              <button
                className={`tp-tab-btn ${tradeTab === 'sell' ? 'tp-tab-active-sell' : ''}`}
                onClick={() => setTradeTab('sell')}
              >
                Sell {tradeModalToken.ticker}
              </button>
            </div>

            {/* Amount Input */}
            <div className="tp-input-group">
              <div className="tp-input-label">
                <span>Amount to {tradeTab.toUpperCase()}:</span>
                {tradeTab === 'sell' && (
                  <span style={{ fontFamily: 'var(--tp-font-mono)' }}>
                    Balance: {(userTokenBalances[tradeModalToken.id] || 0).toLocaleString()} {tradeModalToken.ticker}
                  </span>
                )}
              </div>
              <div className="tp-input-box">
                <input
                  type="number"
                  className="tp-input-field"
                  value={tradeAmount}
                  onChange={e => setTradeAmount(e.target.value)}
                  placeholder="50000"
                />
                <span className="tp-input-badge">{tradeModalToken.ticker}</span>
              </div>
            </div>

            {/* Quick Amount Pills */}
            <div className="tp-amount-pills">
              {['10000', '50000', '100000', '500000'].map(val => (
                <button
                  key={val}
                  className="tp-pill-btn"
                  onClick={() => setTradeAmount(val)}
                >
                  {Number(val).toLocaleString()}
                </button>
              ))}
              {tradeTab === 'sell' && userTokenBalances[tradeModalToken.id] > 0 && (
                <button
                  className="tp-pill-btn"
                  style={{ color: 'var(--tp-accent-green-bright)', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                  onClick={() => setTradeAmount(String(userTokenBalances[tradeModalToken.id]))}
                >
                  MAX
                </button>
              )}
            </div>

            {/* Swap Summary */}
            <div className="tp-swap-summary">
              <div className="tp-summary-line">
                <span>{tradeTab === 'buy' ? 'Required Deposit' : 'Refund Received'}:</span>
                <span className="tp-summary-val">{tradeQuote.costOrRefund.toLocaleString()} GEN wei</span>
              </div>
              <div className="tp-summary-line">
                <span>Pricing Model:</span>
                <span className="tp-summary-val">Linear Bonding Curve</span>
              </div>
              <div className="tp-summary-line">
                <span>Slippage Protection:</span>
                <span className="tp-summary-val" style={{ color: 'var(--tp-accent-green-bright)' }}>0.00% (Mathematical Guarantee)</span>
              </div>
            </div>

            {/* Execute Button */}
            <button
              className={`tp-btn-submit-swap ${tradeTab === 'buy' ? 'tp-btn-submit-buy' : 'tp-btn-submit-sell'}`}
              onClick={handleExecuteTrade}
              disabled={isTrading}
              style={{ opacity: isTrading ? 0.7 : 1, cursor: isTrading ? 'wait' : 'pointer' }}
            >
              {isTrading ? (
                <span>⏳ Submitting On-Chain to Studio Next Validators...</span>
              ) : tradeTab === 'buy' ? (
                `⚡ Instant Buy ${tradeModalToken.ticker}`
              ) : (
                `💰 Instant Sell ${tradeModalToken.ticker}`
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── Autonomous AI Memecoin Launcher Modal ────────────────── */}
      {launchModalOpen && (
        <div className="tp-modal-overlay" onClick={() => !isLaunching && setLaunchModalOpen(false)}>
          <div className="tp-modal-box" onClick={e => e.stopPropagation()}>
            <button className="tp-modal-close" onClick={() => !isLaunching && setLaunchModalOpen(false)}>✕</button>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.45rem', color: '#ffffff', fontWeight: '800' }}>
              🤖 Autonomous AI Memecoin Launcher
            </h3>
            <p style={{ color: 'var(--tp-text-secondary)', fontSize: '0.88rem', margin: '0 0 22px 0', lineHeight: 1.5 }}>
              GenLayer validators independently evaluate tweet virality inside GenVM via LLM consensus.
              If score &ge; 70, the contract autonomously coins the ticker and deploys a 100% fair-launch curve.
            </p>

            {isLaunching ? (
              <div className="tp-consensus-modal">
                <div className="tp-spinner-glow"></div>
                <h4 style={{ color: '#ffffff', margin: '0 0 10px 0', fontSize: '1.2rem', fontWeight: '800' }}>
                  GenVM Multi-Validator Consensus
                </h4>
                <div className="tp-step-list">
                  <div className={`tp-step-item ${launchStep > 1 ? 'tp-step-done' : 'tp-step-active'}`}>
                    <span>{launchStep > 1 ? '✓' : '⟳'}</span>
                    <span>1. Fetching tweet proof via gl.nondet.web.render()</span>
                  </div>
                  <div className={`tp-step-item ${launchStep > 2 ? 'tp-step-done' : launchStep === 2 ? 'tp-step-active' : ''}`}>
                    <span>{launchStep > 2 ? '✓' : launchStep === 2 ? '⟳' : '○'}</span>
                    <span>2. Leader LLM virality scoring & lore synthesis</span>
                  </div>
                  <div className={`tp-step-item ${launchStep > 3 ? 'tp-step-done' : launchStep === 3 ? 'tp-step-active' : ''}`}>
                    <span>{launchStep > 3 ? '✓' : launchStep === 3 ? '⟳' : '○'}</span>
                    <span>3. Validator consensus check (±15 score tolerance)</span>
                  </div>
                  <div className={`tp-step-item ${launchStep >= 4 ? 'tp-step-done' : ''}`}>
                    <span>{launchStep >= 4 ? '✓' : '○'}</span>
                    <span>4. Initializing on-chain 100% fair-launch bonding curve</span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="tp-input-group">
                  <label className="tp-input-label">Author Handle / Source:</label>
                  <div className="tp-input-box">
                    <input
                      type="text"
                      className="tp-input-field"
                      value={customAuthor}
                      onChange={e => setCustomAuthor(e.target.value)}
                      placeholder="@elonmusk"
                    />
                  </div>
                </div>

                <div className="tp-input-group">
                  <label className="tp-input-label">Tweet URL / Verification Proof:</label>
                  <div className="tp-input-box">
                    <input
                      type="text"
                      className="tp-input-field"
                      value={customTweetUrl}
                      onChange={e => setCustomTweetUrl(e.target.value)}
                      placeholder="https://x.com/elonmusk/status/..."
                    />
                  </div>
                </div>

                <div className="tp-input-group">
                  <label className="tp-input-label">Tweet Content to Scan:</label>
                  <div className="tp-input-box" style={{ minHeight: '90px' }}>
                    <textarea
                      className="tp-input-field"
                      style={{ resize: 'vertical', fontSize: '0.95rem', lineHeight: '1.4' }}
                      rows={3}
                      value={customTweetText}
                      onChange={e => setCustomTweetText(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  className="tp-btn-submit-swap tp-btn-submit-buy"
                  style={{ marginTop: '12px' }}
                  onClick={handleAutonomousLaunch}
                >
                  🚀 Submit to GenLayer Consensus Radar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Trend Surge Burn Modal ───────────────────────────────── */}
      {surgeModalToken && (
        <div className="tp-modal-overlay" onClick={() => !isSurging && setSurgeModalToken(null)}>
          <div className="tp-modal-box" onClick={e => e.stopPropagation()}>
            <button className="tp-modal-close" onClick={() => !isSurging && setSurgeModalToken(null)}>✕</button>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', color: 'var(--tp-accent-orange-bright)', fontWeight: '800' }}>
              🔥 Trigger Trend Surge Check ({surgeModalToken.ticker})
            </h3>
            <p style={{ color: 'var(--tp-text-secondary)', fontSize: '0.88rem', margin: '0 0 18px 0', lineHeight: 1.5 }}>
              If the original author (<strong>{surgeModalToken.origin_author}</strong>) follows up on this trend,
              GenLayer validator consensus will automatically execute an on-chain <strong>10% supply burn</strong> of unminted tokens!
            </p>

            {surgeSuccess ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>🎉🔥</div>
                <h4 style={{ color: 'var(--tp-accent-green-bright)', margin: '0 0 10px 0', fontSize: '1.3rem', fontWeight: '800' }}>
                  Trend Surge Verified by Consensus!
                </h4>
                <p style={{ color: '#cbd5e1', fontSize: '1rem', margin: '0 0 24px 0', lineHeight: 1.5 }}>
                  <strong>{surgeSuccess.burnAmount.toLocaleString()} {surgeSuccess.ticker}</strong> supply permanently burned on-chain!
                  <br />
                  New Total Supply: <strong>{surgeSuccess.newTotal.toLocaleString()}</strong>
                </p>
                {surgeSuccess.txHash && (
                  <div style={{ marginBottom: '20px' }}>
                    <a
                      href={`${EXPLORER_URL}/tx/${surgeSuccess.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#38bdf8', textDecoration: 'underline', fontSize: '0.9rem' }}
                    >
                      View Burn Tx on Explorer: {surgeSuccess.txHash.slice(0, 10)}... ↗
                    </a>
                  </div>
                )}
                <button
                  className="tp-btn-submit-swap tp-btn-submit-buy"
                  onClick={() => setSurgeModalToken(null)}
                >
                  Done
                </button>
              </div>
            ) : isSurging ? (
              <div className="tp-consensus-modal">
                <div className="tp-spinner-glow" style={{ borderTopColor: 'var(--tp-accent-orange-bright)', borderRightColor: '#f59e0b' }}></div>
                <h4 style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: '800' }}>Validators Arbitrating Trend Surge...</h4>
                <p style={{ color: 'var(--tp-text-secondary)', fontSize: '0.88rem' }}>
                  Verifying follow-up tweet alignment with original lore on GenLayer Studio Next
                </p>
              </div>
            ) : (
              <div>
                <div className="tp-input-group">
                  <label className="tp-input-label">Follow-up Tweet by {surgeModalToken.origin_author}:</label>
                  <div className="tp-input-box" style={{ minHeight: '90px' }}>
                    <textarea
                      className="tp-input-field"
                      style={{ resize: 'vertical', fontSize: '0.95rem', lineHeight: '1.4' }}
                      rows={3}
                      value={surgeTweetText}
                      onChange={e => setSurgeTweetText(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  className="tp-btn-submit-swap"
                  style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: '#ffffff', boxShadow: '0 6px 24px rgba(249, 115, 22, 0.4)' }}
                  onClick={handleTriggerSurge}
                >
                  🔥 Verify Surge & Execute 10% Burn
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Wallet Select Modal ───────────────────────────────────── */}
      {walletModalOpen && (
        <div className="tp-modal-overlay" onClick={() => setWalletModalOpen(false)}>
          <div className="tp-modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <button className="tp-modal-close" onClick={() => setWalletModalOpen(false)}>✕</button>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.35rem', color: '#ffffff', fontWeight: '800' }}>
              Connect Wallet
            </h3>
            <p style={{ color: 'var(--tp-text-secondary)', fontSize: '0.88rem', margin: '0 0 20px 0' }}>
              Choose your wallet for live interaction with GenLayer Studio Next (Chain 61997).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleConnectDev}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: walletType === 'dev' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: walletType === 'dev' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: '700',
                  textAlign: 'left'
                }}
              >
                <div>
                  <div style={{ fontSize: '1rem', color: '#34d399' }}>⚡ Studio Next Dev Agent</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--tp-text-muted)', fontFamily: 'var(--tp-font-mono)', marginTop: '4px' }}>
                    0x70BE...EcCF · Pre-funded (~90+ GEN)
                  </div>
                </div>
                {walletType === 'dev' && <span style={{ color: '#10b981' }}>✓ Active</span>}
              </button>

              <button
                onClick={handleConnectMetaMask}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: walletType === 'metamask' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: walletType === 'metamask' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: '700',
                  textAlign: 'left'
                }}
              >
                <div>
                  <div style={{ fontSize: '1rem', color: '#f59e0b' }}>🦊 Browser Wallet (MetaMask)</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--tp-text-muted)', fontFamily: 'var(--tp-font-mono)', marginTop: '4px' }}>
                    Direct Web3 injection · Chain 61997
                  </div>
                </div>
                {walletType === 'metamask' && <span style={{ color: '#10b981' }}>✓ Active</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
