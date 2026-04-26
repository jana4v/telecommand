from typing import Dict, List
import copy
from .ExtractConstarints_L2 import ExtractConstraints
import polars as pl
from .Models import DataCommandRow, TcRequest, TcTblRow, TestParametersTable
from .Logging.Logger import logger
from .InvalidateInjectedTm import invalidate_tm_obj
from .Utility import time_all_methods
import datetime

class GenerateCommands(ExtractConstraints):
    def __init__(self):
        self.gui_status_update_raw(summary="Application", status="Initialization started..")
        super().__init__()
        self.tm = {}
        self.initial_tm = {}
        self.updated_tm = {}
        self.commands = []
        self.tc_req:TcRequest = None

    async def generate_commands_for_test_procedure_document(self,tc_request: TcRequest)-> TcRequest:
        row = self.test_parameters_df.filter(pl.col("PARAMETER")==tc_request.parameter).row(0,named=True)
        row_data = TestParametersTable(**row)
        commands_df = self.cfg_based_tc_df.filter(
            pl.col("CFG_NO").is_in(tc_request.config_numbers), 
              (pl.col("PARAMETER").is_null()) |  (pl.col("PARAMETER") == row_data.SNO)
            )
        return commands_df
    
    async def generate_commands_for_test_procedure_off_document(self,tc_request: TcRequest)-> TcRequest:
        row = self.test_parameters_df.filter(pl.col("PARAMETER")==tc_request.parameter).row(0,named=True)
        row_data = TestParametersTable(**row)
        commands_df = self.cfg_based_tc_df.filter(
            pl.col("CFG_NO").is_in(tc_request.config_numbers), 
            pl.col("CMD_TYPE").is_in(["on_cmd"]),
             (pl.col("PARAMETER").is_null()) |  (pl.col("PARAMETER") == row_data.SNO)
            )
        return commands_df

    def generate_request_id(self)-> str:
        #generate date time based request id
        return str(datetime.datetime.now())

    async def  pre_process_request(self, tc_request: TcRequest)-> TcRequest:
        self.tc_req = tc_request
        self.tc_req.request_id = self.generate_request_id()
        if self.tc_req.parameter is None or self.tc_req.parameter == "":
            self.tc_req.parameter = "default"
        self.updated_tm = {}
        self.delete_inject_tm_during_generation_process()
        summary = "Generating Commands"
        status=""
        if self.tc_req.configs_str != "" and self.tc_req.change_only_switches:
            status = f"Change Only Switches Request Received for Configs:{self.tc_req.configs_str}"
        elif self.tc_req.configs_str != "" and self.tc_req.request_is_to_turn_on:
            status = f"Turn On Request Received for Configs:{self.tc_req.configs_str}"
        elif self.tc_req.configs_str != "" and not self.tc_req.request_is_to_turn_on:
            status = f"Turn Off Request Received for Configs:{self.tc_req.configs_str}"
        elif self.tc_req.turn_off_payloads and len(self.tc_req.sub_system_names) > 0:
            status = f"Turn Off Request Received for Subsystems:{self.tc_req.sub_system_names}"
        
        self.update_status(status,0,summary)
        configs = self.get_config_numbers_list_from_str(self.tc_req.configs_str)
        self.tc_req.config_numbers = configs
        param_based_configs = self.get_cfg_nos_for_param_based_tc(configs,self.tc_req.parameter)
        if len(param_based_configs) == 0:
            param_based_configs = self.get_cfg_nos_for_param_based_tc(configs,"default")
        self.tc_req.config_numbers.extend(param_based_configs)
        self.refresh_tm()
        self.tc_req.live_tm_data = self.initial_tm
        self.tc_req.file_name = self.generate_tc_file_name()
        return self.tc_req

    async def generate_cfg_based_on_commands(self, tc_req:TcRequest)-> TcRequest:
        self.commands = []
        if len(tc_req.config_numbers) == 0:
            return tc_req
        active_configurations = self.get_active_configurations()
        active_cfgs = [x for x in active_configurations if x < 2000]
        self.update_status(f"Active Configs:{active_cfgs}",progress=5)
        allowed_configurations = self.get_list_of_non_conflict(tc_req.config_numbers)
        allowed_cfgs =  [x for x in allowed_configurations if x < 2000]
        self.update_status(f"Allowed Configs:{allowed_cfgs}",progress=5)
        disturbed_configurations = self.get_disturbed_configurations(active_configurations, allowed_configurations)
        disturbed_cfgs =  [x for x in disturbed_configurations if x < 2000]
        self.update_status(f"Disturbed Configs:{disturbed_cfgs}",progress=5)
        final_active_configurations = (active_configurations | allowed_configurations) - disturbed_configurations
        final_active_cfgs =  [x for x in final_active_configurations if x < 2000]
        self.update_status(f"Final Active Configs:{final_active_cfgs}",progress=5)
        logger.info(f"Active Configs: {active_cfgs}")
        logger.info(f"Disturbed Configs: {disturbed_cfgs}")
        if tc_req.change_only_switches:
            logger.info(f"Final Active Configs: []")
        else:
            logger.info(f"Final Active Configs: {final_active_cfgs}")
        self.update_status(f"Generating required commands...",progress=10)
        self.inject_single_tm('active_configs',",".join([str(x) for x in final_active_cfgs]),tc_req)
        self.generate_required_commands_to_set_configs_l1(active_configurations,allowed_configurations)
        active_configurations = self.get_active_configurations()
        if len(set(final_active_cfgs)-set(active_cfgs)) != 0:
           self.generate_required_commands_to_set_configs_l1(active_configurations,final_active_cfgs)

        self.generate_required_on_commands(final_active_configurations)
        self.tc_req.active_configurations = active_configurations
        if tc_req.change_only_switches:
            self.commands = self.filter_only_switch_commands(self.commands)
            self.tc_req.active_configurations = set([])
        self.tc_req.commands = self.commands
        self.update_status(f"Generated commands:{self.commands} with File Name:{tc_req.file_name}",progress=20)
        self.tc_req.allowed_configurations = allowed_configurations
        self.tc_req.disturbed_configurations = disturbed_configurations
        self.tc_req.final_active_configurations = final_active_configurations
        return self.tc_req
    
    def filter_only_switch_commands(self,commands):
        df = self.tc_details_df.filter(pl.col("CMD_TYPE").is_in(["off_cmd","switch_cmd"]), pl.col("TC").is_in(commands))
        return df["TC"].to_list()
    
    def generate_required_commands_to_set_configs_l1(self, active_configurations, allowed_configurations)->List[str]:
        for cfg_no in allowed_configurations:
            #logger.info(f"Command file generation in progress for config number {cfg_no}...")
            if cfg_no in active_configurations:
                continue
            self.tm = copy.deepcopy(self.initial_tm)
            self.updated_tm = {}
            cfg_table_df = self.cfg_based_tc_df.filter(pl.col("CFG_NO") == cfg_no).sort("PRIORITY",descending=True)
            df_length = len(cfg_table_df)            
            for i in range(df_length):
                row = cfg_table_df.row(i, named=True) 
                next_row = cfg_table_df.row(i + 1, named=True) if i + 1 < df_length else None
                data: TcTblRow = TcTblRow(**row)
                if data.TM:
                    actual_state = self.get_tm_value(data.TM)
                    if data.TM_STATE != actual_state:
                        self.updated_tm[data.TM] = data.TM_STATE
                        self.inject_tm_during_generation_process(data.TM,data.TM_STATE)
                        allowed_configs_in_current_tm_state =self.cfg_based_tc_df.filter( (pl.col("TM") == data.TM) & (pl.col("TM_STATE") == actual_state))["CFG_NO"].unique().to_list()
                        allowed_configs_in_new_tm_state =self.cfg_based_tc_df.filter( (pl.col("TM") == data.TM) & (pl.col("TM_STATE") == data.TM_STATE))["CFG_NO"].unique().to_list()
                        cfgs = set(allowed_configs_in_current_tm_state) | set(allowed_configs_in_new_tm_state)
                        self.generate_off_commands_for_conflict_cfgs(cfgs,data.PRIORITY)
                        if data.TC not in self.commands:
                            self.commands.append(data.TC)
                else:
                    if data.TC not in self.commands:
                        self.commands.append(data.TC)
                        
                if next_row is not None:
                    next_data: TcTblRow = TcTblRow(**next_row)
                    if next_data.TC != data.TC:
                        self.tm.update(self.updated_tm)
                else:
                    self.tm.update(self.updated_tm)
                self.tm = invalidate_tm_obj.invalidate_local_tm(self.tm)
                
    def generate_off_commands_for_conflict_cfgs(self, conflict_cfgs: List[int], priority:int):
        for cfg_number in conflict_cfgs:
            commands = self.check_configuration_relevance_to_turn_off_systems(cfg_number,priority)
            for cmd in commands:
                if not self.is_tm_state_matched_for_command(cmd):
                    if cmd not in self.commands:
                        self.commands.append(cmd)



    def generate_required_on_commands(self, final_active_configurations):
        for cfg_number in final_active_configurations:
            cfg_table_df = self.cfg_based_tc_df.filter((pl.col("CFG_NO") == cfg_number) & (pl.col("CMD_TYPE") == "on_cmd"))
            on_commands = cfg_table_df.select(pl.col("TC").unique()).to_series().to_list()
            for on_cmd in on_commands:
                if on_cmd not in self.commands:
                    off_cmd = self.get_off_command(on_cmd)
                    if off_cmd in self.commands:
                        self.commands.append(on_cmd)

    
    def check_configuration_relevance_to_turn_off_systems(self, cfg_number, priority):
        commands = []

        # Filter and sort the DataFrame in one step
        cfg_table_df = self.switch_and_on_commands.filter(
            (pl.col("CFG_NO") == cfg_number) & (pl.col("PRIORITY") <= priority)
        ).sort("PRIORITY", descending=True)

        # Precompute off commands to avoid multiple method calls
        off_commands = {}
        for row in cfg_table_df.iter_rows(named=True):
            data: TcTblRow = TcTblRow(**row)
            if data.CMD_TYPE == "on_cmd":
                # Cache the result of get_off_command to avoid duplicates
                if data.TC not in off_commands:
                    off_command = self.get_off_command(data.TC)
                    off_commands[data.TC] = off_command
                else:
                    off_command = off_commands[data.TC]
                
                if off_command not in commands:
                    commands.append(off_command)
            # commented during GSAT-7R its allowing SSPA-2 on directly
            # else:  # GSAT7R Comented
            #     # Use an early exit if the TM value does not match the TM_STATE
            #     if self.get_tm_value(data.TM) != data.TM_STATE:
            #         return commands

        return commands
    
    async def generate_all_rf_systems_off_commands(self,tc_req:TcRequest)-> TcRequest:
        self.tc_req = tc_req
        self.update_status(f"Generating required commands...",progress=13)
        on_commands_df = self.cfg_based_tc_df.filter((pl.col("CMD_TYPE") == "on_cmd") & (pl.col("SUB_SYSTEM") == "payload"))
        on_commands = on_commands_df.select(pl.col("TC").unique()).to_series().to_list()
        commands = []
        for cmd in on_commands:
            off_cmd = self.get_off_command(cmd)
            if not self.is_tm_state_matched_for_command(off_cmd):
                commands.append(off_cmd)
        self.tc_req.commands = commands
        if len(commands) > 0:
            self.tm.update(self.updated_tm)
            active_configurations = self.get_active_configurations()
            active_cfgs = [x for x in active_configurations if x < 2000]
            final_active_cfgs =",".join([str(x) for x in active_cfgs])
            self.inject_single_tm('active_configs',final_active_cfgs,tc_req)
        self.update_status(f"Generated commands:{commands} with File Name:{tc_req.file_name}",progress=25)
        return self.tc_req


    async def generate_cfg_based_off_commands(self, tc_req:TcRequest)-> TcRequest:
        if len(tc_req.config_numbers) == 0:
            return tc_req
        self.commands = []
        commands = []
        self.update_status(f"Generating required commands...",progress=13)
        self.tc_req = tc_req
        # active_configurations = self.get_active_configurations()
        # active_cfgs = set([x for x in active_configurations if x < 2000])
        # final_active_cfgs =",".join([str(x) for x in (active_cfgs-set(tc_req.config_numbers))])
        
        for cfg_no in self.tc_req.config_numbers:
            if self.is_all_switches_are_ok(cfg_no):
                on_commands_df = self.cfg_based_tc_df.filter(pl.col("CFG_NO") == cfg_no,pl.col("CMD_TYPE")=="on_cmd")
                for row in on_commands_df.iter_rows(named=True):
                    off_cmd = self.get_off_command(row["TC"])
                    if not self.is_tm_state_matched_for_command(off_cmd):
                        if off_cmd not in commands:
                            commands.append(off_cmd)
        self.tc_req.commands = commands
        if len(commands) > 0:
            self.tm.update(self.updated_tm)
            active_configurations = self.get_active_configurations()
            active_cfgs = [x for x in active_configurations if x < 2000]
            final_active_cfgs =",".join([str(x) for x in active_cfgs])
            self.inject_single_tm('active_configs',final_active_cfgs,tc_req)
        # self.update_status(f"Generated commands:{commands}",progress=25)
        self.update_status(f"Generated commands:{commands} with File Name:{tc_req.file_name}",progress=25)
        return self.tc_req
        
    def is_all_switches_are_ok(self,cfg_no: int):
        switches_df = self.cfg_based_tc_df.filter(pl.col("CFG_NO") == cfg_no, pl.col("CMD_TYPE")=="switch_cmd")
        for row in switches_df.iter_rows(named=True):
            if self.tm[row["TM"]] != row["TM_STATE"]:
                return False
        return True 
    
    async def generate_boa_commands(self,tc_req:TcRequest)->TcRequest:
        boa_commands = []
        if tc_req.boa_column_name is None and tc_req.boa_value is None and tc_req.parameter is None: 
            return tc_req
        self.update_status(f"Generating required BOA commands...",progress=1)
        for i,cfg_no in enumerate(tc_req.config_numbers):
            if cfg_no > 2000:
                continue
           
            df = self.cfg_based_boa_df.filter(pl.col("CFG_NO") == cfg_no)
            if df.height == 0:
                self.update_status(f"Config Number:{cfg_no} not Found in CFG_BOA Table...",progress=1)
                tc_req.commands = []
                return tc_req
            commands = []
            for row in df.iter_rows(named=True):
                #row = df.row(0,named=True)
                cmd = row["CMD"]
                add_residual_boa = True
                if cmd is None:
                    continue
                value = None
                if tc_req.boa_column_name is not None: 
                    if tc_req.boa_column_name.upper() in self.cfg_based_boa_df.columns:
                        value = row[tc_req.boa_column_name.upper()]
                        if tc_req.boa_column_name.lower() == "boa_cal_start":
                            add_residual_boa = False

                if tc_req.boa_value is not None and value is None:
                    value = float(tc_req.boa_values[i])
                    add_residual_boa = True
                elif tc_req.parameter is not None and tc_req.parameter != "default":
                    if tc_req.parameter.upper() in self.cfg_based_boa_df.columns:
                        value = row[tc_req.parameter.upper()]
                        if value is None:
                            continue
                    else:
                        df1 =self.test_parameters_df.filter(pl.col('PARAMETER') == tc_req.parameter)
                        if df1.height == 0:
                            continue
                        else:
                            boa_col_name = df1.row(0,named=True).get("BOA")
                            value = row[boa_col_name.upper()]
                            if value is None:
                                continue

                residual_boa = row["RESIDUAL_BOA"]    
                if value is None:
                   tc_req.commands = []
                   return tc_req  
                if add_residual_boa:
                    value = value + residual_boa
                else:
                    value = value
                try:
                    row = self.data_commands_df.filter(pl.col("TC") == cmd,pl.col("VALUE") == value).row(0,named=True)
                except Exception as e:
                    self.update_status(f"BOA Value:{value} for CFG:{cfg_no},TC:{cmd} not Found in Data commands/Data commands mapping...",progress=0)
                    raise Exception(e)
                data_command = DataCommandRow(**row)

                final_cmd = f"{cmd} {data_command.DATA_CODE} :{data_command.DISPLAY_VALUE}"
                if data_command.DATA_CODE != data_command.DISPLAY_VALUE:
                    value_set = f"{data_command.DATA_CODE}:{data_command.DISPLAY_VALUE}"
                else:
                    value_set = f"{data_command.DATA_CODE}"
                self.r.hset("CFG_BOA_SET_SHARED",str(int(cfg_no)), value_set)
                injected_tm = self.get_inject_tm_during_generation_process()
                value = injected_tm.get(cmd.lower())
                if (self.get_tm_value(cmd) != data_command.DISPLAY_VALUE) or (tc_req.force_boa_command_generation) or ((value != data_command.DISPLAY_VALUE) and value is not None):
                    if final_cmd not in boa_commands:
                        self.updated_tm[cmd] = data_command.DISPLAY_VALUE
                        self.inject_tm_during_generation_process(cmd,data_command.DISPLAY_VALUE)
                        boa_commands.append(final_cmd)
                        commands.append(f"{cmd} {data_command.DATA_CODE}")
        tc_req.commands = boa_commands
        self.update_status(f"Generated BOA commands:{commands}",progress=5)
        return tc_req

    async def generate_manual_command(self,tc_req: TcRequest)-> TcRequest:
        return tc_req
    
    async def make_subsystem_off(self,tc_req: TcRequest)-> TcRequest:
        self.tc_req = tc_req
        self.update_status(f"Generating required commands...",progress=13)
        if self.tc_req.turn_off_payloads and len(self.tc_req.sub_system_names) > 0:
            on_commands_df = self.cfg_based_tc_df.filter(pl.col("CMD_TYPE") == "on_cmd",pl.col("SUB_SYSTEM").is_in(self.tc_req.sub_system_names))
            on_commands = on_commands_df.select(pl.col("TC").unique()).to_series().to_list()
            commands = []
            for cmd in on_commands:
                off_cmd = self.get_off_command(cmd)
                if not self.is_tm_state_matched_for_command(off_cmd):
                    commands.append(off_cmd)
        self.update_status(f"Generated commands:{commands}",progress=10)
        self.tc_req.commands = commands
        return self.tc_req
