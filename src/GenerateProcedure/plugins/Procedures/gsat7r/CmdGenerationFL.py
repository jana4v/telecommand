from typing import List
import polars as pl
import re,os

#excel_path = os.path.join(os.path.dirname(__file__), "data.xlsx")

file_dir = os.getcwd()
db_path = file_dir + os.sep + 'Database'+ os.sep + 'Telecommand'
excel_path = db_path+os.sep+"db.xlsx"

if not os.path.exists(excel_path):
    raise FileNotFoundError(f"Excel file not found at {excel_path}. Please ensure the file exists.") 


class DigitalProcessorFL:
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

    
    def fl_synthesizer_and_port_select_commands(self,cfg_number:int) -> List[str]:
        """
        inputs: list of strings like ["B1_FL_S_M1_OP_P1", "B2_FL_S_M1_OP_P2", "B3_FL_S_M2_OP_P1", "B4_FL_S_M2_OP_P2"]
        
        Returns: list of 16-bit binary code words as strings
        """
        band_synthesizer_port = (self.DP_CFG.filter(pl.col("CONFIG") == cfg_number)["FL_SYNTHESIZER_AND_OP_PORT"].drop_nulls().to_list())
        #sort inputs to ensure consistent order from B1 to B4
        band_synthesizer_port.sort(key=lambda x: int(re.search(r'B(\d+)', x).group(1)))

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
    
    def generate_gain_word_for_fl_channels(self,cfg_number:int):
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

        channel_gains = (self.DP_CFG.filter(pl.col("CONFIG") == cfg_number)["GAIN_CONTROL_DB"].drop_nulls().to_list())[0]
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

    def generate_synthesizer_nco_phase(self,cfg_number:int):
       
        nco_counts = (self.DP_CFG.filter(pl.col("CONFIG") == cfg_number)["FL_SYNTHESIZER_NCO_PHASE"].drop_nulls().to_list())
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


        # Convert to hex data bytes
        data_bytes = self.binary_to_hex_data_bytes(code_word)
        rt_address = self.DP_RT_ADDRESS.filter(pl.col("SUB_ADDRESS") == 4)["ADDRESS"][0].zfill(4) 
        cmd = ['FL Synthesizer NCO Phase','sendtcp', '1553trantmtcbus', rt_address]
        cmd.extend(data_bytes)
        return cmd

obj= DigitalProcessorFL()
print(obj.fl_synthesizer_and_port_select_commands(1))
print(obj.generate_gain_word_for_fl_channels(1))
print(obj.generate_synthesizer_nco_phase(1))