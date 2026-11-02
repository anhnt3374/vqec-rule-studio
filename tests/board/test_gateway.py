import importlib.util
from pathlib import Path
import unittest
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'tools/board'))

spec = importlib.util.spec_from_file_location('studio_gateway', Path(__file__).resolve().parents[2] / 'tools/board/serve.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class GatewayRoutes(unittest.TestCase):
    def test_camera_discovery_and_ai_only(self):
        camera = '/api/v1/cameras/51650000-0000-4000-8000-000000000000/live-stream'
        self.assertTrue(module.allowed('GET', camera + '?streamType=AI'))
        self.assertFalse(module.allowed('GET', camera + '?streamType=MAIN'))
        self.assertTrue(module.allowed('POST', '/api/v1/media/ai/whep'))
        self.assertFalse(module.allowed('POST', '/api/v1/media/main/whep'))

    def test_no_camera_config_or_arbitrary_proxy(self):
        for path in ('https://example.com/api/v1/cameras', '//example.com/api/v1/cameras', '/api/v1/auth/password', '/api/v1/../maintenance', '/api/v1/media/ai/whep?token=bad'):
            self.assertFalse(module.allowed('POST', path))
        self.assertFalse(module.allowed('DELETE', '/api/v1/cameras'))

    def test_attendance_read_publish_only(self):
        path = '/studio-api/v1/rules/attendance'
        self.assertFalse(module.allowed('PUT', '/api/v1/rules/attendance'))
        for method in ('GET', 'PUT'):
            self.assertTrue(module.allowed(method, path))
            self.assertFalse(module.allowed(method, path + '?other=1'))
            self.assertFalse(module.allowed(method, '/api/v1/rules/other'))
        for method in ('POST', 'DELETE', 'PATCH'):
            self.assertFalse(module.allowed(method, path))

    def test_only_session_cleanup_is_allowed(self):
        self.assertTrue(module.allowed('DELETE', '/api/v1/media/sessions/' + 'a' * 32))
        self.assertFalse(module.allowed('DELETE', '/api/v1/media/sessions/../auth'))
        self.assertFalse(module.allowed('DELETE', '/api/v1/media/sessions/' + 'a' * 33))


if __name__ == '__main__':
    unittest.main()
