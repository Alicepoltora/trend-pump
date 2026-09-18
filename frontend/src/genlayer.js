import { createClient, createAccount } from 'genlayer-js';
import { studioDevnet } from 'genlayer-js/chains';

export const CONTRACT_ADDRESS = '0xDe0d8B959bFf279E26cFFa392aFAAc724d22AE45';
export const DEPLOY_TX_HASH = '0x4c00b9e3c91f800ea6559572fa59406e118307f222e7e78aaf898e929cf5ea7d';
export const EXPLORER_URL = 'https://explorer-studio-dev.genlayer.com';
export const RPC_URL = 'https://studio-dev.genlayer.com/api';
export const CHAIN_ID = 61997;
export const CHAIN_HEX = '0xf22d';

// Pre-funded deployer / dev account on Studio Next
export const DEFAULT_DEV_KEY = '0x1344e32ee1073b2434ed058bebb0871d3109d362630e35fc0d463c68464b6138';
export const DEFAULT_DEV_ADDR = '0x70BEEf62DB5F4a766E07387666f95e384C57EcCF';

export function getReadClient() {
  return createClient({ chain: studioDevnet });
}

export function getWriteClient(privateKey) {
  const account = createAccount(privateKey || DEFAULT_DEV_KEY);
  return {
    client: createClient({ chain: studioDevnet, account }),
    account,
  };
}

// Faucet funding via sim_fundAccount
export async function fundAccount(address, amountGen = '50') {
  try {
    const wei = BigInt(Math.floor(parseFloat(amountGen) * 1e18)).toString();
    const res = await fetch(RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'sim_fundAccount',
        params: [address, wei],
        id: Date.now()
      })
    });
    const data = await res.json();
    return data.result;
  } catch (err) {
    console.error('Faucet fund failed:', err);
    return null;
  }
}

// Fetch real GEN balance from RPC
export async function getAccountBalance(address) {
  try {
    const res = await fetch(RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: Date.now()
      })
    });
    const data = await res.json();
    if (data && data.result) {
      const wei = BigInt(data.result);
      const gen = Number(wei) / 1e18;
      return gen.toFixed(2);
    }
  } catch (err) {
    console.warn('Failed to fetch balance:', err);
  }
  return '0.00';
}

// Fallback seed data in case contract was just deployed
export const CANONICAL_FALLBACK_TOKENS = [
  {
    id: 0,
    ticker: '$MARS',
    name: 'Mars Multiplanetary Coin',
    lore: "Elon Musk Starship tweet fuels humanity colonization of Mars. The cosmos calls.",
    origin_author: '@elonmusk',
    origin_tweet_text: 'Starship will make life multiplanetary on Mars. Humanity belongs among the stars.',
    origin_tweet_url: 'https://x.com/elonmusk/status/1880000000000000000',
    virality_score: 92,
    total_supply: 900000000,
    circulating_supply: 450000000,
    reserve_balance: 1420000,
    is_graduated: false,
    surge_burns_count: 1,
    creator: DEFAULT_DEV_ADDR,
  },
  {
    id: 1,
    ticker: '$GROK',
    name: 'Grok Quantum Reasoning',
    lore: "Spawned from xAI real-time reasoning cluster announcement. Unfiltered AI intellect.",
    origin_author: '@elonmusk',
    origin_tweet_text: 'Grok 3 is trained and entering continuous reasoning mode. Next level frontier intelligence.',
    origin_tweet_url: 'https://x.com/elonmusk/status/1880000000000000001',
    virality_score: 88,
    total_supply: 1000000000,
    circulating_supply: 220000000,
    reserve_balance: 680000,
    is_graduated: false,
    surge_burns_count: 0,
    creator: DEFAULT_DEV_ADDR,
  },
  {
    id: 2,
    ticker: '$LEAN',
    name: 'Lean EVM Protocol',
    lore: "Inspired by Vitalik Buterin manifesto on cryptographic minimalism and light-client validation.",
    origin_author: '@vitalikbuterin',
    origin_tweet_text: 'Simplifying core protocol layers: the future of decentralized verification is lean and deterministic.',
    origin_tweet_url: 'https://x.com/vitalikbuterin/status/1880000000000000002',
    virality_score: 85,
    total_supply: 1000000000,
    circulating_supply: 160000000,
    reserve_balance: 420000,
    is_graduated: false,
    surge_burns_count: 0,
    creator: DEFAULT_DEV_ADDR,
  }
];

// Fetch all tokens directly from on-chain contract storage
export async function fetchAllTokens() {
  const client = getReadClient();
  try {
    const rawTokens = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_tokens',
      args: []
    });

    if (Array.isArray(rawTokens) && rawTokens.length > 0) {
      return rawTokens.map(t => ({
        id: Number(t.id),
        ticker: String(t.ticker),
        name: String(t.name),
        lore: String(t.lore),
        origin_author: String(t.origin_author),
        origin_tweet_text: String(t.origin_tweet_text),
        origin_tweet_url: String(t.origin_tweet_url),
        virality_score: Number(t.virality_score),
        total_supply: Number(t.total_supply),
        circulating_supply: Number(t.circulating_supply),
        reserve_balance: Number(t.reserve_balance),
        is_graduated: Boolean(t.is_graduated),
        surge_burns_count: Number(t.surge_burns_count || 0),
        creator: String(t.creator),
      }));
    }
  } catch (err) {
    console.warn('Could not fetch tokens from contract storage:', err);
  }
  return CANONICAL_FALLBACK_TOKENS;
}

// Seed canonical tokens on-chain
export async function seedInitialTokensOnChain(privateKey) {
  const { client } = getWriteClient(privateKey);
  const fees = await client.estimateTransactionFees();
  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'seed_initial_tokens',
    args: [],
    fees,
  });
  return { txHash };
}

// Autonomous scan & launch on-chain (GenVM AI virality consensus)
export async function scanAndLaunchOnChain(privateKey, { url, text, author, ticker, name }) {
  const { client, account } = getWriteClient(privateKey);
  const fees = await client.estimateTransactionFees();

  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'scan_and_launch',
    args: [
      url || '',
      text || '',
      author || '',
      ticker || '',
      name || '',
    ],
    fees,
  });

  return { txHash, creator: account.address };
}

// Buy tokens via bonding curve on-chain
export async function buyTokensOnChain(privateKey, tokenId, amount) {
  const { client } = getWriteClient(privateKey);
  const fees = await client.estimateTransactionFees();

  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'buy_tokens',
    args: [BigInt(tokenId), BigInt(amount)],
    fees,
  });

  return { txHash };
}

// Sell tokens via bonding curve on-chain
export async function sellTokensOnChain(privateKey, tokenId, amount) {
  const { client } = getWriteClient(privateKey);
  const fees = await client.estimateTransactionFees();

  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'sell_tokens',
    args: [BigInt(tokenId), BigInt(amount)],
    fees,
  });

  return { txHash };
}

// Detect trend surge and trigger on-chain 10% supply burn
export async function detectSurgeOnChain(privateKey, tokenId, url, text) {
  const { client } = getWriteClient(privateKey);
  const fees = await client.estimateTransactionFees();

  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'detect_trend_surge',
    args: [BigInt(tokenId), url || '', text || ''],
    fees,
  });

  return { txHash };
}

// Read buy price from bonding curve
export async function getBuyPrice(tokenId, amount) {
  try {
    const client = getReadClient();
    const price = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_buy_price',
      args: [BigInt(tokenId), BigInt(amount)],
    });
    return Number(price);
  } catch (e) {
    // Mathematical bonding curve local fallback
    const BASE_PRICE = 10;
    const SLOPE = 1;
    const SCALE = 100000;
    const s = 450000000;
    const n = Number(amount);
    return Math.max(1, Math.floor(n * BASE_PRICE + (SLOPE * n * (2 * s + n)) / (2 * SCALE)));
  }
}

// Read user balance
export async function getUserTokenBalance(tokenId, userAddress) {
  try {
    const client = getReadClient();
    const bal = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_balance',
      args: [BigInt(tokenId), userAddress],
    });
    return Number(bal);
  } catch (e) {
    return 0;
  }
}
