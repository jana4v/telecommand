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


db_path = os.getcwd() + os.sep + 'Database'+ os.sep + 'Telecommand'
excel_path = db_path+os.sep+"db.xlsx"

class IncludeFile(ProcedureBase):
    def __init__(self):
        ProcedureBase.__init__(self)

    async def generate_procedure_file(self,tc_row: TcDetailsTblRow, tc_request: TcRequest):
        self.file_content_df = self.clean_dataframe_no_lower_case(pl.read_excel(excel_path,sheet_name="PROCEDURES"))
        p =""
        command = tc_row.TC
        if command.lower() in self.file_content_df.columns:
            rows =self.file_content_df[command.lower()].to_list()
            for _row in rows:
                p += f"{self.get_line_number()} {_row}\n"
        if len(p) > 0:
            p += "\n"
            await self._generate_expected_ccl(tc_row,tc_request=tc_request)
        return p
    
    
    async def get_procedure(self, row: TcDetailsTblRow, tc_request: TcRequest, is_start: bool,r) -> TestProcedure:
        self.r = r  # For simulating TM state injection
        self.line_number = tc_request.line_number
        procedure = TestProcedure()
        procedure.expected_part = ""
        procedure.send_part = await self.generate_procedure_file(row,tc_request)
        procedure.line_number = self.line_number
        return procedure



plugins_factory.register_component("include_file", IncludeFile)