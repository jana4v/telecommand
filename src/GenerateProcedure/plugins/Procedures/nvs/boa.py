from typing import Dict, List
import polars as pl
from polars.exceptions import (
    ColumnNotFoundError,
    NoRowsReturnedError,
    TooManyRowsReturnedError,
    OutOfBoundsError
)
import pyodbc,os
from .....Models import CfgBasedTcTable, DataCommandRow, TcRequest, TestParametersTable
from .....Utility  import logger

class BoaProcedure:
    """
    This class reads all Tele command database tables and loads them as pandas dataframes
    """
    def __init__(self):
        """
        This constructor loads all database tables into pandas dataframes.
        """
        super().__init__()
        cnxn = pyodbc.connect("DSN=TM_TC;")
        logger.info('BOA Plugin Loading TMTC and CFG Table..')
        # read Data commands related tables
        data_commnads_df =pl.read_database("SELECT * FROM DataCommands",cnxn,infer_schema_length=None)
        data_commnads_df = self.clean_df(data_commnads_df)
        data_commands_map_df = self.clean_df(pl.read_database("SELECT * FROM DataCommandsMapping",cnxn,infer_schema_length=None))
        self.data_commands_df = data_commnads_df.join(data_commands_map_df, on="CODE_MAPPING", how="left")
        cfg_based_boa_df =pl.read_database("SELECT * FROM CFG_BOA",cnxn,infer_schema_length=None)
        self.cfg_based_boa_df = self.clean_df(cfg_based_boa_df)   
        cnxn.close()
        

    def clean_df(self,df:pl.DataFrame)-> pl.DataFrame:
        # Strip and convert to lowercase all string columns
        schema = df.schema
        df = df.with_columns(
            [
                pl.col(column).str.strip_chars().str.to_lowercase()
                if dtype == pl.Utf8 else pl.col(column)
                for column, dtype in schema.items()
            ]
        )
        # Identify columns where all values are None
        columns_to_drop = [col for col in df.columns if df[col].is_null().all()]
        df = df.drop(columns_to_drop)
        return df
    
    def generate_boa_commands(self,tc_req:TcRequest,boa_type="MAX")->Dict[str,any]:
        boa_commands = {"boa_commands": [],"commands":[],"values":[],"display_values":[]}
        for cfg_no in tc_req.final_active_configurations:
            df = self.cfg_based_boa_df.filter(pl.col("CFG_NO") == cfg_no)
            if  df.height == 0:
                continue
            row = df.row(0,named=True)
            boa_value = row[boa_type]
            boa_cmd = row["CMD"]
            row = self.data_commands_df.filter(pl.col("TC") == boa_cmd , pl.col("VALUE") == boa_value).row(0,named=True)
            data_command = DataCommandRow(**row)
            cmd = f"{self.get_orignal_data_command_tc_mnemonic(boa_cmd)} {data_command.DATA_CODE}"
            # if (self.tm.get(boa_cmd,"") != data_command.DISPLAY_VALUE):
            if cmd not in boa_commands["boa_commands"]:
                boa_commands["boa_commands"].append(cmd)
                boa_commands["commands"].append(boa_cmd)
                boa_commands["values"].append(boa_value)
                boa_commands["display_values"].append(data_command.DISPLAY_VALUE)
        return boa_commands

