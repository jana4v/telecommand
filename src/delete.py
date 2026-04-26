import redis.asyncio as redis
import asyncio

async def main():
    r = redis.from_url("redis://localhost:6379?decode_responses=True")
    D = await r.hgetall("ENV_VARIABLES")
    print(D)
    await r.aclose()
asyncio.run(main())


import pandas as pd
def sample():
    
    print("hello")
    df = pd.DataFrame({"a": [1, 2, 3], "b": [4, 5, 6]})
    df.to_csv("test.csv", index=False)

sample()