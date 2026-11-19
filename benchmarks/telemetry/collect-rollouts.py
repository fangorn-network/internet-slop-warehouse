#!/usr/bin/env python3
"""Export only whitelisted usage metadata from explicitly linked leaf sessions.

No raw messages, tool arguments, credentials or account IDs are written.
Manifest: {"agents":[{"condition":"A","agentPath":"/root/example",
 "sessionId":"...","parentSessionId":"..."}]}
"""
import argparse
import datetime
import hashlib
import json
from pathlib import Path


def stamp(value):
    return datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))


def inspect(path):
    raw = path.read_bytes()
    metadata = None
    contexts, usage, starts, ends, calls = [], [], [], [], []
    for number, line in enumerate(raw.splitlines(), 1):
        try:
            event = json.loads(line)
        except (ValueError, UnicodeError):
            continue
        payload = event.get("payload", {})
        kind = event.get("type")
        if kind == "session_meta":
            metadata = payload
        elif kind == "turn_context":
            contexts.append({k: payload[k] for k in ("turn_id", "model", "effort", "service_tier") if k in payload})
        elif kind == "response_item" and payload.get("type") in ("function_call", "custom_tool_call"):
            calls.append({"timestamp": event.get("timestamp"), "name": payload.get("name")})
        elif kind == "event_msg":
            entry = {"line": number, "timestamp": event.get("timestamp")}
            if payload.get("type") == "token_count" and payload.get("info"):
                info = payload["info"]
                entry.update({k: info.get(k) for k in ("total_token_usage", "last_token_usage", "last_usage_includes_reasoning")})
                usage.append(entry)
            elif payload.get("type") == "task_started":
                starts.append({**entry, "turn_id": payload.get("turn_id")})
            elif payload.get("type") == "task_complete":
                ends.append({**entry, "turn_id": payload.get("turn_id"), "recorded_duration_ms": payload.get("duration_ms")})
    return raw, metadata, contexts, usage, starts, ends, calls


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--session-root", type=Path, default=Path.home() / ".codex/sessions")
    args = parser.parse_args()
    targets = json.loads(args.manifest.read_text())["agents"]
    wanted = {target["sessionId"] for target in targets}
    found = {}
    # Only retain candidate files selected by exact UUID in the filename. Metadata
    # checks below are authoritative; a matching filename alone is insufficient.
    for path in args.session_root.rglob("*.jsonl"):
        if not any(session in path.name for session in wanted):
            continue
        data = inspect(path)
        metadata = data[1]
        if metadata and metadata.get("id") in wanted:
            session = metadata["id"]
            if session in found:
                raise ValueError(f"Ambiguous duplicate rollout for {session}")
            found[session] = (path, data)
    results = []
    for target in targets:
        path, data = found[target["sessionId"]]
        raw, meta, contexts, usage, starts, ends, calls = data
        spawn = meta.get("source", {}).get("subagent", {}).get("thread_spawn", {})
        if not (meta.get("agent_path") == spawn.get("agent_path") == target["agentPath"] and
                meta.get("parent_thread_id") == spawn.get("parent_thread_id") == target["parentSessionId"]):
            raise ValueError("Session lineage mismatch")
        turns = {c.get("turn_id") for c in contexts}
        if len(turns) != 1 or len(starts) != 1 or len(ends) != 1 or not usage:
            raise ValueError("Expected one finalized fresh builder turn")
        if starts[0]["turn_id"] != ends[0]["turn_id"] or starts[0]["turn_id"] not in turns:
            raise ValueError("Turn linkage mismatch")
        if usage[-1]["line"] > ends[0]["line"]:
            raise ValueError("Usage extends beyond selected completion")
        total = usage[-1]["total_token_usage"]
        if usage[0]["total_token_usage"] != usage[0]["last_token_usage"]:
            raise ValueError("Missing zero-origin baseline: do not treat a resumed cumulative session as a fresh run")
        monotone = all(usage[i]["total_token_usage"]["total_tokens"] >= usage[i-1]["total_token_usage"]["total_tokens"] for i in range(1, len(usage)))
        if not monotone:
            raise ValueError("Cumulative usage reset; explicit segment accounting required")
        if total["input_tokens"] + total["output_tokens"] != total["total_tokens"]:
            raise ValueError("Unexpected token schema")
        sums = {key: sum(u["last_token_usage"].get(key, 0) for u in usage) for key in total}
        results.append({
            **target,
            "modelProvider": meta.get("model_provider"),
            "contexts": contexts,
            "source": {"path": str(path), "sha256": hashlib.sha256(raw).hexdigest(), "finalUsageLine": usage[-1]["line"]},
            "counts": {**total, "uncached_input_tokens": total["input_tokens"] - total["cached_input_tokens"]},
            "reasoningIncludedInOutput": all(u["last_usage_includes_reasoning"] is True for u in usage),
            "consistency": {"singleFinalizedTurn": True, "zeroOriginObserved": True, "monotone": monotone,
                            "sumLastUsageEqualsFinalTotal": sums == total},
            "timing": {"started": starts[0]["timestamp"], "completed": ends[0]["timestamp"],
                       "firstTool": calls[0]["timestamp"] if calls else None,
                       "firstToolToCompletionSeconds": (stamp(ends[0]["timestamp"]) - stamp(calls[0]["timestamp"])).total_seconds() if calls else None,
                       "recordedTaskDurationMs": ends[0]["recorded_duration_ms"]},
            "actualBilledUsd": None,
            "events": usage,
        })
    if args.output.exists():
        raise ValueError("Output exists; refuse to overwrite usage evidence")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"scope": "Own leaf-session model token usage; billed dollars unavailable", "results": results}, indent=2) + "\n")
    print(json.dumps({"exported": len(results), "output": str(args.output)}))


if __name__ == "__main__":
    main()
