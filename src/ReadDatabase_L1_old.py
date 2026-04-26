from typing import Dict, List,Tuple
import polars as pl
from polars.exceptions import (
    ColumnNotFoundError,
    NoRowsReturnedError,
    TooManyRowsReturnedError,
    OutOfBoundsError
)
import pyodbc
#import redis.asyncio as redis
import redis
from .Models import CfgBasedTcTable, TestParametersTable
from .Utility  import Utility
from .Logging.Logger import logger
import time
import os

r = redis.from_url("redis://localhost:6379?decode_responses=True")


file_dir = os.getcwd()
generated_excel__path = file_dir + os.sep + 'Database'+ os.sep + 'Telecommand'+ os.sep + 'GeneratedExcels'
if not os.path.exists(generated_excel__path):
    os.makedirs(generated_excel__path, exist_ok=True)
generated_excel__path += os.sep

class ReadDatabase(Utility):
    """
    This class reads all Tele command database tables and loads them as pandas dataframes
    """
    def __init__(self):
        """
        This constructor loads all database tables into pandas dataframes.
        """
        super().__init__()
        self.r =r
        cnxn = pyodbc.connect("DSN=TM_TC;")
        self.gui_status_update_raw(summary="Application", status="Loading TMTC and CFG Table....")
        logger.info('Loading TMTC and CFG Table....')
        self.tc_details_df = self.clean_df(pl.read_database("SELECT * FROM TeleCommandDetails",cnxn,infer_schema_length=None))
        self.tc_details_tm_stacked_df = self.tc_details_df
        self.pre_process_tc_details_table_new()
  
        if self.enable_excel_creation:
            self.tc_details_tm_stacked_df.write_excel(generated_excel__path+"tc_details.xlsx")
        cfg_based_tc_df: pl.DataFrame = self.clean_df(pl.read_database("SELECT * FROM CFG_based_TC",cnxn,infer_schema_length=None))
        cfg_based_tc_df = cfg_based_tc_df.filter(pl.col("TC").is_not_null() & pl.col("CFG_NO").is_not_null()).select(pl.col(["CFG_NO","TC","PARAMETER"]))
        self.cfg_based_tc_df = cfg_based_tc_df.join(self.tc_details_tm_stacked_df, on="TC", how="left")
        self.create_additional_configs_for_parameter_based_tc()
        if self.enable_excel_creation:
            self.cfg_based_tc_df.write_excel(generated_excel__path+"cfg_based_tc.xlsx")
        self.tm_tbl_df = self.clean_df(pl.read_database("SELECT * FROM TMTBL",cnxn,infer_schema_length=None))
        self.inject_tm_df = self.tm_tbl_df.filter(pl.col("TM_TYPE") == "injected")
        self.inject_tm_list = self.inject_tm_df["TM_MNEMONIC"].to_list()
        self.on_to_off_cmd_df = self.clean_df(pl.read_database('SELECT * FROM ON_OFF_COMMANDS', cnxn,infer_schema_length=None))
        self.off_to_on_cmd_df = self.clean_df(pl.read_database('SELECT * FROM OFF_ON_COMMANDS', cnxn,infer_schema_length=None))
        self.cfg_boa_df = self.clean_df(pl.read_database('SELECT * FROM CFG_BOA', cnxn,infer_schema_length=None))


        self.switch_and_on_commands =  self.cfg_based_tc_df.filter((pl.col("CMD_TYPE").is_in(["switch_cmd", "on_cmd"]))) 
        self.tm_df = self.clean_df(pl.read_database('SELECT * FROM TMTBL', cnxn,infer_schema_length=None))
        self.inject_tm_df = self.tm_df.filter(pl.col("TM_TYPE") == "injected")

        """
        self.switch_TM_Labels_DF = pd.read_sql('SELECT switch_TM_Labels FROM switch_TM_Labels', connection)\
            .dropna(how='all')
        self.switch_TM_Labels_DF = self.switch_TM_Labels_DF.map(self.trim_spaces)
        self.switch_TM_Labels = []
        for label in self.switch_TM_Labels_DF['switch_TM_Labels'].values:
            self.switch_TM_Labels.append(label.strip().lower())
        """
        # self.env_data_dir = pd.read_sql('SELECT * FROM ENV_DATA_DIR', connection).dropna(how='all')
        # self.env_data_dir = self.env_data_dir.map(self.trim_spaces)
        # self.env_data_dir.index = self.env_data_dir["PARAM"]
        # self.cmd_at_start_of_procedure = self.env_data_dir.loc["cmd_at_start_of_procedure", "VALUE"]


        """
        self.loadCurDetails = pd.read_sql('SELECT * FROM loadCurrentSystemDetails', connection).dropna(how='all')
        self.loadCurDetails.index = [x.lower() for x in self.loadCurDetails['ON_CMD'].values]

        """


        # read Data commands related tables
        data_commnads_df =pl.read_database("SELECT * FROM DataCommands",cnxn,infer_schema_length=None)
        data_commnads_df = self.clean_df(data_commnads_df)
        data_commands_map_df = self.clean_df(pl.read_database("SELECT * FROM DataCommandsMapping",cnxn,infer_schema_length=None))
        self.data_commands_df = data_commnads_df.join(data_commands_map_df, on="CODE_MAPPING", how="left")
        cfg_based_boa_df =pl.read_database("SELECT * FROM CFG_BOA",cnxn,infer_schema_length=None)
        self.cfg_based_boa_df = self.clean_df(cfg_based_boa_df)    
        if self.enable_excel_creation:
            self.data_commands_df.write_excel(generated_excel__path+"data_commands_df.xlsx")
        self.test_parameters_df = self.clean_df(pl.read_database("SELECT * FROM TEST_PARAMETERS",cnxn,infer_schema_length=None))

        self.tc_files_df = self.clean_df(pl.read_database("SELECT * FROM TC_FILES",cnxn,infer_schema_length=None))
        # self.TEST_PARAMS = pd.read_sql('SELECT * FROM TEST_PARAMETERS', connection).dropna(how='all')
        # self.TEST_PARAMS = self.TEST_PARAMS.map(self.trim_spaces)

        # self.TEST_PHASES = pd.read_sql('SELECT * FROM TEST_PHASE_NAMES', connection).dropna(how='all')
        # self.TEST_PHASES = self.TEST_PHASES.map(self.trim_spaces)

        # self.tc_files_df = pd.read_sql('SELECT * FROM TC_FILES', connection).dropna(how='all')
        # self.tc_files_df = self.tc_files_df.map(self.trim_spaces)
        # self.maxAffectTMforTC = int(self.env_data_dir.loc["MAX_EFFECTED_TM_FOR_TC".lower(),"VALUE"])

        # self.load_current_details = pd.read_sql('SELECT * FROM loadCurrentSystemDetails', connection).dropna(how='all')
        # self.load_current_details = self.load_current_details.map(self.trim_spaces)


        # self.get_scc_details(connection)
        # self.Close_Connection()
        self.additional_commands_at_start_of_procedure = pl.read_database("SELECT * FROM additionalCMDs",cnxn,infer_schema_length=None)
        cnxn.close()
        self.gui_status_update_raw(summary="Application", status="Loading Databse Completed...")
        self.gui_data()
        redis_data = ';'.join([
            ','.join(map(str, self.cfg_based_tc_df['CFG_NO'].to_list())),
            ','.join(map(str, self.cfg_based_tc_df['TM'].to_list())),
            ','.join(map(str, self.cfg_based_tc_df['TM_STATE'].to_list())),
            ','.join(map(str, self.cfg_based_tc_df['PRIORITY'].to_list()))
        ])
        self.r.set('data_for_go_func', redis_data)
        
    def get_additional_procedure_at_the_start_of_procedure(self,line_number):
        procedure = ""
        line_number = line_number
        for row in self.additional_commands_at_start_of_procedure.iter_rows(named=True):
            cmd = row.get("AT_START")
            if cmd:
                procedure += str(line_number).zfill(3)+" "+cmd.strip()+"\n"
                line_number += 1
        
        return procedure,line_number
        

    def clean_df_old(self,df:pl.DataFrame)-> pl.DataFrame:
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
    
    def clean_df(self, df: pl.DataFrame) -> pl.DataFrame:
        # Get the schema to determine which columns are strings
        schema = df.schema

        # Apply string operations only to string columns
        string_columns = [col for col, dtype in schema.items() if dtype == pl.Utf8]
        df = df.with_columns(
            [
                pl.col(col).str.strip_chars().str.to_lowercase()
                for col in string_columns
            ]
        )
        
        # Identify and drop columns where all values are None
        #non_null_columns = [col for col in df.columns if not df[col].is_null().all()]
        #df = df.select(non_null_columns)
        
        return df
    

    def pre_process_tc_details_table(self):
        # Identify TM columns
        tm_cols = []
        for i in range(1, 11):
            tm_cols.extend([f"TM{i}",f"TM{i}_STATE"])
        tm_cols = [col for col in tm_cols if col in self.tc_details_df.columns]

        # Drop TM columns from the main DataFrame
        df_main = self.tc_details_df.drop(tm_cols)

        # Create a list of DataFrames for each TM and TM_STATE column pair
        dfs = [
            self.tc_details_df.select(['TC', tm, tm_state])
            .rename({tm: 'TM', tm_state: 'TM_STATE'})
            .drop_nulls(['TM', 'TM_STATE'])
            for tm,tm_state in zip(tm_cols[::2],tm_cols[1::2])
        ]

        # Vertically stack all the DataFrames in dfs
        df_combined = pl.concat(dfs)

        # Join the combined TM and TM_STATE columns back with the main DataFrame
        df_final = df_main.join(df_combined, on='TC',how="left")
        self.tc_details_tm_stacked_df = df_final

    def pre_process_tc_details_table_new(self):
        # Identify TM and TM_STATE columns that exist in the DataFrame
        tm_cols = [f"TM{i}" for i in range(1, 11) if f"TM{i}" in self.tc_details_df.columns]
        tm_state_cols = [f"TM{i}_STATE" for i in range(1, 11) if f"TM{i}_STATE" in self.tc_details_df.columns]

        # Drop TM and TM_STATE columns from the main DataFrame
        df_main = self.tc_details_df.drop(tm_cols + tm_state_cols)

        # Combine all TM and TM_STATE columns into a long format DataFrame
        dfs = []
        for tm, tm_state in zip(tm_cols, tm_state_cols):
            df_tm = self.tc_details_df.select(['TC', tm, tm_state]) \
                                    .rename({tm: 'TM', tm_state: 'TM_STATE'}) \
                                    .drop_nulls(['TM', 'TM_STATE'])
            dfs.append(df_tm)
        
        # Concatenate all DataFrames vertically if there are any
        df_combined = pl.concat(dfs) if dfs else None

        # Join the combined DataFrame back to the main DataFrame if df_combined exists
        if df_combined is not None:
            df_final = df_main.join(df_combined, on='TC', how='left')
        else:
            df_final = df_main

        # Store the result in the class attribute
        self.tc_details_tm_stacked_df = df_final


    # def read_env_data(self):
    #     connection = self.Open_Connection('smartPACS')
    #     self.env_data_dir = pd.read_sql('SELECT * FROM ENV_DATA_DIR', connection).dropna(how='all')
    #     self.env_data_dir = self.env_data_dir.map(self.trim_spaces)
    #     self.env_data_dir.index = self.env_data_dir["PARAM"]
    #     self.cmd_at_start_of_procedure = self.env_data_dir.loc["cmd_at_start_of_procedure", "VALUE"]
    #     self.Close_Connection()


    # def get_boa_command_code(self,cmd,boa_value):
    #     boa_code = None
    #     CODE_MAPPING = self.data_commands_df.loc[cmd, 'CODE_MAPPING']
    #     if CODE_MAPPING:
    #         df = self.data_command_values_map_df[self.data_command_values_map_df['TYPE'] == CODE_MAPPING]
    #         boa_code = df[df['BOA_VALUE'] == boa_value]['DATA_CODE'].values[0]
    #     return boa_code
    
    def get_cfg_no_for_param_based_cfg(self, cfg_no, parameter):
        if parameter is None:
            return cfg_no
        _cfg_number = str(int(cfg_no)).zfill(3)
        new_cfg_number = int(f"1{_cfg_number}{str(parameter).zfill(2)}")
        return new_cfg_number

    def create_additional_configs_for_parameter_based_tc(self):
        # Extract relevant columns directly
        cfg_nos = self.cfg_based_tc_df["CFG_NO"]
        parameters = self.cfg_based_tc_df["PARAMETER"]

        # Calculate the new CFG_NO values based on the presence of PARAMETER
        new_cfg_nos = (
            pl.when(parameters.is_null())
            .then(cfg_nos)
            .otherwise(
                (pl.lit("1") +
                cfg_nos.cast(pl.Utf8).str.zfill(3) +
                parameters.cast(pl.Utf8).str.zfill(2))
                .cast(pl.Int64)
            )
        )

        # Update the DataFrame with the new CFG_NO values
        self.cfg_based_tc_df = self.cfg_based_tc_df.with_columns(new_cfg_nos.alias("CFG_NO"))
        #self.cfg_based_tc_df.to_pandas().to_excel("CFG_TBL.xlsx")



    def _get_cfg_no_for_param_based_cfg(self, row: Dict):
        try:
            row_data = CfgBasedTcTable(**row)
            if row_data.PARAMETER is None:
                return row_data.CFG_NO
            _cfg_number = str(int(row_data.CFG_NO)).zfill(3)
            new_cfg_number = int(f"1{_cfg_number}{str(row_data.PARAMETER).zfill(2)}")
            return new_cfg_number
        except Exception as e:
            print(row)
            raise Exception
        
    def _create_additional_configs_for_parameter_based_tc(self):
        updated_values = [ self.get_cfg_no_for_param_based_cfg(row) for row in self.cfg_based_tc_df.to_dicts()]
        self.cfg_based_tc_df = self.cfg_based_tc_df.with_columns(pl.Series("CFG_NO", updated_values))
            
    def get_cfg_nos_for_param_based_tc(self,configs:List[int],parameter: str):
        if parameter is None:
            return []
        additional_configs = []
        try:
            row = self.test_parameters_df.filter(pl.col("PARAMETER")==parameter).row(0,named=True)
            row_data = TestParametersTable(**row)
        except OutOfBoundsError as e:
            raise Exception(f"Parameter:{parameter} Not Defined in TEST_PARAMETERS Table")
        for cfg in configs:
            _cfg_number = str(cfg).zfill(3)
            new_cfg_number = int(f"1{_cfg_number}{str(row_data.SNO).zfill(2)}")
            additional_configs.append(new_cfg_number)
        cfgs = set(self.cfg_based_tc_df["CFG_NO"].drop_nulls().unique().to_list()) & set(additional_configs)
        return list(cfgs)
    


    def gui_data(self):
        self.test_params = self.test_parameters_df["PARAMETER"].unique().to_list()
        self.boa_col_names =list(set(self.cfg_based_boa_df.columns) -set(["CFG_NO", "COMP", "CMD", "BOA_CAL_START","RESIDUAL_BOA"]))
        self.tc_file_names =self.tc_files_df["FILE_NAME"].unique().to_list() 
        self.tc_group_names =self.tc_details_df["GROUP_NAME"].unique().to_list() 
        self.data_commands_list = self.fetch_data_commands_list()
    # end def

    def get_test_parameter_names(self)->List[str]:
        return self.test_params

    def get_cfg_boa_col_names(self)->List[str]:
        return self.boa_col_names
    
    def get_tc_file_names(self)->List[str]:
        return self.tc_file_names
    
    def get_commands_group_names(self)->List[str]:
        return [x.upper() for x in self.tc_group_names]
    
    def get_manual_commands_list(self,group_names)->List[Dict[str,str]]:
        
        df = self.tc_details_df.sort("PRIORITY",descending=True).select(["GROUP_NAME","TC"])
        return [dict(zip(df.columns, row)) for row in df.rows()]  
       
        
    def fetch_data_commands_list(self)->List[str]:
        cmds = self.data_commands_df["TC"].unique().to_list()
        return  cmds
    
    def get_data_commands_list(self)->List[str]:
        return self.data_commands_list
    
    def get_data_commands_values(self,cmd: str)->Dict[str,str]:
        df = self.data_commands_df.filter(pl.col("TC") == cmd)
        data = dict(zip(df["DISPLAY_VALUE"].to_list(), df["DATA_CODE"].to_list()))
        return  data
    
        
if __name__ == "__main__":
    obj = ReadDatabase()

