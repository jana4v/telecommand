
import json
from typing import Dict
from ...GenerateProcedure.plugins.ReadDatabase import ReadDatabase
from ...Models import TcDetailsTblRow, TcRequest, TestProcedure
import polars as pl
from redis.asyncio.client import Redis


class ProcedureBase(ReadDatabase):
    def __init__(self):
        ReadDatabase.__init__(self)
        self.line_number = 1
        self.r:Redis = None
        self.number_of_spaces_before_command = 20
        self.line_number_length = 3
        self.redis_ttl = 3600*2

    def get_spaces(self,ccl_command=None):
        if ccl_command:
            #print(ccl_command,(self.number_of_spaces_before_command-len(ccl_command)-self.line_number_length-1))
            return " "*(self.number_of_spaces_before_command-len(ccl_command)-self.line_number_length-1)
        else:
            return " "*self.number_of_spaces_before_command
        
    def offset_line_number(self,offset):
        self.line_number += offset

    def get_line_number(self):
        line_number = str(self.line_number).zfill(3)
        self.line_number += 1 
        return line_number

    async def get_procedure(self, tc_data: TcDetailsTblRow, tc_request: TcRequest, is_start: bool,r) -> TestProcedure:
        raise NotImplementedError("Subclasses must implement this method")

    async def inject_tm(self, tm: str,value: str,tc_request: TcRequest=None) -> None:
        if tm is not None and value is not None:
            tms = [_tm.lower() for _tm in tm.split(",")]
            values = [_val.lower() for _val in value.split(",")]
            if len(tms) != len(values):
                raise Exception(f"Invalid no of expected tms and values not matching:{tms},{values}")
            tm = tm.lower()
            value = value.lower()
            self.r.hset("INJECTED_TM_FOR_SIMULATOR_MAP", tm, value)
            if tm in self.inject_tm_list and tc_request is not None:
                self.r.hset(tc_request.file_name, tm, value)
                self.r.expire(tc_request.file_name, self.redis_ttl)
        self.r.expire("INJECTED_TM_FOR_SIMULATOR_MAP", 10)
            
    async def _generate_expected_ccl(self, tc_row: TcDetailsTblRow,is_start=True,tc_request:TcRequest=None) -> str:
        expected = ""
        for i in range(1, tc_row.NO_OF_TM_STATES + 1):
            tm_label = f"TM{i}"
            tm_state_label = f"TM{i}_STATE"
            tm = getattr(tc_row,tm_label)
            tm_state = getattr(tc_row, tm_state_label)
            if tm is not None and tm_state is not None:
                await self.inject_tm(tm,tm_state,tc_request)
                if self.inject_tm_df.filter(pl.col("TM_MNEMONIC") == tm).is_empty():
                    if is_start:
                        expected += f"""{self.get_line_number()} EXPECTED TM{self.get_spaces("EXPECTED TM")}{self.get_orignal_tm_mnemonic(tm)} = {tm_state};\n"""
                        is_start = False
                    else:
                        expected += f"{self.get_spaces()}{self.get_orignal_tm_mnemonic(tm)} = {tm_state};\n"
            else:
                return expected
        return expected

    async def inject_tc(self, tc: str, value: str,tc_request: TcRequest=None):
        data = { "cmd":tc.lower(),"code":value.lower(),"full_code": value.lower(),"data_part": value.lower(),"status":"sucees"}
        self.r.hset("INJECTED_TC_FOR_SIMULATOR_MAP", tc, json.dumps(data))

    
    def clean_dataframe_no_lower_case(self,df):
        schema = df.schema
        # Strip and convert to lowercase all string columns
        df = df.with_columns(
            [
                pl.col(column).str.strip_chars().str.replace("oX","")
                if dtype == pl.Utf8 else pl.col(column)
                for column, dtype in schema.items()
            ]
        )
        # Identify columns where all values are None
        columns_to_drop = [col for col in df.columns if df[col].is_null().all()]
        df = df.drop(columns_to_drop)
        return df
    
    def clean_dataframe(self,df):
        schema = df.schema
        # Strip and convert to lowercase all string columns
        df = df.with_columns(
            [
                pl.col(column).str.strip_chars().str.replace("oX","").str.to_lowercase()
                if dtype == pl.Utf8 else pl.col(column)
                for column, dtype in schema.items()
            ]
        )
        # Identify columns where all values are None
        columns_to_drop = [col for col in df.columns if df[col].is_null().all()]
        df = df.drop(columns_to_drop)
        return df
    
    def is_tm_state_matched(self, live_tm: Dict[str,str], tm_mnemonic:str, tm_value:str):
        if tm_mnemonic is not None and tm_value is not None:
            return live_tm.get(tm_mnemonic.lower(),"") == tm_value.lower()
        else:
            return True

    def get_orignal_tm_mnemonic(self, tm_mnemonic):
        tm_mnemonic = tm_mnemonic.lower()
        df = self.tm_tbl_original_df.filter(pl.col("TM_MNEMONIC_LC")==tm_mnemonic)
        if df.height > 0:
           return df.select("TM_MNEMONIC").head(1).item()
        else:
            raise ValueError(f"TM_MNEMONIC:{tm_mnemonic} Not found in TM_TBL")
        
    def get_orignal_tc_mnemonic(self, tc_mnemonic):
        df = self.tc_tbl_original_df.filter(pl.col("TC_LC")== tc_mnemonic)
        if df.height > 0:
           return df.select("TC").head(1).item()
        else:
            raise ValueError(f"TC:{tc_mnemonic} Not found in teleCommandDetails")
        
    def get_orignal_data_command_tc_mnemonic(self, tc_mnemonic):
        df = self.data_commands_original_df.filter(pl.col("TC_LC")== tc_mnemonic.lower())
        if df.height > 0:
           return df.select("TC").head(1).item().strip()
        else:
            raise ValueError(f"TC:{tc_mnemonic} Not found in DataCommands")
        
    def inject_tm_during_generation_process(self,tm,value):
        self.r.hset("inject_tm_during_generation_process",tm.lower(),value)

    def get_inject_tm_during_generation_process(self):
        self.r.hgetall("inject_tm_during_generation_process")