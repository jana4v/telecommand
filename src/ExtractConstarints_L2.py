from typing import List
from .ReadDatabase_L1 import ReadDatabase
import polars as pl
from .Logging.Logger import logger
import time

class ExtractConstraints(ReadDatabase):
    def __init__(self):
        super().__init__()
        self.gui_status_update_raw(summary="Application", status="Finding CFG Wise Conflicts...")
        t1 = time.time()
        #self.conflict_cfgs_df = self.find_cfg_wise_conflicts_all_cfgs()
        self.conflict_cfgs_df = self.find_cfg_wise_conflicts_all_cfgs_optimized()
        print(time.time()-t1)
        self.gui_status_update_raw(summary="Application", status="Done Finding CFG Wise Conflicts...")

    def find_cfg_wise_conflicts(self,cfg_no: int) -> List[int]:
        cfg_tm_state = self.cfg_based_tc_df.filter(pl.col("CFG_NO") == cfg_no)[["TM", "TM_STATE"]]
        conflicts = []
        for row in cfg_tm_state.iter_rows(named=True):
            tm = row["TM"]
            tm_state = row["TM_STATE"]
            if tm is None:
                continue
            conflicting_cfgs = self.cfg_based_tc_df.filter((pl.col("TM") == tm) & (pl.col("TM_STATE") != tm_state))["CFG_NO"].unique()
            conflicts.extend(conflicting_cfgs)
        return list(set(conflicts))

    
    def find_cfg_wise_conflicts_all_cfgs_optimized(self) -> pl.DataFrame:
        # Group by 'TM' and then collect CFG_NO and TM_STATE into lists
        grouped_df = (
            self.cfg_based_tc_df.lazy()
            .group_by("TM")
            .agg([
                pl.col("CFG_NO").alias("CFG_NO_list"),
                pl.col("TM_STATE").alias("TM_STATE_list")
            ])
        ).collect()
        
        # Explode the lists so that we have one row per CFG_NO and TM_STATE
        exploded_df = grouped_df.explode(["CFG_NO_list", "TM_STATE_list"])
        
        # Self-join on 'TM' to create pairs of CFG_NO and TM_STATE for comparison
        conflict_data = (
            exploded_df.join(exploded_df, on="TM", how="inner", suffix="_right")
            .filter(pl.col("TM_STATE_list") != pl.col("TM_STATE_list_right"))
            .select([
                pl.col("CFG_NO_list").alias("CFG_NO"),
                pl.col("CFG_NO_list_right").alias("CONFLICT_CFG")
            ])
        )
        
        # Group the results by CFG_NO and aggregate the conflicts
        result = (
            conflict_data.group_by("CFG_NO")
            .agg(pl.col("CONFLICT_CFG").unique().alias("CONFLICT_CFGS"))
        )
        
        return result
    
    def find_cfg_wise_conflicts_chat_gpt(self, cfg_no: int) -> List[int]:
        # Filter the dataframe once for the given CFG_NO
        cfg_tm_state = self.cfg_based_tc_df.filter(pl.col("CFG_NO") == cfg_no)

        # Join the filtered dataframe with the main dataframe on the "TM" column
        # and get conflicts where TM_STATE does not match
        conflicts_df = cfg_tm_state.join(
            self.cfg_based_tc_df,
            on="TM",
            how="inner"
        ).filter(pl.col("TM_STATE") != pl.col("TM_STATE_right"))

        # Get unique conflicting CFG_NO values
        conflicts = conflicts_df.select("CFG_NO_right").unique().to_series().to_list()

        return conflicts

    
    def find_cfg_wise_conflicts_all_cfgs(self) -> pl.DataFrame:  
        conflict_data = []
        for cfg_no in self.cfg_based_tc_df["CFG_NO"].unique():
            # if cfg_no > 100:
            #     continue
            if cfg_no:
                conflict_cfgs = self.find_cfg_wise_conflicts(cfg_no)
                conflict_data.append({"CFG_NO": cfg_no, "CONFLICT_CFGS": conflict_cfgs})
        return pl.DataFrame(conflict_data)
    
    def get_conflict_cfgs(self,cfg_no: int) -> List[int]:
        data = self.conflict_cfgs_df.filter(pl.col("CFG_NO") == cfg_no)["CONFLICT_CFGS"].to_list()
        if len(data):
            return data[0]
        else:
            return []
    
    def get_list_of_non_conflict(self, configs: List[int]) -> set[int]:
        if len(configs) == 1:
            return set(configs)
        non_conflict = set([configs[0]])
        for cfg in configs[1:]:
            conflict_cfgs = self.get_conflict_cfgs(cfg)
            if conflict_cfgs is None:
                conflict_cfgs = []
            if len(non_conflict & set(conflict_cfgs)) == 0:
                non_conflict.add(cfg)
        logger.info(f"Allowed Configs: {non_conflict}")
        return set(non_conflict)

    def get_disturbed_configurations(self, active_configurations, configurations_to_set)->set[int]:
        disturbed_configurations = set([])
        for cfg_no in active_configurations:
            if cfg_no in configurations_to_set:
                continue
            else:
                if len(set(configurations_to_set) & set(self.get_conflict_cfgs(cfg_no))) > 0:
                    disturbed_configurations.add(cfg_no)
        return disturbed_configurations