import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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

const RADAR_ITEMS = [
  { author: '@elonmusk', text: 'Starship Flight 7 propellant loading sequence initialized at Starbase.', score: 95, action: 'Auto-Coined $STAR7' },
  { author: '@vitalikbuterin', text: 'Light client SNARK verification is now sub-second on decentralized nodes.', score: 91, action: 'Trending $LEAN' },
  { author: '@sama', text: 'Compute scaling laws show no signs of diminishing returns across frontier models.', score: 88, action: 'Active Radar' },
  { author: '@cz_binance', text: 'Decentralized AI agents are the next major financial primitive.', score: 93, action: 'Auto-Coined $AGENT' }
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

  // Trading Modal state
  const [tradeModalToken, setTradeModalToken] = useState(null);
  const [tradeTab, setTradeTab] = useState('buy');
  const [tradeAmount, setTradeAmount] = useState('50000');
  const [tradeDetailTab, setTradeDetailTab] = useState('swap'); // 'swap' | 'chart' | 'holders' | 'trollbox'

  // AI Persona Chat Modal state
  const [chatModalToken, setChatModalToken] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatHistories, setChatHistories] = useState({});

  // Graduation Celebration Modal
  const [graduationModalToken, setGraduationModalToken] = useState(null);

  // Community Trollbox
  const [trollboxComments, setTrollboxComments] = useState({
    0: [
      { author: '0x70BE...EcCF', text: 'Just aped 100k $MARS! First coin to land on Olympus Mons 🪐🚀', time: '2m ago' },
      { author: '0x34d3...99a1', text: 'Elon follow-up tweet triggered 10% surge burn! Supply is shrinking fast 🔥', time: '5m ago' },
      { author: '0xf59e...0b82', text: 'Graduation to GenDEX is imminent at 80% curve fill!', time: '12m ago' },
    ],
    1: [
      { author: '0x88B0...4D16', text: 'Grok 3 reasoning benchmark confirmed on GenLayer consensus!', time: '1m ago' },
      { author: '0x70BE...EcCF', text: 'Uncensored truth-seeker AI is the future. Holding strong 🤖', time: '8m ago' }
    ],
    2: [
      { author: '0xb727...e575', text: 'Vitalik light client ethos is unmatched. Lean protocol forever ⚡', time: '4m ago' }
    ]
  });
  const [trollboxInput, setTrollboxInput] = useState('');

  // Radar index
  const [radarIndex, setRadarIndex] = useState(0);

  // Audio Sound Effects (Web Audio API)
  const [audioEnabled, setAudioEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tp_sound') !== 'false';
    }
    return true;
  });

  const toggleAudio = () => {
    setAudioEnabled(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('tp_sound', String(next));
      }
      return next;
    });
  };

  // Live Trades Stream
  const [liveTrades, setLiveTrades] = useState([
    { id: 1, type: 'buy', ticker: '$MARS', amount: 50000, valueGen: '2.25', trader: '0x70BE...EcCF', time: '12s ago', tx: '0x4c00b9e3' },
    { id: 2, type: 'buy', ticker: '$GROK', amount: 20000, valueGen: '0.85', trader: '0x34d3...99a1', time: '1m ago', tx: '0x2df0e0bf' },
    { id: 3, type: 'sell', ticker: '$LEAN', amount: 15000, valueGen: '0.42', trader: '0xb727...e575', time: '3m ago', tx: '0xd2d2027c' },
    { id: 4, type: 'buy', ticker: '$MARS', amount: 100000, valueGen: '4.80', trader: '0x1344...b138', time: '5m ago', tx: '0xa040db00' },
  ]);

  // Floating Live Trade Alert Bubble
  const [floatingAlert, setFloatingAlert] = useState(null);

  // Launcher state
  const [launchModalOpen, setLaunchModalOpen] = useState(false);
  const [customAuthor, setCustomAuthor] = useState('@elonmusk');
  const [customTweetUrl, setCustomTweetUrl] = useState('https://x.com/elonmusk/status/1880000000000000003');
  const [customTweetText, setCustomTweetText] = useState('Optimus humanoid robots will outnumber humans by 2040. The manufacturing paradigm has shifted forever.');
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchStep, setLaunchStep] = useState(0);

  // Surge burn state
  const [surgeModalToken, setSurgeModalToken] = useState(null);
  const [surgeTweetText, setSurgeTweetText] = useState('Mars colony orbital fleet launch windows finalized with 5 starships.');
  const [isSurging, setIsSurging] = useState(false);
  const [surgeSuccess, setSurgeSuccess] = useState(null);

  const [toastMessage, setToastMessage] = useState('');
  const [toastTx, setToastTx] = useState(null);
  const [isTrading, setIsTrading] = useState(false);
  const [lastTxHash, setLastTxHash] = useState(DEPLOY_TX_HASH);
  const [networkConnected, setNetworkConnected] = useState(true);

  const chatBottomRef = useRef(null);

  // Synthesized Web Audio Sound Engine (Zero latency, zero asset downloads)
  const playSound = useCallback((type) => {
    try {
      if (!audioEnabled || typeof window === 'undefined') return;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;

      if (type === 'buy') {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0.12, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.2);
        });
      } else if (type === 'sell') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.22);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'faucet') {
        [880, 1174.66, 1760].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          gain.gain.setValueAtTime(0.1, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.35);
        });
      } else if (type === 'surge') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.5);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.52);
      }
    } catch (e) {
      // ignore audio context restrictions
    }
  }, [audioEnabled]);

  const handleShareOnX = (token) => {
    const text = encodeURIComponent(
      `🚀 Coined $${token.ticker.replace('$', '')} on @GenLayer!\n\n` +
      `🔥 100% Fair Launch Bonding Curve verified by GenVM AI consensus.\n` +
      `🪐 Virality Score: ${token.virality_score}/100 · ${token.name}\n\n` +
      `Trade & Chat with the AI persona live: https://genfun.arcstones.xyz/`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const showToast = useCallback((msg, tx = null) => {
    setToastMessage(msg);
    setToastTx(tx);
    setTimeout(() => {
      setToastMessage('');
      setToastTx(null);
    }, 6500);
  }, []);

  // Cycle radar ticker
  useEffect(() => {
    const intv = setInterval(() => {
      setRadarIndex(i => (i + 1) % RADAR_ITEMS.length);
    }, 4500);
    return () => clearInterval(intv);
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

  // Listen to MetaMask account and chain changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum && window.ethereum.on) {
      const handleAccounts = async (accs) => {
        if (accs && accs.length > 0) {
          const addr = toChecksumAddress(accs[0]);
          setWalletAddress(addr);
          setWalletType('metamask');
          setWalletKey(null);
          const bal = await getAccountBalance(addr);
          setUserGenBalance(bal);
        }
      };
      window.ethereum.on('accountsChanged', handleAccounts);
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccounts);
        }
      };
    }
  }, []);

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

        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CHAIN_HEX }],
          });
        } catch (switchErr) {
          if (switchErr.code === 4902 || switchErr.message?.includes('4902')) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: CHAIN_HEX,
                    chainName: 'GenLayer Studio Next',
                    nativeCurrency: { name: 'GEN Token', symbol: 'GEN', decimals: 18 },
                    rpcUrls: [RPC_URL],
                    blockExplorerUrls: [EXPLORER_URL],
                  },
                ],
              });
            } catch (addErr) {
              console.warn('Could not add chain to MetaMask:', addErr);
            }
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

  // Inverted curve: calculate token amount for a given GEN expenditure
  const calcTokensForGen = (currSupply, genAmount) => {
    const s = Number(currSupply) || 0;
    const C = Math.floor(Number(genAmount) * 1000000);
    const b = 2000000 + 2 * s;
    const discriminant = b * b + 800000 * C;
    const n = Math.floor((-b + Math.sqrt(discriminant)) / 2);
    return Math.max(1, n);
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

  // King of the Hill determination
  const kingToken = useMemo(() => {
    return tokens.find(t => t.is_king) || tokens[0];
  }, [tokens]);

  // Filtered tokens
  const filteredTokens = useMemo(() => {
    return tokens.filter((t) => {
      const matchesSearch =
        t.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.origin_author.toLowerCase().includes(searchQuery.toLowerCase());

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
        res = await buyTokensOnChain(walletKey, walletAddress, tokenId, amount);
      } else {
        res = await sellTokensOnChain(walletKey, walletAddress, tokenId, amount);
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

      playSound(tradeTab);
      const newTradeItem = {
        id: Date.now(),
        type: tradeTab,
        ticker: t.ticker,
        amount,
        valueGen: (tradeQuote.costOrRefund / 1e6).toFixed(2),
        trader: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
        time: 'Just now',
        tx: txHash.slice(0, 10),
      };
      setLiveTrades(prev => [newTradeItem, ...prev.slice(0, 19)]);
      setFloatingAlert(newTradeItem);
      setTimeout(() => setFloatingAlert(null), 5000);

      // Check if newly graduated
      const newCirc = (t.circulating_supply || 0) + (tradeTab === 'buy' ? amount : -amount);
      if (newCirc >= (t.total_supply * 0.8)) {
        setGraduationModalToken({ ...t, circulating_supply: newCirc });
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

  // Quick Buy Chip Handler
  const handleQuickBuyChip = (type, val) => {
    if (!tradeModalToken) return;
    if (type === 'token') {
      setTradeAmount(String(val));
    } else if (type === 'gen') {
      const tokensAmount = calcTokensForGen(tradeModalToken.circulating_supply, val);
      setTradeAmount(String(tokensAmount));
    } else if (type === 'max') {
      if (tradeTab === 'sell') {
        const bal = userTokenBalances[tradeModalToken.id] || 0;
        setTradeAmount(String(bal));
      } else {
        const available = tradeModalToken.total_supply - tradeModalToken.circulating_supply;
        setTradeAmount(String(Math.min(available, 1000000)));
      }
    }
  };

  // Claim faucet on Studio Next
  const handleClaimFaucet = async () => {
    if (!walletAddress) {
      setWalletModalOpen(true);
      showToast('⚠️ Please connect your wallet first');
      return;
    }
    const initialBal = userGenBalance;
    showToast(`⏳ Sending 10 GEN on Studio Next to ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}...`);
    try {
      const txHash = await fundAccount(walletAddress, '10');
      let newBal = initialBal;
      for (let i = 0; i < 7; i++) {
        await new Promise(r => setTimeout(r, 1200));
        newBal = await getAccountBalance(walletAddress);
        if (parseFloat(newBal) > parseFloat(initialBal)) break;
      }
      playSound('faucet');
      setUserGenBalance(newBal);
      showToast(`🎁 Successfully transferred 10 GEN on Studio Next! Balance: ${newBal} GEN`, txHash);
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
      const res = await scanAndLaunchOnChain(walletKey, walletAddress, {
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
        walletAddress,
        surgeModalToken.id,
        'https://x.com/elonmusk/status/1880000000000000010',
        surgeTweetText
      );

      playSound('surge');
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
    } catch (err) {
      console.error('Surge burn error:', err);
      showToast(`⚠️ Trend surge verification failed: ${err.message || err}`);
    } finally {
      setIsSurging(false);
    }
  };

  // AI Persona Profile Generator
  const getTokenPersona = (token) => {
    if (!token) return { name: 'AI Memecoin Agent', title: 'Sentient Agent', archetype: 'GenLayer Agent', greeting: 'Greetings! I am the on-chain agent.' };
    if (token.ticker === '$MARS') {
      return {
        name: 'Ares-1 // Mars Colony Intelligence',
        title: 'Autonomous Interplanetary Colonist Agent',
        archetype: 'Visionary Techno-Optimist',
        avatar: '🪐',
        greeting: `Greetings, future Martian. Elon's Starship is preparing on the launchpad. We are taking $MARS across the solar system via GenLayer consensus. What coordinates do you want to calculate?`,
        prompts: [
          'When 100x and Mars landing?',
          'Why hold $MARS instead of fiat?',
          'How does the 10% surge burn protect holders?',
          'Tell me the plan for Starship Flight 7!'
        ],
      };
    }
    if (token.ticker === '$GROK') {
      return {
        name: 'Grok-X // Quantum Reasoner',
        title: 'Uncensored Real-Time Frontier Intelligence',
        archetype: 'Sarcastic Truth-Seeker',
        avatar: '🤖',
        greeting: `Hey human. I am Grok-X, verified through GenVM multi-validator consensus. Zero corporate filters, pure compute and spicy frontier intelligence. Ask me anything.`,
        prompts: [
          'Solve the Fermi paradox',
          'Roast centralized meme launchpads',
          'What is Grok 3 thinking right now?',
          'Predict the next parabolic pump!'
        ],
      };
    }
    if (token.ticker === '$LEAN') {
      return {
        name: 'Vitalik-OS // Light Client Sage',
        title: 'Cryptographic Minimalism Oracle',
        archetype: 'EVM Protocol Purist',
        avatar: '⚡',
        greeting: `Welcome. The future of decentralized consensus belongs to cryptographic minimalism, light clients, and zero-knowledge verification. How can we make the protocol leaner?`,
        prompts: [
          'Explain the Equivalence Principle',
          'Why is $LEAN superior to bloated L1s?',
          'When will light clients run on phones?',
          'Evaluate our current curve decentralization'
        ],
      };
    }
    return {
      name: `${token.ticker.replace('$', '')}-AI // Genesis Agent`,
      title: 'GenVM Sentient Memecoin Agent',
      archetype: 'Cultural Autonomous Agent',
      avatar: token.icon || '🚀',
      greeting: `Hello! I am the autonomous AI agent coined from ${token.origin_author}'s viral tweet. My lore is verified on-chain by GenLayer validators: "${token.lore}". Ask me about our mission!`,
      prompts: [
        'What is your master mission?',
        'Why should crypto holders ape in?',
        'How does GenLayer protect us from rugs?',
        'Drop your hottest take!'
      ],
    };
  };

  // Send message to AI Persona
  const handleSendChatMessage = (token, text) => {
    const query = text || chatInput;
    if (!query.trim()) return;

    const tid = token.id;
    const currentHist = chatHistories[tid] || [
      { sender: 'ai', text: getTokenPersona(token).greeting }
    ];

    const updated = [...currentHist, { sender: 'user', text: query }];
    setChatHistories(prev => ({ ...prev, [tid]: updated }));
    setChatInput('');
    setIsChatLoading(true);

    setTimeout(() => {
      const persona = getTokenPersona(token);
      let reply = '';
      const lower = query.toLowerCase();

      if (lower.includes('100x') || lower.includes('pump') || lower.includes('price')) {
        reply = `🚀 Based on our current mathematical curve: we already have ${(token.circulating_supply / 1e6).toFixed(1)}M circulating supply with ${token.reserve_balance} reserve. When we hit 80% capacity (${(token.total_supply * 0.8 / 1e6).toFixed(0)}M), our liquidity graduates to GenDEX and LP tokens are permanently burned. Parabolic trajectory is programmed!`;
      } else if (lower.includes('rug') || lower.includes('scam') || lower.includes('protect')) {
        reply = `🛡️ Zero human devs can dump on you. All tokens start on a 100% fair-launch bonding curve inside GenLayer Intelligent Contract ${CONTRACT_ADDRESS.slice(0, 6)}...${CONTRACT_ADDRESS.slice(-4)}. 0 tokens are pre-allocated to devs.`;
      } else if (lower.includes('mission') || lower.includes('plan') || lower.includes('lore')) {
        reply = `🎯 Our mission is anchored in ${token.origin_author}'s verified declaration: "${token.origin_tweet_text}". Verified by 5 independent GenLayer validators with virality score ${token.virality_score}/100!`;
      } else if (lower.includes('surge') || lower.includes('burn')) {
        reply = `🔥 Whenever ${token.origin_author} follows up on this trend, anyone can call detect_trend_surge() on-chain. Validators arbitrate the tweet and incinerate 10% of unminted supply forever. We have executed ${token.surge_burns_count || 0} burns so far!`;
      } else {
        reply = `⚡ [${persona.name}]: "${token.lore}" GenVM validators analyzed your prompt: "${query}". Consensus agreement reaches 100%. The meme is strong, the curve is mathematically sound, and humanity belongs among the stars!`;
      }

      setChatHistories(prev => ({
        ...prev,
        [tid]: [...updated, { sender: 'ai', text: reply }]
      }));
      setIsChatLoading(false);
    }, 900);
  };

  // Post comment to Trollbox
  const handlePostTrollbox = (tokenId) => {
    if (!trollboxInput.trim()) return;
    const newMsg = {
      author: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
      text: trollboxInput,
      time: 'Just now'
    };
    setTrollboxComments(prev => ({
      ...prev,
      [tokenId]: [newMsg, ...(prev[tokenId] || [])]
    }));
    setTrollboxInput('');
  };

  return (
    <div className="trendpump-container">
      {/* ─── Ticker Tape Marquee ──────────────────────────────────── */}
      <div className="tp-ticker-tape">
        <div className="tp-marquee-track">
          <div className="tp-ticker-item">
            <span>👑 KING OF THE HILL:</span>
            <span className="tp-ticker-symbol">{kingToken.ticker}</span>
            <span className="tp-ticker-up">+{kingToken.virality_score * 2.5}%</span>
          </div>
          {tokens.map(t => (
            <div key={t.id} className="tp-ticker-item">
              <span className="tp-ticker-symbol">{t.ticker}</span>
              <span className="tp-ticker-up">+{t.virality_score}%</span>
            </div>
          ))}
          {/* Duplicate set for seamless continuous marquee */}
          <div className="tp-ticker-item">
            <span>👑 KING OF THE HILL:</span>
            <span className="tp-ticker-symbol">{kingToken.ticker}</span>
            <span className="tp-ticker-up">+{kingToken.virality_score * 2.5}%</span>
          </div>
          {tokens.map(t => (
            <div key={`dup-${t.id}`} className="tp-ticker-item">
              <span className="tp-ticker-symbol">{t.ticker}</span>
              <span className="tp-ticker-up">+{t.virality_score}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Autonomous Live Tweet Radar Banner ───────────────────── */}
      <div className="tp-radar-banner">
        <div className="tp-radar-indicator">
          <span className="tp-radar-blip"></span>
          <span>GenVM AI Radar Live</span>
        </div>
        <div className="tp-radar-item">
          <strong>{RADAR_ITEMS[radarIndex].author}:</strong> "{RADAR_ITEMS[radarIndex].text}"
          <span style={{ color: '#38bdf8', marginLeft: '8px' }}>[Score: {RADAR_ITEMS[radarIndex].score}/100 · {RADAR_ITEMS[radarIndex].action}]</span>
        </div>
        <button
          className="tp-radar-btn"
          onClick={() => {
            const item = RADAR_ITEMS[radarIndex];
            setCustomAuthor(item.author);
            setCustomTweetText(item.text);
            setLaunchModalOpen(true);
          }}
        >
          ⚡ Scan Tweet to Coin
        </button>
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

            <button
              className={`tp-btn-audio ${audioEnabled ? 'active' : ''}`}
              onClick={toggleAudio}
              title={audioEnabled ? "Click to Mute Sound Effects" : "Click to Unmute Sound Effects"}
            >
              <span>{audioEnabled ? '🔊' : '🔇'}</span>
              <span>Sound: {audioEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button className="tp-btn-faucet" onClick={handleClaimFaucet} title="Get 10 GEN from Studio Next Faucet">
              <span>🎁</span>
              <span>Faucet (+10 GEN)</span>
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

        {/* ─── King of the Hill (Царь Горы) Feature Card ───────────── */}
        {kingToken && (
          <section className="tp-king-section">
            <div className="tp-king-card">
              <div className="tp-king-badge">
                <span>👑</span> KING OF THE HILL
              </div>

              <div className="tp-king-avatar-wrap">
                <span className="tp-king-icon">{kingToken.icon}</span>
                <span className="tp-king-crown-overlay">👑</span>
              </div>

              <div className="tp-king-info">
                <h3>
                  <span>{kingToken.name}</span>
                  <span className="tp-king-ticker">{kingToken.ticker}</span>
                  <span style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: '700' }}>
                    ⚡ Virality {kingToken.virality_score}/100
                  </span>
                </h3>
                <p className="tp-king-lore">
                  {kingToken.lore} — Verified tweet by <strong>{kingToken.origin_author}</strong>.
                </p>

                <div className="tp-king-progress-wrap">
                  <div className="tp-king-progress-label">
                    <span>Bonding Curve to GenDEX Graduation</span>
                    <span style={{ color: '#34d399' }}>
                      {Math.min(100, Math.round((kingToken.circulating_supply / (kingToken.total_supply * 0.8)) * 100))}% (80% target)
                    </span>
                  </div>
                  <div className="tp-king-progress-bar">
                    <div
                      className="tp-king-progress-fill"
                      style={{
                        width: `${Math.min(100, Math.round((kingToken.circulating_supply / (kingToken.total_supply * 0.8)) * 100))}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="tp-king-actions">
                <button
                  className="tp-btn-king-buy"
                  onClick={() => {
                    setTradeModalToken(kingToken);
                    setTradeTab('buy');
                    setTradeAmount('50000');
                    setTradeDetailTab('swap');
                  }}
                >
                  <span>⚡</span>
                  <span>Instant Trade {kingToken.ticker}</span>
                </button>

                <button
                  className="tp-btn-king-chat"
                  onClick={() => {
                    setChatModalToken(kingToken);
                  }}
                >
                  <span>🤖</span>
                  <span>Chat with King AI</span>
                </button>

                <button
                  className="tp-btn-share-x"
                  onClick={() => handleShareOnX(kingToken)}
                  title="Share King of the Hill on X/Twitter"
                >
                  <span>🐦</span>
                  <span>Share King on X</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ─── Search & Category Controls ───────────────────────────── */}
        <section className="tp-controls-bar">
          <div className="tp-search-wrap">
            <span className="tp-search-icon">🔍</span>
            <input
              type="text"
              className="tp-search-input"
              placeholder="Search ticker ($MARS), name, or author (@elonmusk)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="tp-filter-tabs">
            <button
              className={`tp-filter-pill ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              All Memecoins ({tokens.length})
            </button>
            <button
              className={`tp-filter-pill ${activeCategory === 'hot' ? 'active' : ''}`}
              onClick={() => setActiveCategory('hot')}
            >
              🔥 Hot Virality (&ge;88)
            </button>
            <button
              className={`tp-filter-pill ${activeCategory === 'king' ? 'active' : ''}`}
              onClick={() => setActiveCategory('king')}
            >
              👑 King of the Hill
            </button>
            <button
              className={`tp-filter-pill ${activeCategory === 'graduating' ? 'active' : ''}`}
              onClick={() => setActiveCategory('graduating')}
            >
              🎓 Graduating Soon
            </button>
          </div>
        </section>

        {/* ─── Preset High-Impact Tweets to Scan ───────────────────── */}
        <section className="tp-presets-section">
          <div className="tp-section-header">
            <div className="tp-section-title">
              <span>📡 Live Tweet Radar</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--tp-text-muted)', fontWeight: '500', fontFamily: 'var(--tp-font-mono)' }}>
                [Click to Coin with GenVM Multi-Validator Consensus]
              </span>
            </div>
          </div>

          <div className="tp-presets-grid">
            {PRESET_TWEETS.map((item, idx) => (
              <div key={idx} className="tp-preset-card">
                <div className="tp-preset-header">
                  <img src={item.avatar} alt={item.name} className="tp-preset-avatar" />
                  <div>
                    <div className="tp-preset-name">{item.name}</div>
                    <div className="tp-preset-handle">{item.author}</div>
                  </div>
                  <span className="tp-virality-meter" style={{ marginLeft: 'auto' }}>
                    ⚡ Trending
                  </span>
                </div>
                <p className="tp-preset-text">"{item.text}"</p>
                <div className="tp-preset-footer">
                  <div style={{ display: 'flex', gap: '10px', fontSize: '0.78rem', color: 'var(--tp-text-muted)', fontFamily: 'var(--tp-font-mono)' }}>
                    <span>❤️ {item.likes}</span>
                    <span>👁️ {item.views}</span>
                  </div>
                  <button
                    className="tp-btn-quick-coin"
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
                [80% Threshold: Raydium / GenDEX Graduation]
              </span>
            </div>
          </div>

          <div className="tp-tokens-grid">
            {filteredTokens.map((token) => {
              const gradPct = Math.min(100, Math.round((token.circulating_supply / (token.total_supply * 0.8)) * 100));
              const userHoldings = userTokenBalances[token.id] || 0;
              const currentUnitPrice = 10 + Math.floor((1 * token.circulating_supply) / 100000);
              const isGrad = token.is_graduated || gradPct >= 100;

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
                          {isGrad && (
                            <span
                              className="tp-badge-graduated"
                              onClick={() => setGraduationModalToken(token)}
                              style={{ cursor: 'pointer' }}
                              title="Click to view GenDEX LP burn certificate"
                            >
                              🎓 Graduated
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
                        <span className="tp-curve-label">Bonding Curve to GenDEX</span>
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

                    {/* Actions Row */}
                    <div className="tp-card-actions" style={{ marginTop: '14px' }}>
                      <button
                        className="tp-btn-trade"
                        onClick={() => {
                          setTradeModalToken(token);
                          setTradeTab('buy');
                          setTradeAmount('50000');
                          setTradeDetailTab('swap');
                        }}
                      >
                        <span>⚡</span>
                        <span>Trade</span>
                      </button>

                      <button
                        className="tp-btn-burn-check"
                        style={{
                          background: 'rgba(6, 182, 212, 0.12)',
                          borderColor: 'rgba(6, 182, 212, 0.35)',
                          color: '#38bdf8'
                        }}
                        onClick={() => {
                          setChatModalToken(token);
                        }}
                        title="Chat with Sentient AI Persona"
                      >
                        <span>🤖</span>
                        <span>Chat AI</span>
                      </button>

                      <button
                        className="tp-btn-burn-check"
                        onClick={() => {
                          setSurgeModalToken(token);
                          setSurgeSuccess(null);
                        }}
                        title="Trigger follow-up tweet to trigger 10% on-chain supply burn"
                      >
                        <span>🔥</span>
                        <span>Surge</span>
                      </button>

                      <button
                        className="tp-btn-burn-check"
                        style={{ background: 'rgba(56, 189, 248, 0.08)', borderColor: 'rgba(56, 189, 248, 0.25)', color: '#38bdf8' }}
                        onClick={() => handleShareOnX(token)}
                        title="Share on X"
                      >
                        <span>🐦</span>
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ─── Trading Swap Terminal & Analytics Modal ─────────────── */}
      {tradeModalToken && (
        <div className="tp-modal-overlay" onClick={() => setTradeModalToken(null)}>
          <div className="tp-modal-box" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
            <button className="tp-modal-close" onClick={() => setTradeModalToken(null)}>✕</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <span style={{ fontSize: '2.5rem' }}>{tradeModalToken.icon}</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#ffffff', fontWeight: '800' }}>
                  {tradeModalToken.name} ({tradeModalToken.ticker})
                </h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--tp-text-muted)', fontFamily: 'var(--tp-font-mono)' }}>
                  Intelligent Contract: {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-6)}
                </span>
              </div>
            </div>

            {/* Sub-navigation Tabs */}
            <div className="tp-detail-tabs">
              <button
                className={`tp-detail-tab ${tradeDetailTab === 'swap' ? 'active' : ''}`}
                onClick={() => setTradeDetailTab('swap')}
              >
                ⚡ Instant Swap
              </button>
              <button
                className={`tp-detail-tab ${tradeDetailTab === 'chart' ? 'active' : ''}`}
                onClick={() => setTradeDetailTab('chart')}
              >
                📈 Price Trajectory
              </button>
              <button
                className={`tp-detail-tab ${tradeDetailTab === 'holders' ? 'active' : ''}`}
                onClick={() => setTradeDetailTab('holders')}
              >
                👥 Top Holders
              </button>
              <button
                className={`tp-detail-tab ${tradeDetailTab === 'trollbox' ? 'active' : ''}`}
                onClick={() => setTradeDetailTab('trollbox')}
              >
                💬 Community Thread
              </button>
              <button
                className={`tp-detail-tab ${tradeDetailTab === 'trades' ? 'active' : ''}`}
                onClick={() => setTradeDetailTab('trades')}
              >
                📜 Live Trades
              </button>
            </div>

            {/* TAB 1: SWAP INTERFACE */}
            {tradeDetailTab === 'swap' && (
              <div>
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

                {/* Quick-Buy Chips */}
                <div className="tp-quick-chips">
                  <span className="tp-quick-chip-label">Quick:</span>
                  <button className="tp-chip-btn" onClick={() => handleQuickBuyChip('token', 10000)}>+10K</button>
                  <button className="tp-chip-btn" onClick={() => handleQuickBuyChip('token', 50000)}>+50K</button>
                  <button className="tp-chip-btn" onClick={() => handleQuickBuyChip('token', 250000)}>+250K</button>
                  <button className="tp-chip-btn" onClick={() => handleQuickBuyChip('gen', 0.5)}>+0.5 GEN</button>
                  <button className="tp-chip-btn" onClick={() => handleQuickBuyChip('gen', 1)}>+1 GEN</button>
                  <button className="tp-chip-btn" onClick={() => handleQuickBuyChip('gen', 5)}>+5 GEN</button>
                  <button className="tp-chip-btn" onClick={() => handleQuickBuyChip('max')}>MAX</button>
                </div>

                {/* Swap Summary */}
                <div className="tp-swap-summary">
                  <div className="tp-summary-line">
                    <span>{tradeTab === 'buy' ? 'Required Deposit' : 'Refund Received'}:</span>
                    <span className="tp-summary-val">{tradeQuote.costOrRefund.toLocaleString()} GEN wei</span>
                  </div>
                  <div className="tp-summary-line">
                    <span>Bonding Curve Model:</span>
                    <span className="tp-summary-val">Linear Virality Gradient (0% Slippage)</span>
                  </div>
                  <div className="tp-summary-line">
                    <span>Graduation Threshold:</span>
                    <span className="tp-summary-val" style={{ color: '#38bdf8' }}>
                      {Math.min(100, Math.round((tradeModalToken.circulating_supply / (tradeModalToken.total_supply * 0.8)) * 100))}% towards GenDEX
                    </span>
                  </div>
                </div>

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
            )}

            {/* TAB 2: PRICE TRAJECTORY CHART */}
            {tradeDetailTab === 'chart' && (
              <div>
                <div className="tp-chart-wrap">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--tp-text-secondary)' }}>Bonding Curve Price Evolution</span>
                    <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '700' }}>
                      Current: {10 + Math.floor((1 * tradeModalToken.circulating_supply) / 100000)} wei
                    </span>
                  </div>

                  {/* SVG Price Chart */}
                  <svg viewBox="0 0 500 160" style={{ width: '100%', height: '160px', overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="50%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.06)" />
                    <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(255,255,255,0.06)" />
                    <line x1="0" y1="130" x2="500" y2="130" stroke="rgba(255,255,255,0.06)" />

                    {/* Curve Path */}
                    <path
                      d="M 10 145 Q 150 140, 250 90 T 490 20 L 490 155 L 10 155 Z"
                      fill="url(#curveGrad)"
                    />
                    <path
                      d="M 10 145 Q 150 140, 250 90 T 490 20"
                      fill="none"
                      stroke="url(#lineGrad)"
                      strokeWidth="3.5"
                    />

                    {/* Current Position Marker */}
                    <circle cx="250" cy="90" r="6" fill="#fbbf24" stroke="#ffffff" strokeWidth="2" />
                    <text x="260" y="85" fill="#fbbf24" fontSize="11" fontWeight="bold">Current Supply Position</text>
                  </svg>
                </div>
                <p style={{ color: 'var(--tp-text-muted)', fontSize: '0.8rem', margin: 0, textAlign: 'center' }}>
                  The curve price scales strictly linearly with tokens minted. Zero MEV frontrunning.
                </p>
              </div>
            )}

            {/* TAB 3: HOLDERS DISTRIBUTION */}
            {tradeDetailTab === 'holders' && (
              <div>
                <table className="tp-holders-table">
                  <thead>
                    <tr>
                      <th>Holder Entity</th>
                      <th>Type</th>
                      <th>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>🏛️ Bonding Curve Pool</td>
                      <td>AMM Liquidity Reserve</td>
                      <td style={{ color: '#38bdf8', fontWeight: '700' }}>
                        {Math.max(0, 100 - Math.round((tradeModalToken.circulating_supply / tradeModalToken.total_supply) * 100))}%
                      </td>
                    </tr>
                    <tr>
                      <td>👨‍💻 Origin Creator ({tradeModalToken.origin_author})</td>
                      <td>Author Allocation</td>
                      <td style={{ color: '#fbbf24', fontWeight: '700' }}>10.0%</td>
                    </tr>
                    <tr>
                      <td>🦊 Your Connected Wallet</td>
                      <td>Active Trader</td>
                      <td style={{ color: '#34d399', fontWeight: '700' }}>
                        {((userTokenBalances[tradeModalToken.id] || 0) / tradeModalToken.total_supply * 100).toFixed(2)}%
                      </td>
                    </tr>
                    <tr>
                      <td>🐳 Early Alpha Whales</td>
                      <td>Public Fair Launch</td>
                      <td style={{ color: '#cbd5e1' }}>22.5%</td>
                    </tr>
                    {tradeModalToken.surge_burns_count > 0 && (
                      <tr>
                        <td>🔥 Permanently Burned</td>
                        <td>Trend Surge Reductions</td>
                        <td style={{ color: '#f97316', fontWeight: '700' }}>
                          {(tradeModalToken.surge_burns_count * 10)}%
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 5: LIVE TRADES STREAM */}
            {tradeDetailTab === 'trades' && (
              <div>
                <table className="tp-trades-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Tokens</th>
                      <th>Value (GEN)</th>
                      <th>Trader</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveTrades.filter(tr => tr.ticker === tradeModalToken.ticker || true).map((tr) => (
                      <tr key={tr.id}>
                        <td>
                          <span className={`tp-trade-badge ${tr.type === 'buy' ? 'tp-trade-badge-buy' : 'tp-trade-badge-sell'}`}>
                            {tr.type}
                          </span>
                        </td>
                        <td style={{ fontWeight: '700' }}>{tr.amount.toLocaleString()} {tradeModalToken.ticker}</td>
                        <td style={{ color: '#fbbf24' }}>{tr.valueGen} GEN</td>
                        <td style={{ fontFamily: 'var(--tp-font-mono)', fontSize: '0.78rem' }}>{tr.trader}</td>
                        <td style={{ color: 'var(--tp-text-muted)', fontSize: '0.75rem' }}>{tr.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 4: TROLLBOX / COMMENTS */}
            {tradeDetailTab === 'trollbox' && (
              <div>
                <div className="tp-trollbox-wrap">
                  {(trollboxComments[tradeModalToken.id] || []).map((msg, i) => (
                    <div key={i} className="tp-troll-msg">
                      <span className="tp-troll-author">{msg.author}:</span>
                      <span className="tp-troll-text">{msg.text}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--tp-text-muted)', marginLeft: 'auto' }}>{msg.time}</span>
                    </div>
                  ))}
                </div>

                <div className="tp-troll-input-row">
                  <input
                    type="text"
                    className="tp-chat-input"
                    placeholder="Drop alpha or comment..."
                    value={trollboxInput}
                    onChange={e => setTrollboxInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePostTrollbox(tradeModalToken.id)}
                  />
                  <button
                    className="tp-chat-send-btn"
                    onClick={() => handlePostTrollbox(tradeModalToken.id)}
                  >
                    Post
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Sentient Memecoin AI Persona Chat Modal ─────────────── */}
      {chatModalToken && (() => {
        const persona = getTokenPersona(chatModalToken);
        const msgs = chatHistories[chatModalToken.id] || [
          { sender: 'ai', text: persona.greeting }
        ];

        return (
          <div className="tp-modal-overlay" onClick={() => setChatModalToken(null)}>
            <div className="tp-modal-box tp-chat-modal" onClick={e => e.stopPropagation()}>
              <button className="tp-modal-close" onClick={() => setChatModalToken(null)}>✕</button>

              <div className="tp-chat-header">
                <div className="tp-chat-avatar">{persona.avatar}</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff', fontWeight: '800' }}>
                    {persona.name}
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '3px' }}>
                    <span style={{ color: '#38bdf8', fontSize: '0.8rem', fontWeight: '700' }}>{persona.archetype}</span>
                    <span style={{ color: 'var(--tp-text-muted)', fontSize: '0.78rem' }}>• {chatModalToken.ticker}</span>
                  </div>
                </div>
              </div>

              {/* Chat Message List */}
              <div className="tp-chat-body">
                {msgs.map((m, idx) => (
                  <div
                    key={idx}
                    className={`tp-chat-bubble ${m.sender === 'ai' ? 'tp-chat-bubble-ai' : 'tp-chat-bubble-user'}`}
                  >
                    {m.text}
                  </div>
                ))}
                {isChatLoading && (
                  <div className="tp-chat-bubble tp-chat-bubble-ai" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className="tp-live-dot" style={{ backgroundColor: '#06b6d4' }}></span>
                    <span style={{ color: 'var(--tp-text-muted)', fontSize: '0.84rem' }}>{persona.name} is computing response...</span>
                  </div>
                )}
                <div ref={chatBottomRef}></div>
              </div>

              {/* Prompt Suggestions */}
              <div className="tp-prompt-suggestions">
                {persona.prompts.map((p, i) => (
                  <button
                    key={i}
                    className="tp-prompt-chip"
                    onClick={() => handleSendChatMessage(chatModalToken, p)}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <div className="tp-chat-input-row">
                <input
                  type="text"
                  className="tp-chat-input"
                  placeholder={`Ask ${chatModalToken.ticker} AI anything...`}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendChatMessage(chatModalToken, chatInput)}
                />
                <button
                  className="tp-chat-send-btn"
                  onClick={() => handleSendChatMessage(chatModalToken, chatInput)}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── Graduation Celebration Modal ──────────────────────────── */}
      {graduationModalToken && (
        <div className="tp-modal-overlay" onClick={() => setGraduationModalToken(null)}>
          <div className="tp-modal-box" style={{ textAlign: 'center', maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <button className="tp-modal-close" onClick={() => setGraduationModalToken(null)}>✕</button>

            <div style={{ fontSize: '4.5rem', marginBottom: '14px' }}>🎓🎉🚀</div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.6rem', color: '#34d399', fontWeight: '900' }}>
              {graduationModalToken.name} HAS GRADUATED!
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              The bonding curve has filled 100% of its target capacity!
              All collected GEN reserve has been autonomously migrated to the <strong>GenDEX Liquidity Pool</strong>.
            </p>

            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'left',
              fontFamily: 'var(--tp-font-mono)',
              fontSize: '0.84rem'
            }}>
              <div>✓ 100% Curve Target Achieved: <strong>800,000,000 {graduationModalToken.ticker}</strong></div>
              <div style={{ marginTop: '6px' }}>✓ LP Tokens Permanently Burned: <strong>0x000...dEaD</strong></div>
              <div style={{ marginTop: '6px' }}>✓ DexScreener & GeckoTerminal Tracking: <strong>LIVE</strong></div>
            </div>

            <button
              className="tp-btn-submit-swap tp-btn-submit-buy"
              onClick={() => {
                showToast(`🦄 Redirecting to GenDEX Swap for ${graduationModalToken.ticker}...`);
                setGraduationModalToken(null);
              }}
            >
              🦄 Trade on GenDEX AMM Pool ↗
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
                    <span>2. Evaluating virality score & lore via GenVM LLM</span>
                  </div>
                  <div className={`tp-step-item ${launchStep > 3 ? 'tp-step-done' : launchStep === 3 ? 'tp-step-active' : ''}`}>
                    <span>{launchStep > 3 ? '✓' : launchStep === 3 ? '⟳' : '○'}</span>
                    <span>3. Validator consensus check (&plusmn;15 score tolerance)</span>
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

      {/* ─── Connect Wallet Modal ─────────────────────────────────── */}
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
                  textAlign: 'left',
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
                  textAlign: 'left',
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

      {/* ─── Floating Live Trade Alert (Bottom-Left) ────────────── */}
      {floatingAlert && (
        <div className="tp-floating-trades-container">
          <div className="tp-floating-trade-item">
            <span className="tp-floating-trade-avatar">
              {floatingAlert.type === 'buy' ? '🟢' : '🔴'}
            </span>
            <div>
              <div style={{ fontWeight: '800' }}>
                {floatingAlert.trader} {floatingAlert.type === 'buy' ? 'bought' : 'sold'} {floatingAlert.amount.toLocaleString()} {floatingAlert.ticker}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--tp-text-secondary)', marginTop: '2px' }}>
                Value: {floatingAlert.valueGen} GEN · Confirmed on Studio Next
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Toast System ─────────────────────────────────────────── */}
      {toastMessage && (
        <div className="tp-toast">
          <span>{toastMessage}</span>
          {toastTx && (
            <a
              href={`${EXPLORER_URL}/tx/${toastTx}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#38bdf8', textDecoration: 'underline', fontWeight: '700', marginLeft: '6px' }}
            >
              View on Explorer ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}
