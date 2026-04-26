import os
import logging
from ....Models import TcDetailsTblRow, TcRequest, TestProcedure,DataCommandRow
from ....GenerateProcedure.plugins.Factory import plugins_factory
from ....GenerateProcedure.plugins.BaseClass import ProcedureBase
folder_path, file_name = os.path.split(os.path.realpath(__file__))
from ....Logging.Logger import logger
import polars as pl
import numpy as np
# parameter_name = file_name.split("procedure_")
# if len(parameter_name) > 1:
#     parameter_name = parameter_name.split("_")[1][:-3]



class BoaCalFile(ProcedureBase):
    def __init__(self):
        ProcedureBase.__init__(self)

    def get_boa_range(self,cfg:int):
        return 

    def get_boa_commands(self,cfg_no:int):
        cfg_boa_row = self.cfg_based_boa_df.filter(pl.col("CFG_NO") == cfg_no).select(pl.col(["CMD","BOA_CAL_START","BOA_CAL_STOP","BOA_CAL_STEP_SIZE"])).row(0,named=True)
        values = list(np.arange(cfg_boa_row["BOA_CAL_START"],cfg_boa_row["BOA_CAL_STOP"]+cfg_boa_row["BOA_CAL_STEP_SIZE"],cfg_boa_row["BOA_CAL_STEP_SIZE"]))
        commands_df = self.data_commands_df.filter(pl.col("TC") == cfg_boa_row["CMD"],pl.col("VALUE").is_in(values)).sort("VALUE")
        return commands_df
    
    async def generate_boa_file(self,tc_request: TcRequest)-> str:
        cfg_number = tc_request.config_numbers[0]
        commands_df = self.get_boa_commands(cfg_number)
        procedure = ""
        i = 0
        p=""
        for row in commands_df.iter_rows(named=True):
            row = DataCommandRow(**row)
            await self.inject_tm(row.TC,row.DISPLAY_VALUE)
            if i==0:
                p += f"""{self.get_line_number()} send{self.get_spaces("send")}{row.TC} {row.DATA_CODE};\n"""
                p += f"""{self.get_spaces()}{row.TC} {row.DATA_CODE};\n"""
                i+=1
            else:
                p += f"""{self.get_spaces()}{row.TC} {row.DATA_CODE};\n"""
        if len(p)>1:
            procedure += p[:-2]+"\n"
        return procedure
        
    async def get_sub_class_procedure(self, row: TcDetailsTblRow, tc_request: TcRequest, is_start: bool,r) -> TestProcedure:
        self.r = r  # For simulating TM state injection
        self.line_number = tc_request.line_number
        procedure = TestProcedure()
        procedure.expected_part = ""
        procedure.send_part = await self.generate_boa_file(tc_request)
        procedure.line_number = self.line_number
        return procedure



plugins_factory.register_component("boaCalFile", BoaCalFile)