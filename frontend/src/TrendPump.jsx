import { useState, useMemo } from 'react';
import './TrendPump.css';

const TRENDPUMP_CONTRACT = '0xc0Bbd2d0a2C81CAa5D4cAC56ae378c809f3dF693';
const EXPLORER_URL = `https://explorer-studio.genlayer.com/address/${TRENDPUMP_CONTRACT}`;

const INITIAL_TOKENS = [
  {
    id: 0,
    ticker: '$MARS',
    name: 'Mars Multiplanetary Coin',
    icon: '🪐',
    lore: "Elon Musk's Starship tweet fuels humanity's push to colonize Mars. The cosmos calls—will you answer?",
    origin_author: '@elonmusk',
    author_name: 'Elon Musk',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
    origin_tweet_text: 'Starship will make life multiplanetary on Mars. Humanity belongs among the stars.',
    origin_tweet_url: 'https://x.com/elonmusk/status/1880000000000000000',
    virality_score: 92,
    total_supply: 900000000, // 100M burned in surge!
    circulating_supply: 450000000,
    reserve_balance: 1420000,
    is_graduated: false,
    surge_burns_count: 1,
    is_king: true,
  },
  {
    id: 1,
    ticker: '$GROK',
    name: 'Grok Quantum Reasoning',
    icon: '🤖',
    lore: "Spawned from xAI's real-time reasoning cluster announcement. Unfiltered AI intellect on-chain.",
    origin_author: '@elonmusk',
    author_name: 'Elon Musk',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
    origin_tweet_text: 'Grok 3 is trained and entering continuous reasoning mode. Next level frontier intelligence.',
    origin_tweet_url: 'https://x.com/elonmusk/status/1880000000000000001',
    virality_score: 88,
    total_supply: 1000000000,
    circulating_supply: 220000000,
    reserve_balance: 680000,
    is_graduated: false,
    surge_burns_count: 0,
    is_king: false,
  },
  {
    id: 2,
    ticker: '$LEAN',
    name: 'Lean EVM Protocol',
    icon: '⚡',
    lore: 'Inspired by Vitalik Buterin’s manifesto on cryptographic minimalism and light-client validation.',
    origin_author: '@vitalikbuterin',
    author_name: 'Vitalik Buterin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    origin_tweet_text: 'Simplifying core protocol layers: the future of decentralized verification is lean and deterministic.',
    origin_tweet_url: 'https://x.com/vitalikbuterin/status/1880000000000000002',
    virality_score: 85,
    total_supply: 1000000000,
    circulating_supply: 160000000,
    reserve_balance: 420000,
    is_graduated: false,
    surge_burns_count: 0,
    is_king: false,
  },
];

const PRESET_TWEETS = [
  {
    author: '@elonmusk',
    name: 'Elon Musk',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
    text: 'Optimus humanoid robots will outnumber humans by 2040. The manufacturing paradigm has shifted forever.',
    url: 'https://x.com/elonmusk/status/1880000000000000003',
    suggested_ticker: '$OPTIMUS',
    suggested_name: 'Optimus Robot Workforce',
  },
  {
    author: '@sama',
    name: 'Sam Altman',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    text: 'Autonomous agents doing continuous multi-week engineering tasks are becoming genuinely capable.',
    url: 'https://x.com/sama/status/1880000000000000004',
    suggested_ticker: '$AGI',
    suggested_name: 'Superintelligence Alpha',
  },
  {
    author: '@vitalikbuterin',
    name: 'Vitalik Buterin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    text: 'Zk-SNARKs and AI consensus will converge to form the ultimate trust-minimized financial layer.',
    url: 'https://x.com/vitalikbuterin/status/1880000000000000005',
    suggested_ticker: '$SNARK',
    suggested_name: 'Zero Knowledge Consensus',
  },
];

export default function TrendPump({ onSwitchToEscrow }) {
  const [tokens, setTokens] = useState(INITIAL_TOKENS);
  const [userGenBalance, setUserGenBalance] = useState(1000000); // 1,000,000 wei starting faucet
  const [userTokenBalances, setUserTokenBalances] = useState({ 0: 10000 }); // Holds 10,000 $MARS
  
  // Modals state
  const [tradeModalToken, setTradeModalToken] = useState(null);
  const [tradeTab, setTradeTab] = useState('buy'); // 'buy' or 'sell'
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

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  // ─── Mathematical Bonding Curve calculation ──────────────
  // Cost = n * 10 + 1 * n * (2s + n) // (2 * 100_000)
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
    if (!tradeModalToken) return { costOrRefund: 0, newPricePerToken: 0 };
    const n = Number(tradeAmount) || 0;
    if (tradeTab === 'buy') {
      const cost = calcBuyCost(tradeModalToken.circulating_supply, n);
      return { costOrRefund: cost, type: 'cost' };
    } else {
      const refund = calcSellRefund(tradeModalToken.circulating_supply, n);
      return { costOrRefund: refund, type: 'refund' };
    }
  }, [tradeModalToken, tradeTab, tradeAmount]);

  // Handle Trade Execution
  const handleExecuteTrade = () => {
    const amount = Number(tradeAmount);
    if (!amount || amount <= 0) {
      showToast('⚠️ Please enter a valid token amount');
      return;
    }

    const t = tradeModalToken;
    const tokenId = t.id;

    if (tradeTab === 'buy') {
      const cost = tradeQuote.costOrRefund;
      if (userGenBalance < cost) {
        showToast(`❌ Insufficient GEN balance: have ${userGenBalance} wei, need ${cost} wei`);
        return;
      }

      setUserGenBalance(prev => prev - cost);
      setUserTokenBalances(prev => ({
        ...prev,
        [tokenId]: (prev[tokenId] || 0) + amount,
      }));

      setTokens(prev => prev.map(tok => {
        if (tok.id === tokenId) {
          const newCirc = tok.circulating_supply + amount;
          const isGrad = newCirc >= (tok.total_supply * 0.8);
          return {
            ...tok,
            circulating_supply: newCirc,
            reserve_balance: tok.reserve_balance + cost,
            is_graduated: isGrad,
          };
        }
        return tok;
      }));

      showToast(`🎉 Successfully bought ${amount.toLocaleString()} ${t.ticker} for ${cost.toLocaleString()} GEN wei!`);
      setTradeModalToken(null);
    } else {
      // Sell
      const userBal = userTokenBalances[tokenId] || 0;
      if (userBal < amount) {
        showToast(`❌ Insufficient ${t.ticker} balance: have ${userBal.toLocaleString()}`);
        return;
      }

      const refund = tradeQuote.costOrRefund;
      setUserTokenBalances(prev => ({
        ...prev,
        [tokenId]: userBal - amount,
      }));
      setUserGenBalance(prev => prev + refund);

      setTokens(prev => prev.map(tok => {
        if (tok.id === tokenId) {
          return {
            ...tok,
            circulating_supply: Math.max(0, tok.circulating_supply - amount),
            reserve_balance: Math.max(0, tok.reserve_balance - refund),
          };
        }
        return tok;
      }));

      showToast(`💰 Sold ${amount.toLocaleString()} ${t.ticker} for ${refund.toLocaleString()} GEN wei refund!`);
      setTradeModalToken(null);
    }
  };

  // Claim faucet
  const handleClaimFaucet = () => {
    setUserGenBalance(prev => prev + 1000000);
    showToast('🎁 Claimed 1,000,000 GEN wei from contract faucet!');
  };

  // Autonomous Launch Simulation
  const handleAutonomousLaunch = () => {
    if (!customTweetText.trim()) {
      showToast('⚠️ Tweet text cannot be empty');
      return;
    }

    setIsLaunching(true);
    setLaunchStep(1);

    setTimeout(() => {
      setLaunchStep(2);
      setTimeout(() => {
        setLaunchStep(3);
        setTimeout(() => {
          setLaunchStep(4);
          setTimeout(() => {
            // Generate token
            const words = customTweetText.split(' ');
            const primaryWord = words[0].replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 5) || 'TREND';
            const ticker = `$${primaryWord}`;
            const name = `${primaryWord} Autonomous Coin`;
            const lore = `Minted by GenLayer consensus from ${customAuthor}'s viral post on breaking tech paradigms.`;

            const newToken = {
              id: tokens.length,
              ticker,
              name,
              icon: '🚀',
              lore,
              origin_author: customAuthor,
              author_name: customAuthor.replace('@', ''),
              avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
              origin_tweet_text: customTweetText,
              origin_tweet_url: customTweetUrl,
              virality_score: 91,
              total_supply: 1000000000,
              circulating_supply: 0,
              reserve_balance: 0,
              is_graduated: false,
              surge_burns_count: 0,
              is_king: false,
            };

            setTokens(prev => [newToken, ...prev]);
            setIsLaunching(false);
            setLaunchModalOpen(false);
            setLaunchStep(0);
            showToast(`🚀 ${ticker} successfully coined & fair-launch curve deployed on GenLayer!`);
          }, 900);
        }, 800);
      }, 700);
    }, 600);
  };

  // Trend surge burn
  const handleTriggerSurge = () => {
    if (!surgeTweetText.trim() || !surgeModalToken) return;
    setIsSurging(true);

    setTimeout(() => {
      const t = surgeModalToken;
      const remaining = t.total_supply - t.circulating_supply;
      const burnAmount = Math.floor(remaining / 10);
      const newTotal = t.total_supply - burnAmount;

      setTokens(prev => prev.map(tok => {
        if (tok.id === t.id) {
          return {
            ...tok,
            total_supply: newTotal,
            surge_burns_count: tok.surge_burns_count + 1,
          };
        }
        return tok;
      }));

      setIsSurging(false);
      setSurgeSuccess({
        burnAmount,
        newTotal,
        ticker: t.ticker,
      });
      showToast(`🔥 TREND SURGE CONFIRMED! ${burnAmount.toLocaleString()} ${t.ticker} supply burned forever!`);
    }, 1200);
  };

  return (
    <div className="trendpump-container">
      {/* Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#151d2c',
          border: '1px solid #22c55e',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          zIndex: 999,
          fontWeight: '600',
          fontSize: '0.9rem',
        }}>
          {toastMessage}
        </div>
      )}

      {/* ─── Top Ticker Tape ────────────────────────────────────────── */}
      <div className="tp-ticker-tape">
        <div className="tp-ticker-item">
          <span>👑 KING:</span>
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
          <span style={{ color: '#fb923c' }}>🔥 2 SURGE BURNS TODAY: 100M $MARS BURNED BY VALIDATOR CONSENSUS</span>
        </div>
        <div className="tp-ticker-item">
          <span style={{ color: '#94a3b8' }}>ZERO HUMAN DEVS · 100% MATHEMATICAL BONDING CURVES</span>
        </div>
      </div>

      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header className="tp-header">
        <div className="tp-header-inner">
          <div className="tp-logo-group">
            <div className="tp-logo-icon">🚀</div>
            <div>
              <div className="tp-logo-title">
                TrendPump
                <span className="tp-badge-genlayer">GenLayer Intelligent Contract</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a 
              href={EXPLORER_URL}
              target="_blank"
              rel="noreferrer"
              className="tp-network-pill"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <span className="tp-live-dot"></span>
              <span>StudioNet: 0xc0Bbd...dF693 ↗</span>
            </a>

            <div className="tp-network-pill" style={{ color: '#4ade80', fontWeight: '700' }}>
              💰 {userGenBalance.toLocaleString()} GEN wei
            </div>

            <button className="tp-btn-faucet" onClick={handleClaimFaucet} title="Get 1,000,000 GEN wei">
              🎁 Free Faucet
            </button>

            <button className="tp-btn-launch" onClick={() => setLaunchModalOpen(true)}>
              🤖 Auto-Launch from Tweet
            </button>

            <button 
              onClick={onSwitchToEscrow}
              style={{
                background: '#1e293b',
                color: '#94a3b8',
                border: '1px solid #334155',
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              ⚖️ Switch to AgentEscrow
            </button>
          </div>
        </div>
      </header>

      <main className="tp-main">
        {/* ─── Hero Banner ──────────────────────────────────────────── */}
        <div className="tp-banner">
          <div className="tp-banner-text">
            <h1>Autonomous AI Memecoin Launchpad</h1>
            <p>
              Zero human developers. Zero rugpulls. The <strong>GenLayer Intelligent Contract</strong> monitors 
              viral tweets via validators, scores virality using LLMs, mints community meme tokens, 
              and powers mathematical bonding curves with automated <strong>10% Trend Surge Burns</strong>.
            </p>
          </div>
          <div className="tp-banner-stats">
            <div className="tp-stat-box">
              <div className="tp-stat-val">100%</div>
              <div className="tp-stat-label">Fair Launch</div>
            </div>
            <div className="tp-stat-box">
              <div className="tp-stat-val">{tokens.length}</div>
              <div className="tp-stat-label">Active Curves</div>
            </div>
            <div className="tp-stat-box">
              <div className="tp-stat-val">100M</div>
              <div className="tp-stat-label">Supply Burned</div>
            </div>
          </div>
        </div>

        {/* ─── Influencer Live Tweet Radar ──────────────────────────── */}
        <section className="tp-radar-section">
          <div className="tp-section-header">
            <div className="tp-section-title">
              <span>📡 Influencer Radar</span>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal' }}>
                (Live scanned via gl.nondet.web.render)
              </span>
            </div>
          </div>

          <div className="tp-radar-grid">
            {PRESET_TWEETS.map((item, idx) => (
              <div key={idx} className="tp-radar-card">
                <div>
                  <div className="tp-tweet-author">
                    <img src={item.avatar} alt={item.name} className="tp-tweet-avatar" />
                    <div className="tp-author-info">
                      <div className="tp-author-name">
                        {item.name}
                        <span className="tp-verified-check">✓</span>
                      </div>
                      <div className="tp-author-handle">{item.author}</div>
                    </div>
                  </div>
                  <div className="tp-tweet-text" style={{ marginTop: '10px' }}>
                    "{item.text}"
                  </div>
                </div>

                <div className="tp-radar-footer">
                  <span className="tp-virality-badge">⚡ 94/100 Viral</span>
                  <button 
                    className="tp-btn-radar-launch"
                    onClick={() => {
                      setCustomAuthor(item.author);
                      setCustomTweetUrl(item.url);
                      setCustomTweetText(item.text);
                      setLaunchModalOpen(true);
                    }}
                  >
                    🚀 Launch {item.suggested_ticker}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Active Meme Tokens Grid ──────────────────────────────── */}
        <section>
          <div className="tp-section-header">
            <div className="tp-section-title">
              <span>🔥 Fair-Launch Bonding Curves</span>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal' }}>
                (Graduates to DEX at 80% supply cap)
              </span>
            </div>
          </div>

          <div className="tp-tokens-grid">
            {tokens.map((token) => {
              const gradPct = Math.min(100, Math.round((token.circulating_supply / (token.total_supply * 0.8)) * 100));
              const userHoldings = userTokenBalances[token.id] || 0;
              const currentUnitPrice = 10 + Math.floor((1 * token.circulating_supply) / 100000);

              return (
                <div 
                  key={token.id} 
                  className={`tp-token-card ${token.is_king ? 'tp-card-king' : ''}`}
                >
                  {token.is_king && <div className="tp-king-tag">👑 King of the Hill</div>}

                  <div>
                    {/* Header */}
                    <div className="tp-token-header">
                      <div className="tp-token-icon">{token.icon}</div>
                      <div className="tp-token-identity">
                        <div className="tp-token-name-row">
                          <span className="tp-token-name">{token.name}</span>
                          <span className="tp-token-ticker">{token.ticker}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span className="tp-virality-badge">⚡ Score {token.virality_score}</span>
                          {token.surge_burns_count > 0 && (
                            <span style={{ fontSize: '0.75rem', color: '#fb923c', background: 'rgba(251, 146, 60, 0.15)', padding: '2px 8px', borderRadius: '9999px', border: '1px solid rgba(251, 146, 60, 0.3)' }}>
                              🔥 {token.surge_burns_count} Surge Burns
                            </span>
                          )}
                        </div>
                        <p className="tp-token-lore">{token.lore}</p>
                      </div>
                    </div>

                    {/* Embedded Origin Tweet Card */}
                    <div className="tp-card-tweet" style={{ marginTop: '14px' }}>
                      <div className="tp-card-tweet-author">
                        <span>Original Tweet by <strong>{token.origin_author}</strong></span>
                        <a 
                          href={token.origin_tweet_url} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ color: '#38bdf8', textDecoration: 'none' }}
                        >
                          View X ↗
                        </a>
                      </div>
                      <div className="tp-card-tweet-text">"{token.origin_tweet_text}"</div>
                    </div>
                  </div>

                  <div>
                    {/* Bonding Curve Box */}
                    <div className="tp-curve-box">
                      <div className="tp-curve-header">
                        <span className="tp-curve-label">Bonding Curve Progress</span>
                        <span className="tp-curve-pct">{gradPct}%</span>
                      </div>
                      <div className="tp-progress-bar-bg">
                        <div className="tp-progress-bar-fill" style={{ width: `${gradPct}%` }}></div>
                      </div>
                      <div className="tp-curve-stats-row">
                        <span>Price: {currentUnitPrice} wei</span>
                        <span>Circulating: {(token.circulating_supply / 1e6).toFixed(1)}M / {(token.total_supply / 1e6).toFixed(0)}M</span>
                      </div>
                    </div>

                    {/* User Holdings pill */}
                    {userHoldings > 0 && (
                      <div style={{ 
                        marginTop: '10px', 
                        fontSize: '0.8rem', 
                        color: '#4ade80', 
                        background: 'rgba(74, 222, 128, 0.1)', 
                        padding: '6px 12px', 
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}>
                        <span>Your Holdings:</span>
                        <strong>{userHoldings.toLocaleString()} {token.ticker}</strong>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="tp-card-actions" style={{ marginTop: '12px' }}>
                      <button 
                        className="tp-btn-trade"
                        onClick={() => {
                          setTradeModalToken(token);
                          setTradeTab('buy');
                          setTradeAmount('50000');
                        }}
                      >
                        ⚡ Buy / Sell {token.ticker}
                      </button>

                      <button 
                        className="tp-btn-burn-check"
                        onClick={() => {
                          setSurgeModalToken(token);
                          setSurgeSuccess(null);
                        }}
                        title="Validate follow-up tweet to trigger 10% supply burn"
                      >
                        🔥 Trend Surge
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ─── Trading Swap Modal ─────────────────────────────────────── */}
      {tradeModalToken && (
        <div className="tp-modal-overlay" onClick={() => setTradeModalToken(null)}>
          <div className="tp-modal-box" onClick={e => e.stopPropagation()}>
            <button className="tp-modal-close" onClick={() => setTradeModalToken(null)}>✕</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '2rem' }}>{tradeModalToken.icon}</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff' }}>
                  Trade {tradeModalToken.name} ({tradeModalToken.ticker})
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Contract: {TRENDPUMP_CONTRACT.slice(0, 10)}...{TRENDPUMP_CONTRACT.slice(-6)}
                </span>
              </div>
            </div>

            {/* Buy / Sell Tab */}
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

            {/* Input */}
            <div className="tp-input-group">
              <div className="tp-input-label">
                <span>Amount of {tradeModalToken.ticker} to {tradeTab}:</span>
                {tradeTab === 'sell' && (
                  <span>Available: {(userTokenBalances[tradeModalToken.id] || 0).toLocaleString()}</span>
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

            {/* Quick buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {['10000', '50000', '100000', '500000'].map(val => (
                <button
                  key={val}
                  onClick={() => setTradeAmount(val)}
                  style={{
                    background: '#151d2c',
                    border: '1px solid #243047',
                    color: '#94a3b8',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    flex: 1,
                  }}
                >
                  {Number(val).toLocaleString()}
                </button>
              ))}
            </div>

            {/* Summary */}
            <div className="tp-swap-summary">
              <div className="tp-summary-line">
                <span>{tradeTab === 'buy' ? 'Required GEN Deposit' : 'GEN Refund to Receive'}:</span>
                <span className="tp-summary-val">{tradeQuote.costOrRefund.toLocaleString()} wei</span>
              </div>
              <div className="tp-summary-line">
                <span>Curve Model:</span>
                <span className="tp-summary-val">Linear P(s) = 10 + s/100,000</span>
              </div>
              <div className="tp-summary-line">
                <span>Slippage Protection:</span>
                <span className="tp-summary-val" style={{ color: '#4ade80' }}>0.00% (Mathematical)</span>
              </div>
            </div>

            {/* Execute Button */}
            <button 
              className={`tp-btn-submit-swap ${tradeTab === 'buy' ? 'tp-btn-submit-buy' : 'tp-btn-submit-sell'}`}
              onClick={handleExecuteTrade}
            >
              {tradeTab === 'buy' 
                ? `⚡ Instant Buy ${tradeModalToken.ticker}` 
                : `💰 Instant Sell ${tradeModalToken.ticker}`}
            </button>
          </div>
        </div>
      )}

      {/* ─── Autonomous Launch Modal ────────────────────────────────── */}
      {launchModalOpen && (
        <div className="tp-modal-overlay" onClick={() => !isLaunching && setLaunchModalOpen(false)}>
          <div className="tp-modal-box" onClick={e => e.stopPropagation()}>
            <button className="tp-modal-close" onClick={() => !isLaunching && setLaunchModalOpen(false)}>✕</button>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', color: '#ffffff' }}>
              🤖 Autonomous AI Memecoin Launcher
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: 1.4 }}>
              GenLayer validators evaluate tweet virality inside GenVM via LLM consensus.
              If score &gt; 70, the contract autonomously mints the ticker and deploys a fair-launch bonding curve.
            </p>

            {isLaunching ? (
              <div className="tp-consensus-modal">
                <div className="tp-spinner-large"></div>
                <h4 style={{ color: '#ffffff', margin: '0 0 10px 0' }}>GenVM Multi-Validator Consensus</h4>
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
                    <span>3. Validator consensus check (within ±15 score tolerance)</span>
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
                  <div className="tp-input-box" style={{ minHeight: '80px' }}>
                    <textarea 
                      className="tp-input-field"
                      style={{ resize: 'vertical', fontSize: '0.95rem' }}
                      rows={3}
                      value={customTweetText}
                      onChange={e => setCustomTweetText(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  className="tp-btn-submit-swap tp-btn-submit-buy"
                  style={{ marginTop: '10px' }}
                  onClick={handleAutonomousLaunch}
                >
                  🚀 Submit to GenLayer Consensus Radar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Trend Surge Modal ──────────────────────────────────────── */}
      {surgeModalToken && (
        <div className="tp-modal-overlay" onClick={() => !isSurging && setSurgeModalToken(null)}>
          <div className="tp-modal-box" onClick={e => e.stopPropagation()}>
            <button className="tp-modal-close" onClick={() => !isSurging && setSurgeModalToken(null)}>✕</button>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', color: '#fb923c' }}>
              🔥 Trigger Trend Surge Check ({surgeModalToken.ticker})
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 16px 0', lineHeigh: 1.4 }}>
              If the original author (<strong>{surgeModalToken.origin_author}</strong>) follows up on this trend, 
              GenLayer validator consensus will automatically execute an on-chain <strong>10% supply burn</strong> of unminted tokens!
            </p>

            {surgeSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎉🔥</div>
                <h4 style={{ color: '#4ade80', margin: '0 0 10px 0', fontSize: '1.2rem' }}>
                  Trend Surge Verified by Consensus!
                </h4>
                <p style={{ color: '#cbd5e1', fontSize: '0.95rem', margin: '0 0 20px 0' }}>
                  <strong>{surgeSuccess.burnAmount.toLocaleString()} {surgeSuccess.ticker}</strong> supply burned forever!
                  <br />
                  New Total Supply: <strong>{surgeSuccess.newTotal.toLocaleString()}</strong>
                </p>
                <button 
                  className="tp-btn-submit-swap tp-btn-submit-buy"
                  onClick={() => setSurgeModalToken(null)}
                >
                  Done
                </button>
              </div>
            ) : isSurging ? (
              <div className="tp-consensus-modal">
                <div className="tp-spinner-large" style={{ borderTopColor: '#fb923c' }}></div>
                <h4 style={{ color: '#ffffff' }}>Validators Arbitrating Trend Surge...</h4>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  Verifying follow-up tweet alignment with original lore
                </p>
              </div>
            ) : (
              <div>
                <div className="tp-input-group">
                  <label className="tp-input-label">Follow-up Tweet by {surgeModalToken.origin_author}:</label>
                  <div className="tp-input-box" style={{ minHeight: '80px' }}>
                    <textarea 
                      className="tp-input-field"
                      style={{ resize: 'vertical', fontSize: '0.95rem' }}
                      rows={3}
                      value={surgeTweetText}
                      onChange={e => setSurgeTweetText(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  className="tp-btn-submit-swap"
                  style={{ background: 'linear-gradient(135deg, #fb923c, #ea580c)', color: '#ffffff' }}
                  onClick={handleTriggerSurge}
                >
                  🔥 Verify Surge & Execute 10% Burn
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
