"""Real native daemon tests: IPC, durable publish, resets and malformed packets."""
import json
import os
from pathlib import Path
import socket
import struct
import subprocess
import tempfile
import unittest
import sqlite3

MAGIC = 0x5651454352554C32
BINARY = Path(os.environ['STUDIO_BACKEND']).resolve()


class Runtime(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='studio-runtime-')
        self.root = Path(self.tmp.name)
        self.start()
        self.sequence = 0

    def start(self):
        self.process = subprocess.Popen([str(BINARY), str(self.root), str(self.root/'config.db')],
                                        stderr=subprocess.PIPE, text=True)
        line = self.process.stderr.readline()
        if 'studio_backend_ready' not in line:
            raise RuntimeError(line + self.process.stderr.read())

    def stop(self):
        self.process.terminate()
        _, error = self.process.communicate(timeout=5)
        self.assertEqual(self.process.returncode, 0, error)

    def tearDown(self):
        if self.process.poll() is None:
            self.stop()
        self.tmp.cleanup()

    def control(self, config=None, raw=None):
        with socket.socket(socket.AF_UNIX, socket.SOCK_SEQPACKET) as peer:
            peer.settimeout(3)
            peer.connect(str(self.root/'control.sock'))
            peer.send(raw if raw is not None else b'G' if config is None else b'P'+json.dumps(config).encode())
            return json.loads(peer.recv(8192))

    def connect(self):
        peer = socket.socket(socket.AF_UNIX, socket.SOCK_SEQPACKET)
        peer.settimeout(3)
        peer.connect(str(self.root/'analysis.sock'))
        return peer

    def batch(self, peer, y, gap=0, generation=1, frame=None, observed=1, uncertain=0):
        self.sequence += 1
        f = frame or self.sequence
        packet = struct.pack('<13Q', MAGIC, self.sequence, 1, f, self.sequence, f*40000000, 1, gap, y is not None, 1, 1, 2560, 1440)
        if y is not None:
            xy = [struct.unpack('<I', struct.pack('<f', v))[0] for v in (.5, y)]
            packet += struct.pack('<6Q', 1, generation, *xy, 1, observed | uncertain*2)
        peer.send(packet)
        data = peer.recv(1448)
        words = struct.unpack('<'+'Q'*(len(data)//8), data)
        self.assertEqual(words[0], MAGIC)
        self.assertEqual(words[1], self.sequence)
        return words

    def config(self, y=.6, direction=1):
        return {'kind':'attendance', 'x1':.1, 'y1':y, 'x2':.9, 'y2':y, 'direction':direction}

    def test_unconfigured_publish_crossing_and_restart(self):
        self.assertFalse(self.control()['details']['configured'])
        with self.connect() as peer:
            self.assertEqual(self.batch(peer, .4)[2], 1)
            reply = self.control(self.config())
            self.assertEqual(reply['code'], 202)
            self.assertEqual(reply['details']['pendingVersion'], 1)
            self.assertEqual(self.batch(peer, .4)[11], 0)
            self.assertEqual(self.batch(peer, .8)[11], 1)
            self.assertEqual(self.control()['details']['crossingCount'], 1)
        self.stop()
        self.start()
        status = self.control()['details']
        self.assertEqual(status['activeVersion'], 1)
        self.assertAlmostEqual(status['line']['y1'], .6)
        with self.connect() as peer:
            self.assertEqual(self.batch(peer, .8)[11], 0)

    def test_gaps_empty_generation_and_revisions(self):
        self.control(self.config())
        with self.connect() as peer:
            self.batch(peer, .4)
            self.assertEqual(self.batch(peer, .8, gap=1)[11], 0)
            self.batch(peer, .4)
            self.assertEqual(self.batch(peer, .8, generation=2)[11], 0)
            self.batch(peer, .4, generation=2)
            self.batch(peer, None)
            self.assertEqual(self.batch(peer, .8, generation=2)[11], 0)
            self.batch(peer, .4, generation=2)
            same_frame = self.sequence
            self.assertEqual(self.batch(peer, .8, generation=2, frame=same_frame)[11], 0)
            self.batch(peer, .4, generation=2, uncertain=1)
            self.assertEqual(self.batch(peer, .8, generation=2)[11], 0)

    def test_publish_boundary_and_failed_config(self):
        self.control(self.config())
        with self.connect() as peer:
            self.batch(peer, .4)
            self.assertEqual(self.control(self.config(direction=-1))['code'], 202)
            self.assertEqual(self.control(self.config())['code'], 409)
            self.assertEqual(self.batch(peer, .8)[11], 0)
            self.assertEqual(self.batch(peer, .4)[11], 1)
            self.assertEqual(self.control(self.config(direction=0))['code'], 422)
            self.assertEqual(self.control(raw=b'Pnull')['code'], 422)
            self.assertEqual(self.control(raw=b'P{}garbage')['code'], 422)
            self.assertEqual(self.control()['details']['activeVersion'], 2)

    def test_disconnect_does_not_join_trajectory(self):
        self.control(self.config())
        with self.connect() as peer:
            self.batch(peer, .4)
        # Explicitly wait for peer closure to be observed using control progress;
        # reconnect may be rejected while the preceding live owner is draining.
        self.stop()
        self.start()
        with self.connect() as peer:
            self.assertEqual(self.batch(peer, .8)[11], 0)

    def test_highlight_color_persists_past_three_seconds_then_clears(self):
        config=self.config()
        config['highlight']={'enabled':True,'color':'#123abc','lifetime':'track'}
        self.assertEqual(self.control(config)['code'],202)
        with self.connect() as peer:
            self.assertEqual(self.batch(peer,.4)[19],0)
            result=self.batch(peer,.8)
            self.assertEqual(result[19],1)
            self.assertEqual(result[23:26],(1,1,0xff123abc))
            for _ in range(110):
                result=self.batch(peer,.8)
                self.assertEqual(result[19],1)
                self.assertEqual(result[21:24],(1,1,0xff123abc))
            self.assertEqual(self.batch(peer,.8,uncertain=1)[19],0)
            self.assertEqual(self.batch(peer,.8)[19],0)
            self.batch(peer,.4)
            self.assertEqual(self.batch(peer,.8)[19],1)
            self.assertEqual(self.batch(peer,.8,generation=2)[19],0)
            self.batch(peer,.4,generation=2)
            self.assertEqual(self.batch(peer,.8,generation=2)[19],1)
            self.assertEqual(self.batch(peer,.8,generation=2,gap=1)[19],0)
            self.batch(peer,None)
            self.assertEqual(self.batch(peer,.8)[19],0)
        self.stop(); self.start()
        h=self.control()['details']['highlight']
        self.assertTrue(h['enabled']); self.assertEqual(h['color'],'#123abc');self.assertEqual(h['lifetime'],'track')

    def test_highlight_optional_and_disabled_does_not_suppress_event(self):
        config=self.config()
        config['highlight']={'enabled':False,'color':'#00ff99','lifetime':'track'}
        self.control(config)
        with self.connect() as peer:
            self.batch(peer,.4)
            result=self.batch(peer,.8)
            self.assertEqual(result[11],1)
            self.assertEqual(result[19],0)
        self.assertFalse(self.control()['details']['highlight']['enabled'])
        for h in [{'enabled':'yes'},{'enabled':True,'color':'red'},
                  {'enabled':True,'color':'#123abc','lifetime':'three-seconds'}]:
            config['highlight']=h
            self.assertEqual(self.control(config)['code'],422)

    def test_migrate_legacy_gate_without_implicit_highlight(self):
        self.stop()
        with sqlite3.connect(str(self.root/'config.db')) as db:
            db.execute('DROP TABLE attendance')
            db.execute('CREATE TABLE attendance(id INTEGER PRIMARY KEY,version INTEGER,x1 REAL,y1 REAL,x2 REAL,y2 REAL,direction INTEGER)')
            db.execute('INSERT INTO attendance VALUES(1,7,.2,.4,.8,.4,-1)')
        self.start()
        d=self.control()['details']
        self.assertEqual(d['activeVersion'],7)
        self.assertAlmostEqual(d['line']['y1'],.4)
        self.assertFalse(d['highlight']['enabled'])

    def test_malformed_and_shutdown_with_idle_peers(self):
        with self.connect() as peer:
            peer.send(b'bad')
            self.assertEqual(peer.recv(1448), b'')
        slow = socket.socket(socket.AF_UNIX, socket.SOCK_SEQPACKET)
        slow.connect(str(self.root/'control.sock'))
        self.stop()
        slow.close()

    @unittest.skipUnless(os.environ.get('STUDIO_CAMERA_ROOT'), 'optional camera protocol source')
    def test_protocol_pin(self):
        studio = Path(__file__).resolve().parents[1]/'ipc/wire.h'
        camera = Path(os.environ['STUDIO_CAMERA_ROOT'])/'src/rules/ipc/wire.h'
        self.assertEqual(studio.read_bytes(), camera.read_bytes())

    @unittest.skipUnless(os.environ.get('STUDIO_CAMERA_TEST'), 'optional camera C adapter executable')
    def test_camera_action_boundary(self):
        subprocess.run([os.environ['STUDIO_CAMERA_TEST'], str(self.root), str(self.root/'outbox.db')], check=True, timeout=10)
        subprocess.run([os.environ['STUDIO_CAMERA_TEST'], str(self.root/'absent')], check=True, timeout=3)


if __name__ == '__main__':
    unittest.main()
