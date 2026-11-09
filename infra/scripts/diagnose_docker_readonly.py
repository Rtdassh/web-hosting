#!/usr/bin/env python3
"""Inspect Docker through its current context. Never restart/remove/exec containers.
Does not export Config.Env or unrestricted inspect JSON, which can contain secrets.
"""
import argparse
import json
import re
import subprocess
from datetime import datetime, timezone


def docker(*args):
    return subprocess.run(['docker',*args],check=True,capture_output=True,text=True,timeout=30).stdout


def redact_log(text):
    import re
    text=re.sub(r'(?i)(password|passwd|secret|token|authorization)(\s*[:=]\s*)\S+',r'\1\2[REDACTED]',text)
    text=re.sub(r'(?i)(postgres(?:ql)?://)[^\s]+',r'\1[REDACTED]',text)
    return text


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',default='codrop-docker-'+datetime.now().strftime('%Y%m%d_%H%M%S')+'.json')
    args=parser.parse_args()
    context=docker('context','show').strip()
    print('Contexto Docker:',context)
    ids=docker('ps','-aq').split()
    entries=[]
    for ident in ids:
        item=json.loads(docker('inspect',ident))[0]
        name=item.get('Name','').lstrip('/')
        labels=item.get('Config',{}).get('Labels') or {}
        # Inventory all states, collect detailed mounts/logs only for Codrop containers.
        entry=dict(id=ident,name=name,image=item['Config']['Image'],state={key:item['State'].get(key) for key in ('Status','Running','ExitCode','Error','OOMKilled','StartedAt','FinishedAt')})
        managed=labels.get('managed_by')=='cloudpaas' or name.startswith(('paas_','cloudpaas','codrop'))
        if managed:
            entry.update(user=item['Config'].get('User'),mounts=item.get('Mounts'),
                port_bindings=item['HostConfig'].get('PortBindings'),
                cap_drop=item['HostConfig'].get('CapDrop'),security_opt=item['HostConfig'].get('SecurityOpt'),
                readonly_rootfs=item['HostConfig'].get('ReadonlyRootfs'),tmpfs=item['HostConfig'].get('Tmpfs'),
                network_mode=item['HostConfig'].get('NetworkMode'),
                memory_limit=item['HostConfig'].get('Memory'),nano_cpus=item['HostConfig'].get('NanoCpus'))
            # Nginx/site logs only. Backend logs can include SQL parameters or private data.
            if 'nginx' in entry['image'].lower() or labels.get('managed_by')=='cloudpaas' or name.startswith('paas_web_') or re.fullmatch(r'paas_\d+_[a-f0-9]+',name):
                try:
                    result=subprocess.run(['docker','logs','--tail','100',ident],capture_output=True,text=True,timeout=10)
                    entry['logs']=redact_log(result.stdout+result.stderr)
                except subprocess.TimeoutExpired: entry['logs']='Log query timed out'
        entries.append(entry)
    with open(args.output,'x',encoding='utf-8') as output:
        json.dump(dict(captured_at=datetime.now(timezone.utc).isoformat(),context=context,containers=entries),output,indent=2)
    print('Diagnóstico guardado:',args.output)
    print('Los logs pueden incluir IP/rutas de visitantes; revisa esos campos antes de compartir.')

if __name__=='__main__': main()
