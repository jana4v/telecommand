import os
from typing import List
import polars as pl
from .....Models import TcDetailsTblRow, TcRequest, TestProcedure
from .....GenerateProcedure.plugins.Factory import plugins_factory
from .....GenerateProcedure.plugins.BaseClass import ProcedureBase
from .....GenerateProcedure.plugins.Procedures.gsat7r.CmdGenerationDP import DigitalProcessor
folder_path, file_name = os.path.split(os.path.realpath(__file__))
from .....Logging.Logger import logger

# parameter_name = file_name.split("procedure_")
# if len(parameter_name) > 1:
#     parameter_name = parameter_name.split("_")[1][:-3]

#excel_path = os.path.dirname(os.path.realpath(__file__))+os.sep+"nvs.xlsx"
file_dir = os.getcwd()
db_path = file_dir + os.sep + 'Database'+ os.sep + 'Telecommand'
excel_path = db_path+os.sep+"db.xlsx"


class Gsat7R(ProcedureBase,DigitalProcessor):
    def __init__(self):
        ProcedureBase.__init__(self)
        DigitalProcessor.__init__(self)
        self.tc_request:TcRequest = TcRequest()
       
    async def generate_expected_command_file_format(self,line_number:str,expected_tm_df:pl.DataFrame)->str:
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
                        expected += f"""{line_number} EXPECTED TM{self.get_spaces("EXPECTED TM")}{self.get_orignal_tm_mnemonic(tm)} = {tm_state};\n"""
                        is_start = False
                    else:
                        expected += f"{self.get_spaces()}{self.get_orignal_tm_mnemonic(tm)} = {tm_state};\n"
            else:
                return expected
        return expected
   
    async def generate_expected_command_file_format2(self,expected_tms:List[str])->str:
        #return ""
        is_start = True
        expected = ""
        for tms in expected_tms:
            for tm in tms.split(","):
                tv = tm.split("=")
                if len(tv) != 2:
                    continue
                tm = tv[0].strip()
                tm_state = tv[1].strip()
                await self.inject_tm(tm,tm_state,self.tc_request)
                if self.inject_tm_df.filter(pl.col("TM_MNEMONIC") == tm).is_empty():
                    if is_start:
                        expected += f"""{self.get_line_number()} EXPECTED TM{self.get_spaces("EXPECTED TM")}{self.get_orignal_tm_mnemonic(tm)} = {tm_state},\n"""
                        is_start = False
                    else:
                        expected += f"{self.get_spaces()}{self.get_orignal_tm_mnemonic(tm)} = {tm_state},\n"
        return expected[:-2]+"\n" if expected else expected
    
    async def generate_send_file_format(self,commands:List[str],command_type:str="send")-> str:
        procedure = ""
        is_start = True
        for command in commands:
            if command is not None and command != "":
                if is_start:
                    procedure += f"""{self.get_line_number()} {command_type}{self.get_spaces(command_type)} {command},\n"""
                    is_start = False
                else:
                    procedure += f"""{self.get_spaces()}{command},\n"""
        return procedure[:-2]+"\n" if procedure else procedure
        
    async def get_procedure_string(self, row: TcDetailsTblRow,tc_request: TcRequest) -> str:
        procedure = ""
        command = row.TC
        #print(row,tc_request)
        self.live_tm_data = tc_request.live_tm_data if tc_request.live_tm_data else {}
        self.line_number,procedure = await self.handle_request(self.line_number,tc_request.config_numbers, command) # type: ignore
        return procedure
    
    async def get_procedure(self,tc_data: TcDetailsTblRow, tc_request: TcRequest, is_start: bool,r) -> TestProcedure:
        self.r = r  # For simulating TM state injection
        self.tc_request = tc_request
        self.line_number = tc_request.line_number
        procedure = TestProcedure()
        procedure.expected_part = ""
        procedure.send_part = await self.get_procedure_string(tc_data,tc_request)
        procedure.line_number = self.line_number
        return procedure
    
   

plugins_factory.register_component("gsat7r", Gsat7R)