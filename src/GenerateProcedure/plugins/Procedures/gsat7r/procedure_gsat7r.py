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
        
    async def get_procedure_string(self, row: TcDetailsTblRow,tc_request: TcRequest) -> str:
        procedure = ""
        command = row.TC
        #print(row,tc_request)
        self.live_tm_data = tc_request.live_tm_data if tc_request.live_tm_data else {}
        self.line_number,procedure = await self.handle_request(self.line_number,tc_request.config_numbers, command,tc_request) # type: ignore
        return procedure
    
    async def generate_expected_command_file_format21(self,expected_tms:List[str],is_start = True)->str:
        try:
            #return ""
            expected = ""
            for tms in expected_tms:
                if tms is None:
                    continue
                for tm_val in tms.split(","):
                    if tm_val.find("=") != -1:
                        tv = tm_val.split("=")
                        if len(tv) == 2:
                            tm = tv[0].strip()
                            tm_state = tv[1].strip()
                    elif tm_val.find(">") != -1:
                        tv = tm_val.split(">") 
                        if len(tv) == 2:
                            tm = tv[0].strip()
                            v = float(tv[1].strip())
                            tm_state = v + v* 0.1  # Assuming a 10% margin for greater than condition
                    elif tm_val.find("<") != -1:
                        tv = tm_val.split("<") 
                        if len(tv) == 2:
                            tm = tv[0].strip()
                            v = float(tv[1].strip())
                            tm_state = v - v* 0.1 

                    await self.inject_tm(tm,str(tm_state),self.tc_request)
                    if self.inject_tm_df.filter(pl.col("TM_MNEMONIC") == tm).is_empty():
                        if is_start:
                            expected += f"""{self.get_line_number()} EXPECTED TM{self.get_spaces("EXPECTED TM")}{tm_val};\n"""
                            is_start = False
                        else:
                            expected += f"{self.get_spaces()}{tm_val};\n"
            return expected[:-2]+"\n" if len(expected) > 3 else expected
        except Exception as e:
            logger.error(f"Error in generating expected command file format: {e}")
            return ""
    
    async def get_sub_class_procedure(self,tc_data: TcDetailsTblRow, tc_request: TcRequest, is_start: bool,r) -> TestProcedure:
        self.r = r  # For simulating TM state injection
        self.tc_request = tc_request
        self.line_number = tc_request.line_number
        procedure = TestProcedure()
        procedure.expected_part = ""
        procedure.send_part = await self.get_procedure_string(tc_data,tc_request)
        procedure.line_number = self.line_number
        return procedure
    
   

plugins_factory.register_component("gsat7r", Gsat7R)