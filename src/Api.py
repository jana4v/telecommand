import os
from typing import Dict, List
from fastapi import APIRouter, HTTPException
import uvicorn
from contextlib import asynccontextmanager
from .Models import TcRequest,GeneratedTestProcedure
from .ApiHandlers import ApiHandler



router = APIRouter(prefix="/restApi/tc")


@router.post("/set_cfgs_on")
async def set_cfgs_on(tc_request: TcRequest)-> GeneratedTestProcedure:
    try:
        #tc_req = TcRequest(configs_str="1",boa_column_name="NOM")
        #return PlainTextResponse(await ApiHandler.set_configs_on(tc_request))
        return await ApiHandler.set_configs_on(tc_request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate_boa_cal_procedure")
async def set_cfgs_on(tc_request: TcRequest)-> GeneratedTestProcedure:
    try:
        #tc_req = TcRequest(configs_str="1",boa_column_name="NOM")
        #return PlainTextResponse(await ApiHandler.set_configs_on(tc_request))
        return await ApiHandler.generate_boa_cal_procedure(tc_request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate_test_procedure_document")
async def generate_test_procedure_document(tc_request: TcRequest)-> str:
    try:
        #tc_req = TcRequest(configs_str="1",boa_column_name="NOM")
        #return PlainTextResponse(await ApiHandler.set_configs_on(tc_request))
        return await ApiHandler.generate_test_procedure_document(tc_request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate_test_procedure_turn_off_document")
async def generate_test_procedure_turn_off_document(tc_request: TcRequest)-> str:
    try:
        #tc_req = TcRequest(configs_str="1",boa_column_name="NOM")
        #return PlainTextResponse(await ApiHandler.set_configs_on(tc_request))
        return await ApiHandler.generate_test_procedure_turn_off_document(tc_request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/set_cfgs_off")
async def set_cfgs_off(tc_request: TcRequest)-> GeneratedTestProcedure:
    try:
        #tc_req = TcRequest(configs_str="1",boa_column_name="NOM")
        #return PlainTextResponse(await ApiHandler.set_configs_off(tc_request))
        return await ApiHandler.set_configs_off(tc_request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/set_all_payload_off")
async def set_all_payload_off()-> GeneratedTestProcedure:
    try:
        #tc_req = TcRequest(configs_str="1",boa_column_name="NOM")
        #return PlainTextResponse(await ApiHandler.set_configs_off(tc_request))
        return await ApiHandler.set_all_payload_off()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 

@router.post("/generate_manual_commands_file")
async def manual_commands(tc_request: TcRequest)-> GeneratedTestProcedure:
    try:
        #tc_req = TcRequest(configs_str="1",boa_column_name="NOM")
        return await ApiHandler.manual_commands(tc_request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/get_cfg_boa_col_names",response_model=List[str])
async def get_cfg_boa_col_names()-> List[str]:
    try:
        return await ApiHandler.get_cfg_boa_col_names()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/get_test_parameter_names" ,response_model=List[str])
async def get_test_parameter_names()-> List[str]:
    try:
        return await ApiHandler.get_test_parameter_names()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/get_tc_file_names" ,response_model=List[str])
async def get_tc_file_names()-> List[str]:
    try:
        return await ApiHandler.get_tc_file_names()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/get_commands_group_names" ,response_model=List[str])
async def get_commands_group_names()-> List[str]:
    try:
        return await ApiHandler.get_commands_group_names()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get_manual_commands_list" ,response_model=List[Dict[str,str]])
async def get_manual_commands_list()-> List[Dict[str,str]]:
    try:
        return await ApiHandler.get_manual_commands_list()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/get_data_commands_list" ,response_model=List[str])
async def get_data_commands_list()-> List[str]:
    try:
        return await ApiHandler.get_data_commands_list()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/get_data_command_values" ,response_model=Dict[str,str])
async def get_data_command_values(data_command:List[str])->Dict[str,str]:
    try:
        return await ApiHandler.get_data_command_values(data_command[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate_data_commands")
async def generate_data_commands(tc_request:TcRequest)->GeneratedTestProcedure:
    try:
        return await ApiHandler.generate_data_commands(tc_request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.post("/executeTestProcedure")
async def execute_test_procedure(request:GeneratedTestProcedure)->str:
    try:
        return await ApiHandler.execute_test_procedure(request)
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/trigger_file_execution")
async def trigger_file_execution(request:GeneratedTestProcedure)->str:
    try:
        return await ApiHandler.trigger_file_execution(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



