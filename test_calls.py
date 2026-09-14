import os
from pathlib import Path
from eth_account import Account
import genlayer_py as gl

PRIVATE_KEY = "0x1344e32ee1073b2434ed058bebb0871d3109d362630e35fc0d463c68464b6138"
CONTRACT_ADDRESS = "0xc0Bbd2d0a2C81CAa5D4cAC56ae378c809f3dF693"

account = Account.from_key(PRIVATE_KEY)
client = gl.create_client(gl.studionet, account=account)

print("1. Testing get_token_count...")
try:
    c = client.read_contract(CONTRACT_ADDRESS, "get_token_count", [])
    print("Success get_token_count:", c)
except Exception as e:
    print("Fail get_token_count:", e)

print("2. Testing get_tokens...")
try:
    tokens = client.read_contract(CONTRACT_ADDRESS, "get_tokens", [])
    print("Success get_tokens count:", len(tokens))
except Exception as e:
    print("Fail get_tokens:", e)

print("3. Testing get_gen_balance...")
try:
    g = client.read_contract(CONTRACT_ADDRESS, "get_gen_balance", [account.address])
    print("Success get_gen_balance with str:", g)
except Exception as e:
    print("Fail get_gen_balance with str:", e)

print("4. Testing get_balance for token 0...")
try:
    b = client.read_contract(CONTRACT_ADDRESS, "get_balance", [0, account.address])
    print("Success get_balance with [0, str]:", b)
except Exception as e:
    print("Fail get_balance with [0, str]:", e)

