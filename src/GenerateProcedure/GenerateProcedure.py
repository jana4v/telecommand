from typing import Dict, List
import polars as pl
from ..Models import TcRequest, TestProcedure, TcDetailsTblRow,TestProcedure
from ..GenerateProcedure.plugins.Factory import ProceduresAPi
from ..Utility import Utility

class GenerateProcedure(Utility):
    def __init__(self,tc_details_df: pl.DataFrame,r ):
        self.tc_details_df = tc_details_df
        self.r = r
        self.line_number = 1
        self.number_of_tm_states = len([col for col in self.tc_details_df.columns if '_STATE' in col])
        self.tc_req:TcRequest = None

    def get_line_number(self):
        line_number = str(self.line_number).zfill(3)
        self.line_number += 1 
        return line_number
    
    def generate_wait_command(self,tc_row: TcDetailsTblRow):
        return f"{self.get_line_number()} wait {tc_row.POST_CONDITION_VALUE}\n"
        
    
    async def _generate_procedure(self, df: pl.DataFrame, tc_request: TcRequest) -> str:
        procedure = ""
        for start in range(0, df.height, tc_request.number_of_commands_in_each_send):
            chunk = df.slice(start, tc_request.number_of_commands_in_each_send)
            last_cmd_format = None
            expected_part = ""
            send_part = ""
            wait_post_condition = None
            for row in chunk.iter_rows(named=True):
                tc_row = TcDetailsTblRow(**row)
                is_start = False
                if tc_row.POST_CONDITION_TYPE == "wait_seconds":
                    wait_post_condition = tc_row
                if (last_cmd_format != tc_row.CMD_FORMAT) or tc_row.EXCLUDE_IN_EXPECTED or (len(expected_part) == 0 and len(send_part) == 0):
                    is_start = True
                    if len(expected_part) > 0:
                        procedure += expected_part[:-2]+ "\n"
                        expected_part = ""
                    if len(send_part) > 0:
                        procedure += send_part[:-2]+ "\n"
                        send_part = ""
                last_cmd_format = tc_row.CMD_FORMAT
                tc_request.line_number = self.line_number
                _procedure = await ProceduresAPi.get_procedure(tc_row, tc_request, is_start,self.r) 
                expected_part += _procedure.expected_part
                send_part += _procedure.send_part
                self.line_number = _procedure.line_number
        
            if len(expected_part) > 0:
                procedure += expected_part[:-2]+ "\n"
            if len(send_part) > 0:
                if send_part[-2:].find(";") != -1:
                    procedure += send_part[:-2]+ "\n"
                else:
                    procedure += send_part
                if wait_post_condition:
                    procedure += self.generate_wait_command(wait_post_condition)

        return procedure
        
    def end_of_procedure(self):
        p=""
        #p += f"{self.get_line_number()} single_step\ n"
        p += f"{self.get_line_number()} end\n"
        return p
    
    async def generate_procedure(self, tc_request: TcRequest) -> str:
        self.tc_req = tc_request
        self.update_status(f"",progress=2,summary="Generating Procedure...")
        self.r.delete("INJECTED_TM_FOR_SIMULATOR")
        self.r.delete("INJECTED_TC_FOR_SIMULATOR")
        self.line_number = tc_request.line_number
        procedure = ""
        commands = tc_request.commands
        #tc_request.
        tc_df = self.tc_details_df.filter(pl.col("TC").is_in(commands))
        if not tc_request.manual_commanding_mode:
            groups = tc_df.filter(pl.col("CMD_TYPE") == "initial_cmd").sort("PRIORITY",descending=False).group_by("PRIORITY")
            for gname,gdata in groups:
                procedure += await self._generate_procedure(gdata,tc_request)
            groups = tc_df.filter(pl.col("CMD_TYPE") == "off_cmd").sort("PRIORITY",descending=False).group_by("PRIORITY")
            for gname,gdata in groups:
                procedure += await self._generate_procedure(gdata,tc_request)
            switch_commands = tc_df.filter(pl.col("CMD_TYPE") == "switch_cmd").sort("PRIORITY",descending=False)
            procedure +=await self._generate_procedure(switch_commands,tc_request)
            groups = tc_df.filter(~pl.col("CMD_TYPE").is_in(["off_cmd","switch_cmd","initial_cmd"])).sort("PRIORITY",descending=True).group_by("PRIORITY")
            for gname,gdata in groups:
                procedure += await self._generate_procedure(gdata,tc_request)
            
            # groups = tc_df.filter(~pl.col("CMD_TYPE").is_in(["off_cmd","switch_cmd","on_cmd"])).sort("PRIORITY",descending=True).group_by("PRIORITY")
            # for gname,gdata in groups:
            #     procedure += await self._generate_procedure(gdata,tc_request)
        else:
            custom_order_map= {tc:idx for idx,tc in enumerate(commands)}
            cs = pl.Series("custom_order",[custom_order_map[tc] for tc in tc_df["TC"]])
            tc_df = tc_df.with_columns(cs)
            tc_df = tc_df.sort("custom_order")
            procedure += await self._generate_procedure(tc_df,tc_request)
        if len(procedure) > 0:
            self.update_status(f"Procedure Generation Completed",progress=2,summary="Procedure Generation Completed successfully")
        return procedure
    
    async def generate_boa_procedure(self,tc_request: TcRequest) -> str:
        if len(tc_request.commands) == 0:
            return ""
        row = TcDetailsTblRow(CMD_FORMAT="boa")
        tp = await ProceduresAPi.get_procedure(row, tc_request, True,self.r) 
        self.line_number = tp.line_number
        return tp.send_part
    
    async def generate_boa_cal_procedure(self,tc_request: TcRequest) -> str:
        tp = await ProceduresAPi.get_procedure(TcDetailsTblRow(CMD_FORMAT="boaCalFile"), tc_request, True,self.r) 
        return tp.send_part