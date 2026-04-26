from typing import Any, Dict, List
from pydantic import BaseModel, Field

class TcTblRow(BaseModel):
    TC : str
    CID: str | None = None
    CMD_TYPE: str = "other_cmd"
    CMD_FORMAT:str = "normal"
    PID: str | None = None
    TM: str| None = None
    TM_STATE: str| None
    PRIORITY: int = 0
    CFG_NO: int| None = None
    # SUB_SYSTEM: str| None


class TcDetailsTblRow(BaseModel):
    TC : str | None = None
    CID: str | None = None
    CMD_TYPE: str = "other_cmd"
    CMD_FORMAT:str = "normal"
    PRIORITY: int = 0
    NO_OF_TM_STATES: int = 20
    CFG_NO: int| None = None
    TM1_PID: str | None = None
    TM1: str| None = None
    TM1_STATE: str| None = None
    TM2_PID: str | None = None
    TM2: str| None = None
    TM2_STATE: str| None = None
    TM3_PID: str | None = None
    TM3: str| None = None
    TM3_STATE: str| None = None
    TM4: str| None = None
    TM4_PID: str | None = None
    TM4_STATE: str| None = None
    TM5_PID: str | None = None
    TM5: str| None = None
    TM5_STATE: str| None = None
    TM6_PID: str | None = None
    TM6: str| None = None
    TM6_STATE: str| None = None
    TM7: str| None = None
    TM7_STATE: str| None = None
    TM8: str| None = None
    TM8_STATE: str| None = None
    TM9: str| None = None
    TM9_STATE: str| None = None
    TM10: str| None = None
    TM10_STATE: str| None = None
    TM11: str| None = None
    TM11_STATE: str| None = None
    TM12: str| None = None
    TM12_STATE: str| None = None
    TM13: str| None = None
    TM13_STATE: str| None = None
    POST_CONDITION_TYPE: str| None = None
    POST_CONDITION_VALUE: str| None = None
    PARAMETER: int | None = None
    TEST_PHASE: str | None = None
    EXCLUDE_IN_PROCEDURE: bool = False
    EXCLUDE_IN_EXPECTED: bool = False
    
class TcRequest(BaseModel):
    configs_str: str = ""
    config_numbers: List[int] = []
    parameter: str | None = None
    boa_value: str| None = None
    boa_column_name: str | None = None
    force_boa_command_generation: bool=False
    commands: List[str] = []
    rpc_command: str| None = None
    rpc_name: str| None = None
    turn_off_payloads: bool = False
    sub_system_names: List[str] = []
    request_is_to_turn_on: bool = False
    change_only_switches: bool = False
    active_configurations: List[int]=[]
    allowed_configurations: List[int]=[]
    disturbed_configurations: List[int]=[]
    final_active_configurations: List[int]=[]
    request_id: str| None = None
    line_number: int = 1
    manual_commanding_mode: bool = False
    number_of_commands_in_each_send: int = 15
    live_tm_data: Dict[str,str] | None = None
    file_name: str | None = None
    req_progress:int = 0
    req_summary: str = ""
    req_status: str = ""
    

    @property
    def boa_values(self) -> List[float]:
        try:
            return [float(boa) for boa in self.boa_value.split(",")]
        except Exception as e:
            return []


    
class TestProcedure(BaseModel):
    check_part: str = ""
    expected_part: str = ""
    send_part: str = ""
    line_number: int = 1

class DataCommandRow(BaseModel):
    TC: str | None = None
    CID : str| None = None
    CODE_MAPPING: str | None = None 
    DATA_CODE_LENGTH: int | None = None
    DISPLAY_VALUE: str | None = None 
    VALUE: float | None = None
    DATA_CODE: str | None = None

class TestParametersTable(BaseModel):
    SNO: int | None = None
    PARAMETER: str | None = None
    BOA: str | None = None

class CfgBasedTcTable(TcDetailsTblRow):
    pass


class WampMessage(BaseModel):
    topic: str = "com.tc_file.status"
    msg: Dict[str, Any] = Field(default_factory=dict)

class GeneratedTestProcedure(BaseModel):
    file_name: str = ""
    file_content: str = ""

