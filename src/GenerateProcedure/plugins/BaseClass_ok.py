
import json
from typing import Dict, List
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

    async def get_sub_class_procedure(self, tc_data: TcDetailsTblRow, tc_request: TcRequest, is_start: bool,r) -> TestProcedure:
        raise NotImplementedError("Subclasses must implement this method")

    async def get_procedure(self, row: TcDetailsTblRow, tc_request: TcRequest, is_start: bool,r) -> TestProcedure:
        procedure: TestProcedure = await self.get_sub_class_procedure(row, tc_request, is_start, r)
        if row.EXCLUDE_IN_PROCEDURE:
            procedure.expected_part = ""
            procedure.send_part = ""
            self.line_number = tc_request.line_number
            procedure.line_number = self.line_number
        if row.EXCLUDE_IN_EXPECTED:
            procedure.expected_part = ""
        return procedure
 
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
    
    async def generate_expected_command_file_format(self,expected_tm_df:pl.DataFrame)->str:
        try:
            data = expected_tm_df.row(0,named=True)
            expected = ""
            #return ""
            is_start = True
            for i in range(1, 20):
                tm_label = f"TM{i}"
                tm_state_label = f"TM{i}_STATE"
                tm = data.get(tm_label,None)
                tm_state = data.get(tm_state_label,None)
                if tm is not None and tm_state is not None and tm != "" and tm_state != "":
                    await self.inject_tm(tm,tm_state,self.tc_request)
                    if self.inject_tm_df.filter(pl.col("TM_MNEMONIC") == tm).is_empty():
                        if is_start:
                            expected += f"""{self.get_line_number()} EXPECTED TM{self.get_spaces("EXPECTED TM")}{self.get_orignal_tm_mnemonic(tm)} = {tm_state};\n"""
                            is_start = False
                        else:
                            expected += f"{self.get_spaces()}{self.get_orignal_tm_mnemonic(tm)} = {tm_state};\n"
                else:
                    return expected[:-2]+"\n" if len(expected) > 3 else expected
                
            return expected[:-2]+"\n" if len(expected) > 3 else expected
        except Exception as e:
            print(f"Error in generating expected command file format: {e}")
            return ""
    
    async def generate_expected_command_file_format2(self,expected_tms:List[str],command = "EXPECTED TM")->str:
        #return ""
        try:
            is_start = True
            expected = ""
            for tms in expected_tms:
                if tms is None:
                    continue
                for tm in tms.split(","):
                    tv = tm.split("=")
                    if len(tv) != 2:
                        continue
                    tm = tv[0].strip()
                    tm_state = tv[1].strip()
                    await self.inject_tm(tm,tm_state,self.tc_request)
                    if self.inject_tm_df.filter(pl.col("TM_MNEMONIC") == tm).is_empty():
                        if is_start:
                            expected += f"""{self.get_line_number()} {command}{self.get_spaces(command)}{self.get_orignal_tm_mnemonic(tm)} = {tm_state};\n"""
                            is_start = False
                        else:
                            expected += f"{self.get_spaces()}{self.get_orignal_tm_mnemonic(tm)} = {tm_state};\n"
            return expected[:-2]+"\n" if len(expected) > 3 else expected
        except Exception as e:
            print(f"Error in generating expected command file format: {e}")
            return ""
        
    async def generate_send_file_format(self,commands:List[str],command_type:str="send")-> str:
        procedure = ""
        is_start = True
        for command in commands:
            if command is not None and command != "":
                if is_start:
                    procedure += f"""{self.get_line_number()} {command_type}{self.get_spaces(command_type)}{command};\n"""
                    is_start = False
                else:
                    procedure += f"""{self.get_spaces()}{command};\n"""
        return procedure[:-2]+"\n" if procedure else procedure

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