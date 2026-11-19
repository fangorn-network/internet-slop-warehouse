#!/usr/bin/env python3
"""Link explicitly named fresh agents using session metadata; print no transcript content."""
import argparse,json
from pathlib import Path

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('names',nargs='+')
p.add_argument('--output',type=Path)
p.add_argument('--session-root',type=Path,default=Path.home()/'.codex/sessions')
a=p.parse_args();found={}
for path in a.session_root.rglob('*.jsonl'):
    try:
        with path.open() as f:
            # Session metadata is normally first. Do not retain other payloads.
            header=json.loads(next(f))
        if header.get('type')!='session_meta':continue
        meta=header['payload'];name=meta.get('agent_path')
        if name not in a.names:continue
        spawn=meta.get('source',{}).get('subagent',{}).get('thread_spawn',{})
        if spawn.get('agent_path')!=name or spawn.get('parent_thread_id')!=meta.get('parent_thread_id'):raise ValueError('Lineage mismatch')
        if name in found:raise ValueError('Ambiguous agent name: '+name)
        found[name]={'condition':name.rsplit('_',1)[-1].upper(),'agentPath':name,'sessionId':meta['id'],'parentSessionId':meta['parent_thread_id']}
    except (StopIteration,json.JSONDecodeError):continue
missing=set(a.names)-set(found)
if missing:raise SystemExit('Missing named agent metadata: '+', '.join(sorted(missing)))
out={'agents':[found[n] for n in a.names]}
if a.output:
    if a.output.exists():raise SystemExit('Refusing output overwrite')
    a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))
