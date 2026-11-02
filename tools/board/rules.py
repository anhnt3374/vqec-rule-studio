"""Authenticated control gateway to the native Studio owner; no analysis here."""
import json
import socket


def attendance(_handler, _upstream, _headers, _body):
    """Reuse camera session authority, then deliver config to Studio's private socket."""
    _upstream.request('GET', '/api/v1/profile', headers=_headers)
    response = _upstream.getresponse()
    payload = response.read(16385)
    if response.status != 200:
        return response.status, b'{"message":"studio.authentication_required"}'
    if len(payload) > 16384:
        raise ValueError('Profile size limit')
    profile = json.loads(payload)
    if profile.get('details', {}).get('role') != 'administrator':
        return 403, b'{"message":"studio.administrator_required"}'
    if _handler.command == 'PUT' and (not _body or len(_body) > 512):
        return 422, b'{"message":"studio.invalid_config"}'
    packet = b'P' + _body if _handler.command == 'PUT' else b'G'
    with socket.socket(socket.AF_UNIX, socket.SOCK_SEQPACKET) as peer:
        peer.settimeout(3)
        peer.connect(_handler.server.rules_socket)
        if peer.send(packet) != len(packet):
            raise OSError('Incomplete Studio command')
        data, _, flags, _ = peer.recvmsg(8192)
        if flags & socket.MSG_TRUNC:
            raise ValueError('Studio response size limit')
    reply = json.loads(data)
    status = reply.get('code', 503)
    if status not in (200, 202, 409, 422, 500, 503):
        raise ValueError('Invalid Studio status')
    return status, data
