#!/usr/bin/env python3
# cfg_state_watcher.py

import os
import math
import asyncio
import signal
import logging
from typing import Dict, List, Tuple, Any, Optional
from pathlib import Path

import pandas as pd
import redis.asyncio as redis

# ---------- Fixed config ----------
SCRIPT_DIR = Path(__file__).resolve().parent
EXCEL_PATH = SCRIPT_DIR / "DP_SET_ESTIMATE.xlsx"
SHEET_NAME = "TM"

REDIS_URL = "redis://localhost:6379?decode_responses=True"
TM_HASH = "TM_MAP"
DTM_HASH = "DTM_MAP"
OUT_KEY = "dp_cfg_sts"
POLL_PERIOD_SEC = 4.0
STORE_DEBUG = False  # set True to also store dp_cfg_diag

# ---------- Logging ----------
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s | %(levelname)s | %(message)s"
)
log = logging.getLogger("cfg_state_watcher")

# ---------- Load CFG rules ----------
def load_cfg_rules_from_excel(path: Path, sheet_name: str = "Sheet2") -> Dict[str, List[Tuple[str, Any]]]:
    """
    Returns: { cfg_name: [(tm_name_lower, expected_value), ...] }
    Ignores blank TM_STATE cells.
    """
    if not path.exists():
        raise FileNotFoundError(f"Excel file not found: {path}")

    df = pd.read_excel(path, sheet_name=sheet_name)
    cols = list(df.columns)
    if "CFG" not in cols:
        raise ValueError("Sheet must contain a 'CFG' column")

    start_idx = cols.index("CFG") + 1

    rules: Dict[str, List[Tuple[str, Any]]] = {}
    for _, row in df.iterrows():
        cfg = str(row["CFG"]).strip()
        tms: List[Tuple[str, Any]] = []

        i = start_idx
        while i < len(cols):
            tm_col = cols[i]
            state_col = cols[i + 1] if i + 1 < len(cols) else None
            tm_name = row.get(tm_col, None)
            exp_val = row.get(state_col, None) if state_col else None

            if pd.notna(tm_name) and pd.notna(exp_val):
                # LOWERCASE TM NAME to match Redis lowercased keys
                tms.append((str(tm_name).strip().lower(), exp_val))
            i += 2

        rules[cfg] = tms

    if not rules:
        raise ValueError("No CFG rules loaded from the sheet.")
    log.info("Loaded %d CFG definitions from %s:%s", len(rules), path.name, sheet_name)
    return rules

# ---------- Matching helpers ----------
def _to_boolish(s: Any) -> Optional[bool]:
    if s is None:
        return None
    v = str(s).strip().lower()
    if v in {"on", "true", "yes"}:
        return True
    if v in {"off", "false", "no"}:
        return False
    return None

def _to_float(s: Any) -> Optional[float]:
    if s is None:
        return None
    try:
        return float(str(s).strip())
    except Exception:
        return None

def values_equal(expected: Any, actual: Any, tol: float = 1e-6) -> bool:
    """
    Comparison order:
      1) Boolean-ish (case-insensitive): on/off/1/0/true/false/yes/no
      2) Numeric (abs tolerance)
      3) String (case-insensitive)
    """
    be = _to_boolish(expected)
    ba = _to_boolish(actual)
    if be is not None or ba is not None:
        return be is not None and ba is not None and be == ba

    fe = _to_float(expected)
    fa = _to_float(actual)
    if fe is not None and fa is not None:
        return math.isclose(fe, fa, rel_tol=0.0, abs_tol=tol)

    # Case-insensitive string compare for everything else
    return str(expected).strip().lower() == str(actual).strip().lower()

def normalize_tm_map(raw_tm: Dict[Any, Any]) -> Dict[str, Any]:
    """
    Redis has all-lowercase mnemonics and lowercase strings. Ensure keys are lowercase.
    decode_responses=True -> values are already str (or numbers if set that way).
    """
    return {str(k).strip().lower(): v for k, v in raw_tm.items()}

# ---------- CFG estimation ----------
def estimate_cfg(tm_map: Dict[str, Any], cfg_rules: Dict[str, List[Tuple[str, Any]]]):
    """
    Return (best_cfg, details).
    Selection:
      - Only CFGs with ZERO mismatches are eligible.
      - Pick highest 'matched' count; tie-break by coverage.
      - If none, return 'UNKNOWN'.
    """
    best = None
    best_matched = -1
    best_cov = -1.0
    details = {"candidates": {}}

    for cfg, pairs in cfg_rules.items():
        required = len(pairs)
        matched = 0
        mismatches = 0
        missing = 0

        for (tm_lower, expected) in pairs:
            if tm_lower not in tm_map:
                missing += 1
                continue
            actual = tm_map[tm_lower]
            if values_equal(expected, actual):
                matched += 1
            else:
                mismatches += 1

        coverage = matched / required if required else 0.0
        details["candidates"][cfg] = {
            "required": required,
            "matched": matched,
            "missing": missing,
            "mismatches": mismatches,
            "coverage": coverage,
        }

        if mismatches == 0:
            if (matched > best_matched) or (matched == best_matched and coverage > best_cov):
                best = cfg
                best_matched = matched
                best_cov = coverage

    return best or "_invalid", details

# ---------- Poller ----------
async def cfg_state_poller(
    r: "redis.Redis",
    cfg_rules: Dict[str, List[Tuple[str, Any]]],
    *,
    tm_hash: str = TM_HASH,
    dtm_hash: str = DTM_HASH,
    out_key: str = OUT_KEY,
    period_sec: float = POLL_PERIOD_SEC,
    also_store_debug: bool = STORE_DEBUG,
):
    log.info("Starting CFG state poller: TM=%s -> %s[%s] every %.1fs", tm_hash, dtm_hash, out_key, period_sec)
    while True:
        try:
            raw_tm = await r.hgetall(tm_hash)  # dict[str, str]
            tm_map = normalize_tm_map(raw_tm)

            best_cfg, diag = estimate_cfg(tm_map, cfg_rules)

            await r.hset(dtm_hash, mapping={out_key: best_cfg})
            if also_store_debug:
                await r.hset(dtm_hash, mapping={"dp_cfg_diag": str(diag)})

        except Exception as e:
            log.exception("Poller error: %s", e)
            try:
                await r.hset(dtm_hash, mapping={"dp_cfg_error": str(e)})
            except Exception:
                pass

        await asyncio.sleep(period_sec)

# ---------- Main ----------
async def amain():
    cfg_rules = load_cfg_rules_from_excel(EXCEL_PATH, SHEET_NAME)
    r = redis.from_url(REDIS_URL)

    stop_event = asyncio.Event()

    def _shutdown(*_):
        log.info("Shutdown signal received. Stopping...")
        stop_event.set()

    for sig_name in ("SIGINT", "SIGTERM"):
        sig = getattr(signal, sig_name, None)
        if sig is not None:
            try:
                asyncio.get_running_loop().add_signal_handler(sig, _shutdown)
            except NotImplementedError:
                pass

    poller = asyncio.create_task(
        cfg_state_poller(
            r,
            cfg_rules,
            tm_hash=TM_HASH,
            dtm_hash=DTM_HASH,
            out_key=OUT_KEY,
            period_sec=POLL_PERIOD_SEC,
            also_store_debug=STORE_DEBUG,
        )
    )

    try:
        await stop_event.wait()
    except KeyboardInterrupt:
        log.info("Interrupted by user.")
    finally:
        poller.cancel()
        try:
            await poller
        except asyncio.CancelledError:
            pass
        await r.aclose()
        log.info("Stopped cleanly.")

if __name__ == "__main__":
    try:
        asyncio.run(amain())
    except KeyboardInterrupt:
        pass
