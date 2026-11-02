#define _POSIX_C_SOURCE 200809L
#include "private.h"
#include <time.h>
#include <sys/random.h>
#include <string.h>
uint64_t vqec_vision_studio_service_state_clock(void)
{
    struct timespec now;
    return clock_gettime(CLOCK_MONOTONIC,&now) ? 0 : (uint64_t)now.tv_sec*1000000000+(uint64_t)now.tv_nsec;
}
int vqec_vision_studio_service_state_open(vqec_vision_studio_service *_self,const char *_path)
{
    if (getrandom(&_self->epoch,sizeof(_self->epoch),0)!=sizeof(_self->epoch) || !_self->epoch) return -1;
    if (sqlite3_open_v2(_path,&_self->database,SQLITE_OPEN_READWRITE|SQLITE_OPEN_CREATE,NULL)!=SQLITE_OK) return -1;
    sqlite3_busy_timeout(_self->database,1000);
    if (sqlite3_exec(_self->database,"PRAGMA synchronous=FULL; PRAGMA journal_mode=WAL;"
        "CREATE TABLE IF NOT EXISTS attendance(id INTEGER PRIMARY KEY CHECK(id=1),"
        "version INTEGER NOT NULL,x1 REAL NOT NULL,y1 REAL NOT NULL,x2 REAL NOT NULL,y2 REAL NOT NULL,direction INTEGER NOT NULL);",
        NULL,NULL,NULL)!=SQLITE_OK) return -1;
    if (vqec_vision_studio_highlight_config_schema(_self->database)) return -1;
    sqlite3_stmt *row=NULL;
    if (sqlite3_prepare_v2(_self->database,"SELECT version,x1,y1,x2,y2,direction,highlight_color,highlight_enabled FROM attendance WHERE id=1",-1,&row,NULL)!=SQLITE_OK) return -1;
    int rc=sqlite3_step(row);
    if (rc==SQLITE_ROW) {
        if (sqlite3_column_int64(row,0)<=0) { sqlite3_finalize(row); return -1; }
        sqlite3_int64 color=sqlite3_column_int64(row,6);
        if (color && (color<UINT32_C(0xff000000) || color>UINT32_MAX)) { sqlite3_finalize(row); return -1; }
        int enabled=sqlite3_column_int(row,7);
        if (enabled<0 || enabled>1 || (enabled && !color)) { sqlite3_finalize(row); return -1; }
        _self->active_color=(uint32_t)color; _self->active_highlight=(uint32_t)enabled;
        _self->active=(vqec_vision_rule_config){.version=(uint64_t)sqlite3_column_int64(row,0),
            .x1=(float)sqlite3_column_double(row,1),.y1=(float)sqlite3_column_double(row,2),
            .x2=(float)sqlite3_column_double(row,3),.y2=(float)sqlite3_column_double(row,4),
            .direction=sqlite3_column_int(row,5),.tolerance=.002f};
    }
    sqlite3_finalize(row);
    if (rc!=SQLITE_ROW && rc!=SQLITE_DONE) return -1;
    /* An empty database is unconfigured. No default gate is activated. */
    if (vqec_vision_rules_engine_context_create(1024,&_self->engine)) return -1;
    return _self->active.version ? vqec_vision_rules_engine_context_start(_self->engine,&_self->active) : 0;
}
