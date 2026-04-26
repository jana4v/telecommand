import os
import logging
from ....Models import TcDetailsTblRow, TcRequest, TestProcedure
from ....GenerateProcedure.plugins.Factory import plugins_factory
from ....GenerateProcedure.plugins.BaseClass import ProcedureBase
folder_path, file_name = os.path.split(os.path.realpath(__file__))
from ....Logging.Logger import logger

# parameter_name = file_name.split("procedure_")
# if len(parameter_name) > 1:
#     parameter_name = parameter_name.split("_")[1][:-3]



class Boa(ProcedureBase):
    def __init__(self):
        ProcedureBase.__init__(self)

    async def generate_boa_commands(self,tc_request: TcRequest)-> str:
        procedure = ""
        chunk_size = tc_request.number_of_commands_in_each_send
        cmd_chunks = [tc_request.commands[i:i+chunk_size] for i in range(0,len(tc_request.commands),chunk_size)]
        for chunk in cmd_chunks:
            i = 0
            p=""
            for cmd in chunk: # cmd="l5-dvr-r-attn 000f:0 db"
                cmd = cmd.split(":")
                display_value = cmd[1]
                cmd_code = cmd[0].strip().split(" ")
                cmd = cmd_code[0].strip()
                code = cmd_code[1].strip()
                await self.inject_tm(cmd,display_value,tc_request)
                if i==0:
                    p += f"""{self.get_line_number()} send{self.get_spaces("send")}{self.get_orignal_data_command_tc_mnemonic(cmd)} {code};\n"""
                    i+=1
                else:
                    p += f"""{self.get_spaces()}{self.get_orignal_data_command_tc_mnemonic(cmd)} {code};\n"""
            if len(p)>1:
                procedure += p[:-2]+"\n"
        return procedure
        
    async def get_procedure(self, row: TcDetailsTblRow, tc_request: TcRequest, is_start: bool,r) -> TestProcedure:
        self.r = r  # For simulating TM state injection
        self.line_number = tc_request.line_number
        procedure = TestProcedure()
        procedure.expected_part = ""
        procedure.send_part = await self.generate_boa_commands(tc_request)
        procedure.line_number = self.line_number
        return procedure



plugins_factory.register_component("boa", Boa)