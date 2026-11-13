import importlib.util
from pathlib import Path
import pytest

spec = importlib.util.spec_from_file_location('caddy_config', Path(__file__).resolve().parents[2] / 'infra/scripts/render_caddy_config.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_local_and_public_https_mapping():
    content = module.render([
        {'domain': 'codrop.test', 'port': 5173, 'local': True},
        {'domain': 'site.example.com', 'port': 30001},
    ])
    assert content.count('tls internal') == 1
    assert 'reverse_proxy 127.0.0.1:30001' in content


@pytest.mark.parametrize('domain', ['bad\n{ admin off }', 'https://example.com', '*.example.com', 'example.com:80'])
def test_rejects_host_config_injection(domain):
    with pytest.raises(ValueError):
        module.render([{'domain': domain, 'port': 30001}])
