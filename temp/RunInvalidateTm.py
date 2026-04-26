from src.InvalidateInjectedTm import invalidate_tm_obj
import asyncio
async def run():
    while True:
        await invalidate_tm_obj.invalidate_tm()
        await asyncio.sleep(2)

asyncio.run(run())