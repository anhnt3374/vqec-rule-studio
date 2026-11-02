#include "state.h"
#include <json-c/json.h>
#include <string.h>
#include <sqlite3.h>
int vqec_vision_studio_highlight_config_read(struct json_object *_body,uint32_t *_color,uint32_t *_enabled)
{
    *_color=*_enabled=0;
    struct json_object *highlight=NULL,*enabled=NULL,*color=NULL,*lifetime=NULL;
    if (!json_object_object_get_ex(_body,"highlight",&highlight)) return 0;
    if (!json_object_is_type(highlight,json_type_object) ||
        !json_object_object_get_ex(highlight,"enabled",&enabled) || !json_object_is_type(enabled,json_type_boolean)) return -1;
    if (json_object_object_get_ex(highlight,"lifetime",&lifetime) &&
        (!json_object_is_type(lifetime,json_type_string) || strcmp(json_object_get_string(lifetime),"track"))) return -1;
    *_enabled=(uint32_t)json_object_get_boolean(enabled);
    if (!json_object_object_get_ex(highlight,"color",&color)) return *_enabled ? -1:0;
    if (!json_object_is_type(color,json_type_string)) return -1;
    const char *text=json_object_get_string(color);
    if (strlen(text)!=7 || text[0]!='#') return -1;
    uint32_t rgb=0;
    for (unsigned i=1;i<7;++i) {
        unsigned c=(unsigned char)text[i],digit=c>='0' && c<='9' ? c-'0' :
            c>='a' && c<='f' ? c-'a'+10 : c>='A' && c<='F' ? c-'A'+10 : 16;
        if (digit==16) return -1;
        rgb=(rgb<<4)|digit;
    }
    *_color=UINT32_C(0xff000000)|rgb; return 0;
}

int vqec_vision_studio_highlight_config_schema(sqlite3 *_database)
{
    if (sqlite3_exec(_database,"BEGIN IMMEDIATE",NULL,NULL,NULL)!=SQLITE_OK) return -1;
    sqlite3_stmt *row=NULL; int has_color=0,has_enabled=0,result=-1,rc;
    if (sqlite3_prepare_v2(_database,"PRAGMA table_info(attendance)",-1,&row,NULL)!=SQLITE_OK) goto done;
    while ((rc=sqlite3_step(row))==SQLITE_ROW) {
        const char *name=(const char*)sqlite3_column_text(row,1);
        has_color|=!strcmp(name,"highlight_color"); has_enabled|=!strcmp(name,"highlight_enabled");
    }
    sqlite3_finalize(row); row=NULL;
    if (rc!=SQLITE_DONE) goto done;
    if (!has_color && sqlite3_exec(_database,"ALTER TABLE attendance ADD COLUMN highlight_color INTEGER NOT NULL DEFAULT 0",NULL,NULL,NULL)!=SQLITE_OK) goto done;
    if (!has_enabled && sqlite3_exec(_database,
        "ALTER TABLE attendance ADD COLUMN highlight_enabled INTEGER NOT NULL DEFAULT 0;"
        "UPDATE attendance SET highlight_enabled=(highlight_color<>0)",NULL,NULL,NULL)!=SQLITE_OK) goto done;
    if (sqlite3_exec(_database,"COMMIT",NULL,NULL,NULL)==SQLITE_OK) result=0;
done:
    sqlite3_finalize(row);
    if (result) (void)sqlite3_exec(_database,"ROLLBACK",NULL,NULL,NULL);
    return result;
}
