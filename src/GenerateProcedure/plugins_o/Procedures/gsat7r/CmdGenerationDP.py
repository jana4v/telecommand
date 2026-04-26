from typing import List,Dict
import polars as pl
import re,os
import copy
import functools
excel_path = os.path.join(os.path.dirname(__file__), "DP_for_command_generation_data.xlsx")
if not os.path.exists(excel_path):
    raise FileNotFoundError(f"Excel file not found at {excel_path}. Please ensure the file exists.") 

rl_power_tm_limit_map = {
            1: 0b0000000000000001,
            2: 0b0000000000000010,
            3: 0b0000000000000011,
            4: 0b0000000000000100,
            5: 0b0000000000000101,
            6: 0b0000000000000110,
            8: 0b0000000000001000,
            10: 0b0000000000001010,
            13: 0b0000000000001101,
            16: 0b0000000000010000,
            20: 0b0000000000010100,
            25: 0b0000000000011001,
            31: 0b0000000000011111,
            39: 0b0000000000100111,
            50: 0b0000000000110010,
            63: 0b0000000000111111,
            79: 0b0000000001001111,
            100: 0b0000000001100100,
            126: 0b0000000001111110,
            158: 0b0000000010011110,
            199: 0b0000000011000111,
            251: 0b0000000011111011,
            316: 0b0000000100111100,
            398: 0b0000000110001110,
            501: 0b0000000111110101
        }

rl_power_limit_map = {
            0: 0b000000,
            1: 0b100001,
            2: 0b010001,
            3: 0b000001,
            4: 0b100010,
            5: 0b010010,
            6: 0b000010,
            7: 0b100011,
            8: 0b010011,
            9: 0b000011,
            10: 0b100100,
            11: 0b010100,
            12: 0b000100,
            13: 0b100101,
            14: 0b010101,
            15: 0b000101,
            16: 0b100110,
            17: 0b010110,
            18: 0b000110,
            19: 0b100111,
            20: 0b010111,
            21: 0b000111,
            22: 0b101000,
            23: 0b011000,
            24: 0b001000,
            25: 0b101001,
            26: 0b011001,
            27: 0b001001,
            28: 0b101010,
            29: 0b011010,
            30: 0b001010,
            31: 0b101011,
            32: 0b011011,
            33: 0b001011,
            34: 0b101100,
            35: 0b011100,
            36: 0b001100,
            37: 0b101101,
            38: 0b011101,
            39: 0b001101,
            40: 0b101110,
            41: 0b011110,
            42: 0b001110
        }

def catch_and_report_errors(cls):
    for attr_name, attr in cls.__dict__.items():
        if callable(attr) and not attr_name.startswith("__"):
            @functools.wraps(attr)
            def wrapper(self, *args, __func=attr, __name=attr_name, **kwargs):
                try:
                    return __func(self, *args, **kwargs)
                except Exception as e:
                    msg = f"Error in function: {__name}: {e}"
                    print(msg)
                    raise Exception(msg) from e
            setattr(cls, attr_name, wrapper)
    return cls


@catch_and_report_errors
class DigitalProcessor:
    def __init__(self):
        self.DP_CFG = pl.read_excel(excel_path,sheet_name="CFG",infer_schema_length=None)
        self.DP_RT_ADDRESS = pl.read_excel(excel_path,sheet_name="RT_ADDRESS",infer_schema_length=None)
        self.NCO1_FREQ = pl.read_excel(excel_path,sheet_name="CH_NCO1",infer_schema_length=None)
        self.ch_2nd_nco_sub_address_map = { "m1": 6, "m2": 7, "r1": 8, "r2": 9  }
        self.epc_commands = pl.read_excel(excel_path,sheet_name="EPC_COMMANDS",infer_schema_length=None)
        self.config_set_mmap_df = pl.read_excel(excel_path,sheet_name="CFG_TO_SET_MAP",infer_schema_length=None)
        self.valid_commands_df = pl.read_excel(excel_path,sheet_name="VALID_COMMANDS",infer_schema_length=None)
        self.commnds_for_saw_path_df = pl.read_excel(excel_path,sheet_name="ENSURE_SAW_PATH",infer_schema_length=None)
        self.dp_tm = pl.read_excel(excel_path,sheet_name="DP_TM",infer_schema_length=None)
        self.dp_path_sw_fl_cfgs = pl.read_excel(excel_path,sheet_name="DP_PATH_SW_CFGS",infer_schema_length=None).unpivot(variable_name="MNEMONIC", value_name="CFG")
        self._line_number = 1  # Initialize line number for command generation
        self.live_tm_data: Dict[str, str] = {}  # Dictionary to hold live TM data for injection
        cols_to_keep = [ col for col in self.commnds_for_saw_path_df.columns if not self.commnds_for_saw_path_df.select(pl.col(col).is_null().all()).item()]
        self.commnds_for_saw_path_df = self.commnds_for_saw_path_df.select(cols_to_keep)
        self.commnds_for_saw_path_df = self.commnds_for_saw_path_df.with_columns( pl.col("RL_SYN").fill_null(""))
        self.request_cfgs  =  []

    def expecte_tms_for_saw_path_df(self,df:pl.DataFrame) -> pl.DataFrame:
        tm_cols = [col for col in df.columns if re.match(r"TM\d+$", col)]
        tm_state_cols = [col for col in df.columns if re.match(r"TM\d+(_STATE)", col)]
        # Melt TM columns


        df_tm = df.select(["SNO", "MNEMONIC"] + tm_cols).unpivot(
            index=["SNO", "MNEMONIC"],
            on=tm_cols,
            variable_name="TM_INDEX",
            value_name="TM"
        )

        # Melt TM_STATE columns
        df_state = df.select(["SNO", "MNEMONIC"] + tm_state_cols).unpivot(
            index=["SNO", "MNEMONIC"],
            on=tm_state_cols,
            variable_name="STATE_INDEX",
            value_name="TM_STATE"
        )

        # Convert Series to DataFrame before concat
        df_combined = pl.concat([df_tm, df_state.select(["TM_STATE"])], how="horizontal")

        # Drop rows where TM is null
        df_cleaned = df_combined.filter(pl.col("TM").is_not_null())

        df = df_cleaned.select(pl.col(["TM","TM_STATE"]))
        df = df.with_columns([
            (pl.arange(0, df.height) // 5).alias("group_id"),    # one row per 4 entries
            (pl.arange(0, df.height) % 5 + 1).alias("position")   # TM1, TM2...
        ])

        # Pivot the data
        tm_pivot = df.pivot(
            values="TM",
            index="group_id",
            on="position"
        ).rename({str(i): f"TM{i}" for i in range(1, df.height+1)})

        state_pivot = df.pivot(
            values="TM_STATE",
            index="group_id",
            on="position"
        ).rename({str(i): f"TM{i}_STATE" for i in range(1, df.height+1)})

        # Combine
        return pl.concat([tm_pivot, state_pivot.drop("group_id") ], how="horizontal")


    def _get_line_number(self):
        line_number = str(self._line_number).zfill(3)
        self._line_number += 1 
        return line_number
    
    def get_set_type(self, cfg_number: int) -> str:
        row = self.config_set_mmap_df.filter(pl.col("CONFIG") == cfg_number)
        if row.is_empty():
            raise ValueError(f"No set number found for CONFIG {cfg_number}")
        return row["LINK"].to_list()[0]

    def get_df(self, cfg_number: int) -> pl.DataFrame:
        """
        Get the set number for a given configuration number.
        Returns: int, the set number
        """
        # Filter the DataFrame to find the row with the matching CONFIG
        row = self.config_set_mmap_df.filter(pl.col("CONFIG") == cfg_number)
        if row.is_empty():
            raise ValueError(f"No set number found for CONFIG {cfg_number}")
        return self.DP_CFG.filter(pl.col("SET") == row["SET"].to_list()[0],pl.col("LINK") == row["LINK"].to_list()[0])

    def get_set_name(self, cfg_number: int) -> str:
        """
        Get the set number for a given configuration number.
        Returns: int, the set number
        """
        # Filter the DataFrame to find the row with the matching CONFIG
        df = self.config_set_mmap_df.filter(pl.col("CONFIG") == cfg_number)
        if df.is_empty():
            raise ValueError(f"No set number found for CONFIG {cfg_number}")
        row = df.row(0,named=True)
        return f"{row['LINK']}_LINK_SET_{row['SET']}"
        

    def binary_to_hex_data_bytes(self,bin_str):
        # Ensure length is multiple of 4
        bin_str = bin_str.zfill((len(bin_str) + 3) // 4 * 4)
        # Convert to integer and format as uppercase hex
        s = f"{int(bin_str, 2):0{len(bin_str) // 4}X}"
        data_bytes = [s[i:i+2] for i in range(0, len(s), 2)]
        return data_bytes

    def rl_generate_power_limit_words(self, cfg_number: int) -> List[str]:
        df = self.get_df(cfg_number)
        power_limit_value = df["RL_POWER_LIMIT"].to_list()[0]
        power_limit_for_tm = df["RL_POWER_LIMIT_TM"].drop_nulls().to_list()
        if len(power_limit_for_tm) > 0:
            power_limit_for_tm = int(power_limit_for_tm[0])
        else:
            power_limit_for_tm = 1
        power_limit_value_bits = rl_power_limit_map[int(power_limit_value)]
        power_limit_for_tm_bits = rl_power_tm_limit_map[power_limit_for_tm]
        word1 = f"{power_limit_value_bits:016b}"
        word2 = f"{power_limit_for_tm_bits:016b}"
        code = f"{word1}{word2}"
        address = 11
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == address)["ADDRESS"][0].zfill(4)
        cmd = ['RL Power Limit','sendtcp', '1553trantmtcbus',rt_address]
        data_bytes = self.binary_to_hex_data_bytes(code)
        cmd.extend(data_bytes)
        return cmd
    
    def fl_generate_power_limit_words(self, cfg_number: int) -> List[str]:
        df = self.get_df(cfg_number)
        power_limit_value = df["FL_POWER_LIMIT"].to_list()[0]
        power_limit_value_bits = rl_power_limit_map[int(power_limit_value)]
        code = f"{power_limit_value_bits:016b}"
        address = 2
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == address)["ADDRESS"][0].zfill(4)
        cmd = ['FL Power Limit','sendtcp', '1553trantmtcbus',rt_address]
        data_bytes = self.binary_to_hex_data_bytes(code)
        cmd.extend(data_bytes)
        return cmd
    
    def rl_generate_ch_1st_nco_band_select_words(self,cfg_number:int) -> list:
        """
        channelizer_freq_map: dict with keys:
            m1_1, m1_2, m2_1, m2_2, r1_1, r1_2, r2_1, r2_2
            and values: frequency code as 'f1', 'f2', ..., or actual freq string

        Returns (band_select1_16bit, band_select2_16bit) as binary strings
        """
        NCO1 = self.get_df(cfg_number)
        #NCO1 = NCO1.join(NCO1_FREQ,on="CHANNELIZER_IP_FREQUENCIES")
        channelizer_freq_map = dict(zip(NCO1["RL_CHANNELIZER_IP_PORTS"].to_list(), NCO1["RL_CHANNELIZER_IP_FREQUENCIES"].to_list()))
        FREQ_TO_CODE = {"292.5": 0b001,"297.5": 0b010,"302.5": 0b011,"307.5": 0b100, "312.5": 0b101, "317.5": 0b110}
        FREQ_CODE_MAP = {"f1": 0b001, "f2": 0b010,"f3": 0b011,"f4": 0b100,"f5": 0b101,"f6": 0b110}
        # Select your map depending on input:
        code_map = FREQ_CODE_MAP if list(channelizer_freq_map.values())[0].startswith('f') else FREQ_TO_CODE

        # BAND SELECT 1 bit assignment:
        # Bit  2-0: m1_1 (ADC-A, Ch1 Main)
        # Bit  5-3: m1_2 (ADC-B, Ch1 Main)
        # Bit  8-6: m2_1 (ADC-A, Ch2 Main)
        # Bit 11-9: m2_2 (ADC-B, Ch2 Main)
        # Bit 14-12: r1_1 (ADC-A, Ch3 Redundant-1)
        band_select1 = 0
        band_select1 |= (code_map[channelizer_freq_map["m1_1"]] & 0b111)         # bits 2-0
        band_select1 |= (code_map[channelizer_freq_map["m1_2"]] & 0b111) << 3    # bits 5-3
        band_select1 |= (code_map[channelizer_freq_map["m2_1"]] & 0b111) << 6    # bits 8-6
        band_select1 |= (code_map[channelizer_freq_map["m2_2"]] & 0b111) << 9    # bits 11-9
        band_select1 |= (code_map[channelizer_freq_map["r1_1"]] & 0b111) << 12   # bits 14-12

        # BAND SELECT 2 bit assignment:
        # Bit  2-0: r1_2 (ADC-B, Ch3 Redundant-1)
        # Bit  5-3: r2_1 (ADC-A, Ch4 Redundant-2)
        # Bit  8-6: r2_2 (ADC-B, Ch4 Redundant-2)
        band_select2 = 0
        band_select2 |= (code_map[channelizer_freq_map["r1_2"]] & 0b111)         # bits 2-0
        band_select2 |= (code_map[channelizer_freq_map["r2_1"]] & 0b111) << 3    # bits 5-3
        band_select2 |= (code_map[channelizer_freq_map["r2_2"]] & 0b111) << 6    # bits 8-6

        # Format as 16-bit binary string
        bs1_str = f"{band_select1:016b}"
        bs2_str = f"{band_select2:016b}"
        code = f"{bs1_str}{bs2_str}"
        
        address = 5
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == address)["ADDRESS"][0].zfill(4)
        cmd = ['RL Channelizer 1st NCO Select','sendtcp', '1553trantmtcbus',rt_address]
        data_bytes = self.binary_to_hex_data_bytes(code)
        cmd.extend(data_bytes)
        return cmd


    def rl_make_ch_2nd_nco_word(self,channel: int, nco_value: int) -> str:
        """
        Generate a 16-bit binary string for the NCO word.
        channel: int (0-7), will be placed in bits 11-9
        nco_value: int (0-511), will be placed in bits 8-0
        Returns: string, e.g., '0001000100001011'
        """
        # Limit channel and nco_value to their ranges
        channel = (channel-1) & 0b111       # 3 bits
        nco_value = nco_value & 0x1FF   # 9 bits

        word = (channel << 9) | nco_value
        # Format as 16-bit binary string
        return f"{word:016b}"

    def rl_generate_ch_2nd_nco_band_select_words(self, cfg_number: int) -> List[List[str]]:
        """
        Generate the 2nd NCO band select words for a given configuration number.
        Returns a list of commands to be sent.
        """
        # Get the NCO2 frequencies for the given configuration
        nco2 = self.get_df(cfg_number).select(pl.col(["RL_CHANNELIZER_OP_PORTS", "RL_CHANNELIZER_OP_NCO_COUNT"])).to_dict(as_series=False)
        nco2 = dict(zip(nco2["RL_CHANNELIZER_OP_PORTS"], nco2["RL_CHANNELIZER_OP_NCO_COUNT"]))
        # Create the command list
        
        commands = []
        for ch_channel, count in nco2.items():
            channelizer, channel = ch_channel.split('_')  # Extract the port name (e.g., 'm1', 'm2', etc.)
            nco_word = self.rl_make_ch_2nd_nco_word(int(channel), int(count))
            rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == self.ch_2nd_nco_sub_address_map[channelizer])["ADDRESS"][0].zfill(4)
            cmd = [f'RL Channelizer 2nd NCO Select for channel:{ch_channel}','sendtcp', '1553trantmtcbus', rt_address]
            data_bytes = self.binary_to_hex_data_bytes(nco_word)
            cmd.extend(data_bytes)
            commands.append(cmd)
        return commands
    
    def rl_comm_channel_selectio_code(self,ch_port: str) -> str:
        """
        ch_port: string like 'm1_1', 'm2_4', 'r1_8', etc.
        Returns a 5-bit binary code string, e.g. '00000' (for m1_1), '01101' (for m2_2)
        """
        channelizer_map = {
            "m1": 0b00,
            "m2": 0b01,
            "r1": 0b10,
            "r2": 0b11,
        }
        ch, port = ch_port.split("_")
        port_num = int(port)
        ch_bits = channelizer_map[ch]      # 2 bits
        port_bits = port_num - 1           # Port 1 = 0, Port 2 = 1, ... Port 8 = 7
        # Compose: [ch_bits (2)] [port_bits (3)]
        code = (ch_bits << 3) | port_bits
        return f"{code:016b}"
    
    def rl_generate_com_and_power_channel_select_words(self, cfg_number: int) -> List[List[str]]:
        """
        Generate the 2nd NCO band select words for a given configuration number.
        Returns a list of commands to be sent.
        """
        # Get the NCO2 frequencies for the given configuration
        com_channels = (self.get_df(cfg_number)["RL_COM_CHANNEL_SELECT"].drop_nulls().to_list())
        pow_channels = (self.get_df(cfg_number)["RL_POWER_CHANNEL_SELECT"].drop_nulls().to_list())
        # Create the command list
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == 10)["ADDRESS"][0].zfill(4)
        cmd = ['RL Select COM & Power Channels','sendtcp', '1553trantmtcbus', rt_address]
        command_bytes = []
        for com_channel in com_channels:
            nco_word = self.rl_comm_channel_selectio_code(com_channel)
            data_bytes = self.binary_to_hex_data_bytes(nco_word)
            command_bytes.extend(data_bytes)
        for pow_channel in pow_channels:
            nco_word = self.rl_comm_channel_selectio_code(pow_channel)
            data_bytes = self.binary_to_hex_data_bytes(nco_word)
            command_bytes.extend(data_bytes)

        cmd.extend(command_bytes)
        return cmd
    
    def rl_generate_sub_channel_select_words(self, cfg_number: int) -> List[str]:
        """
        Generate the sub-channel select words for a given configuration number.
        Returns a list of commands to be sent.
        """
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == 18)["ADDRESS"][0].zfill(4)
        sub_channel_code = (self.get_df(cfg_number)["RL_SUB_CHANNEL"].drop_nulls().to_list())[0].zfill(16)
        cmd = ['RL Select Sub-Channel','sendtcp', '1553trantmtcbus', rt_address]
        data_bytes = self.binary_to_hex_data_bytes(sub_channel_code)
        cmd.extend(data_bytes)
        return cmd
    
    def rl_generate_gain_word_for_rl_channels(self,cfg_number:int):
        gain_to_code = {
            0.0:   0b0000,
            1.0:   0b0001,
            2.0:   0b0010,
            3.0:   0b0011,
            4.0:   0b0100,
            5.0:   0b0101,
            6.0:   0b0110,
            7.0:   0b0111,
            8.0:   0b1000,
            9.0:   0b1001,
            10.0:  0b1010,
            5.5:   0b1011,
            6.5:   0b1100,
            7.5:   0b1101,
            8.5:   0b1110,
            9.5:   0b1111,
        }

        gain_to_code = {
            5.0:0b0000,
            4.0:0b0001,
            3.0:0b0010,
            2.0:0b0011,
            1.0:0b0100,
            0.0:0b0101,
            -0.5:0b1011,
            -1.0:0b0110,
            -1.5:0b1100,
            -2.0:0b0111,
            -2.5:0b1101,
            -3.0:0b1000,
            -3.5:0b1110,
            -4.0:0b1001,
            -4.5:0b1111,
            -5.0:0b1010,
        }
    


        com_channel_gains = (self.get_df(cfg_number)["RL_GAIN_CONTROL_DB"].drop_nulls().to_list())
        code_word = ""
        for val in com_channel_gains:
            codes = [float(x) for x in val.split(",")]
            for code in codes:
                if code not in gain_to_code:
                    raise ValueError(f"Gain {code}dB is not a valid code. Allowed: {list(gain_to_code.keys())}")
            word = (
                (gain_to_code[codes[3]] << 12) |
                (gain_to_code[codes[2]] << 8)  |
                (gain_to_code[codes[1]] << 4)  |
                (gain_to_code[codes[0]])
            )
            code_word +=f"{word:016b}"  # return as 16-bit binary string
        # Convert to hex data bytes
        data_bytes = self.binary_to_hex_data_bytes(code_word)
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == 12)["ADDRESS"][0].zfill(4) 
        cmd = ['RL Gain For Channels','sendtcp', '1553trantmtcbus', rt_address]
        cmd.extend(data_bytes)
        return cmd

    def rl_generate_synthesizer_nco_word(self,cfg_number:int):
        """
        nco_value: int (0 to 2047)
        Returns a 16-bit binary string with bits [10:0] = nco_value, others 0.
        """
        nco_counts = (self.get_df(cfg_number)["RL_SYNTHESIZER_NCO_COUNT"].drop_nulls().to_list())
        if len(nco_counts) == 0:
            return []
        code_word = ""
        for count in nco_counts:
            if not isinstance(count, int):
                raise ValueError("RL_SYNTHESIZER_NCO_COUNT must be an integer")
            if not (0 <= count < 2048):
                raise ValueError("RL_SYNTHESIZER_NCO_COUNT must be in the range 0..2047 (11 bits)")
            word = count & 0x7FF  # Mask to 11 bits
            code_word += f"{word:016b}"
        data_bytes = self.binary_to_hex_data_bytes(code_word)
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == 13)["ADDRESS"][0].zfill(4) 
        cmd = ['RL Generate Synthesizer NCO Word','sendtcp', '1553trantmtcbus', rt_address]
        cmd.extend(data_bytes)
        return cmd 
    
    def generate_channelizer_epc_select_to_turn_on(self,cfg_number:int):
        channelizer_order = [ "RL_C_R2","RL_C_R1","RL_C_M2","FL_C_R","RL_C_M1","FL_C_M"]
        # Create the command list
        selection = self.get_df(cfg_number).select(pl.col(["EPC_SELECT_CHANNELIZER", "EPC_SELECT_CHANNELIZER_BIT"])).drop_nulls()
        commands_list = []
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == 14)["ADDRESS"][0].zfill(4)
        bits = []
        for channelizer in channelizer_order:
            bits.append(str(selection.filter(pl.col("EPC_SELECT_CHANNELIZER") == channelizer)["EPC_SELECT_CHANNELIZER_BIT"].to_list()[0]))
        
        bits = bits[::-1]  # Now bits[0] is LSB (FL_C_M), bits[5] is MSB (RL_C_R2)
        channelizer_order = channelizer_order[::-1]  # Reverse order to match bits
        current_bits = ["0"] * len(bits)
        on_count = 0
        for i, b in enumerate(bits):
            if b == "1":
                current_bits[i] = "1"
                on_count += 1
                if on_count > 3:
                    break
                bits_str = "".join(current_bits[::-1])  # Reverse back to MSB->LSB for data word
                bits_str = bits_str.zfill(16)
                data_bytes = self.binary_to_hex_data_bytes(bits_str)
                if i == 2:
                    commands_list.append(self.master_clock_select_code("FL_REDT"))
                cmd = [f'Channelizer EPC {channelizer_order[i]} to turn On', 'sendtcp', '1553trantmtcbus', rt_address] + data_bytes
                commands_list.append(cmd)
        return commands_list 
    
    def generate_channelizer_epc_select_to_turn_off(self,cfg_number:int=None):
        channelizer_order = [ "RL_C_R2","RL_C_R1","RL_C_M2","FL_C_R","RL_C_M1","FL_C_M"]
        mnemonics = [
            "DIG_PROC_CHNZR_RLINK_REDT2_EPC_STS",
            "DIG_PROC_CHNZR_RLINK_REDT1_EPC_STS",
            "DIG_PROC_CHNZR_RLINK_MAIN2_EPC_STS",
            "DIG_PROC_CHNZR_FLINK_REDT_EPC_STS",
            "DIG_PROC_CHNZR_RLINK_MAIN1_EPC_STS",
            "DIG_PROC_CHNZR_FLINK_MAIN_EPC_STS"
        ]
        commands_list = []
        bits = []
        if cfg_number is None:
            for  i,mnemonic in enumerate(mnemonics):
                actual_mnemonic = self.dp_tm.filter(pl.col("MNEMONIC") == mnemonic)["TM_MNEMONIC"].to_list()[0]
                mnemonics[i] = actual_mnemonic
                sts = self.live_tm_data.get(actual_mnemonic.lower(), "0")
                if sts == 'on':
                    bits.append("1")
                else:
                    bits.append("0")
        else:
            # Create the command list
            selection = self.get_df(cfg_number).select(pl.col(["EPC_SELECT_CHANNELIZER", "EPC_SELECT_CHANNELIZER_BIT"])).drop_nulls()
            commands_list = []
            for channelizer in channelizer_order:
                bits.append(str(selection.filter(pl.col("EPC_SELECT_CHANNELIZER") == channelizer)["EPC_SELECT_CHANNELIZER_BIT"].to_list()[0]))
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == 14)["ADDRESS"][0].zfill(4)
        bits = bits[::-1]  # Now bits[0] is LSB (FL_C_M), bits[5] is MSB (RL_C_R2)
        channelizer_order = channelizer_order[::-1]  # Reverse order to match bits
        current_bits = copy.deepcopy(bits)  # Start with all bits as they are
        for i, b in enumerate(bits):
            if b == "1":
                if i == 0:
                    continue
                current_bits[i] = "0"
                current_bits[0] = "1"
                bits_str = "".join(current_bits[::-1])  # Reverse back to MSB->LSB for data word
                bits_str = bits_str.zfill(16)
                data_bytes = self.binary_to_hex_data_bytes(bits_str)
                cmd = [f'Select Channelizer EPC {channelizer_order[i]} to turn Off', 'sendtcp', '1553trantmtcbus', rt_address] + data_bytes
                commands_list.append(cmd)
        return commands_list 

    def which_return_link_synthesizer_is_going_to_on(self,cfg_number:int):
        channelizer_order = [ "RL_S_R","RL_S_M"]
        
        # Create the command list
        selection = self.get_df(cfg_number).select(pl.col(["EPC_SELECT_SYNTHESIZER","EPC_SELECT_SYNTHESIZER_BIT"])).drop_nulls()
        rl_synth = ""
        for channelizer in channelizer_order:
            if str(selection.filter(pl.col("EPC_SELECT_SYNTHESIZER") == channelizer)["EPC_SELECT_SYNTHESIZER_BIT"].to_list()[0]) == "1":
                rl_synth = channelizer
        if rl_synth == "RL_S_R":
            rl_synth = "REDT"
        elif rl_synth == "RL_S_M":
            rl_synth = "MAIN"
        return rl_synth

    def generate_synthesizer_epc_select_to_turn_on(self,cfg_number:int):
        channelizer_order = [ "RL_S_R","FL_S_R","FL_S_M2","RL_S_M","FL_S_M1"]
        # Create the command list
        selection = self.get_df(cfg_number).select(pl.col(["EPC_SELECT_SYNTHESIZER","EPC_SELECT_SYNTHESIZER_BIT"])).drop_nulls()
        commands_list = []
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == 15)["ADDRESS"][0].zfill(4)
        bits = []
        for channelizer in channelizer_order:
            bits.append(str(selection.filter(pl.col("EPC_SELECT_SYNTHESIZER") == channelizer)["EPC_SELECT_SYNTHESIZER_BIT"].to_list()[0]))

        bits = bits[::-1]  # Now bits[0] is LSB (FL_S_M1), bits[5] is MSB (RL_S_R)
        channelizer_order = channelizer_order[::-1]  # Reverse order to match bits
        current_bits = ["0"] * len(bits)
        on_count = 0
        for i, b in enumerate(bits):
            if b == "1":
                current_bits[i] = "1"
                on_count += 1
                if on_count > 3:
                    break
                bits_str = "".join(current_bits[::-1])  # Reverse back to MSB->LSB for data word
                bits_str = bits_str.zfill(16)
                data_bytes = self.binary_to_hex_data_bytes(bits_str)
                cmd = [f'Select Synthesizer EPC {channelizer_order[i]} to turn On', 'sendtcp', '1553trantmtcbus', rt_address] + data_bytes
                commands_list.append(cmd)
        return commands_list 
    
    def generate_synthesizer_epc_select_to_turn_off(self,cfg_number:int):
        channelizer_order = [ "RL_S_R","FL_S_R","FL_S_M2","RL_S_M","FL_S_M1"]
        mnemonics = [
            "DIG_PROC_SYNTH_RLINK_REDT_EPC_STS",
            "DIG_PROC_SYNTH_FLINK_REDT_EPC_STS",
            "DIG_PROC_SYNTH_FLINK_MAIN2_EPC_STS",
            "DIG_PROC_SYNTH_RLINK_MAIN_EPC_STS",
            "DIG_PROC_SYNTH_FLINK_MAIN1_EPC_STS"
        ]
        bits = []
        commands_list = []
        if cfg_number is None:
            for  i,mnemonic in enumerate(mnemonics):
                actual_mnemonic = self.dp_tm.filter(pl.col("MNEMONIC") == mnemonic)["TM_MNEMONIC"].to_list()[0]
                mnemonics[i] = actual_mnemonic
                sts = self.live_tm_data.get(actual_mnemonic.lower(), "0")
                if sts == 'on':
                    bits.append("1")
                else:
                    bits.append("0")
        else:
            # Create the command list
            selection = self.get_df(cfg_number).select(pl.col(["EPC_SELECT_SYNTHESIZER","EPC_SELECT_SYNTHESIZER_BIT"])).drop_nulls()
            commands_list = []
            for channelizer in channelizer_order:
                bits.append(str(selection.filter(pl.col("EPC_SELECT_SYNTHESIZER") == channelizer)["EPC_SELECT_SYNTHESIZER_BIT"].to_list()[0]))
             
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == 13)["ADDRESS"][0].zfill(4)
        
        
            
        bits = bits[::-1]  # Now bits[0] is LSB (FL_S_M1), bits[5] is MSB (RL_S_R)
        channelizer_order = channelizer_order[::-1]  # Reverse order to match bits
        current_bits = copy.deepcopy(bits)  # Start with all bits as they are
        for i, b in enumerate(bits):
            if b == "1":
                if i == 0:
                    continue
                current_bits[i] = "0"
                current_bits[0] = "1"
                bits_str = "".join(current_bits[::-1])  # Reverse back to MSB->LSB for data word
                bits_str = bits_str.zfill(16)
                data_bytes = self.binary_to_hex_data_bytes(bits_str)
                cmd = [f'Select Synthesizer EPC {channelizer_order[i]} to turn Off', 'sendtcp', '1553trantmtcbus', rt_address] + data_bytes
                commands_list.append(cmd)
        return commands_list 

    
    def mesh_link_control_word(self,
        mesh_enable: int,        # 0 or 1
        rl_chan_id: int,         # 0-3 (2 bits)
        port: str                # e.g. 'P13', 'P14', 'P13&P14', 'P15', 'P16', 'P15&P16', etc.
    ):
        """
        mesh_enable: 0=disable, 1=enable (bit 0)
        rl_chan_id: int, Return Link Channel Identifier (bits 2-1)
        port: Which port or ports (e.g. 'P13', 'P13&P14', ...)
        Returns: 16-bit binary codeword as string
        """
        # Validate
        assert mesh_enable in (0, 1)
        assert 0 <= rl_chan_id <= 3

        # Deduce synthesizer and bits 6-5
        if port in ('P13', 'P14', 'P13&P14'):
            bits_6_5 = 0b00  # M1
        elif port in ('P15', 'P16', 'P15&P16'):
            bits_6_5 = 0b01  # M2
        elif port in ('P17', 'P18', 'P17&P18'):
            bits_6_5 = 0b10  # REDT
        else:
            raise ValueError(f"Unknown port: {port}")

        # Port selection for bits 4-3 (as per image logic)
        port_map = {
            'P13': 0b01, 'P14': 0b10, 'P13&P14': 0b01,    # Both P13 and P14: use '01'
            'P15': 0b01, 'P16': 0b10, 'P15&P16': 0b01,
            'P17': 0b01, 'P18': 0b10, 'P17&P18': 0b01,
        }
        bits_4_3 = port_map[port]

        # Compose the word
        word = (
            (bits_6_5 << 5) |              # bits 6-5: synth number
            (bits_4_3 << 3) |              # bits 4-3: port(s)
            ((rl_chan_id & 0b11) << 1) |   # bits 2-1: channel ID
            (mesh_enable & 0b1)            # bit 0: enable
        )
        return f"{word:016b}"
        
    def generate_mesh_link_control_word(self,cfg_number:int):
        selection = self.get_df(cfg_number).select(pl.col(["MESH_LINK"])).drop_nulls()["MESH_LINK"].to_list()
        words = ""
        remark = "Disable Mesh Link"
        for mesh_link in selection:
            enable,com_channel,port = mesh_link.split(",")
            # Extract parameters from the mesh_link
            mesh_enable = enable == 'E'
            if mesh_enable:
                remark = "Enable Mesh Link Selection"
            rl_chan_id = int(com_channel[-1])  # Assuming 'RL_C_M1', 'RL_C_M2', etc. and extracting the last character
            # Generate the control word
            words += self.mesh_link_control_word(mesh_enable, rl_chan_id, port)
        # Convert to hex data bytes
        if len(words):
            data_bytes = self.binary_to_hex_data_bytes(words)
            rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == 16)["ADDRESS"][0].zfill(4)
            cmd = [remark,'sendtcp', '1553trantmtcbus', rt_address]
            cmd.extend(data_bytes)
            return cmd
    
    def reconfig_control_word(self,cmd: str) -> List[str]:
        """
        cmd: command name (case-insensitive, keywords below)
        Returns: 16-bit binary codeword as a string
        """

        cmd_map = {
            "FL_MAIN_CHAN":        0b0000,
            "RL_MAIN1_CHAN":       0b0001,
            "FL_REDT_CHAN":        0b0010,
            "RL_MAIN2_CHAN":       0b0011,
            "RL_REDT1_CHAN":       0b0100,
            "RL_REDT2_CHAN":       0b0101,
            "FL_MAIN1_SYNTH":      0b0110,
            "RL_MAIN_SYNTH":       0b0111,
            "FL_MAIN2_SYNTH":      0b1000,
            "FL_REDT_SYNTH":       0b1001,
            "RL_REDT_SYNTH":       0b0111,   # Looks like 0111 appears twice; use as needed!
        }

        cmd_key = cmd.strip().upper()
        if cmd_key not in cmd_map:
            raise ValueError(
                f"Unknown command. Allowed keys: {list(cmd_map.keys())}"
            )

        word = cmd_map[cmd_key]
        word = f"{word:016b}"
        data_bytes = self.binary_to_hex_data_bytes(word)
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == 17)["ADDRESS"][0].zfill(4)
        cmd_list = ['Reconfig Control Word','sendtcp', '1553trantmtcbus', rt_address]
        cmd_list.extend(data_bytes)
        return cmd_list

    def master_clock_select_code(self,chan: str) -> List[str]:
        """
        chan: string for channelizer, one of:
            "FL_MAIN", "RL_MAIN1", "FL_REDT", "RL_MAIN2", "RL_REDT1", "RL_REDT2"
        Returns: 16-bit binary codeword string
        """
        chan_map = {
            "FL_MAIN":   0b000,
            "RL_MAIN1":  0b001,
            "FL_REDT":   0b010,
            "RL_MAIN2":  0b011,
            "RL_REDT1":  0b100,
            "RL_REDT2":  0b101,
            # 0b110, 0b111 are "don't care"
        }
        key = chan.strip().upper()
        if key not in chan_map:
            raise ValueError(
                f"Unknown channelizer. Use one of {list(chan_map.keys())}"
            )
        word = chan_map[key]
        word = f"{word:016b}"
        data_bytes = self.binary_to_hex_data_bytes(word)
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == 19)["ADDRESS"][0].zfill(4)
        cmd_list = [f'Select {chan} as Master Clock','sendtcp', '1553trantmtcbus', rt_address]
        cmd_list.extend(data_bytes)
        return cmd_list
    
    async def fl_out_put_switch_commands(self, cfg_number: int, is_before_on: bool) -> str:
        commands = []
        expected_tms = []
        col_names = ["EXPECTED_TM_FL_OP_SWITCH","FL_OP_SWITCH"]
        selection = self.get_df(cfg_number).select(pl.col(col_names)).drop_nulls()
        for row in selection.iter_rows(named=True):
            tm = row['FL_OP_SWITCH']
            expected_val = row['EXPECTED_TM_FL_OP_SWITCH']
            commands.append(tm)
            expected_tms.append(expected_val)
            
        return "\n".join(commands)

    async def generate_saw_path_commands(self,cfg_number: int, is_before_on:bool) -> str:
        """
        Generate commands to ensure the SAW path is set correctly for the given configuration number.
        Returns: List of commands to be sent.
        """
        rl_syn = self.which_return_link_synthesizer_is_going_to_on(cfg_number)
        is_return_link = self.get_set_type(cfg_number) == "RETURN"
        p = ""
        
        if is_before_on:
            df = self.commnds_for_saw_path_df.filter( (pl.col("TYPE") == 'BEFORE_DP_ON') & (pl.col("RL_SYN") == "") | ((pl.col("TYPE") == 'BEFORE_DP_ON') & (pl.col("RL_SYN") == rl_syn)))
        else:
            if is_return_link:
                df = self.commnds_for_saw_path_df.filter( (pl.col("TYPE") == 'AFTER_DP_CFG') & (pl.col("RL_SYN") == rl_syn))   
            else:
                df = self.commnds_for_saw_path_df.filter((pl.col("TYPE") == 'AFTER_DP_CFG') & (pl.col("RL_SYN") == ""))
                valid_mnemonics = (  self.dp_path_sw_fl_cfgs.filter(pl.col("CFG").is_in(self.request_cfgs)).select("MNEMONIC").unique())
                df = df.filter(pl.col("MNEMONIC").str.to_lowercase().is_in(valid_mnemonics["MNEMONIC"].to_list()))

        df = df.sort(by=["SNO"], descending=False)
        send_commands = df["MNEMONIC"].unique().to_list()
        expecte_tms_for_saw_path_df = self.expecte_tms_for_saw_path_df(df)
        p += await self.generate_expected_command_file_format(self._get_line_number(),expecte_tms_for_saw_path_df)
        if len(p) == 0:
            self._line_number -= 1
        step = self._get_line_number()
        prefix = f"{step} send            "
        indent = " " * len(prefix)
        p += "\n".join(
            [prefix + send_commands[0] + ";"] +
            [indent + cmd + ";" for cmd in send_commands[1:]]
        ) + "\n"
        #p += f"{self._get_line_number()} send "+f";\n".join(" "* 11 + cmd for cmd in send_commands)+"\n"

        return p
    
    def generate_epc_on(self, cfg_number: int) -> List[str]:
        """
        Generate the EPC On command for a given configuration number.
        """
        #EPC CFG ON OFF self.epc_commands dataframe columns
        columns = ["ROUTER_EPC","CDU_EPC","WAIT", "CH_EPC","SYN_EPC"]
        clmn_names = ["ROUTER_EPC","CDU_EPC", "CH_EPC","SYN_EPC"]
        selection = self.get_df(cfg_number).select(pl.col(clmn_names)).drop_nulls()
        if selection.is_empty():
            raise ValueError("No EPC configuration found for the given configuration number.")
        # get first row as dictionary
        data = selection.row(0,named=True)
        commands = []
        for col in columns:
            if col == "WAIT":
                commands.append([f"Wait command","wait",f"{" "*11}00:01:00:00"])
                continue
            if col not in data:
                raise ValueError(f"Column {col} not found in the EPC configuration.")
            sys = col.split("_")[0]  # e.g. 'CDU', 'ROUTER', 'SYN', 'CH'
            on_command = self.epc_commands.filter(pl.col("EPC") == sys,pl.col("CFG")== data[col]).select(pl.col("ON"))
            if on_command.is_empty():
                raise ValueError(f"No ON command found for {sys} with configuration {data[col]}.")
            on_command = on_command["ON"][0]
            cmd = [f"EPC {sys} {data[col]} On","send",f"{" "*11}{on_command}"]
            commands.append(cmd)

        
        # Generate the synthesizer and channelizer EPC select commands
        ch_epc = self.generate_channelizer_epc_select_to_turn_on(cfg_number)
        syn_epc = self.generate_synthesizer_epc_select_to_turn_on(cfg_number)
       
        # Combine all commands
        all_commands = commands + ch_epc + syn_epc + [[f"Wait command","wait",f"{" "*11}00:00:15:00"]]
      
        return all_commands

    def generate_epc_m_off(self, cfg_number: int=None) -> List[str]:
        """
        Generate the EPC Off commands for all systems.
        Returns: List of commands to turn off all EPCs.
        """
        commands = []
        ch_epc = self.generate_channelizer_epc_select_to_turn_off(cfg_number)
        syn_epc = self.generate_synthesizer_epc_select_to_turn_off(cfg_number)
        
        for sys in ["SYN", "CH", "ROUTER", "CDU",]:
            off_command = self.epc_commands.filter(pl.col("EPC") == sys, pl.col("CFG") == "M").select(pl.col("OFF"))
            if off_command.is_empty():
                raise ValueError(f"No OFF command found for {sys}.")
            off_command = off_command["OFF"][0]
            cmd = [f"EPC {sys} Off","send", off_command]
            commands.append(cmd)
        return ch_epc + syn_epc + commands

    def fl_synthesizer_and_port_select_commands(self,cfg_number:int) -> List[str]:
        """
        inputs: list of strings like ["B1_FL_S_M1_OP_P1", "B2_FL_S_M1_OP_P2", "B3_FL_S_M2_OP_P1", "B4_FL_S_M2_OP_P2"]
        
        Returns: list of 16-bit binary code words as strings
        """
        band_synthesizer_port = self.get_df(cfg_number)["FL_SYNTHESIZER_AND_OP_PORT"].drop_nulls().to_list()
        # band_synthesizer_port = [str(x) for x in band_synthesizer_port]
        # band_synthesizer_port.sort(
        #     key=lambda x: int(re.search(r'B(\d+)', x).group(1)) if re.search(r'B(\d+)', x) else float('inf')
        # )
        #sort inputs to ensure consistent order from B1 to B4
        def band_number(x):
            match = re.search(r'B(\d+)', x)
            if not match:
                raise ValueError(f"Band number not found in string: {x}")
            return int(match.group(1))
        band_synthesizer_port.sort(key=band_number)


        word = 0
        for fl_synth_str in band_synthesizer_port:

            # Parse band (routing bit position)
            if fl_synth_str.startswith("B1_"):
                band_shift = 0
            elif fl_synth_str.startswith("B2_"):
                band_shift = 3
            elif fl_synth_str.startswith("B3_"):
                band_shift = 6
            elif fl_synth_str.startswith("B4_"):
                band_shift = 9
            else:
                raise ValueError("Band prefix must be B1, B2, B3, or B4")
            
            # Parse synthesizer
            if "M1" in fl_synth_str:
                synth_code = 0b00  # Main-1
            elif "M2" in fl_synth_str:
                synth_code = 0b01  # Main-2
            elif "R" in fl_synth_str:
                synth_code = 0b10  # Redundant
            else:
                raise ValueError(f"Synthesizer not recognized in {fl_synth_str}")

            # Parse port
            if "P1" in fl_synth_str:
                code = (synth_code << 1) | 0b0  # Upper
            elif "P2" in fl_synth_str:
                code = (synth_code << 1) | 0b1 # Lower
            else:
                raise ValueError(f"Port not recognized in {fl_synth_str}")

            # Compose word
            
            word |= (code << band_shift)        # bits 11-10: synthesizer
           
        data_bytes = self.binary_to_hex_data_bytes(f"{word:016b}")
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == 1)["ADDRESS"][0].zfill(4) 
        cmd = ['FL Synthesizer and Port Select','sendtcp', '1553trantmtcbus', rt_address]
        cmd.extend(data_bytes)
        return cmd 
    
    def fl_generate_gain_word_for_fl_channels(self,cfg_number:int):
        gain_to_code = {
            0.0:   0b0000,
            1.0:   0b0001,
            2.0:   0b0010,
            3.0:   0b0011,
            4.0:   0b0100,
            5.0:   0b0101,
            6.0:   0b0110,
            7.0:   0b0111,
            8.0:   0b1000,
            9.0:   0b1001,
            10.0:  0b1010,
            5.5:   0b1011,
            6.5:   0b1100,
            7.5:   0b1101,
            8.5:   0b1110,
            9.5:   0b1111,
        }
        gain_to_code = {
         0.0: 0b0000,
        -1.0: 0b0001,
        -2.0: 0b0010,
        -3.0: 0b0011,
        -4.0: 0b0100,
        -5.0: 0b0101,
        -5.5: 0b1011,
        -6.0: 0b0110,
        -6.5: 0b1100,
        -7.0: 0b0111,
        -7.5: 0b1101,
        -8.0: 0b1000,
        -8.5: 0b1110,
        -9.0: 0b1001,
        -9.5: 0b1111,
        -10.0: 0b1010,
        }

        channel_gains = self.get_df(cfg_number)["FL_GAIN_CONTROL_DB"].drop_nulls()
        if channel_gains.is_empty():
            return []
        channel_gains = (channel_gains.to_list())[0]
        code_word = ""
        codes = [float(x) for x in channel_gains.split(",")]
        if len(codes) != 4:
            raise ValueError("Gain control must have exactly 4 values for B1, B2, B3, and B4")
        for code in codes:
            if code not in gain_to_code:
                raise ValueError(f"Gain {code}dB is not a valid code. Allowed: {list(gain_to_code.keys())}")
        word = (
            (gain_to_code[codes[1]] << 12) |
            (gain_to_code[codes[0]] << 8)  |
            (gain_to_code[codes[3]] << 4)  |
            (gain_to_code[codes[2]])
        )
        code_word +=f"{word:016b}"  # return as 16-bit binary string
        # Convert to hex data bytes
        data_bytes = self.binary_to_hex_data_bytes(code_word)
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == 3)["ADDRESS"][0].zfill(4) 
        cmd = ['FL Gain Control','sendtcp', '1553trantmtcbus', rt_address]
        cmd.extend(data_bytes)
        return cmd

    def fl_generate_synthesizer_nco_phase(self,cfg_number:int):
       
        nco_counts = (self.get_df(cfg_number)["FL_SYNTHESIZER_NCO_PHASE"].drop_nulls().to_list())
        code_word = ""
        for counts in nco_counts:
            if not isinstance(counts, str):
                raise ValueError("NCO counts must be a string of comma-separated values")
            if len(counts.split(",")) != 3:
                raise ValueError("NCO counts must have exactly 3 values for M1, M2, and R")
            count_vals = [ int(x) for x in counts.split(",")]
            word = (
                (count_vals[2] << 4) |
                (count_vals[1] << 2)  |
                (count_vals[0] & 0b11)
            )
            code_word += f"{word:016b}"  # return as 16-bit binary string
        if len(code_word) == 0:
            return []
        # Convert to hex data bytes
        data_bytes = self.binary_to_hex_data_bytes(code_word)
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == 4)["ADDRESS"][0].zfill(4) 
        cmd = ['FL Synthesizer NCO Phase','sendtcp', '1553trantmtcbus', rt_address]
        cmd.extend(data_bytes)
        return cmd
    
    def rl_generate_commnds(self,cfg_number:int):
        """
        Generate all RL commands for a given configuration number.
        Returns a list of commands to be executed.
        """
        commands = []
        #commands.append(self.master_clock_select_code("FL_MAIN"))
        commands.append(self.rl_generate_ch_1st_nco_band_select_words(cfg_number))
        commands.extend(self.rl_generate_ch_2nd_nco_band_select_words(cfg_number))
        commands.append(self.rl_generate_com_and_power_channel_select_words(cfg_number))
        commands.append(self.rl_generate_sub_channel_select_words(cfg_number))
        commands.append(self.rl_generate_gain_word_for_rl_channels(cfg_number))
        commands.append(self.rl_generate_power_limit_words(cfg_number))
        commands.append(self.rl_generate_synthesizer_nco_word(cfg_number))
        #commands.append(self.generate_mesh_link_control_word(cfg_number))
        return commands
    
    def ml_generate_commnds(self,cfg_number:int):
        """
        Generate all FL commands for a given configuration number.
        Returns a list of commands to be executed.
        """
        commands = []
        commands.append(self.rl_generate_ch_1st_nco_band_select_words(cfg_number))
        commands.extend(self.rl_generate_ch_2nd_nco_band_select_words(cfg_number))
        commands.append(self.rl_generate_com_and_power_channel_select_words(cfg_number))
        commands.append(self.rl_generate_sub_channel_select_words(cfg_number))
        commands.append(self.rl_generate_gain_word_for_rl_channels(cfg_number))
        commands.append(self.rl_generate_power_limit_words(cfg_number))
        commands.append(self.generate_mesh_link_control_word(cfg_number))
        commands.append(self.fl_synthesizer_and_port_select_commands(cfg_number))
        commands.append(self.fl_generate_synthesizer_nco_phase(cfg_number))
        
        return commands
    
    def fl_generate_commnds(self,cfg_number:int):
        """
        Generate all FL commands for a given configuration number.
        Returns a list of commands to be executed.
        """
        commands = []
        #commands.append(self.master_clock_select_code("RL_MAIN1"))
        commands.append(self.fl_synthesizer_and_port_select_commands(cfg_number))
        commands.append(self.fl_generate_gain_word_for_fl_channels(cfg_number))
        commands.append(self.fl_generate_synthesizer_nco_phase(cfg_number))
        commands.append(self.fl_generate_power_limit_words(cfg_number))
        
        return commands
    
    def get_remark(self,cmd,is_start=True):
        overall_length = 60
        if is_start:
            header = f"1553 CMD for:{cmd}"
            no_of_stars =int( (overall_length-len(header))/2)
            return f"\n!{'*'*no_of_stars}{header}{'*'*no_of_stars}\n"
        else:
            header = f"END of 1553 CMD"
            no_of_stars = int((overall_length-len(header))/2)
            return f"!{'*'*no_of_stars}{header}{'*'*no_of_stars}\n"
    
    def generate_command_file_format(self,command_data)->str:
        #Input
        #['sendtcp', '1553trantmtcbus', '00a4', '00', '00', '00', '00']
        #Output
        # 001 sendtcp 1553trantmtcbus 00a4;
        #                 Data_Byte 00;
        #                 Data_Byte 00;
        #                 Data_Byte 00;
        #                 Data_Byte 00
        procedure = ""
        p= ""
        if 'sendtcp' in command_data:
            # If 'sendtcp' is present, we assume it's a command to be executed
            command_data = [str(x).replace("0x","") for x in command_data]
            cmd = self._get_line_number()+" "+" ".join(command_data[1:4])
            procedure += cmd+";\n"
            procedure += "\n".join([f"{' '*(len(cmd)-12)}Data_Byte {code};" for code in command_data[4:]])[:-1]+"\n"
            p = self.get_remark(command_data[0])+procedure+self.get_remark(command_data[0],False)
        elif 'send' in command_data:
            # If 'send' is present, we assume it's a command to be sent
            cmd = self._get_line_number()+" "+" ".join(command_data[1:])
            procedure += cmd+"\n"
            p = procedure
        elif 'wait' in command_data:
            # If 'send' is present, we assume it's a command to be sent
            cmd = self._get_line_number()+" "+" ".join(command_data[1:])
            procedure += cmd+"\n"
            p = procedure
        return p
    
    async def generate_expected_command_file_format(self,line_number:str,expected_tm_df:pl.DataFrame)->str:
        return ""

    
    def final_commnd_format(self,command_data:List[str])->str:
        """
        Generate the final command format for a list of commands.
        Each command is formatted as a string with line numbers and remarks.
        """
        formatted_commands = []
        for cmd in command_data:
            if isinstance(cmd, list):
                formatted_commands.append(self.generate_command_file_format(cmd))
            else:
                formatted_commands.append(cmd)
        return "\n".join(formatted_commands)
    
    def get_cfg_number(self,cfg_numbers: List[int]):
        cfgs = list(set(self.config_set_mmap_df["CONFIG"].to_list()) & set(cfg_numbers))
        print(cfgs)
        return cfgs[0]

    async def handle_request(self,line_number:int, cfg_numbers: List[int], cmd: str) -> tuple[int,str]:
        """
        Handle a command request based on the configuration number and command.
        Returns a list of commands to be executed.
        """
        self.request_cfgs = cfg_numbers
        cfg_number = self.get_cfg_number(cfg_numbers)
        set_name = self.get_set_name(cfg_number)
        self._line_number = line_number
        df = self.valid_commands_df.filter(pl.col("MNEMONIC") == cmd)
        if df.is_empty():
            raise ValueError(f"Command '{cmd}' not found in valid commands.")
        cmd_type = df["TYPE"][0]
        # Get only columns matching TM1, TM1_STATE, TM2, TM2_STATE, etc.
        tm_columns = [col for col in self.valid_commands_df.columns if re.match(r"TM\d+(_STATE)?", col)]
        # Select only those columns
        expected_tm_df = self.valid_commands_df.select(tm_columns)
        p = await self.generate_expected_command_file_format(self._get_line_number(),expected_tm_df)
        if len(p) == 0:
            self._line_number -= 1
        if cmd_type == "EPC_ON":
           commnds = self.generate_epc_on(cfg_number)
           p += await self.generate_saw_path_commands(cfg_number,is_before_on=True)
           p += self.final_commnd_format(commnds)
        elif cmd_type == "EPC_OFF":
           commnds = self.generate_epc_m_off()
           p += self.final_commnd_format(commnds)
        elif cmd_type == "RL_DP_CFG":
           commnds = self.rl_generate_commnds(cfg_number)
           p += self.final_commnd_format(commnds)
           p += await self.generate_saw_path_commands(cfg_number,is_before_on=False)
        elif cmd_type == "FL_DP_CFG":
           commnds = self.fl_generate_commnds(cfg_number)
           p += self.final_commnd_format(commnds)
           p += await self.generate_saw_path_commands(cfg_number,is_before_on=False)
        elif cmd_type == "ML_DP_CFG":
           commnds = self.ml_generate_commnds(cfg_number)
           p += self.final_commnd_format(commnds)
           p += await self.generate_saw_path_commands(cfg_number,is_before_on=False)

        if cmd_type in ["EPC_ON"]:
            # Add remarks for start and end of commands
            pre_fix = f"\n!***Commands for:{set_name} START***\n\n"
            suf_fix = f"\n!***Commands for:{set_name} END***\n\n"
            p = pre_fix + p 
        if cmd_type in ["RL_DP_CFG", "FL_DP_CFG", "ML_DP_CFG"]:
            # Add remarks for start and end of commands
            pre_fix = f"\n!***Commands for:{set_name} START***\n\n"
            suf_fix = f"\n!***Commands for:{set_name} END***\n\n"
            p =  p + suf_fix
        return self._line_number,p
    
    
        

if __name__ == "__main__":
    obj= DigitalProcessor()
    # print(obj.generate_epc_on(9))
    # print(obj.rl_generate_ch_1st_nco_band_select_words(9))
    # print(obj.rl_generate_ch_2nd_nco_band_select_words(9))
    # print(obj.rl_generate_com_and_power_channel_select_words(9))
    # print(obj.rl_generate_sub_channel_select_words(9))
    # print(obj.rl_generate_gain_word_for_rl_channels(9))
    # print(obj.generate_mesh_link_control_word(9))
    # data = obj.rl_generate_commnds(9)
    # for c in data:
    #     print(c)
    
    #print(obj.handle_request(9, 'dp_rl_set1'))  # Example usage of NCO word generation
    import asyncio
    # result = asyncio.run(obj.handle_request(2,9, 'dp_epc_m_on'))
    # print(result[1])  # Example usage of NCO word generation

    result = asyncio.run(obj.handle_request(2,57, 'dp_ml_set1'))
    print(result[1])  # Example usage of NCO word generation

    
