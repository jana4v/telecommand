# Algorithm Implementation Guide - Quick Reference

## Quick Navigation
- [Algorithm Index](#algorithm-index)
- [Entry Point Flow](#entry-point-flow)
- [Algorithm Details](#algorithm-details)
- [Key Data Structures](#key-data-structures)

---

## Algorithm Index

### Core System Algorithms

| # | Algorithm | File | Lines | Time | Space | Purpose |
|---|-----------|------|-------|------|-------|---------|
| 1 | Entry Point Setup | tc.py | 1-20 | O(1) | O(1) | Initialize environment |
| 2 | REST API Initialization | RestApi.py | 1-80 | O(1) | O(m) | Setup server/middleware |
| 3 | TM Refresh & Heartbeat Monitor | Utility.py+RestApi.py | - | O(k) | O(k) | Maintain live telemetry cache |
| 4 | Database Initialization | ReadDatabase_L1.py | 1-100 | O(n·log n) | O(n) | Load all tables into RAM |
| 5 | Conflict Detection (Optimized) | ExtractConstraints_L2.py | 50-80 | O(n·m) | O(n·m) | Pre-calculate CFG conflicts |
| 6 | Configuration State Analysis | GenerateCommands_L3.py | 50-100 | O(n·m) | O(n) | Determine active/allowed CFGs |
| 7 | Minimal Command Generation | GenerateCommands_L3.py | 100-200 | O(n·m) | O(k) | Generate command sequence |
| 8 | Procedure Type Filtering | GenerateProcedure.py | 20-50 | O(k·log k) | O(k) | Sort commands by type/priority |
| 9 | Command Chunking | GenerateProcedure.py | 50-80 | O(k/c) | O(c) | Batch commands for sending |
| 10 | Plugin Factory Routing | Factory.py | 40-100 | O(1) | O(p) | Route to correct handler |
| 11 | Gray Code Path Finding | CmdGenerationDP.py | 130-200 | O(2^b) | O(p) | Find safe state transitions |
| 12 | Binary Bit Encoding | CmdGenerationDP.py | 250-320 | O(b/4) | O(b) | Convert to hardware format |
| 13 | Telemetry State Tracking | Multiple | - | O(1) | O(t) | Maintain TM cache during gen |
| 14 | DataFrame Transformation | CmdGenerationDP.py | 200-280 | O(n·log n) | O(n) | Reshape data for procedures |

---

## Entry Point Flow

```python
# tc.py execution sequence

START
  │
  ├─[1] Setup Python path & working directory
  │     └─ Adjust for frozen executable scenarios
  │
  ├─[2] Import RestApi module
  │     └─ Triggers full module initialization chain:
  │        └─ redis connection
  │        └─ FastAPI app creation
  │        └─ lifespan setup (background invalidation task)
  │
  ├─[3] Call run_rest_api()
  │     └─ Starts Uvicorn server
  │     └─ Listening on 0.0.0.0:8000
  │     └─ Awaiting HTTP requests
  │
  └─ RUNNING: Process never returns to main()
     └─ Background task: Invalidate TM every 3 seconds
     └─ HTTP Server: Process requests as they arrive
```

---

## Algorithm Details

### Algorithm 1: TM Refresh with Heartbeat Monitoring

```python
def refresh_tm(self):
    """Atomic refresh of live telemetry from Redis"""
    
    # Check if source system is alive
    tm1 = self.r.get("TM1_HEART_BEAT")      # Get heartbeat indicator
    tm2 = self.r.get("TM2_HEART_BEAT")
    
    if tm1 == "OK" or tm2 == "OK":
        # Source is alive - retrieve full TM snapshot
        self.tm = self.r.hgetall("TM_MAP")          # All current TM values
        self.initial_tm = copy.deepcopy(self.tm)    # Save snapshot
        logger.info("TM Refreshed successfully")
        
        # Now safe to return TM values
        return self.tm
    else:
        # Source is dead or not responding
        self.tm = {}
        self.initial_tm = {}
        logger.error("Telemetry Data Break - source not responding")
        raise Exception("Telemetry Data Break")

# Usage in request handler:
@app.post("/restApi/tc/set_cfgs_on")
async def set_cfgs_on(tc_request: TcRequest):
    # Pre-process triggers TM refresh
    tc_request = await gc.pre_process_request(tc_request)
    # At this point: tc_request.live_tm_data = snapshot of all TMs
```

---

### Algorithm 2: Conflict Detection (Self-Join Optimization)

```python
def find_cfg_wise_conflicts_all_cfgs_optimized(self) -> pl.DataFrame:
    """
    Find all configuration conflicts using vectorized operations.
    
    CONCEPT:
    ════════
    If two CFGs expect the SAME teleemetry to have DIFFERENT states,
    they CONFLICT and cannot be active simultaneously.
    
    Example:
        CFG_1: TM="STATUS", TM_STATE="ON"
        CFG_5: TM="STATUS", TM_STATE="OFF"
        → CONFLICT: Cannot activate both
    """
    
    # STEP 1: Group by TM (telemetry parameter)
    grouped_df = (
        self.cfg_based_tc_df.lazy()
        .group_by("TM")
        .agg([
            pl.col("CFG_NO").alias("CFG_NO_list"),
            pl.col("TM_STATE").alias("TM_STATE_list")
        ])
    ).collect()
    
    # Result:
    # ┌────────┬─────────────┬──────────────────┐
    # │ TM     │ CFG_NO_list │ TM_STATE_list    │
    # ├────────┼─────────────┼──────────────────┤
    # │ STATUS │ [1,3,5,8]   │ [ON,ON,OFF,OFF]  │
    # │ POWER  │ [1,5,10]    │ [25,50,25]       │
    # └────────┴─────────────┴──────────────────┘
    
    
    # STEP 2: Explode to individual rows
    exploded_df = grouped_df.explode(["CFG_NO_list", "TM_STATE_list"])
    
    # Result:
    # ┌────────┬────────────┬────────────┐
    # │ TM     │ CFG_NO     │ TM_STATE   │
    # ├────────┼────────────┼────────────┤
    # │ STATUS │ 1          │ ON         │
    # │ STATUS │ 3          │ ON         │
    # │ STATUS │ 5          │ OFF        │
    # │ STATUS │ 8          │ OFF        │
    # │ POWER  │ 1          │ 25         │
    # └────────┴────────────┴────────────┘
    
    
    # STEP 3: Self-join on TM column
    #         This creates pairs of all CFGs for each TM
    conflict_data = (
        exploded_df.join(exploded_df, on="TM", how="inner", suffix="_right")
        .filter(pl.col("TM_STATE_list") != pl.col("TM_STATE_list_right"))
        .select([
            pl.col("CFG_NO_list").alias("CFG_NO"),
            pl.col("CFG_NO_list_right").alias("CONFLICT_CFG")
        ])
    )
    
    # Result (simplified):
    # ┌────────┬──────────────┐
    # │ CFG_NO │ CONFLICT_CFG │
    # ├────────┼──────────────┤
    # │ 1      │ 5            │ ← CFG1 and CFG5 differ on STATUS
    # │ 1      │ 8            │ ← CFG1 and CFG8 differ on STATUS
    # │ 3      │ 5            │ ← CFG3 and CFG5 differ on STATUS
    # │ 3      │ 8            │ ← CFG3 and CFG8 differ on STATUS
    # │ 5      │ 1            │ ← Reverse pairs also included
    # │ 5      │ 3            │
    # │ 8      │ 1            │
    # │ 8      │ 3            │
    # └────────┴──────────────┘
    
    
    # STEP 4: Group and aggregate
    result = (
        conflict_data.group_by("CFG_NO")
        .agg(pl.col("CONFLICT_CFG").unique().alias("CONFLICT_CFGS"))
    )
    
    # Final Result:
    # ┌────────┬──────────────────────┐
    # │ CFG_NO │ CONFLICT_CFGS        │
    # ├────────┼──────────────────────┤
    # │ 1      │ [5, 8]               │
    # │ 3      │ [5, 8]               │
    # │ 5      │ [1, 3]               │
    # │ 8      │ [1, 3]               │
    # └────────┴──────────────────────┘
    
    return result


# COMPLEXITY ANALYSIS:
# ═══════════════════════
# 
# Group: O(n·log n) where n = rows in cfg_based_tc_df
# Explode: O(m) where m = total (CFG, TM_STATE) pairs
# Join: O(m·log m) vectorized
# Total: O(n·log n) via Polars optimization
#
# Memory: O(n) storing conflict matrix sparse representation
```

---

### Algorithm 3: Minimal Command Generation

```python
async def generate_cfg_based_on_commands(self, tc_req: TcRequest) -> TcRequest:
    """
    Generate the MINIMAL set of commands to activate target configurations.
    
    KEY INSIGHT:
    ════════════
    We don't just add all commands for target CFGs.
    We calculate EXACTLY which commands are needed considering:
      1. What's currently active
      2. What conflicts with the target
      3. What must turn OFF first
      4. TM state transitions required
    """
    
    # Get current state
    active_configurations = get_active_configurations()  # {2, 5, 8}
    request_configs = [1, 3]  # User wants these ON
    
    # Get allowed configs (non-conflicting pairs)
    allowed = get_list_of_non_conflict(request_configs)  # {1, 3}
    
    # Find what must be disabled
    disturbed = get_disturbed_configurations(
        active_configurations,  # {2, 5, 8}
        allowed                 # {1, 3}
    )  # Result: {5} (CFG 5 conflicts with target)
    
    # Calculate final desired state
    final_state = (active_configurations | allowed) - disturbed
    # = ({2,5,8} ∪ {1,3}) - {5} = {1,2,3,8}
    
    commands = []
    
    # For each target config that's not already active
    for target_cfg in allowed:
        if target_cfg in active_configurations:
            continue  # Already ON, skip
        
        # Get all commands for this config
        cfg_commands = cfg_based_tc_df.filter(CFG_NO == target_cfg)
        
        # Sort by priority (high priority first)
        cfg_commands = cfg_commands.sort(PRIORITY, descending=False)
        
        # Process each command
        for cmd_row in cfg_commands:
            if cmd_row.TM is not None:
                # This command changes a telemetry state
                
                # What's the current TM value?
                current_tm_value = get_tm_value(cmd_row.TM)
                
                if current_tm_value != cmd_row.TM_STATE:
                    # TM needs to change
                    
                    # Find which CFGs would be affected by this change
                    cfgs_in_old_state = cfg_based_tc_df.filter(
                        TM == cmd_row.TM AND
                        TM_STATE == current_tm_value
                    )["CFG_NO"].unique()  # CFGs that like current state
                    
                    cfgs_in_new_state = cfg_based_tc_df.filter(
                        TM == cmd_row.TM AND
                        TM_STATE == cmd_row.TM_STATE
                    )["CFG_NO"].unique()  # CFGs that like new state
                    
                    intersection = cfgs_in_old_state & cfgs_in_new_state
                    
                    # If intersection exists, those CFGs conflict
                    # Turn them OFF before changing TM
                    generate_off_commands_for(intersection)
                    
                    # Now add the command to change TM
                    if cmd_row.TC not in commands:
                        commands.append(cmd_row.TC)
                        
                    # Update local TM cache
                    self.tm[cmd_row.TM] = cmd_row.TM_STATE
                else:
                    # TM already in desired state
                    if cmd_row.TC not in commands:
                        commands.append(cmd_row.TC)
            else:
                # Command has no TM requirement
                if cmd_row.TC not in commands:
                    commands.append(cmd_row.TC)
    
    return commands


# EXAMPLE WALKTHROUGH:
# ════════════════════
# 
# Initial state: active={2,5}, request=[1,3]
# 
# Step 1: Get allowed
#   CFG_1: {TM1:ON, TM2:SEL_A}
#   CFG_3: {TM1:ON, TM2:SEL_B}
#   → CONFLICT on TM2 (SEL_A vs SEL_B)
#   → Allowed = {1}
# 
# Step 2: Get disturbed
#   active={2,5} vs allowed={1}
#   CFG_5: {TM1:OFF, TM2:SEL_C}
#   → CFG_5 conflicts (TM1:OFF vs target:ON)
#   → Disturbed = {5}
# 
# Step 3: Process CFG_1
#   Commands needed:
#     • Check TM1: current=OFF, target=ON → ADD SET_RF_ON
#     • Check TM2: current=SEL_A, target=SEL_A → SKIP (already correct)
#   → commands = [SET_RF_ON]
# 
# Final: commands = [TURN_OFF_CFG_5_CMDS..., SET_RF_ON]
```

---

### Algorithm 4: Procedure Generation (Formatting)

```python
async def generate_procedure(self, tc_request: TcRequest) -> str:
    """
    Convert command list to formatted test procedure with:
    - Telemetry expectations
    - Send commands
    - Line numbers
    - Proper spacing
    """
    
    procedure = ""
    line_number = tc_request.line_number or 1
    
    # STEP 1: Categorize commands
    commands_df = tc_details_df.filter(TC.is_in(tc_request.commands))
    
    initial_cmds = commands_df.filter(CMD_TYPE == "initial_cmd")
    off_cmds = commands_df.filter(CMD_TYPE == "off_cmd")
    switch_cmds = commands_df.filter(CMD_TYPE == "switch_cmd")
    other_cmds = commands_df.filter(~CMD_TYPE.is_in([...]))
    
    
    # STEP 2: Process in order with priorities
    for cmd_group in [initial_cmds, off_cmds, switch_cmds, other_cmds]:
        # Group by priority
        for priority, priority_group in cmd_group.group_by(PRIORITY):
            
            # STEP 3: Chunk into batches
            batch_size = tc_request.number_of_commands_in_each_send  # 5
            for start in range(0, len(priority_group), batch_size):
                batch = priority_group[start:start+batch_size]
                
                # STEP 4: Route through factory
                for row in batch:
                    tc_row = TcDetailsTblRow(**row)
                    
                    # Get handler for this command format
                    handler = plugins_factory.get_component(tc_row.CMD_FORMAT)
                    
                    # Generate procedure fragment
                    fragment = await handler.get_procedure(
                        tc_row,
                        tc_request,
                        is_start=(start == 0),  # First of batch
                        redis=self.r
                    )
                    
                    # fragment = TestProcedure(
                    #     expected_part="001 EXPECTED TM  STATUS = ON;",
                    #     send_part="002 send          SET_RF_ON;",
                    #     line_number=3
                    # )
                    
                    procedure += fragment.expected_part
                    procedure += fragment.send_part
                    line_number = fragment.line_number
    
    # STEP 5: Add ending
    procedure += f"{str(line_number).zfill(3)} end\n"
    
    return procedure


# OUTPUT FORMAT:
# ══════════════
# 001 EXPECTED TM                    STATUS_MAIN = ON;
#                                    STATUS_RL = SELECT_RL;
# 002 send                           SET_RF_ON;
#                                    SELECT_RL_M1;
# 003 EXPECTED TM                    PWR_STATUS = 25;
# 004 send_tcp 1553TranTMTCBus 0005 09 09;
#                                    0A 0B;
# 005 end
```

---

### Algorithm 5: Gray Code Path Finding (CmdGenerationDP)

```python
def find_constrained_gray_paths(
    self,
    start_pattern: str,           # "00001" (current state)
    targets: str,                 # "10101" (goal state)
    constraint_positions=None,    # [(0,3)] can't both be 1
    constraint_positions2=None,   # [(1,2,4)] can't all be 1
    max_ones=3,                   # Max 3 simultaneous components
    reverse=False                 # Direction of search
) -> List[str]:
    """
    Find safe transitions between hardware states using Gray code.
    
    GRAY CODE PRINCIPLE:
    ════════════════════
    Each step can only FLIP ONE BIT (change one component on/off)
    This ensures one-at-a-time state changes.
    
    CONSTRAINTS:
    ════════════
    • Some components can't be powered simultaneously (power budget)
    • Some component pairs have physical conflicts
    • Maximum "1" bits (components ON) limited
    
    USE CASE:
    ════════════
    Powering up satellite digital processor:
    
    Start:  "00001" ← only Main RF on
    Goal:   "10101" ← Redundant RF, Redt Synth, Redt Synth-M on
    
    Cannot go directly (jumps 2+ bits).
    Need intermediate safe states.
    
    Constraint: Cannot have (Redt_RF AND Main_RF) both on
    Constraint: Cannot have (Redt_Synth AND Main_Synth AND Mesh) all on
    """
    
    def is_valid_pattern(pattern: str) -> bool:
        """Check if pattern satisfies all constraints"""
        
        # Constraint 1: Hard constraint
        if constraint_positions:
            if pattern[constraint_positions[0]] == '1' and \
               pattern[constraint_positions[1]] == '1':
                return False  # Invalid: both bits are 1
        
        # Constraint 2: Soft constraint
        if constraint_positions2:
            if pattern[constraint_positions2[0]] == '1' and \
               pattern[constraint_positions2[1]] == '1' and \
               pattern[constraint_positions2[2]] == '1':
                return False  # Invalid: all three bits are 1
        
        # Constraint 3: Bit count limit
        if pattern.count('1') > max_ones:
            return False  # Too many components active
        
        # Constraint 4: At least one component must be on
        if pattern.count('1') == 0:
            return False  # No components selected
        
        return True
    
    def get_neighbors(current: str) -> List[str]:
        """Generate all valid one-bit-flip neighbors"""
        neighbors = []
        for i in range(len(current)):
            # Flip bit at position i
            neighbor_list = list(current)
            neighbor_list[i] = '1' if current[i] == '0' else '0'
            neighbor = ''.join(neighbor_list)
            
            if is_valid_pattern(neighbor):
                neighbors.append(neighbor)
        
        return neighbors
    
    
    # BFS SEARCH
    # ═════════
    
    if reverse:
        # Search backward: TARGET → START
        queue = deque([(targets, [targets])])
        search_goal = start_pattern
    else:
        # Search forward: START → TARGET
        queue = deque([(start_pattern, [start_pattern])])
        search_goal = targets
    
    visited = {queue[0][0]}
    
    while queue:
        current, path = queue.popleft()
        
        # Check if reached goal
        if current == search_goal:
            if reverse:
                return path[::-1]  # Reverse if backward search
            else:
                return path[1:]    # Skip the starting state in result
        
        # Explore neighbors
        for neighbor in get_neighbors(current):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, path + [neighbor]))
    
    # No path found - should not happen if constraints allow it
    return None


# DETAILED EXAMPLE:
# ═════════════════
# 
# Input:
#   start = "00001"  (only SYNTH_MAIN on)
#   target = "10101"  (SYNTH_REDT, CHANNEL_REDT, CHANNEL_M on)
#   max_ones = 3
#   constraint: cannot have SYNTH_MAIN (bit-0) AND SYNTH_REDT (bit-4) on
# 
# BFS Exploration:
# 
# Initial: queue = [("00001", ["00001"])], visited = {"00001"}
# 
# Iteration 1:
#   current = "00001", path = ["00001"]
#   neighbors = ["01001", "00101"]  (flips bit 1, 2)
#   Add to queue, mark visited
# 
# Iteration 2:
#   current = "01001", path = ["00001", "01001"]
#   neighbors = ["00001"(skip), "11001"(invalid:bit0+4), "01101"]
#   Add "01101" to queue
# 
# Iteration 3:
#   current = "00101", path = ["00001", "00101"]
#   neighbors = ["01101", "00001"(skip), "00111"(invalid:3 ones)]
#   "01101" already visited, skip
# 
# Iteration 4:
#   current = "01101", path = ["00001", "01001", "01101"]
#   neighbors = ["00101"(skip), "11101"(invalid:4 ones), "01001"(skip), "01111"(invalid:4ones)]
#   dead end at this path
# 
# Continue searching...
# Path found: ["00001", "00101", "10101"]
#
# OUTPUT: ["00101", "10101"]  (skip start state)
# 
# Which translates to commands:
#   1. Flip bit-2: TURN ON CHANNEL_REDT
#   2. Flip bit-4: TURN ON SYNTH_REDT (now bit-0 is off already due to "00101")
#
# Timeline:
#   Step 0: "00001" (start: SYNTH_MAIN on)
#   Step 1: "00101" → TURN OFF SYNTH_MAIN, TURN ON CHANNEL_REDT
#   Step 2: "10101" → TURN ON SYNTH_REDT (goal reached)
```

---

## Key Data Structures

### TcRequest Object

```python
class TcRequest(BaseModel):
    # Configuration specification
    configs_str: str = ""                    # "1,3,5" or "1-5"
    config_numbers: List[int] = []           # [1, 3, 5]
    parameter: str | None = None             # Test parameter ("NOM", "MAX", etc.)
    
    # BOA (Board of Adjustments)
    boa_value: str | None = None             # Adjustment value
    boa_column_name: str | None = None       # Column to adjust
    force_boa_command_generation: bool=False # Force even if no BOA in DB
    
    # Command control
    commands: List[str] = []                 # Generated commands
    rpc_command: str | None = None           # Optional RPC
    rpc_name: str | None = None
    turn_off_payloads: bool = False          # Kill all payloads
    change_only_switches: bool = False       # Only switch commands
    
    # Subsystems
    sub_system_names: List[str] = []         # ["RF", "DAS"]
    request_is_to_turn_on: bool = False      # ON vs OFF request
    
    # State tracking (populated during generation)
    active_configurations: List[int]=[]      # Currently ON
    allowed_configurations: List[int]=[]     # Can be ON
    disturbed_configurations: List[int]=[]   # Must turn OFF
    line_number: int = 1                     # Procedure line counter
    
    # Internal tracking
    request_id: str = ""                     # Timestamp-based ID
    file_name: str = ""                      # Redis key for session
    live_tm_data: Dict[str, str] = {}        # Current TM snapshot
    
    # UI feedback
    req_summary: str = ""                    # Summary for UI
    req_status: str = ""                     # Status message
    req_progress: int = 0                    # Percentage (0-100)
```

### TestProcedure Object

```python
class TestProcedure(BaseModel):
    expected_part: str = ""     # EXPECTED TM lines
    send_part: str = ""         # send command lines
    line_number: int = 1        # Updated line counter
```

### GeneratedTestProcedure Object

```python
class GeneratedTestProcedure(BaseModel):
    procedure_string: str = ""  # Complete formatted procedure
    active_configurations: List[int] = []
    allowed_configurations: List[int] = []
    disturbed_configurations: List[int] = []
    final_active_configurations: List[int] = []
```

---

## Summary Matrix

### Performance Characteristics

| Operation | Time | Space | When Used |
|-----------|------|-------|-----------|
| Startup init | O(n·log n) | O(n) | Once on server start |
| TM refresh | O(k) | O(k) | Each request |
| Conflict calc | O(n·m) | O(n·m) | Pre-calculated, lookup O(1) |
| Gene commands | O(n·m) | O(k) | Per request |
| Gen procedure | O(k·p) | O(k) | Per request |
| Gray code | O(2^b) | O(p) | For DP config changes |

Where n=CFGs, m=TM/CFG, k=commands, p=patterns, b=bits

---

## Debugging Quick Tips

### Enable Debug Mode

```python
# In conf.toml
[logging]
level = "DEBUG"  # vs "INFO", "WARNING", "ERROR"

[options]
create_excel_files = true  # Writes debug Excel files to GeneratedExcels/
```

### Check Redis Cache

```bash
# View all injected TMs
redis-cli
> HGETALL INJECTED_TM_FOR_SIMULATOR_MAP

# View session data
> HGETALL <file_name>  # Where file_name = request ID

# View software config
> HGETALL SOFTWARE_CFG
```

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| "Telemetry Data Break" | Source system down | Check Go/Rust backend |
| "No Configurations Found" | Invalid config_str | Verify config numbers exist |
| "Unknown command format" | Plugin not loaded | Check procedure_*.py registration |
| "TM Mnemonic not found" | TM doesn't exist | Verify TMTBL database |

---

This quick reference complements the full system architecture document and provides algorithm details for implementation.
