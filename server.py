import os
import json
import asyncio
from pathlib import Path
from aiohttp import web
from eth_account import Account
import genlayer_py as gl

# Load environment
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ[k.strip()] = v.strip()

PRIVATE_KEY = os.getenv('GENLAYER_PRIVATE_KEY', '0x1344e32ee1073b2434ed058bebb0871d3109d362630e35fc0d463c68464b6138')
CONTRACT_ADDRESS = os.getenv('CONTRACT_ADDRESS', '0xc0Bbd2d0a2C81CAa5D4cAC56ae378c809f3dF693')

account = Account.from_key(PRIVATE_KEY)
client = gl.create_client(gl.studionet, account=account)

async def handle_status(request):
    try:
        balance_wei = client.w3.eth.get_balance(account.address)
        gen_bal = client.read_contract(CONTRACT_ADDRESS, 'get_gen_balance', [account.address])
        token_count = client.read_contract(CONTRACT_ADDRESS, 'get_token_count', [])
        return web.json_response({
            'status': 'online',
            'network': 'studionet',
            'contract_address': CONTRACT_ADDRESS,
            'deployer_address': account.address,
            'wallet_balance_gen': balance_wei / 1e18,
            'contract_gen_balance': gen_bal,
            'token_count': token_count
        })
    except Exception as e:
        return web.json_response({'status': 'error', 'error': str(e)}, status=500)

async def handle_get_tokens(request):
    try:
        tokens = client.read_contract(CONTRACT_ADDRESS, 'get_tokens', [])
        # Also fetch user balances
        enhanced = []
        for t in tokens:
            tid = t.get('id', 0)
            user_bal = client.read_contract(CONTRACT_ADDRESS, 'get_balance', [tid, account.address])
            t_copy = dict(t)
            t_copy['user_balance'] = user_bal
            enhanced.append(t_copy)
        return web.json_response({'tokens': enhanced})
    except Exception as e:
        return web.json_response({'error': str(e)}, status=500)

async def handle_buy(request):
    try:
        data = await request.json()
        token_id = int(data.get('token_id', 0))
        token_amount = int(data.get('token_amount', 0))
        if token_amount <= 0:
            return web.json_response({'error': 'Amount must be greater than zero'}, status=400)
            
        loop = asyncio.get_event_loop()
        def _buy():
            tx_hash = client.write_contract(
                CONTRACT_ADDRESS,
                'buy_tokens',
                args=[token_id, token_amount],
                leader_only=False
            )
            receipt = client.wait_for_transaction_receipt(tx_hash, retries=40, interval=3000)
            tx_hex = tx_hash.hex() if hasattr(tx_hash, 'hex') else str(tx_hash)
            return tx_hex, receipt
            
        tx_hex, receipt = await loop.run_in_executor(None, _buy)
        return web.json_response({
            'success': True,
            'transaction_hash': tx_hex,
            'explorer_url': f'https://explorer-studio.genlayer.com/tx/{tx_hex}'
        })
    except Exception as e:
        return web.json_response({'error': str(e)}, status=500)

async def handle_sell(request):
    try:
        data = await request.json()
        token_id = int(data.get('token_id', 0))
        token_amount = int(data.get('token_amount', 0))
        if token_amount <= 0:
            return web.json_response({'error': 'Amount must be greater than zero'}, status=400)
            
        loop = asyncio.get_event_loop()
        def _sell():
            tx_hash = client.write_contract(
                CONTRACT_ADDRESS,
                'sell_tokens',
                args=[token_id, token_amount],
                leader_only=False
            )
            receipt = client.wait_for_transaction_receipt(tx_hash, retries=40, interval=3000)
            tx_hex = tx_hash.hex() if hasattr(tx_hash, 'hex') else str(tx_hash)
            return tx_hex, receipt
            
        tx_hex, receipt = await loop.run_in_executor(None, _sell)
        return web.json_response({
            'success': True,
            'transaction_hash': tx_hex,
            'explorer_url': f'https://explorer-studio.genlayer.com/tx/{tx_hex}'
        })
    except Exception as e:
        return web.json_response({'error': str(e)}, status=500)

async def handle_launch(request):
    try:
        data = await request.json()
        tweet_url = str(data.get('tweet_url', '')).strip()
        tweet_text = str(data.get('tweet_text', '')).strip()
        author = str(data.get('author', '')).strip()
        
        if not tweet_text or not author:
            return web.json_response({'error': 'Tweet text and author required'}, status=400)
            
        loop = asyncio.get_event_loop()
        def _launch():
            tx_hash = client.write_contract(
                CONTRACT_ADDRESS,
                'scan_and_launch',
                args=[tweet_url, tweet_text, author],
                leader_only=False
            )
            receipt = client.wait_for_transaction_receipt(tx_hash, retries=60, interval=3000)
            tx_hex = tx_hash.hex() if hasattr(tx_hash, 'hex') else str(tx_hash)
            return tx_hex, receipt
            
        tx_hex, receipt = await loop.run_in_executor(None, _launch)
        return web.json_response({
            'success': True,
            'transaction_hash': tx_hex,
            'explorer_url': f'https://explorer-studio.genlayer.com/tx/{tx_hex}'
        })
    except Exception as e:
        return web.json_response({'error': str(e)}, status=500)

async def handle_faucet(request):
    try:
        loop = asyncio.get_event_loop()
        def _faucet():
            tx_hash = client.write_contract(
                CONTRACT_ADDRESS,
                'faucet',
                args=[],
                leader_only=False
            )
            receipt = client.wait_for_transaction_receipt(tx_hash, retries=30, interval=3000)
            tx_hex = tx_hash.hex() if hasattr(tx_hash, 'hex') else str(tx_hash)
            return tx_hex, receipt
            
        tx_hex, receipt = await loop.run_in_executor(None, _faucet)
        gen_bal = client.read_contract(CONTRACT_ADDRESS, 'get_gen_balance', [account.address])
        return web.json_response({
            'success': True,
            'transaction_hash': tx_hex,
            'new_balance': gen_bal,
            'explorer_url': f'https://explorer-studio.genlayer.com/tx/{tx_hex}'
        })
    except Exception as e:
        return web.json_response({'error': str(e)}, status=500)

async def handle_surge(request):
    try:
        data = await request.json()
        token_id = int(data.get('token_id', 0))
        follow_up_url = str(data.get('follow_up_url', '')).strip()
        follow_up_text = str(data.get('follow_up_text', '')).strip()
        
        loop = asyncio.get_event_loop()
        def _surge():
            tx_hash = client.write_contract(
                CONTRACT_ADDRESS,
                'detect_trend_surge',
                args=[token_id, follow_up_url, follow_up_text],
                leader_only=False
            )
            receipt = client.wait_for_transaction_receipt(tx_hash, retries=60, interval=3000)
            tx_hex = tx_hash.hex() if hasattr(tx_hash, 'hex') else str(tx_hash)
            return tx_hex, receipt
            
        tx_hex, receipt = await loop.run_in_executor(None, _surge)
        return web.json_response({
            'success': True,
            'transaction_hash': tx_hex,
            'explorer_url': f'https://explorer-studio.genlayer.com/tx/{tx_hex}'
        })
    except Exception as e:
        return web.json_response({'error': str(e)}, status=500)

app = web.Application()
app.router.add_get('/api/status', handle_status)
app.router.add_get('/api/tokens', handle_get_tokens)
app.router.add_post('/api/buy', handle_buy)
app.router.add_post('/api/sell', handle_sell)
app.router.add_post('/api/launch', handle_launch)
app.router.add_post('/api/faucet', handle_faucet)
app.router.add_post('/api/surge', handle_surge)

if __name__ == '__main__':
    print('Starting TrendPump Live On-Chain Bridge on port 4200...')
    web.run_app(app, host='127.0.0.1', port=4200)
