import os
import polars as pl
from .....Models import TcDetailsTblRow, TcRequest, TestProcedure
from .....GenerateProcedure.plugins.Factory import plugins_factory
from .....GenerateProcedure.plugins.BaseClass import ProcedureBase
from .boa import BoaProcedure
folder_path, file_name = os.path.split(os.path.realpath(__file__))
from .....Logging.Logger import logger

# parameter_name = file_name.split("procedure_")
# if len(parameter_name) > 1:
#     parameter_name = parameter_name.split("_")[1][:-3]

#excel_path = os.path.dirname(os.path.realpath(__file__))+os.sep+"nvs.xlsx"
file_dir = os.getcwd()
db_path = file_dir + os.sep + 'Database'+ os.sep + 'Telecommand'
excel_path = db_path+os.sep+"db.xlsx"


class Nvs(ProcedureBase,BoaProcedure):
    def __init__(self):
        BoaProcedure.__init__(self)
        ProcedureBase.__init__(self)
        self.modulator = self.clean_dataframe_no_lower_case(pl.read_excel(excel_path,sheet_name="MODULATOR"))
        self.acmu = self.clean_dataframe_no_lower_case(pl.read_excel(excel_path,sheet_name="ACMU"))
        self.nsgu = self.clean_dataframe_no_lower_case(pl.read_excel(excel_path,sheet_name="NSGU"))
        
        # self.modulator_org = self.clean_dataframe_no_lower_case(pl.read_excel(excel_path,sheet_name="MODULATOR"))
        # self.acmu_org = self.clean_dataframe_no_lower_case(pl.read_excel(excel_path,sheet_name="ACMU"))
        # self.nsgu_org = self.clean_dataframe_no_lower_case(pl.read_excel(excel_path,sheet_name="NSGU"))

        self.dfs = [self.modulator,self.acmu,self.nsgu]
        self.sub_address = [1,2,3,4,5]
        self.sub_system = ["MODULATOR","ACMU","NSGU"]
        self.other_commands = self.clean_dataframe_no_lower_case(pl.read_excel(excel_path,sheet_name="OTHER_CMDS"))
        self.boa = self.clean_dataframe_no_lower_case(pl.read_excel(excel_path,sheet_name="BOA"))
        # self.other_commands_org = self.clean_dataframe_no_lower_case(pl.read_excel(excel_path,sheet_name="OTHER_CMDS"))
        
    def generate_sendtcp_command(self,command_data)->str:
        #Input
        #['sendtcp', '1553trantmtcbus', '00a4', '00', '00', '00', '00']
        #Output
        # 001 sendtcp 1553trantmtcbus 00a4;
        #                 Data_Byte 00;
        #                 Data_Byte 00;
        #                 Data_Byte 00;
        #                 Data_Byte 00
        procedure = ""
        if len(command_data) > 3:
            command_data = [str(x).replace("0x","") for x in command_data]
            cmd = self.get_line_number()+" "+" ".join(command_data[0:3])
            procedure += cmd+";\n"
            procedure += "\n".join([f"{' '*(len(cmd)-12)}Data_Byte {code};" for code in command_data[3:]])[:-1]+"\n"
        else:
            cmd = self.get_line_number()+" "+" ".join(command_data[0:])
            procedure += cmd+";\n"
        return procedure
    
    async def generate_expected_ccl(self, command_df: pl.DataFrame,tc_request:TcRequest=None)->str:
        procedure =""
        if "EXP_TM" in command_df.columns and "EXP_TM_VAL" in command_df.columns:
            if command_df["EXP_TM"][0] is not None and command_df["EXP_TM_VAL"][0] is not None:
                expected_tms = command_df["EXP_TM"][0].split(",")
                expected_values =[str(x).replace("0x","") for x in command_df["EXP_TM_VAL"][0].split(",")]
                if len(expected_tms) != len(expected_values):
                    raise Exception(f"Expected TM number of mnemonics and values mismatch in nvs.xlsx for mnemonics:{expected_tms}")
                procedure =""
                for i,tm in enumerate(expected_tms):
                    await self.inject_tm(tm, expected_values[i],tc_request)
                    if i==0:
                        procedure += f"{self.get_line_number()} EXPECTED TM {tm}={expected_values[i]};\n"
                    else:
                        procedure += f"{' '*16}{tm}={expected_values[i]};\n"
                if len(procedure) > 0:
                    procedure = procedure[:-2]+"\n"
        return procedure

    def get_remark(self,system,cmd,is_start=True):
        overall_length = 80
        if is_start:
            header = f"{system} 1553 CMD for:{cmd}"
            no_of_stars =int( (overall_length-len(header))/2)
            return f"\n!{'*'*no_of_stars}{header}{'*'*no_of_stars}\n"
        else:
            header = f"END of 1553 CMD"
            no_of_stars = int((overall_length-len(header))/2)
            return f"!{'*'*no_of_stars}{header}{'*'*no_of_stars}\n"
        
    async def get_procedure_string(self, row: TcDetailsTblRow,tc_request: TcRequest) -> str:
        procedure = ""
        system =""
        command = row.TC
        command_df = None
        c=-1
        for df in self.dfs:
            command_df = df.filter(pl.col("TC") == command.lower())
            c += 1
            if command_df.height > 0:
                break
        system = self.sub_system[c]
        if command_df.height == 0:
            procedure += await self.handle_other_commands(command,tc_request)
            return procedure
        row = command_df.row(0,named=True)
        await self.inject_tm(row["INJ_TM"], row["INJ_TM_VAL"],tc_request)
        await self.inject_tm(row["EXP_TM"], row["EXP_TM_VAL"],tc_request)
        # c1 = self.is_tm_state_matched(tc_request.live_tm_data,row["INJ_TM"], row["INJ_TM_VAL"])
        # c2 = self.is_tm_state_matched(tc_request.live_tm_data,row["EXP_TM"],row["EXP_TM_VAL"])
        # if c1 and c2 :
        #     return procedure 
        procedure += await self.generate_expected_ccl(command_df,tc_request)
        # if len(procedure):
        #     procedure += "\n"
        for i in self.sub_address:
            search_exp = f"^SA{i}.*$"
            sa_cmd = command_df.select(pl.col(search_exp).drop_nulls())
            if sa_cmd.height > 0:
                procedure += self.generate_sendtcp_command(sa_cmd.row(0))
        if len(procedure) > 0:
            procedure = self.get_remark(system,command)+procedure+self.get_remark(system,command,False)
        return procedure
    
    async def get_procedure(self,row: TcDetailsTblRow, tc_request: TcRequest, is_start: bool,r) -> TestProcedure:
        self.r = r  # For simulating TM state injection
        self.line_number = tc_request.line_number
        procedure = TestProcedure()
        procedure.expected_part = ""
        procedure.send_part = await self.get_procedure_string(row,tc_request)
        procedure.line_number = self.line_number
        return procedure
    

    async def handle_other_commands(self,cmd:str,tc_request: TcRequest):
        p = ""
        df = self.other_commands.filter(pl.col("TC") == cmd.lower())
        if df.height > 0:
            row = df.row(0,named=True)
            if row["SEND_IF_CMD_IS_PART_OF_PROCEDURE"] is None:
                condition = True
            else:
                required_commands = set(row["SEND_IF_CMD_IS_PART_OF_PROCEDURE"].split(","))
                issued_commands = set(tc_request.commands)
                condition = len(required_commands & issued_commands) > 0
            if condition:
                if row["PROCEDURE"] is not None:
                    await self.inject_tm(row.get("INJ_TM",None), row.get("INJ_TM_VAL",None),tc_request)
                    p += await self.generate_expected_ccl(df)
                    p += f"{self.get_line_number()} {row['PROCEDURE']}\n"
                else:
                    if cmd == "boa_max":
                        p += await self.boa_max(tc_request)
                    elif cmd == "boa_normalize":
                        p += await self.boa_nom(tc_request)
        else:
            print(f"No command found in nvs.xlsx for TC:{cmd}")
        return p
    
    async def boa_max(self, tc_req: TcRequest) -> str:
        boa_commands = []
        for row in self.boa.iter_rows(named=True):
            #CMD	TM	STATE BOA_MAX
            if tc_req.live_tm_data.get(row["TM"]) == row["STATE"]:
                boa_commands.append(f"""{row["CMD"]} {row["BOA_MAX"]}""")
                await self.inject_tm(row["CMD"],f"""{row["BOA_MAX"]} db""",tc_req)
                self.inject_tm_during_generation_process(row["CMD"],f"""{row["BOA_MAX"]} db""")

        print(f"Generating BOA MAX commands for TC:{boa_commands}")
        p = ""
        for i,boa_command in enumerate(boa_commands):
            if i == 0:
                p += f"{self.get_line_number()} send{' '*(self.number_of_spaces_before_command-8)}{boa_command};\n"
            else:
                p += f"{' '*self.number_of_spaces_before_command}{boa_command};\n"
        # if len(p) > 0:
        #     p = p[:-2]+"\n"
        return p

    async def boa_nom(self, tc_req: TcRequest) -> str:
        return ""
        boa_commands = self.generate_boa_commands(tc_req, "NOM") #{"boa_commands": [],"commands":[],"values":[],"display_values":[]}
        print(f"Generating BOA Nom commands for TC:{boa_commands}")
        p = ""
        for i,boa_command in enumerate(boa_commands["boa_commands"]):
            await self.inject_tm(boa_commands["commands"][i], boa_commands["display_values"][i],tc_req)
            if i == 0:
                p += f"{self.get_line_number()} send{' '*(self.number_of_spaces_before_command-8)}{boa_command};\n"
            else:
                p += f"{' '*self.number_of_spaces_before_command}{boa_command};\n"
        # if len(p) > 0:
        #     p = p[:-2]+"\n"
        return p


plugins_factory.register_component("nvs", Nvs)