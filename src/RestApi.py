import os
from datetime import datetime
from typing import Dict, List
from click import Tuple
from fastapi import FastAPI, HTTPException
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from contextlib import asynccontextmanager
from src.Models import TcRequest,GeneratedTestProcedure
from src.ApiHandlers import ApiHandler


from src.InvalidateInjectedTm import invalidate_tm_obj
import asyncio
import redis
rc = redis.from_url("redis://localhost:6379?decode_responses=True")
async def run_invalidate():
    while True:
        #print("Invalidating TM")
        await invalidate_tm_obj.invalidate_tm()
        await asyncio.sleep(3)


@asynccontextmanager
async def lifespan(app:FastAPI):
    task = asyncio.create_task(run_invalidate())
    try:
        yield
    finally:
        task.cancel()
        while True:
            canceled =task.cancelled()
            if canceled:
                break
            else:
                await asyncio.sleep(1)
        print("**")


app = FastAPI(lifespan=lifespan)
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




@app.post("/restApi/tc/set_cfgs_on")
async def set_cfgs_on(tc_request: TcRequest)-> GeneratedTestProcedure:
    try:
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "true")
        res = await ApiHandler.set_configs_on(tc_request)
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "false")
        return res
    except Exception as e:
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "false")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/restApi/tc/generate_boa_cal_procedure")
async def _generate_boa_cal_procedure(tc_request: TcRequest)-> GeneratedTestProcedure:
    try:
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "true")
        res = await ApiHandler.generate_boa_cal_procedure(tc_request)
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "false")
        return res
    except Exception as e:
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "false")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/restApi/tc/generate_test_procedure_document")
async def generate_test_procedure_document(tc_request: TcRequest)-> str:
    try:
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "true")
        rc.hset("SOFTWARE_CFG", "ENABLE_INJECT_TM", 0)
        res = await ApiHandler.generate_test_procedure_document(tc_request)
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "false")
        rc.hset("SOFTWARE_CFG", "ENABLE_INJECT_TM", 1)
        return res
    except Exception as e:
        rc.hset("SOFTWARE_CFG", "ENABLE_INJECT_TM", 1)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/restApi/tc/set_cfgs_off")
async def set_cfgs_off(tc_request: TcRequest)-> GeneratedTestProcedure:
    try:
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "true")
        res = await ApiHandler.set_configs_off(tc_request)
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "false")
        return res
    except Exception as e:
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "false")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/restApi/tc/set_all_payload_off")
async def set_all_payload_off()-> GeneratedTestProcedure:
    try:
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "true")
        res = await ApiHandler.set_all_payload_off()
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "false")
        return res
    except Exception as e:
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "false")
        raise HTTPException(status_code=500, detail=str(e)) 

@app.post("/restApi/tc/generate_manual_commands_file")
async def manual_commands(tc_request: TcRequest)-> GeneratedTestProcedure:
    try:
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "true")
        res = await ApiHandler.manual_commands(tc_request)
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "false")
        return res
    except Exception as e:
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "false")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/restApi/tc/get_cfg_boa_col_names",response_model=List[str])
async def get_cfg_boa_col_names()-> List[str]:
    try:
        return await ApiHandler.get_cfg_boa_col_names()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/restApi/tc/get_test_parameter_names" ,response_model=List[str])
async def get_test_parameter_names()-> List[str]:
    try:
        return await ApiHandler.get_test_parameter_names()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/restApi/tc/get_tc_file_names" ,response_model=List[str])
async def get_tc_file_names()-> List[str]:
    try:
        return await ApiHandler.get_tc_file_names()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/restApi/tc/get_commands_group_names" ,response_model=List[str])
async def get_commands_group_names()-> List[str]:
    try:
        return await ApiHandler.get_commands_group_names()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# @app.post("/restApi/tc/get_manual_commands_list" ,response_model=List[List[str]])
# async def get_manual_commands_list(group_names:List[str])-> List[List[str]]:
#     try:
#         return await ApiHandler.get_manual_commands_list(group_names)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

@app.get("/restApi/tc/get_manual_commands" ,response_model=Dict[str, List[str]])
async def get_manual_commands()-> Dict[str, List[str]]:
    try:
        return await ApiHandler.get_manual_commands()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.get("/restApi/tc/get_data_commands_list" ,response_model=List[str])
async def get_data_commands_list()-> List[str]:
    try:
        return await ApiHandler.get_data_commands_list()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/restApi/tc/get_data_command_values" ,response_model=Dict[str,str])
async def get_data_command_values(data_command:List[str])->Dict[str,str]:
    try:
        return await ApiHandler.get_data_command_values(data_command[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/restApi/tc/generate_data_commands")
async def generate_data_commands(tc_request:TcRequest)->GeneratedTestProcedure:
    try:
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "true")
        res = await ApiHandler.generate_data_commands(tc_request)
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "false")
        return res
    except Exception as e:
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "false")
        raise HTTPException(status_code=500, detail=str(e))
    

@app.post("/restApi/tc/executeTestProcedure")
async def execute_test_procedure(request:GeneratedTestProcedure)->str:
    try:
        return await ApiHandler.execute_test_procedure(request)
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/restApi/tc/trigger_file_execution")
async def trigger_file_execution(request:GeneratedTestProcedure)->str:
    try:
        return await ApiHandler.trigger_file_execution(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/restApi/tc/get_manual_cmd_edit_mode",response_model=bool)
async def get_manual_cmd_edit_mode()-> bool:
    try:
        mode = rc.hget("SOFTWARE_CFG", "TC_MANUAL_CMD_EDIT_MODE")
        if not mode:
            rc.hset("SOFTWARE_CFG", "TC_MANUAL_CMD_EDIT_MODE", "52022110")
            return False

        raw_value = mode.strip()
        if len(raw_value) != 8 or not raw_value.isdigit():
            return False

        try:
            # Value is saved reversed (e.g. 52022190 -> 09122025 for 09-12-2025).
            target_date = datetime.strptime(raw_value[::-1], "%d%m%Y").date()
        except ValueError:
            return False

        return target_date > datetime.now().date()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




def run_rest_api():
    uvicorn.run("src:RestApi.app", host="0.0.0.0", port=10002, reload=False)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("RestApi:app", host="0.0.0.0", port=10001, reload=True)
