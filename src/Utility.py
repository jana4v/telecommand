import time
from typing import List
import aiohttp
import polars as pl
from .Models import TcRequest, TcTblRow, WampMessage
import requests
from .Logging.Logger import logger
import copy
import tomllib
import os


file_dir = os.getcwd()
db_path = file_dir + os.sep + 'Database'+ os.sep + 'Telecommand'
conf_path = db_path+os.sep+"conf.toml"
# Load the TOML file
enable_excel_creation = True
with open(conf_path, "rb") as f:
    config = tomllib.load(f)
    enable_excel_creation = config['options']['create_excel_files']

class Utility:
    def __init__(self) -> None:
        self.enable_excel_creation = enable_excel_creation
        self.redis_ttl = 3600*2
    @staticmethod
    async def get_request(url: str,use_url_prefix=True) -> str:
        if use_url_prefix:
            url = f"http://127.0.0.1:10000/{url}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                # Check if the response status is not OK
                if response.status != 200:
                    raise ValueError(f"Request failed with status code {response.status}")
                # Ensure the response is JSON and return it
                if response.headers['content-type'] == 'application/json':
                    json_data = await response.json()
                    return json_data
                else:
                    return await response.text()
                
    def gui_status_update(self, tc_req:TcRequest):
        wamp_msg = WampMessage()
        wamp_msg.msg = { "summary":tc_req.req_summary,"status":tc_req.req_status,"progress": str(tc_req.req_progress) }
        r = requests.post(url = "http://127.0.0.1/publish_to_wamp",json= wamp_msg.__dict__)

    def gui_status_update_raw(self, summary="",status="",progress=0):
        wamp_msg = WampMessage()
        wamp_msg.msg = { "summary":summary,"status":status,"progress": str(progress) }
        r = requests.post(url = "http://127.0.0.1/publish_to_wamp",json= wamp_msg.__dict__)

    def update_status(self,status:str=None,progress:int=None,summary:str=None):
        if self.tc_req is None:
            self.gui_status_update_raw(summary=summary,status=status,progress=progress)
            return
        if summary is not None:
            self.tc_req.req_summary = summary
        if status is not None:
            self.tc_req.req_status = status
        if progress is not None:
            p = self.tc_req.req_progress+progress
            if p >= 100:
                p = 100
            self.tc_req.req_progress = p
        self.gui_status_update(self.tc_req)

    def refresh_tm(self):
        self.update_status(f"Getting Telemetry",2)
        logger.info("Getting Telemetry...")
        tm1 = self.r.get("TM1_HEART_BEAT")
        tm2 = self.r.get("TM2_HEART_BEAT")
        if tm1 == "OK" or tm2 == "OK":
            self.tm = self.r.hgetall("TM_MAP")
            self.initial_tm = copy.deepcopy(self.tm)
            print("TM Refreshed")
            # # Convert the dictionary to a DataFrame
            # self.df = pl.DataFrame({
            #     'mnemonic': list(self.tm.keys()),
            #     'value': list(self.tm.values())
            # })
            # self.df.write_excel('output.xlsx')
        else:
            self.tm = {}
            self.update_status(f"Telemetry Data Break",0)
            logger.error("Telemetry Data Break")
            raise Exception("Telemetry Data Break")

    def get_tm_value(self,mnemonic:str):
        if mnemonic is None:
            return None
        value = self.tm.get(mnemonic,"")
        if value == "":
            self.update_status(f"TM Mnemonic Not found in Telemetry Data:{mnemonic}",0)
            # print(f"Mnemonic:{mnemonic} Not Found in Telemetry")
            pass
        return value

    # async def get_active_configurations(self)-> set[int]:
    #     pl_state = await self.get_request("get_payload_state")
    #     return set(pl_state.get(0, []))
    
    def get_off_command(self, on_command):
        result = self.on_to_off_cmd_df.filter(pl.col("ON_CMD") == on_command).select(pl.col("OFF_CMD"))
        if result.is_empty():
            cmd = on_command[:-1]+"ff"
        else:
            cmd = result["OFF_CMD"][0]
        return cmd

    def get_on_command(self, off_command):
        result = self.on_to_off_cmd_df.filter(pl.col("OFF_CMD") == off_command).select(pl.col("ON_CMD"))
        if result.is_empty():
            cmd = off_command[:-1]+"f"
        else:
            cmd = result["ON_CMD"][0]
        return cmd

    def is_tm_state_matched_for_command(self, command):
        x = self.tc_details_tm_stacked_df.filter(pl.col("TC") == command).select(pl.col(["TM","TM_STATE"]))
        for row in x.iter_rows(named=True):
            if row["TM_STATE"] is None: continue
            row["TM_STATE"] = row["TM_STATE"].lower()
            current_tm_state = self.get_tm_value(row["TM"])
            if current_tm_state != row["TM_STATE"]:
                self.updated_tm[row["TM"]] = row["TM_STATE"]
                self.inject_tm_during_generation_process(row["TM"],row["TM_STATE"])
                return False
        return True
    
    def get_pl_state_new(self):
        excel = []
        payload_cfg_state = {}
        for cfg in self.cfg_based_tc_df["CFG_NO"].drop_nulls().unique().to_list():
            payload_cfg_state[cfg] = 0
        for row in self.cfg_based_tc_df.iter_rows(named=True):
            if (row.get("CMD_TYPE") is None) or (row.get("TC") is None):
                continue
            data: TcTblRow = TcTblRow(**row)
            if data.TM_STATE is None: continue
            data.TM_STATE = data.TM_STATE.lower()
            if self.get_tm_value(data.TM)!= data.TM_STATE:
                excel.append({"tm":data.TM,"current_state":self.get_tm_value(data.TM),"desired_state":data.TM_STATE,"cfg_no":data.CFG_NO})
                payload_cfg_state[data.CFG_NO] = payload_cfg_state.get(data.CFG_NO, 0) + data.PRIORITY
                
        df = pl.DataFrame(excel)
        df.write_excel("pl_state.xlsx")
        payload_cost_to_cfg = {}
        for cfg, cost in payload_cfg_state.items():
            if payload_cost_to_cfg.get(cost) is None:
                payload_cost_to_cfg[cost] = []
            payload_cost_to_cfg[cost].append(cfg)
        return payload_cost_to_cfg

    def get_active_configurations(self):
        logger.info("Getting active configurations")
        pl_state = self.get_pl_state_new()
        active_cfgs = pl_state.get(0)
        if active_cfgs is None:
            active_cfgs = []
        #logger.info(f"Active configurations:{active_cfgs}")
        return set(active_cfgs)
    
    def get_config_numbers_list_from_str(self, configs_str: str) -> List[int]:
        try:
            _cfg_numbers = []
            _cfgs = configs_str.split(',')
            for num in _cfgs:
                temp = num.split('-')
                if len(temp) == 2:
                    _cfg_numbers.extend(range(int(temp[0]), int(temp[1]) + 1))
                elif len(temp) == 1:
                    _cfg_numbers.append(int(temp[0]))
            return _cfg_numbers
        except Exception:
            return []
    
    def generate_tc_file_name(self):
        """
        This function names the tele-command file generated locally.
        :return: TC File name
        :rtype: string
        """
        months = {1: "jan", 2: "feb", 3: "mar", 4: "apr", 5: "may", 6: "jun", 7: "jul", 8: "aug",
                       9: "sep", 10: "oct", 11: "nov", 12: "dec"}
        format = lambda x: '0' * (2 - len(str(x))) + str(x)
        _time = time.localtime()
        tc_file_name = format(_time.tm_hour)+"_" + format(_time.tm_min) +"_" + format(_time.tm_sec)+"_" +format(_time.tm_mday)+months.get(_time.tm_mon)+format(_time.tm_year)[2:] + '.tst'
        return tc_file_name
    
    def inject_tm_during_generation_process(self,tm,value):
        self.r.hset("inject_tm_during_generation_process",tm.lower(),value.lower())

    def get_inject_tm_during_generation_process(self):
        return self.r.hgetall("inject_tm_during_generation_process")

    def delete_inject_tm_during_generation_process(self):
        self.r.delete("inject_tm_during_generation_process")

    def inject_tm(self, tm: str,value: str,tc_request: TcRequest=None) -> None:
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

    def inject_single_tm(self, tm: str,value: str,tc_request: TcRequest=None) -> None:
        if tm is not None and value is not None:
            tm = tm.lower()
            value = value.lower()
            self.r.hset("INJECTED_TM_FOR_SIMULATOR_MAP", tm, value)
            if tm in self.inject_tm_list and tc_request is not None:
                self.r.hset(tc_request.file_name, tm, value)
                self.r.expire(tc_request.file_name, self.redis_ttl)
        self.r.expire("INJECTED_TM_FOR_SIMULATOR_MAP", 10)
    

import time
from functools import wraps

def timeit(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        elapsed_time = end_time - start_time
        print(f"Function '{func.__name__}' took {elapsed_time:.4f} seconds")
        return result
    return wrapper

def time_all_methods(cls):
    for attr_name, attr_value in cls.__dict__.items():
        if callable(attr_value) and not attr_name.startswith("__"):
            setattr(cls, attr_name, timeit(attr_value))
    return cls