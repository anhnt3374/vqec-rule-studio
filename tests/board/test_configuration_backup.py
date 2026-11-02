import importlib.util
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('studio_install', Path(__file__).resolve().parents[2]/'tools/board/install.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ConfigurationBackup(unittest.TestCase):
    def test_restore_before_highlight_schema_migration(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory); db=root/'active.sqlite3'; snapshot=root/'rollback'; snapshot.mkdir()
            with sqlite3.connect(db) as c:
                c.execute('CREATE TABLE attendance(version INTEGER,x1 REAL)')
                c.execute('INSERT INTO attendance VALUES(4,.25)')
            with patch.object(module,'g_database',db):
                module.backup_configuration(snapshot)
                with sqlite3.connect(db) as c:
                    c.execute('ALTER TABLE attendance ADD COLUMN highlight_color INTEGER DEFAULT 0')
                    c.execute('UPDATE attendance SET version=5,highlight_color=4279384764')
                module.restore_configuration(snapshot)
            with sqlite3.connect(db) as c:
                self.assertEqual(c.execute('SELECT * FROM attendance').fetchall(),[(4,.25)])
                self.assertEqual(len(c.execute('PRAGMA table_info(attendance)').fetchall()),2)
                self.assertEqual(c.execute('PRAGMA quick_check').fetchone()[0],'ok')
            self.assertEqual(db.stat().st_mode & 0o777,0o600)


if __name__=='__main__':unittest.main()
