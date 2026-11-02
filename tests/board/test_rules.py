"""The Studio gateway authorizes control but never forwards rules to camera API."""
import json
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch
sys.path.insert(0, str(Path(__file__).resolve().parents[2]/'tools/board'))
from rules import attendance


class RuleAuthority(unittest.TestCase):
    def upstream(self, role='administrator', status=200):
        response = SimpleNamespace(status=status, read=lambda _limit: json.dumps({'details': {'role': role}}).encode())
        upstream = Mock()
        upstream.getresponse.return_value = response
        return upstream

    def handler(self, method='PUT'):
        return SimpleNamespace(command=method, server=SimpleNamespace(rules_socket='/private/studio.sock'))

    def test_invalid_session_never_reaches_native_owner(self):
        with patch('rules.socket.socket') as socket:
            self.assertEqual(attendance(self.handler(), self.upstream(status=401), {}, b'{}')[0], 401)
            socket.assert_not_called()

    def test_nonadmin_never_reaches_native_owner(self):
        with patch('rules.socket.socket') as socket:
            self.assertEqual(attendance(self.handler(), self.upstream(role='operator'), {}, b'{}')[0], 403)
            socket.assert_not_called()

    def test_authorized_config_goes_only_to_studio_socket(self):
        upstream = self.upstream()
        with patch('rules.socket.socket') as socket:
            peer = socket.return_value.__enter__.return_value
            peer.send.return_value = 3
            peer.recvmsg.return_value = (b'{"code":202,"details":{}}', [], 0, None)
            self.assertEqual(attendance(self.handler(), upstream, {'Authorization':'Bearer fixture'}, b'{}')[0], 202)
            upstream.request.assert_called_once_with('GET', '/api/v1/profile', headers={'Authorization':'Bearer fixture'})
            peer.connect.assert_called_once_with('/private/studio.sock')
            peer.send.assert_called_once_with(b'P{}')


if __name__ == '__main__':
    unittest.main()
