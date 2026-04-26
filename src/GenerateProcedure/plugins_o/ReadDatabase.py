from typing import Dict, List
import polars as pl
import pyodbc
from ...Utility  import Utility
from polars.exceptions import (
    ColumnNotFoundError,
    NoRowsReturnedError,
    TooManyRowsReturnedError,
    OutOfBoundsError
)
from ...Logging.Logger import logger



class ReadDatabase(Utility):
    """
    This class reads all Tele command database tables and loads them as pandas dataframes
    """
    def __init__(self):
        """
        This constructor loads all database tables into pandas dataframes.
        """
        super().__init__()
        cnxn = pyodbc.connect("DSN=TM_TC;")
        logger.info('Generate Procedure Loading TMTC and CFG Table..')
        self.tm_tbl_original_df = self.clean_df_no_lower_case(pl.read_database("SELECT PID,TM_MNEMONIC FROM TMTBL",cnxn,infer_schema_length=None))
        self.tc_tbl_original_df = self.clean_df_no_lower_case(pl.read_database("SELECT CID,TC FROM TeleCommandDetails",cnxn,infer_schema_length=None))
        self.tm_tbl_original_df = self.tm_tbl_original_df.with_columns(pl.col("TM_MNEMONIC").str.to_lowercase().alias("TM_MNEMONIC_LC"))
        self.tc_tbl_original_df = self.tc_tbl_original_df.with_columns(pl.col("TC").str.to_lowercase().alias("TC_LC"))
        self.data_commands_original_df = self.clean_df_no_lower_case(pl.read_database("SELECT TC FROM DataCommands",cnxn,infer_schema_length=None))
        self.data_commands_original_df = self.data_commands_original_df.with_columns(pl.col("TC").str.to_lowercase().alias("TC_LC"))
        self.tm_tbl_df = self.clean_df(pl.read_database("SELECT * FROM TMTBL",cnxn,infer_schema_length=None))
        self.inject_tm_df = self.tm_tbl_df.filter(pl.col("TM_TYPE") == "injected")
        self.inject_tm_list = self.inject_tm_df["TM_MNEMONIC"].to_list()
        self.macros = self.clean_df_no_lower_case(pl.read_database("SELECT * FROM MACROS",cnxn,infer_schema_length=None))
        self.pre_process_macro_table()
        self.data_commands_df = self.clean_df_no_lower_case(pl.read_database(f"""SELECT TC,DATA_CODE_LENGTH,DISPLAY_VALUE,DATA_CODE,VALUE 
                              FROM (DataCommands dc LEFT JOIN 
                              DataCommandsMapping dcm  ON dc.CODE_MAPPING = dcm.CODE_MAPPING)""",cnxn,infer_schema_length=None))

        self.cfg_based_boa_df = self.clean_df_no_lower_case(pl.read_database(f"""SELECT * FROM CFG_BOA""",cnxn,infer_schema_length=None))
        cnxn.close()

    def pre_process_macro_table(self):
        tc_columns = [col for col in self.macros.columns if col.startswith("TC")]
        self.macros = self.macros.with_columns( pl.concat_str(
            [pl.col(f"{col}") for col in tc_columns],separator=",",ignore_nulls=True).alias("TC")
            ).select(pl.col(["MACRO","TC"]))
        
    def get_macro_expansion(self, macro: str):
        macro = self.macros.filter(pl.col("MACRO") == macro)
        value=None
        if macro.height > 0:
            value = macro["TC"][0] 
        return value


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
    
    def clean_df_no_lower_case(self,df:pl.DataFrame)-> pl.DataFrame:
        # Strip and convert to lowercase all string columns
        schema = df.schema
        df = df.with_columns(
            [
                pl.col(column).str.strip_chars()
                if dtype == pl.Utf8 else pl.col(column)
                for column, dtype in schema.items()
            ]
        )
        # Identify columns where all values are None
        columns_to_drop = [col for col in df.columns if df[col].is_null().all()]
        df = df.drop(columns_to_drop)
        return df
    
