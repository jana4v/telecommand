from typing import List
import polars as pl
import re,os

#excel_path = os.path.join(os.path.dirname(__file__), "data.xlsx")
file_dir = os.getcwd()
db_path = file_dir + os.sep + 'Database'+ os.sep + 'Telecommand'
excel_path = db_path+os.sep+"db.xlsx"

if not os.path.exists(excel_path):
    raise FileNotFoundError(f"Excel file not found at {excel_path}. Please ensure the file exists.") 


class DigitalProcessorRL:
    def __init__(self):
        self.DP_CFG = pl.read_excel(excel_path,sheet_name="CFG")
        self.DP_RT_ADDRESS = pl.read_excel(excel_path,sheet_name="RT_ADDRESS")
        self.NCO1_FREQ = pl.read_excel(excel_path,sheet_name="CH_NCO1")
        self.ch_2nd_nco_sub_address_map = { "m1": 6, "m2": 7, "r1": 8, "r2": 9  }

    def binary_to_hex_data_bytes(self,bin_str):
        # Ensure length is multiple of 4
        bin_str = bin_str.zfill((len(bin_str) + 3) // 4 * 4)
        # Convert to integer and format as uppercase hex
        s = f"{int(bin_str, 2):0{len(bin_str) // 4}X}"
        data_bytes = [s[i:i+2] for i in range(0, len(s), 2)]
        return data_bytes

    
    def generate_ch_1st_nco_band_select_words(self,cfg_number:int) -> list:
        """
        channelizer_freq_map: dict with keys:
            m1_1, m1_2, m2_1, m2_2, r1_1, r1_2, r2_1, r2_2
            and values: frequency code as 'f1', 'f2', ..., or actual freq string

        Returns (band_select1_16bit, band_select2_16bit) as binary strings
        """
        NCO1 = self.DP_CFG.filter(pl.col("CONFIG") == 1).select(pl.col(["SNO","CONFIG","CHANNELIZER_IP_PORTS","CHANNELIZER_IP_FREQUENCIES"]))
        #NCO1 = NCO1.join(NCO1_FREQ,on="CHANNELIZER_IP_FREQUENCIES")
        channelizer_freq_map = dict(zip(NCO1["CHANNELIZER_IP_PORTS"].to_list(), NCO1["CHANNELIZER_IP_FREQUENCIES"].to_list()))
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


    def make_ch_2nd_nco_word(self,channel: int, nco_value: int) -> str:
        """
        Generate a 16-bit binary string for the NCO word.
        channel: int (0-7), will be placed in bits 11-9
        nco_value: int (0-511), will be placed in bits 8-0
        Returns: string, e.g., '0001000100001011'
        """
        # Limit channel and nco_value to their ranges
        channel = channel & 0b111       # 3 bits
        nco_value = nco_value & 0x1FF   # 9 bits

        word = (channel << 9) | nco_value
        # Format as 16-bit binary string
        return f"{word:016b}"

    def generate_ch_2nd_nco_band_select_words(self, cfg_number: int) -> List[List[str]]:
        """
        Generate the 2nd NCO band select words for a given configuration number.
        Returns a list of commands to be sent.
        """
        # Get the NCO2 frequencies for the given configuration
        nco2 = self.DP_CFG.filter(pl.col("CONFIG") == cfg_number).select(pl.col(["CHANNELIZER_OP_PORTS", "CHANNELIZER_OP_COUNT"])).to_dict(as_series=False)
        nco2 = dict(zip(nco2["CHANNELIZER_OP_PORTS"], nco2["CHANNELIZER_OP_COUNT"]))
        # Create the command list
        
        commands = []
        for ch_channel, count in nco2.items():
            channelizer, channel = ch_channel.split('_')  # Extract the port name (e.g., 'm1', 'm2', etc.)
            nco_word = self.make_ch_2nd_nco_word(int(channel), int(count))
            rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == self.ch_2nd_nco_sub_address_map[channelizer])["ADDRESS"][0].zfill(4)
            cmd = ['RL Channelizer 2nd NCO Select','sendtcp', '1553trantmtcbus', rt_address]
            data_bytes = self.binary_to_hex_data_bytes(nco_word)
            cmd.extend(data_bytes)
            commands.append(cmd)
        return commands
    
    def comm_channel_selectio_code(self,ch_port: str) -> str:
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
    
    def generate_com_and_power_channel_select_words(self, cfg_number: int) -> List[List[str]]:
        """
        Generate the 2nd NCO band select words for a given configuration number.
        Returns a list of commands to be sent.
        """
        # Get the NCO2 frequencies for the given configuration
        com_channels = (self.DP_CFG.filter(pl.col("CONFIG") == cfg_number)["COM_CHANNEL_SELECT"].drop_nulls().to_list())
        pow_channels = (self.DP_CFG.filter(pl.col("CONFIG") == cfg_number)["POWER_CHANNEL_SELECT"].drop_nulls().to_list())
        # Create the command list
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == 10)["ADDRESS"][0].zfill(4)
        cmd = ['RL Select COM & Power Channels','sendtcp', '1553trantmtcbus', rt_address]
        command_bytes = []
        for com_channel in com_channels:
            nco_word = self.comm_channel_selectio_code(com_channel)
            data_bytes = self.binary_to_hex_data_bytes(nco_word)
            command_bytes.extend(data_bytes)
        for pow_channel in pow_channels:
            nco_word = self.comm_channel_selectio_code(pow_channel)
            data_bytes = self.binary_to_hex_data_bytes(nco_word)
            command_bytes.extend(data_bytes)

        cmd.extend(command_bytes)
        return cmd
    
    def generate_sub_channel_select_words(self, cfg_number: int) -> List[str]:
        """
        Generate the sub-channel select words for a given configuration number.
        Returns a list of commands to be sent.
        """
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == 18)["ADDRESS"][0].zfill(4)
        sub_channel_code = (self.DP_CFG.filter(pl.col("CONFIG") == cfg_number)["SUB_CHANNEL"].drop_nulls().to_list())[0].zfill(16)
        cmd = ['RL Select Sub-Channel','sendtcp', '1553trantmtcbus', rt_address]
        data_bytes = self.binary_to_hex_data_bytes(sub_channel_code)
        cmd.extend(data_bytes)
        return cmd
    
    def generate_gain_word_for_rl_channels(self,cfg_number:int):
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

        com_channel_gains = (self.DP_CFG.filter(pl.col("CONFIG") == cfg_number)["GAIN_CONTROL_DB"].drop_nulls().to_list())
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

    def generate_synthesizer_nco_word(self,cfg_number:int):
        """
        nco_value: int (0 to 2047)
        Returns a 16-bit binary string with bits [10:0] = nco_value, others 0.
        """
        nco_counts = (self.DP_CFG.filter(pl.col("CONFIG") == cfg_number)["SYNTHESIZER_NCO_COUNT"].drop_nulls().to_list())
        code_word = ""
        for count in nco_counts:
            if not isinstance(count, int):
                raise ValueError("SYNTHESIZER_NCO_COUNT must be an integer")
            if not (0 <= count < 2048):
                raise ValueError("SYNTHESIZER_NCO_COUNT must be in the range 0..2047 (11 bits)")
            word = count & 0x7FF  # Mask to 11 bits
            code_word += f"{word:016b}"
        data_bytes = self.binary_to_hex_data_bytes(code_word)
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == 13)["ADDRESS"][0].zfill(4) 
        cmd = ['RL Generate Synthesizer NCO Word','sendtcp', '1553trantmtcbus', rt_address]
        cmd.extend(data_bytes)
        return cmd 
    
    def generate_channelizer_epc_select(self,cfg_number:int):
        channelizer_order = [ "RL_C_R2","RL_C_R1","RL_C_M2","FL_C_R","RL_C_M1","FL_C_M"]
        # Create the command list
        selection = self.DP_CFG.filter(pl.col("CONFIG") == cfg_number).select(pl.col(["EPC_SELECT_CHANNELIZER", "EPC_SELECT_CHANNELIZER_BIT"])).drop_nulls()
        commands = []
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == 14)["ADDRESS"][0].zfill(4)
        cmd = ['RL Select Channelizer EPC','sendtcp', '1553trantmtcbus', rt_address]
        bits = ""
        for channelizer in channelizer_order:
            bits += str(selection.filter(pl.col("EPC_SELECT_CHANNELIZER") == channelizer)["EPC_SELECT_CHANNELIZER_BIT"].to_list()[0])
            
        data_bytes = self.binary_to_hex_data_bytes(bits.zfill(16))
        cmd.extend(data_bytes)
        return cmd
    
    def generate_synthesizer_epc_select(self,cfg_number:int):
        channelizer_order = [ "RL_S_R","FL_S_R","FL_S_M2","RL_S_M","FL_S_M1"]
        # Create the command list
        selection = self.DP_CFG.filter(pl.col("CONFIG") == cfg_number).select(pl.col(["EPC_SELECT_SYNTHESIZER","EPC_SELECT_SYNTHESIZER_BIT"])).drop_nulls()
        commands = []
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == 14)["ADDRESS"][0].zfill(4)
        cmd = ['RL Select Synthesizer EPC','sendtcp', '1553trantmtcbus', rt_address]
        bits = ""
        for channelizer in channelizer_order:
            bits += str(selection.filter(pl.col("EPC_SELECT_SYNTHESIZER") == channelizer)["EPC_SELECT_SYNTHESIZER_BIT"].to_list()[0])
            
        data_bytes = self.binary_to_hex_data_bytes(bits.zfill(16))
        cmd.extend(data_bytes)
        return cmd
    
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
        selection = self.DP_CFG.filter(pl.col("CONFIG") == cfg_number).select(pl.col(["MESH_LINK"])).drop_nulls()["MESH_LINK"].to_list()
        words = ""
        for mesh_link in selection:
            enable,com_channel,port = mesh_link.split(",")
            # Extract parameters from the mesh_link
            mesh_enable = enable == 'E'
            rl_chan_id = int(com_channel[-1])  # Assuming 'RL_C_M1', 'RL_C_M2', etc. and extracting the last character
            # Generate the control word
            words += self.mesh_link_control_word(mesh_enable, rl_chan_id, port)
        # Convert to hex data bytes
        data_bytes = self.binary_to_hex_data_bytes(words)
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == 16)["ADDRESS"][0].zfill(4)
        cmd = ['Mesh Link Selection','sendtcp', '1553trantmtcbus', rt_address]
        cmd.extend(data_bytes)
        return cmd
    
    def reconfig_control_word(self,cmd: str) -> str:
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
        cmd = ['Reconfig Control Word','sendtcp', '1553trantmtcbus', rt_address]
        cmd.extend(data_bytes)
        return cmd

    def master_clock_select_code(self,chan: str) -> str:
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
        cmd = ['Master Clock Select','sendtcp', '1553trantmtcbus', rt_address]
        cmd.extend(data_bytes)
        return cmd

obj= DigitalProcessorRL()
print(obj.generate_ch_1st_nco_band_select_words(1))
print(obj.generate_ch_2nd_nco_band_select_words(1))
print(obj.generate_com_and_power_channel_select_words(1))
print(obj.generate_sub_channel_select_words(1))
print(obj.generate_gain_word_for_rl_channels(1))
print(obj.generate_synthesizer_nco_word(1))
print(obj.generate_channelizer_epc_select(1))
print(obj.generate_synthesizer_epc_select(1))
print(obj.generate_mesh_link_control_word(1))
