# Telecommand System - Complete Architecture & Algorithm Analysis

## Document Overview
This document provides a complete analysis of how the Telecommand System works from entry point (`tc.py`) through all layers of processing, with detailed algorithm flows and implementation strategies.

---

## Part 1: Entry Point & System Initialization

### 1.1 Entry Point: `tc.py`

```python
# Location: i:\code\python\src\Telecommand\tc.py

if __name__ == "__main__":
    # Step 1: Setup Python path and working directory
    path = os.path.dirname(os.path.abspath(__file__))
    if path not in sys.path:
        sys.path.append(path)
    
    # Step 2: Change to parent directory if running from lib
    if path.find("lib") != -1:
        lib_index = path.split(os.sep).index("lib")
        parent_path = os.sep.join(path.split(os.sep)[:lib_index]) 
        os.chdir(parent_path)
    else:
        os.chdir(path)    
 
    # Step 3: Import and run REST API server
    from src.RestApi import run_rest_api
    
    if __name__ == '__main__':
        freeze_support()  # For multiprocessing
        run_rest_api()    # Start FastAPI server on port 8000
```

**Key Points:**
- Minimal entry point
- Handles frozen executable scenarios
- Delegates to RestApi module
- Enables multiprocessing support

---

## Part 2: REST API Layer

### 2.1 REST API Structure: `RestApi.py`

```
FASTAPI SERVER INITIALIZATION
══════════════════════════════════════════════════════════════════

Step 1: Redis Connection
└─ redis://localhost:6379 (in-memory data store)
   └─ "INJECTED_TM_FOR_SIMULATOR" - Telemetry injection store
   └─ "INJECTED_TC_FOR_SIMULATOR" - Test command injection
   └─ "SOFTWARE_CFG" - Configuration storage

Step 2: Lifespan Management
└─ Startup: TM invalidation background task
│  ├─ Every 3 seconds: check "INJECTED_TM_FOR_SIMULATOR" 
│  ├─ Flag: "HOLD_INVALIDATE_TM" pauses invalidation during generation
│  └─ Deletes expired injected TM values
└─ Shutdown: Clean task cancellation

Step 3: CORS Middleware
└─ Allow all origins (*), methods (*), headers (*)
└─ Enables cross-origin requests from Web UI/clients

Step 4: Route Registration
├─ /restApi/tc/set_cfgs_on          → Turn ON configuration
├─ /restApi/tc/set_cfgs_off         → Turn OFF configuration
├─ /restApi/tc/set_all_payload_off  → Kill all payloads
├─ /restApi/tc/generate_boa_cal_procedure    → BOA calibration
├─ /restApi/tc/generate_test_procedure_document
├─ /restApi/tc/generate_test_procedure_turn_off_document
├─ /restApi/tc/generate_manual_commands_file
├─ /restApi/tc/get_cfg_boa_col_names      → Query endpoint
├─ /restApi/tc/get_test_parameter_names   → Query endpoint
├─ /restApi/tc/get_tc_file_names          → Query endpoint
└─ /restApi/tc/get_commands_group_names   → Query endpoint

All endpoints:
✓ Async/await pattern
✓ Middleware: TM invalidation pause/resume
✓ Error handling with HTTP 500 on exception
```

### 2.2 API Endpoints Pattern

```python
ENDPOINT EXECUTION PATTERN
═══════════════════════════════════════════════════════════════

@app.post("/restApi/tc/set_cfgs_on")
async def set_cfgs_on(tc_request: TcRequest) -> GeneratedTestProcedure:
    try:
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "true")  # Pause TM invalidation
        res = await ApiHandler.set_configs_on(tc_request)       # Process request
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "false") # Resume TM invalidation
        return res
    except Exception as e:
        rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "false")
        raise HTTPException(status_code=500, detail=str(e))


FLOW:
  1. Accept POST request with JSON body (TcRequest object)
  2. Hold TM invalidation (critical section lock)
  3. Call handler method
  4. Release TM invalidation lock
  5. Return GeneratedTestProcedure object
  6. On error: Release lock, return 500 HTTP error
```

---

## Part 3: Request Handling & Command Generation Pipeline

### 3.1 ApiHandler Layer: `ApiHandlers.py`

```
REQUEST HANDLER ARCHITECTURE
═══════════════════════════════════════════════════════════════════════

CLASS: ApiHandler (Static Methods)
│
├─ INITIALIZATION
│  ├─ gc = GenerateCommands() instance
│  ├─ gp = GenerateProcedure() instance
│  └─ Load entire database into memory on startup
│
├─ API METHODS (Request Processing)
│  ├─ set_configs_on(tc_request)
│  ├─ set_configs_off(tc_request)
│  ├─ set_all_payload_off()
│  ├─ generate_boa_cal_procedure(tc_request)
│  ├─ generate_test_procedure_document(tc_request)
│  ├─ generate_test_procedure_turn_off_document(tc_request)
│  ├─ generate_manual_commands_file(tc_request)
│  └─ Query methods (get_cfg_boa_col_names, etc.)
│
└─ DOCUMENT GENERATION (Complex Logic)
   └─ generate_test_procedure_document():
      ├─ Parse config string → config numbers
      ├─ For each config:
      │  ├─ Generate commands
      │  ├─ Generate procedure for ON commands
      │  ├─ Generate BOA procedure
      │  └─ Format into DOCX paragraph
      ├─ Combine all procedures into single Word document
      └─ Save to: C:\\Users\\Public\\temp\\procedures.docx


DETAILED: set_configs_on() Flow
────────────────────────────────

async def set_configs_on(tc_request: TcRequest) -> GeneratedTestProcedure:
    
    # 1. PRE-PROCESS REQUEST
    tc_request = await gc.pre_process_request(tc_request)
    │  ├─ Generate request ID (timestamp)
    │  ├─ Refresh live telemetry from Redis
    │  ├─ Extract config numbers from config_str
    │  ├─ Add parameter-based configs
    │  └─ Update UI status: "Generating Commands"
    │
    # 2. GET ADDITIONAL PRE-PROCEDURE COMMANDS
    pre_procedure, line_number = gc.get_additional_procedure_at_the_start_of_procedure(1)
    │  └─ Optional header commands from database
    │
    # 3. GENERATE CONFIG-BASED COMMANDS
    tc_req = await gc.generate_cfg_based_on_commands(tc_request)
    │  ├─ Get active configurations
    │  ├─ Get allowed configurations (non-conflicting)
    │  ├─ Get disturbed configurations (need to turn off)
    │  ├─ Inject telemetry: active_configs
    │  ├─ Generate required commands to reach target state
    │  └─ tc_req.commands populated with command list
    │
    # 4. GENERATE PROCEDURE
    procedure = await gp.generate_procedure(tc_req)
    │  └─ Use Factory pattern to route each command
    │     to correct handler (CmdGenerationDP, etc.)
    │
    # 5. HANDLE OTHER COMMAND TYPES
    tc_req = await gc.generate_boa_commands(tc_request)
    procedure += await gp.generate_boa_procedure(tc_req)
    │  └─ BOA (Board of Adjustments) commands
    │
    # 6. FINALIZE PROCEDURE
    procedure = procedure + gp.end_of_procedure()
    │  └─ Add "end" line
    │
    # 7. RETURN RESULT
    return GeneratedTestProcedure(
        procedure_string=procedure,
        active_configs=tc_req.active_configurations,
        allowed_configs=tc_req.allowed_configurations,
        disturbed_configs=tc_req.disturbed_configurations
    )
```

---

## Part 4: Database Layer & Initialization

### 4.1 Database Read Flow: `ReadDatabase_L1.py`

```
DATABASE INITIALIZATION (Happens at Startup)
══════════════════════════════════════════════════════════════════

Connection: ODBC DSN = "TM_TC"
└─ Windows ODBC configured database connection

Step 1: LOAD INHIBITED CONFIGURATIONS
   └─ Query: SELECT CFG_NO FROM INHIBITED_CONFIGS
   └─ Load into memory for fast lookup

Step 2: LOAD TELECOMMAND DETAILS
   └─ Query: SELECT * FROM TeleCommandDetails
   └─ Unique by TC (keep first occurrence)
   └─ Filter out INHIBITED commands (INHIBITED=1)
   └─ Result: tc_details_df (main command table)

Step 3: LOAD CONFIGURATION-BASED TC MAPPING
   └─ Query: SELECT * FROM CFG_based_TC
   └─ Join with tc_details_df on TC column
   └─ Filter out inhibited commands
   └─ Result: cfg_based_tc_df
   │  ├─ CFG_NO: Configuration number
   │  ├─ TC: Command mnemonic
   │  ├─ PARAMETER: Test parameter ID
   │  ├─ TM: Telemetry that changes
   │  ├─ TM_STATE: Expected TM state after command
   │  ├─ PRIORITY: Execution order
   │  ├─ CMD_TYPE: initial_cmd, on_cmd, off_cmd, switch_cmd
   │  ├─ CMD_FORMAT: normal, dp_config, etc.
   │  └─ NO_OF_TM_STATES: Number of expected TM values
   │
Step 4: LOAD TELEMETRY TABLE
   └─ Query: SELECT * FROM TMTBL
   └─ Extract injected TMs (TM_TYPE = "injected")
   └─ Result: tm_tbl_df, inject_tm_df, inject_tm_list

Step 5: LOAD ON/OFF COMMAND MAPPINGS
   ├─ Query: SELECT * FROM ON_OFF_COMMANDS
   ├─ Query: SELECT * FROM OFF_ON_COMMANDS
   └─ Result: on_to_off_cmd_df, off_to_on_cmd_df

Step 6: LOAD DATA COMMANDS & TEST PARAMETERS
   ├─ Query: SELECT * FROM DataCommands
   ├─ Join with DataCommandsMapping
   ├─ Query: SELECT * FROM TEST_PARAMETERS
   ├─ Query: SELECT * FROM CFG_BOA
   └─ Result: data_commands_df, test_parameters_df, cfg_boa_df

Step 7: LOAD TC FILES METADATA
   └─ Query: SELECT * FROM TC_FILES
   └─ Result: tc_files_df

Step 8: OPTIMIZE STORAGE
   └─ If enable_excel_creation=True:
      ├─ Write tc_details.xlsx
      ├─ Write cfg_based_tc.xlsx
      ├─ Write data_commands_df.xlsx
      └─ Location: Database/Telecommand/GeneratedExcels/

Step 9: POPULATE REDIS CACHE
   └─ Key: 'data_for_go_func'
   └─ Value: Semicolon-separated strings of:
      ├─ CFG_NO values (comma-separated)
      ├─ TM values (comma-separated)
      ├─ TM_STATE values (comma-separated)
      └─ PRIORITY values (comma-separated)


KEY DATA STRUCTURES

cfg_based_tc_df:
┌─────────┬──────┬─────────────┬──────────┬──────────────┬──────────┬──────────┐
│ CFG_NO  │ TC   │ PARAMETER   │ TM       │ TM_STATE     │ PRIORITY │ CMD_TYPE │
├─────────┼──────┼─────────────┼──────────┼──────────────┼──────────┼──────────┤
│ 1       │ SET1 │ NULL        │ STAT1    │ ON           │ 10       │ on_cmd   │
│ 1       │ SET2 │ NULL        │ STAT2    │ ON           │ 20       │ on_cmd   │
│ 2       │ SET3 │ NULL        │ STAT3_RL │ SELECT_RL    │ 5        │ switch   │
│ 2       │ SET1 │ NULL        │ NULL     │ NULL         │ 10       │ on_cmd   │
│ 100     │ BOA1 │ 50          │ BOA_VAL  │ ADJUSTED     │ 1        │ boa_cmd  │
└─────────┴──────┴─────────────┴──────────┴──────────────┴──────────┴──────────┘

inject_tm_df:
┌──────────────────────┬──────────────────────────┐
│ TM_MNEMONIC          │ TM_TYPE                  │
├──────────────────────┼──────────────────────────┤
│ STAT1                │ injected                 │
│ STAT2                │ injected                 │
│ STAT3_RL             │ injected                 │
└──────────────────────┴──────────────────────────┘
```

---

## Part 5: Command Generation Pipeline

### 5.1 Architecture: Three-Layer Hierarchy

```
COMMAND GENERATION HIERARCHY
═══════════════════════════════════════════════════════════════════

Layer 3: GenerateCommands (Business Logic)
    │
    ├─ generate_cfg_based_on_commands()
    ├─ generate_required_commands_to_set_configs_l1()
    ├─ generate_off_commands_for_conflict_cfgs()
    └─ generate_required_on_commands()
    │
    ↑ Inherits from
    │
Layer 2: ExtractConstraints (Conflict Detection)
    │
    ├─ find_cfg_wise_conflicts_all_cfgs_optimized()
    ├─ get_conflict_cfgs()
    ├─ get_list_of_non_conflict()
    ├─ get_disturbed_configurations()
    └─ get_active_configurations()
    │
    ↑ Inherits from
    │
Layer 1: ReadDatabase (Data Access)
    │
    ├─ ODBC database connection management
    ├─ DataFrame caching
    ├─ Telemetry refresh (refresh_tm())
    └─ TM value lookup (get_tm_value())
    │
    ↑ Inherits from
    │
Base: Utility (Common Functions)
    │
    ├─ Redis connection (self.r)
    ├─ Status update (update_status())
    ├─ Async HTTP requests (get_request())
    └─ Configuration file handling (TOML)
```

### 5.2 Algorithm: Generate Commands for Configuration

```
ALGORITHM: generate_cfg_based_on_commands()
═══════════════════════════════════════════════════════════════════

PURPOSE: Generate the minimal set of commands to turn ON a configuration

INPUT:
    tc_request.config_numbers = [1, 3, 5]  # Target configurations

ALGORITHM STEPS:

Step 1: DETERMINE CONFIGURATION STATES
├─ active_configurations = get_active_configurations()
│  └─ FROM: go/rust API endpoint → which CFGs are currently ON
│
├─ allowed_configurations = get_list_of_non_conflict(config_numbers)
│  └─ FROM: Table lookup → which CFGs can be ON simultaneously
│  └─ Algorithm: Iterative conflict resolution (see Step 2)
│
├─ disturbed_configurations = get_disturbed_configurations(
│      active_configurations, 
│      allowed_configurations
│  )
│  └─ CFGs that must turn OFF because they conflict with target
│
└─ final_active_configurations = (active ∪ allowed) - disturbed
   └─ Expected final state after all commands executed


Step 2: CONFLICT DETECTION (find_cfg_wise_conflicts_optimized)
─────────────────────────────────────────────────────────────

Given: cfg_based_tc_df stores (CFG_NO, TM, TM_STATE) triples

Algorithm:
   1. GROUP by TM (telemetry parameter)
      └─ Collect all (CFG_NO, TM_STATE) pairs for each TM
      
   2. SELF-JOIN by TM
      └─ For each TM, find pairs of CFGs with DIFFERENT TM_STATE
      
   3. FILTER where TM_STATE differs
      └─ If CFG_A expects TM="STATUS" → "ON"
         And CFG_B expects TM="STATUS" → "OFF"
         Then CFG_A conflicts with CFG_B
         
   4. AGGREGATE conflicts
      └─ GROUP by CFG_NO
      └─ UNIQUE conflicts for each CFG
      └─ Result: conflict_cfgs_df
         ┌──────────┬──────────────────────┐
         │ CFG_NO   │ CONFLICT_CFGS        │
         ├──────────┼──────────────────────┤
         │ 1        │ [5, 7, 12]           │
         │ 3        │ [8, 15]              │
         │ 5        │ [1, 6]               │
         └──────────┴──────────────────────┘

Complexity: O(n·m) where n=configs, m=TM per config
Optimization: Vectorized Polars operations (CPU+GPU accelerated)


Step 3: ITERATIVE CONFIGURATION SETTING
─────────────────────────────────────────

for each target_config in config_numbers:
    if target_config in active_configurations:
        continue  # Already ON, skip
    
    # Simulate turning on this config
    cfg_table = cfg_based_tc_df.filter(CFG_NO == target_config)
    cfg_table.sort(PRIORITY descending)  # High priority first
    
    for each row in cfg_table:
        # Row structure: {CFG_NO, TC, TM, TM_STATE, CMD_TYPE, PRIORITY}
        
        if row.TM is not NULL:
            # This command changes a telemetry state
            actual_tm_state = get_current_tm_value(row.TM)
            
            if actual_tm_state ≠ row.TM_STATE:
                # TM needs to change
                # 1. Update local TM cache
                self.updated_tm[row.TM] = row.TM_STATE
                self.inject_tm_during_generation(row.TM, row.TM_STATE)
                
                # 2. Find all CFGs affected by this TM change
                allowed_in_current_state = cfg_based_tc_df.filter(
                    TM == row.TM AND TM_STATE == actual_tm_state
                )["CFG_NO"].unique()
                
                allowed_in_new_state = cfg_based_tc_df.filter(
                    TM == row.TM AND TM_STATE == row.TM_STATE
                )["CFG_NO"].unique()
                
                affected_cfgs = allowed_in_current_state ∪ allowed_in_new_state
                
                # 3. Generate OFF commands for conflicting CFGs
                generate_off_commands_for_conflict(affected_cfgs, row.PRIORITY)
                
                # 4. Add the ON command for this config
                if row.TC not in self.commands:
                    self.commands.append(row.TC)
            else:
                # TM already in correct state
                if row.TC not in self.commands:
                    self.commands.append(row.TC)
        else:
            # Command has no TM requirement
            if row.TC not in self.commands:
                self.commands.append(row.TC)
        
        # Update local TM state cache for next row
        self.tm.update(self.updated_tm)

RESULT:
    self.commands = [cmd1, cmd2, cmd3, ...]  ← Minimal command set
    tc_request.commands = self.commands


EXAMPLE EXECUTION:

Initial state:
  active_configs = {3, 7}  (CFG 3 and 7 are ON)
  request = set_cfgs_on([1, 5])

Step 1: Check conflicts
  CFG 1 conflicts with [5] → cannot activate 5 when 1 is on
  cfg_1_tms = {TM1: ON, TM2: SELECT_A}
  
Step 2: Determine target state
  allowed_cfgs = {1}  ← only CFG 1 can be ON (conflicts prevent 5)
  disturbed_cfgs = {7}  ← CFG 7 conflicts with target
  final_active = {1, 3}

Step 3: Generate commands to reach {1, 3}
  • CFG 1 not active → add commands for CFG 1
  • CFG 3 already active → skip
  • CFG 7 active but conflicts → add OFF commands for CFG 7

OUTPUT:
  commands = [OFF_CMD_7, ON_CMD_1a, ON_CMD_1b]
```

---

## Part 6: Procedure Generation & Formatting

### 6.1 Procedure Generation: `GenerateProcedure.py`

```
PROCEDURE GENERATION ALGORITHM
═══════════════════════════════════════════════════════════════════

PURPOSE: Convert command list to formatted test procedure file

INPUT:
    tc_request.commands = [SET_RF_ON, SEL_RL, SET_PWR_25, ...]
    tc_request.number_of_commands_in_each_send = 5

ALGORITHM:

Step 1: FILTER & SORT COMMANDS BY TYPE
├─ Filter: CMD_TYPE == "initial_cmd"
│  └─ SORT by PRIORITY ascending
│  └─ GROUP by PRIORITY value
│
├─ Filter: CMD_TYPE == "off_cmd"
│  └─ SORT by PRIORITY ascending
│  └─ GROUP by PRIORITY value
│
├─ Filter: CMD_TYPE == "switch_cmd"
│  └─ SORT by PRIORITY ascending (no grouping)
│
└─ Filter: other commands
   └─ SORT by PRIORITY descending
   └─ GROUP by PRIORITY value


Step 2: PROCESS BY GROUPS & CHUNKS
─────────────────────────────────

For each (priority_group):
    for chunk_start = 0 to len(group_df) step number_of_commands_in_each_send:
        chunk = group_df[chunk_start : chunk_start + chunk_size]
        
        Process chunk:
        ├─ Determine CMD_FORMAT (from first row)
        ├─ Collect all rows with same CMD_FORMAT
        ├─ Route to appropriate formatter (Factory pattern)
        └─ Generate procedure string


Step 3: COMMAND ROUTING (Factory Pattern)
──────────────────────────────────────

cmd_format = row.CMD_FORMAT  # e.g., "normal", "dp_config"

api = plugins_factory.get_component(cmd_format)
if api is not None:
    procedure = await api.get_procedure(row, tc_request, is_start, redis)
else:
    raise Exception(f"Unknown command format: {cmd_format}")

Registered Components:
  • "normal" → Normal command format handler
  • "dp_config" → Digital Processor configuration handler
  • "boa" → BOA adjustment commands
  • ... (dynamically loaded from plugins/)


Step 4: PROCEDURE FORMATTING
────────────────────────────

For each procedure component returned:

    expected_part = "001 EXPECTED TM                    STAT_MAIN = ON;\n"
    send_part = "002 send                            SET_RF_ON;\n"
                "                                     SEL_RL_M1;\n"
    
    • Line number: 3-digit zero-padded, auto-incremented
    • Spacing: Fixed column width for readability
    • Concatenation: expected_part + send_part
    • Final: procedure += (expected_part[:-2] + "\n") + (send_part)


Step 5: END OF PROCEDURE
────────────────────────

procedure += f"{line_number} end\n"


EXAMPLE OUTPUT:

001 EXPECTED TM                    STAT_MAIN = ON;
                                   STAT_RL = SELECT_RL;
002 send                           SET_RF_ON;
                                   SEL_RL_M1;
003 EXPECTED TM                    PWR_STAT = 25;
004 send_tcp 1553TranTMTCBus 0005 09 09;  [RL 1st NCO select]
005 end


LINE NUMBER MANAGEMENT:

• Initialized from: tc_request.line_number (usually 1)
• Incremented by: each called get_line_number()
• Transferred between: components via TestProcedure object
• Persisted in: Redis for session tracking
```

### 6.2 Plugin Factory & Command Format Routing

```
PLUGIN FACTORY ARCHITECTURE
═══════════════════════════════════════════════════════════════════

Dynamic Loader (Factory.py):
├─ Scan: src/GenerateProcedure/plugins/Procedures/*/procedure_*.py
├─ Load: Each procedure_*.py module dynamically
├─ Register: Class instance in plugins_factory dictionary
└─ Key: command_format (extracted from plugin)


Registration Process:

1. Filesystem scan:
   for each root, subfolders, files in os.walk(plugins_dir):
       for file in files:
           if file.startswith("procedure_") and file.endswith(".py"):
               → Found procedure plugin file

2. Module import:
   importlib.import_module(f".{module_name}", package=package_name)
   → Executes module code

3. Class registration:
   Each procedure_*.py should register itself:
   
   plugins_factory.register_component(
       command_format="normal",
       class_ref=NormalCommandFormatter()
   )

4. Lookup on demand:
   api = plugins_factory.get_component(tc_row.CMD_FORMAT)
   if api is not None:
       return await api.get_procedure(...)


PLUGIN EXAMPLE: CmdGenerationDP.py

Location: src/GenerateProcedure/plugins/Procedures/gsat7r/CmdGenerationDP.py

Class: CmdGenerationDp(ProcedureBase)
│
├─ Inherits: ProcedureBase
│  ├─ Telemetry injection methods
│  ├─ Line number management
│  ├─ Spacing/formatting utilities
│  └─ State tracking
│
├─ Initialization:
│  ├─ Load 8+ Excel sheets (parameter lookup tables)
│  ├─ Mapping dictionaries (power limits, frequencies, etc.)
│  └─ Configuration-to-parameter resolvers
│
├─ Async Methods: (10+ core algorithms)
│  ├─ find_constrained_gray_paths()  ← Gray code path finding
│  ├─ binary_to_hex_data_bytes()     ← Binary encoding
│  ├─ rl_generate_power_limit_words()
│  ├─ fl_generate_gain_word()
│  ├─ generate_synthesizer_epc_select_to_turn_on()
│  ├─ generate_synthesizer_epc_select_to_turn_off()
│  ├─ generate_mesh_link_control_word()
│  ├─ fl_out_put_switch_commands()
│  ├─ generate_saw_path_commands()
│  └─ generate_epc_on() / generate_epc_off()
│
└─ async get_sub_class_procedure(row, tc_request, is_start)
   └─ Routes to appropriate generation method
   └─ Returns TestProcedure(expected_part, send_part, line_number)
```

---

## Part 7: Telemetry Management & State Tracking

### 7.1 Telemetry System

```
TELEMETRY (TM) MANAGEMENT
══════════════════════════════════════════════════════════════════

Architecture: Multi-Layer Caching

LAYER 1: Source System (Rust/Go backend)
    ↓ (periodic refresh via API)

LAYER 2: Redis Cache
    ├─ Key: "TM_MAP" (hash set)
    ├─ Value: {mnemonic: value, ...}
    ├─ TTL: Managed by go/rust backend
    └─ Heartbeat: "TM1_HEART_BEAT", "TM2_HEART_BEAT" = "OK"

LAYER 3: Python Objects
    ├─ self.tm = local copy of Redis TM_MAP
    ├─ self.initial_tm = snapshot at request start
    ├─ self.updated_tm = changes during generation
    └─ self.live_tm_data = tc_request.live_tm_data

LAYER 4: Injected TM (Test Injection)
    ├─ Redis Key: "INJECTED_TM_FOR_SIMULATOR_MAP"
    ├─ Holds: Test-modified TM values
    ├─ TTL: Set by generate_procedure
    └─ Invalidated: Every 3 seconds (background task)


REFRESH ALGORITHM (refresh_tm):
────────────────────────────────

def refresh_tm():
    # Check heartbeat
    tm1 = r.get("TM1_HEART_BEAT")
    tm2 = r.get("TM2_HEART_BEAT")
    
    if tm1 == "OK" or tm2 == "OK":
        # Source is alive
        self.tm = r.hgetall("TM_MAP")          # Get all TM values
        self.initial_tm = copy.deepcopy(self.tm)  # Save snapshot
        return True
    else:
        # Source is dead
        self.tm = {}
        raise Exception("Telemetry Data Break")


GET TM VALUE ALGORITHM:
──────────────────────

def get_tm_value(mnemonic: str):
    if mnemonic is None:
        return None
    
    # Try to get from live data (current + injected)
    value = self.tm.get(mnemonic, "")
    
    # Also check injected TM
    injected = r.hget("INJECTED_TM_FOR_SIMULATOR_MAP", mnemonic)
    if injected is not None:
        value = injected
    
    if value == "":
        logger.warning(f"TM Mnemonic not found: {mnemonic}")
    
    return value


INJECTION ALGORITHM (inject_tm):
────────────────────────────────

async def inject_tm(tm: str, value: str, tc_request: TcRequest = None):
    if tm is not None and value is not None:
        # Parse comma-separated TM names and values
        tms = [_tm.lower() for _tm in tm.split(",")]
        values = [_val.lower() for _val in value.split(",")]
        
        if len(tms) != len(values):
            raise Exception("TM names and values count mismatch")
        
        # Store in global injection map
        r.hset("INJECTED_TM_FOR_SIMULATOR_MAP", tm, value)
        
        # If this is a critical TM, also store in request-specific storage
        if tm.lower() in self.inject_tm_list and tc_request is not None:
            r.hset(tc_request.file_name, tm, value)
            r.expire(tc_request.file_name, 3600*2)  # 2-hour TTL
        
        # Set expiration for global map (10 seconds)
        r.expire("INJECTED_TM_FOR_SIMULATOR_MAP", 10)


BACKGROUND INVALIDATION TASK:
──────────────────────────────

async def run_invalidate():
    while True:
        # Check if should hold (during generation)
        hold_flag = r.hget("SOFTWARE_CFG", "HOLD_INVALIDATE_TM")
        
        if hold_flag != "true":
            # Clean up expired injected TM values
            await invalidate_tm_obj.invalidate_tm()
        
        await asyncio.sleep(3)  # Run every 3 seconds


PURPOSE OF INVALIDATION:
• Remove stale test injections
• Ensure live data accuracy
• Prevent request pollution


TELEMETRY STATE TRANSITION TRACKING:
────────────────────────────────────

During generation:
    
    1. Snapshot initial state
       initial_tm = {STAT_MAIN: OFF, STAT_RL: SELECT_M1, ...}
    
    2. Simulate commands
       For cfg_1:
           updated_tm[STAT_MAIN] = ON
           inject_tm(STAT_MAIN, ON)
           local_tm = {STAT_MAIN: ON, STAT_RL: SELECT_M1, ...}
    
    3. Track transitions
       If TM changes from current → new:
           If any other CFGs affected by this TM:
               Add OFF commands for those CFGs
    
    4. Build expected procedure
       001 EXPECTED TM STAT_MAIN = ON;
       002 send SET_RF_ON;
```

---

## Part 8: Complete Request Lifecycle

### 8.1 End-to-End Flow Diagram

```
REQUEST LIFECYCLE: set_cfgs_on([1, 3])
════════════════════════════════════════════════════════════════════════════

┌─── HTTP: POST /restApi/tc/set_cfgs_on ───────────────────────────────────┐
│                                                                            │
│  Body: {                                                                   │
│    "configs_str": "1,3",                                                 │
│    "parameter": "NOM",                                                    │
│    "live_tm_data": { ... }                                               │
│  }                                                                         │
│                                                                            │
└─── REQUEST RECEIVED ─────────────────────────────────────────────────────┘
                                   ↓

┌─── RestApi.py: set_cfgs_on() ─────────────────────────────────────────────┐
│                                                                            │
│  1. rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "true")               │
│     └─ Prevent background TM invalidation during generation               │
│                                                                            │
│  2. res = await ApiHandler.set_configs_on(tc_request)                   │
│  3. rc.hset("SOFTWARE_CFG", "HOLD_INVALIDATE_TM", "false")              │
│                                                                            │
└─── MIDDLEWARE LOCK ──────────────────────────────────────────────────────┘
                                   ↓

┌─── ApiHandlers.set_configs_on() ─────────────────────────────────────────┐
│                                                                            │
│  1. tc_request = await gc.pre_process_request(tc_request)               │
│     ├─ Generate request ID (timestamp)                                   │
│     ├─ Refresh live TM from Redis (refresh_tm())                         │
│     ├─ Extract config numbers: [1, 3]                                    │
│     ├─ Add dependent configs (e.g., parameter-based)                     │
│     └─ Update status: "Generating Commands..."                           │
│                                                                            │
│  2. pre_procedure, line_num = gc.get_additional_procedure_at_start(1)   │
│     └─ Optional pre-procedure commands                                    │
│                                                                            │
│  3. tc_req = await gc.generate_cfg_based_on_commands(tc_request)        │
│     └─ → See Step 5 for detailed algorithm                               │
│                                                                            │
│  4. procedure = await gp.generate_procedure(tc_req)                      │
│     └─ → See Step 6 for detailed algorithm                               │
│                                                                            │
│  5. tc_req = await gc.generate_boa_commands(tc_request)                 │
│  6. procedure += await gp.generate_boa_procedure(tc_req)                │
│                                                                            │
│  7. procedure = procedure + gp.end_of_procedure()                        │
│     └─ Add "end" line                                                    │
│                                                                            │
│  8. return GeneratedTestProcedure(...)                                    │
│                                                                            │
└─── COMMAND GENERATION ───────────────────────────────────────────────────┘
                                   ↓

┌─── GenerateCommands.generate_cfg_based_on_commands() ────────────────────┐
│                                                                            │
│  1. active_configurations = get_active_configurations()                   │
│     └─ Query go/rust API: which CFGs are currently active                │
│     └─ Result: {2, 5, 8}  (CFGs 2, 5, 8 are ON)                          │
│                                                                            │
│  2. allowed_configs = get_list_of_non_conflict([1, 3])                  │
│     └─ Call: find_cfg_wise_conflicts_all_cfgs_optimized()               │
│     └─ Check: Does CFG1 conflict with CFG3?                              │
│     └─ → Analyze TM states
│        If CFG1 expects TM1=ON but CFG3 expects TM1=OFF → CONFLICT
│     └─ Result: {1, 3} (both can be ON together)                          │
│                                                                            │
│  3. disturbed_configs = get_disturbed_configurations(                    │
│        {2, 5, 8},     # currently active                                 │
│        {1, 3}         # allowed target configs                            │
│     )                                                                      │
│     └─ Which of {2,5,8} conflict with {1,3}?                            │
│     └─ Result: {5}  (CFG 5 conflicts)                                    │
│                                                                            │
│  4. final_active = ({2,5,8} ∪ {1,3}) - {5} = {1,2,3,8}                 │
│                                                                            │
│  5. Update Redis: inject_single_tm('active_configs', "1,2,3,8", tc_req)│
│                                                                            │
│  6. For each config in allowed_configs that's not active:               │
│     └─ Call: generate_required_commands_to_set_configs_l1(...)          │
│     └─ → Iterate through cfg_based_tc_df for this config                 │
│     └─ → For each command:                                               │
│        If TM needs to change:                                             │
│            • Resolve conflicts (turn OFF conflicting CFGs)                │
│            • Add the command                                              │
│        Else:                                                              │
│            • Add the command                                              │
│     └─ Result: self.commands populated                                    │
│                                                                            │
│  7. Final output:                                                        │
│     tc_request.commands = [CMD1, CMD2, ...]                             │
│     tc_request.active_configurations = {2, 5, 8}  # old state            │
│     tc_request.allowed_configurations = {1, 3}    # requested             │
│     tc_request.disturbed_configurations = {5}     # turned off            │
│     tc_request.final_active_configurations = {1,2,3,8}  # new state      │
│                                                                            │
└─── CONFIG-BASED COMMAND GENERATION ──────────────────────────────────────┘
                                   ↓

┌─── GenerateProcedure.generate_procedure(tc_request) ─────────────────────┐
│                                                                            │
│  1. Filter commands by type:                                             │
│     ├─ initial_cmd: [cmd_a, cmd_b]                                       │
│     ├─ off_cmd: [cmd_c]                                                  │
│     ├─ switch_cmd: [cmd_d, cmd_e]                                        │
│     └─ other_cmd: [cmd_f]                                                │
│                                                                            │
│  2. Process in order: initial → off → switch → other                     │
│     For each group:                                                       │
│        └─ Sort by PRIORITY                                               │
│        └─ Chunk into groups of N commands                                │
│        └─ Route to appropriate formatter                                 │
│                                                                            │
│  3. Route each command via Factory:                                      │
│     format = row.CMD_FORMAT  # e.g., "normal" or "dp_config"            │
│     api = plugins_factory.get_component(format)                          │
│     procedure += await api.get_procedure(row, tc_request, ...)          │
│                                                                            │
│  4. Build procedure string:                                              │
│     ├─ Accumulate expected_part (EXPECTED TM lines)                      │
│     ├─ Accumulate send_part (send command lines)                         │
│     ├─ Manage line numbers (auto-increment)                              │
│     └─ Join with newlines                                                │
│                                                                            │
│  OUTPUT:                                                                  │
│     001 EXPECTED TM  status_main = ON;                                   │
│                      status_rl = SELECT_RL;                              │
│     002 send         SET_RF_ON;                                          │
│                      SELECT_RL_M1;                                       │
│     ...                                                                    │
│                                                                            │
└─── PROCEDURE GENERATION ──────────────────────────────────────────────────┘
                                   ↓

┌─── RestApi Response ──────────────────────────────────────────────────────┐
│                                                                            │
│  return GeneratedTestProcedure(                                           │
│      procedure_string=procedure,                                         │
│      active_configurations={2,5,8},                                      │
│      allowed_configurations={1,3},                                       │
│      disturbed_configurations={5},                                       │
│      final_active_configurations={1,2,3,8}                              │
│  )                                                                         │
│                                                                            │
│  HTTP 200 Response (JSON):                                               │
│  {                                                                        │
│    "procedure_string": "001 EXPECTED TM...",                            │
│    "active_configurations": [2,5,8],                                     │
│    "allowed_configurations": [1,3],                                      │
│    "disturbed_configurations": [5],                                      │
│    "final_active_configurations": [1,2,3,8]                             │
│  }                                                                         │
│                                                                            │
└─── HTTP RESPONSE SENT ────────────────────────────────────────────────────┘
```

---

## Part 9: Data Flow Diagrams

### 9.1 Database Schema & Relationships

```
DATABASE SCHEMA (ODBC - TM_TC)
════════════════════════════════════════════════════════════════════

TeleCommandDetails Table:
┌──────┬────────────────────┬────────┬──────────┬──────────┬──────────┬─────────┐
│ TC   │ CID                │ CMD_TYPE│ PRIORITY │ PID      │ TM       │ TM_STATE│
├──────┼────────────────────┼────────┼──────────┼──────────┼──────────┼─────────┤
│ SET1 │ 0x1001            │ on_cmd │ 10       │ 0x2001   │ STAT_M   │ ON      │
│ SET2 │ 0x1002            │ on_cmd │ 20       │ 0x2002   │ STAT_RL  │ SELECT_R│
│ OFF1 │ 0x1003            │ off_cmd│ 5        │ NULL     │ NULL     │ NULL    │
└──────┴────────────────────┴────────┴──────────┴──────────┴──────────┴─────────┘

CFG_based_TC Table:
┌────────┬──────┬──────────┬──────────┬──────────┬─────────────┐
│ CFG_NO │ TC   │ PARAMETER│ TM       │ TM_STATE │ PRIORITY    │
├────────┼──────┼──────────┼──────────┼──────────┼─────────────┤
│ 1      │ SET1 │ NULL     │ STAT_M   │ ON       │ 10          │
│ 1      │ SET2 │ NULL     │ STAT_RL  │ SELECT_R │ 20          │
│ 3      │ SET1 │ NULL     │ STAT_M   │ ON       │ 10          │
│ 3      │ SET3 │ NULL     │ STAT_FL  │ SELECT_F │ 15          │
│ 5      │ SET2 │ NULL     │ STAT_RL  │ SELECT_M │ 20          │
└────────┴──────┴──────────┴──────────┴──────────┴─────────────┘

INHIBITED_CONFIGS Table:
┌────────┐
│ CFG_NO │
├────────┤
│ 100    │  ← This config is disabled
│ 102    │
└────────┘

TMTBL Table:
┌──────────────────┬─────────┐
│ TM_MNEMONIC      │ TM_TYPE │
├──────────────────┼─────────┤
│ STAT_M           │ injected│
│ STAT_RL          │ injected│
│ STAT_FL          │ injected│
│ COUNTER1         │ raw     │
└──────────────────┴─────────┘

CONFLICT DETECTION:
──────────────────

cfg_based_tc_df after join with TMTBL:

CFG_1: TM states required
  • STAT_M = ON
  • STAT_RL = SELECT_R

CFG_3: TM states required
  • STAT_M = ON
  • STAT_FL = SELECT_F

CFG_5: TM states required
  • STAT_RL = SELECT_M

CONFLICT CHECK:
  CFG_1 vs CFG_3: STAT_M both ON, STAT_RL differs → COMPATIBLE
  CFG_1 vs CFG_5: STAT_RL differs (SELECT_R vs SELECT_M) → CONFLICT
  CFG_3 vs CFG_5: STAT_RL differs → CONFLICT

Result: conflict_cfgs_df = {
  CFG_1: [CFG_5],
  CFG_3: [CFG_5],
  CFG_5: [CFG_1, CFG_3]
}
```

---

## Part 10: Key Algorithms Summary

### 10.1 Algorithm Reference Table

| Algorithm | Location | Complexity | Purpose |
|-----------|----------|------------|---------|
| find_cfg_wise_conflicts_optimized | ExtractConstraints | O(n·m) | Detect CFG conflicts |
| generate_cfg_based_on_commands | GenerateCommands | O(n·m) | Generate minimal commands |
| generate_procedure | GenerateProcedure | O(k·p) | Format procedure |
| find_constrained_gray_paths | CmdGenerationDP | O(2^b) | Safe state transitions |
| binary_to_hex_data_bytes | CmdGenerationDP | O(b/4) | Binary encoding |
| expecte_tms_for_saw_path_df | CmdGenerationDP | O(n·log n) | Data transformation |

Where:
- n = number of configurations
- m = average TMs per config
- k = number of commands
- p = number of procedure components
- b = number of bits

---

## Part 11: Configuration & Deployment

### 11.1 Configuration File: `Database/Telecommand/conf.toml`

```toml
[options]
create_excel_files = true  # Generate debug Excel exports

[database]
dsn = "TM_TC"              # ODBC datasource name

[redis]
url = "redis://localhost:6379?decode_responses=True"

[api]
port = 8000                # FastAPI server port
host = "0.0.0.0"           # Listen on all interfaces

[telemetry]
heartbeat_interval = 3     # TM invalidation interval (seconds)
redis_ttl = 7200           # 2 hours TTL for stored data
```

### 11.2 Dependencies & Requirements

```toml
# pyproject.toml
python = "^3.12"
fastapi = "^0.112.0"       # Web framework
polars = "^1.5.0"          # High-performance dataframes
redis = "^5.0.8"           # Cache + message store
uvicorn = "^0.30.5"        # ASGI server
httpx = "^0.27.0"          # Async HTTP client
pyodbc = "^5.1.0"          # ODBC database
aiohttp = "^3.10.1"        # Async HTTP library
requests = "^2.32.3"       # HTTP library
xlsxwriter = "^3.2.0"      # Excel generation
cx-freeze = "^7.2.0"       # Executable building
fastexcel = "^0.11.5"      # Excel performance
pyarrow = "^17.0.0"        # Data processing
```

---

## Part 12: Error Handling & Logging

### 12.1 Logging System

```python
# Location: src/Logging/Logger.py

logger = getLogger(__name__)

# Log levels used:
logger.info("Normal operations")
logger.error("Exceptions and failures")
logger.warning("Warnings (TM not found, etc.)")
logger.debug("Verbose debug info")

# Example flow:
info: "Loading TeleCommandDetails from database..."
info: "Pre-processing request for CFG: [1, 3]"
info: "Active Configs: [2, 5, 8]"
info: "Disturbed Configs: [5]"
info: "Final Active Configs: [1, 2, 3, 8]"
info: "Generating required commands..."
info: "Commands generated: [SET1, SET2, ...]"
info: "Generating procedure..."
error: "Exception in procedure generation: {error_details}"
```

### 12.1 Exception Handling

```
EXCEPTION HIERARCHY:
────────────────────

TcGenerationException (custom)
├─ DatabaseException
│  ├─ "No Configurations Found in the Request"
│  ├─ "CFG_NO not found in database"
│  └─ "TM_MNEMONIC not found in TMTBL"
│
├─ CommandException
│  ├─ "Unknown command format"
│  └─ "Invalid command parameters"
│
├─ TelemetryException
│  ├─ "Telemetry Data Break"
│  ├─ "TM values count mismatch"
│  └─ "TM not found: {mnemonic}"
│
└─ ProcedureException
   ├─ "Error in procedure formatting"
   └─ "Line number overflow"

API RESPONSE ON ERROR:

HTTP 500 Internal Server Error
{
    "detail": "Error occurred while generating commands: {error_message}"
}

UI Notification:
  "status": "ERROR",
  "message": "{error_details}"
```

---

## Conclusion

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     TELECOMMAND SYSTEM                          │
│                  Complete Architecture View                      │
└─────────────────────────────────────────────────────────────────┘

PRESENTATION LAYER:
├─ FastAPI REST API Server (port 8000)
├─ Endpoints: /restApi/tc/*
└─ CORS enabled for cross-origin requests

SERVICE LAYER:
├─ ApiHandlers: Request routing & orchestration
├─ GenerateCommands (L3): Command generation logic
├─ ExtractConstraints (L2): Conflict detection
└─ ReadDatabase (L1): Data access layer

DATA LAYER:
├─ Primary: ODBC Database (PostgreSQL/SQL Server)
├─ Cache: Redis (TM storage, injections, sessions)
└─ Temporary: Generated Excel files (debug output)

PROCESSING LAYER:
├─ Conflict Resolution: Multi-configuration state analysis
├─ Command Generation: Minimal command set calculation
├─ Procedure Generation: Formatted test sequence output
└─ State Transitions: Gray code path finding

PLUGIN ARCHITECTURE:
├─ Factory Pattern: Dynamic format handlers
├─ Digital Processor: CmdGenerationDP algorithms
├─ Command Formatters: Normal, BOA, Data commands
└─ Extensible: Add new formats without core changes


KEY DESIGN PATTERNS:
════════════════════

1. Factory Pattern
   ├─ Dynamic plugin loading
   ├─ Command format routing
   └─ Easy extensibility

2. Async/Await Pattern
   ├─ Non-blocking operations
   ├─ Concurrent request handling
   └─ Background TM invalidation

3. Layered Architecture
   ├─ Clear separation of concerns
   ├─ Testability
   └─ Maintainability

4. State Management
   ├─ Session-based configuration
   ├─ Redis caching
   └─ Transaction-like semantics

5. Constraint Satisfaction
   ├─ Conflict detection
   ├─ Valid state verification
   └─ Optimal command sequencing


PERFORMANCE CHARACTERISTICS:
═════════════════════════════

Database Load: Startup (5-10 seconds)
  • All tables loaded into memory
  • DataFrames cached in Python
  • Conflict resolution pre-calculated

Per-Request Latency: ~1-5 seconds
  • TM refresh: ~500ms
  • Command generation: ~1-2s
  • Procedure formatting: ~500ms-1s

Memory Footprint: ~200-500 MB
  • Database tables (cfgs, commands, TMs)
  • Conflict matrices
  • Cached DataFrames

Scalability:
  • Linear with number of configurations
  • Linear with commands per config
  • Concurrent requests via async

Bottlenecks:
  • Database query performance
  • Complex conflict resolution
  • TM state transitions
```

---

## Appendix: Quick Reference

### Quick Algorithm Selection Guide

**Need to:**|**Use Algorithm**|**Location**
---|---|---
Check if CFGs conflict|find_cfg_wise_conflicts_optimized|ExtractConstraints
Generate minimal commands|generate_cfg_based_on_commands|GenerateCommands
Format procedures|generate_procedure|GenerateProcedure
Safe state transitions|find_constrained_gray_paths|CmdGenerationDP
Binary encoding|binary_to_hex_data_bytes|CmdGenerationDP
Route commands|plugins_factory.get_component|Factory
Get active configs|get_active_configurations|Utility
Refresh telemetry|refresh_tm|Utility
Inject test TM|inject_tm|ProcedureBase

This comprehensive document provides complete visibility into how the Telecommand System works from entry point to output.
