"""Generate explicit host mappings; never accept proxy targets from public requests."""
import argparse
import json
import re
from pathlib import Path


def render(mappings: list[dict]) -> str:
    blocks = []
    seen = set()
    for item in mappings:
        domain, port = item['domain'], item['port']
        if not isinstance(domain, str) or len(domain) > 253 or not re.fullmatch(r'(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,62}', domain):
            raise ValueError('Use a lowercase hostname without scheme, port, or path')
        if domain in seen or type(port) is not int or not 1 <= port <= 65535:
            raise ValueError('Duplicate domain or invalid port')
        seen.add(domain)
        tls = '    tls internal\n' if item.get('local', False) else ''
        blocks.append(f'{domain} {{\n{tls}    reverse_proxy 127.0.0.1:{port}\n}}')
    if not blocks:
        raise ValueError('At least one domain is required')
    return '\n\n'.join(blocks) + '\n'


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('mappings', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    content = render(json.loads(args.mappings.read_text(encoding='utf-8')))
    args.output.write_text(content, encoding='utf-8')
