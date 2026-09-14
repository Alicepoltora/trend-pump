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
    tweet_time: '2h ago',
    likes: '48.2K',
    retweets: '9.4K',
    views: '2.4M',
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
    tweet_time: '4h ago',
    likes: '35.1K',
    retweets: '7.8K',
    views: '1.8M',
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
    tweet_time: '6h ago',
    likes: '19.4K',
    retweets: '4.1K',
    views: '920K',
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
  const [tokens, setTokens] = useState(INITIAL_TOKENS);
  const [userGenBalance, setUserGenBalance] = useState(1000000); // 1,000,000 wei starting faucet
  const [userTokenBalances, setUserTokenBalances] = useState({ 0: 10000 });
  
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

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  // ─── Mathematical Bonding Curve calculation ──────────────
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

      showToast(`🎉 Bought ${amount.toLocaleString()} ${t.ticker} for ${cost.toLocaleString()} GEN wei!`);
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
              tweet_time: 'Just now',
              likes: '1.2K',
              retweets: '340',
              views: '85K',
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
          }, 800);
        }, 700);
      }, 600);
    }, 500);
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
      showToast(`🔥 TREND SURGE CONFIRMED! ${burnAmount.toLocaleString()} ${t.ticker} supply burned!`);
    }, 1100);
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
          alignItems: 'center',
          gap: '10px'
        }}>
          {toastMessage}
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
                TrendPump
                <span className="tp-badge-genlayer">
                  <span>⚡</span> GenLayer Intelligent Contract
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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

            <div className="tp-network-pill" style={{ color: '#34d399', fontWeight: '800' }}>
              💰 {userGenBalance.toLocaleString()} GEN wei
            </div>

            <button className="tp-btn-faucet" onClick={handleClaimFaucet} title="Claim 1,000,000 GEN test tokens">
              <span>🎁</span>
              <span>Faucet</span>
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
                        <span>Source Tweet by <strong>{token.origin_author}</strong> · {token.tweet_time || 'Recent'}</span>
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
                        <span>Your Balance:</span>
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
                        title="Simulate follow-up tweet to trigger 10% supply burn"
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
                  Intelligent Contract: {TRENDPUMP_CONTRACT.slice(0, 10)}...{TRENDPUMP_CONTRACT.slice(-6)}
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
            >
              {tradeTab === 'buy' 
                ? `⚡ Instant Buy ${tradeModalToken.ticker}` 
                : `💰 Instant Sell ${tradeModalToken.ticker}`}
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
                  <strong>{surgeSuccess.burnAmount.toLocaleString()} {surgeSuccess.ticker}</strong> supply permanently burned!
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
                <div className="tp-spinner-glow" style={{ borderTopColor: 'var(--tp-accent-orange-bright)', borderRightColor: '#f59e0b' }}></div>
                <h4 style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: '800' }}>Validators Arbitrating Trend Surge...</h4>
                <p style={{ color: 'var(--tp-text-secondary)', fontSize: '0.88rem' }}>
                  Verifying follow-up tweet alignment with original lore
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
    </div>
  );
}
