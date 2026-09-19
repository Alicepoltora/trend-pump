import { createClient, createAccount } from 'genlayer-js';
import { studioDevnet } from 'genlayer-js/chains';
import { keccak_256 } from '@noble/hashes/sha3';

export const CONTRACT_ADDRESS = '0xDe0d8B959bFf279E26cFFa392aFAAc724d22AE45';
export const DEPLOY_TX_HASH = '0x4c00b9e3c91f800ea6559572fa59406e118307f222e7e78aaf898e929cf5ea7d';
export const EXPLORER_URL = 'https://explorer-studio-dev.genlayer.com';
export const RPC_URL = 'https://studio-dev.genlayer.com/api';
export const CHAIN_ID = 61997;
export const CHAIN_HEX = '0xf22d';

// Pre-funded deployer / dev account on Studio Next (~90+ GEN)
export const DEFAULT_DEV_KEY = '0x1344e32ee1073b2434ed058bebb0871d3109d362630e35fc0d463c68464b6138';
export const DEFAULT_DEV_ADDR = '0x70BEEf62DB5F4a766E07387666f95e384C57EcCF';

// Standard ERC-55 Checksum Address utility
export function toChecksumAddress(address) {
  if (!address || typeof address !== 'string') return DEFAULT_DEV_ADDR;
  const addr = address.toLowerCase().replace(/^0x/, '');
  if (addr.length !== 40) return address;
  const hash = keccak_256(new TextEncoder().encode(addr));
  let ret = '0x';
  for (let i = 0; i < addr.length; i++) {
    const byte = hash[i >> 1];
    const nibble = (i % 2 === 0) ? (byte >> 4) : (byte & 0x0f);
    if (nibble >= 8) {
      ret += addr[i].toUpperCase();
    } else {
      ret += addr[i];
    }
  }
  return ret;
}

export function getReadClient() {
  return createClient({ chain: studioDevnet });
}

export function getWriteClient(privateKey, userAddress) {
  if (!privateKey && typeof window !== 'undefined' && window.ethereum && userAddress) {
    const checksummed = toChecksumAddress(userAddress);
    return {
      client: createClient({
        chain: studioDevnet,
        provider: window.ethereum,
        account: checksummed,
      }),
      account: { address: checksummed },
    };
  }
  const account = createAccount(privateKey || DEFAULT_DEV_KEY);
  return {
    client: createClient({ chain: studioDevnet, account }),
    account,
  };
}

// Real on-chain faucet: transfers real GEN from funded relayer to recipient address on chain 61997
export async function fundAccount(recipientAddress, amountGen = '10') {
  try {
    const checksummed = toChecksumAddress(recipientAddress);
    const account = createAccount(DEFAULT_DEV_KEY);
    const client = createClient({ chain: studioDevnet, account });
    const valueWei = BigInt(Math.floor(parseFloat(amountGen) * 1e18));

    const txHash = await client.sendTransaction({
      to: checksummed,
      value: valueWei,
    });

    try {
      await client.waitForTransactionReceipt({ hash: txHash, timeout: 15000 });
    } catch (e) {
      console.warn('waitForTransactionReceipt timeout/warn (proceeding):', e);
    }
    return txHash;
  } catch (err) {
    console.error('Real GEN funding failed:', err);
    throw err;
  }
}

// Fetch real GEN balance from RPC using client
export async function getAccountBalance(address) {
  try {
    if (!address) return '0.00';
    const checksummed = toChecksumAddress(address);
    const client = getReadClient();
    const wei = await client.getBalance({ address: checksummed });
    const gen = Number(wei) / 1e18;
    return gen.toFixed(2);
  } catch (err) {
    console.warn('Failed to fetch balance:', err);
    return '0.00';
  }
}

// Fallback seed data in case contract was just deployed
export const CANONICAL_FALLBACK_TOKENS = [
  {
    id: 0,
    ticker: '$MARS',
    name: 'Mars Multiplanetary Coin',
    icon: '🪐',
    lore: "Elon Musk Starship tweet fuels humanity colonization of Mars. The cosmos calls.",
    origin_author: '@elonmusk',
    author_name: 'Elon Musk',
    origin_tweet_text: 'Starship will make life multiplanetary on Mars. Humanity belongs among the stars.',
    origin_tweet_url: 'https://x.com/elonmusk/status/1880000000000000000',
    virality_score: 92,
    total_supply: 900000000,
    circulating_supply: 450000000,
    reserve_balance: 1420000,
    is_graduated: false,
    surge_burns_count: 1,
    is_king: true,
    creator: DEFAULT_DEV_ADDR,
  },
  {
    id: 1,
    ticker: '$GROK',
    name: 'Grok Quantum Reasoning',
    icon: '🤖',
    lore: "Spawned from xAI real-time reasoning cluster announcement. Unfiltered AI intellect.",
    origin_author: '@elonmusk',
    author_name: 'Elon Musk',
    origin_tweet_text: 'Grok 3 is trained and entering continuous reasoning mode. Next level frontier intelligence.',
    origin_tweet_url: 'https://x.com/elonmusk/status/1880000000000000001',
    virality_score: 88,
    total_supply: 1000000000,
    circulating_supply: 220000000,
    reserve_balance: 680000,
    is_graduated: false,
    surge_burns_count: 0,
    is_king: false,
    creator: DEFAULT_DEV_ADDR,
  },
  {
    id: 2,
    ticker: '$LEAN',
    name: 'Lean EVM Protocol',
    icon: '⚡',
    lore: "Inspired by Vitalik Buterin manifesto on cryptographic minimalism and light-client validation.",
    origin_author: '@vitalikbuterin',
    author_name: 'Vitalik Buterin',
    origin_tweet_text: 'Simplifying core protocol layers: the future of decentralized verification is lean and deterministic.',
    origin_tweet_url: 'https://x.com/vitalikbuterin/status/1880000000000000002',
    virality_score: 85,
    total_supply: 1000000000,
    circulating_supply: 160000000,
    reserve_balance: 420000,
    is_graduated: false,
    surge_burns_count: 0,
    is_king: false,
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
export async function seedInitialTokensOnChain(privateKey, userAddress) {
  const { client } = getWriteClient(privateKey, userAddress);
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
export async function scanAndLaunchOnChain(privateKey, userAddress, { url, text, author, ticker, name }) {
  const { client, account } = getWriteClient(privateKey, userAddress);
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
export async function buyTokensOnChain(privateKey, userAddress, tokenId, amount) {
  const { client } = getWriteClient(privateKey, userAddress);
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
export async function sellTokensOnChain(privateKey, userAddress, tokenId, amount) {
  const { client } = getWriteClient(privateKey, userAddress);
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
export async function detectSurgeOnChain(privateKey, userAddress, tokenId, url, text) {
  const { client } = getWriteClient(privateKey, userAddress);
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
    const checksummed = toChecksumAddress(userAddress);
    const client = getReadClient();
    const bal = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_balance',
      args: [BigInt(tokenId), checksummed],
    });
    return Number(bal);
  } catch (e) {
    return 0;
  }
}
