import pyodbc
import polars as pl
import redis.asyncio as redis
#import redis
import asyncio
import copy

class InvalidateTm:
    def __init__(self):
        self.r = redis.from_url("redis://localhost:6379?decode_responses=True")
        cnxn = pyodbc.connect("DSN=TM_TC;")
        self.injected_tm = self.clean_df(pl.read_database("SELECT * FROM INVALIDATE_INJECTED_TM",cnxn))
        cnxn.close()

    def clean_df(self,df:pl.DataFrame)-> pl.DataFrame:
        # Strip and convert to lowercase all string columns
        schema = df.schema
        df = df.with_columns(
            [
                pl.col(column).str.strip_chars().str.to_lowercase()
                if dtype == pl.Utf8 else pl.col(column)
                for column, dtype in schema.items()
            ]
        )
        # Identify columns where all values are None
        columns_to_drop = [col for col in df.columns if df[col].is_null().all()]
        df = df.drop(columns_to_drop)
        return df

    async def invalidate_tm(self):
        try:
            df = self.injected_tm.filter(pl.col("ONLY_FOR_GENERATION") == 0)
            hold_invalidate = await self.r.hget("SOFTWARE_CFG", "HOLD_INVALIDATE_TM")
            if hold_invalidate is None:
                await self.r.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "false")
            else:
                if hold_invalidate.lower() == "true":
                    return
            tm = await self.r.hgetall("TM_MAP")
            all = df.filter(pl.col("MNEMONIC") == "all")
            clear_all = False
            if all.height > 0:
                row_data = all.row(0,named=True)
                condition = row_data["CONDITION"]
                try:
                    clear_all= eval(condition)
                except Exception as e:
                    clear_all = False
                    

            for row in df.iter_rows(named=True):
                mnemonic = row["MNEMONIC"].strip().lower()
                condition = row["CONDITION"].strip().lower()
                reset_val = row["RESET_VAL"].strip().lower()
                try:
                    if clear_all:
                       await self.r.hset("DTM_MAP", mnemonic, reset_val) 
                    if eval(condition): 
                        #print(mnemonic,condition)
                        x = await self.r.hget("DTM_MAP", mnemonic)
                        if x == reset_val:
                            continue
                        #print(mnemonic)
                        await self.r.hset("DTM_MAP", mnemonic, reset_val)
                except KeyError as e:
                    pass
        except Exception as e:
            pass
            #print("invalidate_tm Error:"+str(e))

    def invalidate_local_tm(self,tm_data):
        try:
            tm = copy.deepcopy(tm_data)
            for row in self.injected_tm.iter_rows(named=True):
                mnemonic =  row["MNEMONIC"].strip().lower()
                condition = row["CONDITION"].strip().lower()
                reset_val = row["RESET_VAL"].strip().lower()
                try:
                    if eval(condition):
                        tm_data[mnemonic] = reset_val
                except KeyError as e:
                    pass
            return tm_data
        except Exception as e:
            print("invalidate_local_tm Error:"+str(e))

invalidate_tm_obj = InvalidateTm()

            