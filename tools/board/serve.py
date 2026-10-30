#!/usr/bin/env python3
"""Static HTTPS host and fixed, narrow gateway to the existing camera API."""
import argparse
import http.client
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
import ssl
from urllib.parse import urlsplit


def allowed(method, target):
    url = urlsplit(target)
    if url.scheme or url.netloc or url.fragment:
        return False
    path = url.path
    if method == 'POST' and path in ('/api/v1/auth/login', '/api/v1/auth/logout', '/api/v1/auth/refresh'):
        return not url.query
    if method == 'GET' and path == '/api/v1/cameras':
        return not url.query
    if method == 'GET' and re.fullmatch(r'/api/v1/cameras/[a-f0-9-]{36}/live-stream', path):
        return url.query == 'streamType=AI'
    if method == 'POST' and path == '/api/v1/media/ai/whep':
        return not url.query
    return method == 'DELETE' and bool(re.fullmatch(r'/api/v1/media/sessions/[a-f0-9]{32}', path)) and not url.query


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass  # Do not log authorization headers, credentials or query strings.

    def do_GET(self):
        if self.path == '/studio-config.json':
            data = json.dumps({'boardApi': True, 'protocol': 'WEBRTC', 'streamType': 'AI'}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(data)
        elif self.path.startswith('/api/'):
            self.proxy()
        else:
            super().do_GET()

    def do_POST(self):
        self.proxy()

    def do_DELETE(self):
        self.proxy()

    def list_directory(self, _path):
        self.send_error(403)
        return None

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'same-origin')
        super().end_headers()

    def proxy(self):
        if not allowed(self.command, self.path):
            self.send_error(403)
            return
        host = self.headers.get('Host', '')
        if self.command != 'GET' and self.headers.get('Origin') not in (None, 'https://' + host):
            self.send_error(403)
            return
        try:
            if self.headers.get('Transfer-Encoding'):
                raise ValueError('Chunked input is not accepted')
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 <= length <= 65536:
                raise ValueError('Request size limit')
        except ValueError:
            self.send_error(413)
            return
        self.connection.settimeout(15)
        body = self.rfile.read(length) if length else None
        headers = {name: self.headers[name] for name in ('Authorization', 'Content-Type', 'Cookie') if name in self.headers}
        headers['Origin'] = 'https://' + self.server.upstream
        upstream = http.client.HTTPSConnection(self.server.upstream, context=self.server.upstream_tls, timeout=12)
        try:
            upstream.request(self.command, self.path, body=body, headers=headers)
            response = upstream.getresponse()
            data = response.read(1024 * 1024 + 1)
            if len(data) > 1024 * 1024:
                raise ValueError('Upstream response size limit')
            self.send_response(response.status)
            for name, value in response.getheaders():
                if name.lower() in ('content-type', 'set-cookie', 'location'):
                    if name.lower() == 'location' and value.startswith('https://' + self.server.upstream + '/'):
                        value = urlsplit(value).path
                    self.send_header(name, value)
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(data)
        except (OSError, ValueError, http.client.HTTPException):
            self.send_error(502, 'Existing camera API is unavailable')
        finally:
            upstream.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--cert', required=True)
    parser.add_argument('--key', required=True)
    parser.add_argument('--upstream', default='192.168.138.142:8443')
    parser.add_argument('--port', type=int, default=8444)
    args = parser.parse_args()
    root = args.root.resolve(strict=True)
    handler = lambda *a, **kw: Handler(*a, directory=str(root), **kw)
    server = ThreadingHTTPServer(('0.0.0.0', args.port), handler)
    server.upstream = args.upstream
    server.upstream_tls = ssl.create_default_context(cafile=args.cert)
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    context.load_cert_chain(args.cert, args.key)
    server.socket = context.wrap_socket(server.socket, server_side=True)
    server.serve_forever()


if __name__ == '__main__':
    main()
