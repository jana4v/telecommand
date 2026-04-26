import os
import polars as pl
import logging
from ....Models import TcDetailsTblRow, TcRequest, TestProcedure
from ....GenerateProcedure.plugins.Factory import plugins_factory
from ....GenerateProcedure.plugins.BaseClass import ProcedureBase
folder_path, file_name = os.path.split(os.path.realpath(__file__))
from ....Logging.Logger import logger
# parameter_name = file_name.split("procedure_")
# if len(parameter_name) > 1:
#     parameter_name = parameter_name.split("_")[1][:-3]



class CallP(ProcedureBase):
    def __init__(self):
        ProcedureBase.__init__(self)

    async def _generate_expecdted_ccl(self, tc_row: TcDetailsTblRow,is_start=True,tc_request:TcRequest=None) -> str:
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
    
    async def _generate_ccl(self,ccl_cmd: str, tc_row: TcDetailsTblRow,is_start=True) -> str:
        procedure = ""
        tc = getattr(tc_row, "TC")
        procedure += f"""{self.get_line_number()} {ccl_cmd}{self.get_spaces(ccl_cmd)}{self.get_orignal_tc_mnemonic(tc)};\n"""
        return procedure
        
    async def get_sub_class_procedure(self, row: TcDetailsTblRow, tc_request: TcRequest, is_start: bool,r) -> TestProcedure:
        self.r = r  # For simulating TM state injection
        self.line_number = tc_request.line_number
        procedure = TestProcedure()
        procedure.expected_part = await self._generate_expecdted_ccl(row, is_start,tc_request)
        procedure.send_part = await self._generate_ccl("call", row, is_start)
        procedure.line_number = self.line_number
        return procedure



plugins_factory.register_component("call", CallP)