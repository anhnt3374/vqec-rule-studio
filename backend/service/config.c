#include "private.h"
#include <json-c/json.h>
#include <math.h>
#include <limits.h>
#include <string.h>
int vqec_vision_studio_service_config_apply(vqec_vision_studio_service *_self,const char *_text)
{
    struct json_tokener *parser=json_tokener_new();
    if (!parser) return 500;
    json_tokener_set_flags(parser,JSON_TOKENER_STRICT);
    struct json_object *body=json_tokener_parse_ex(parser,_text,(int)strlen(_text));
    int valid=json_tokener_get_error(parser)==json_tokener_success &&
        (size_t)parser->char_offset==strlen(_text) && body && json_object_is_type(body,json_type_object);
    json_tokener_free(parser);
    struct json_object *kind=NULL;
    valid=valid && json_object_object_get_ex(body,"kind",&kind) && json_object_is_type(kind,json_type_string) &&
        !strcmp(json_object_get_string(kind),"attendance");
    const char *keys[]={"x1","y1","x2","y2","direction"}; double values[5]={0};
    for (unsigned i=0;i<5;++i) {
        struct json_object *value=NULL;
        if (!body || !json_object_object_get_ex(body,keys[i],&value) ||
            (!json_object_is_type(value,json_type_int) && !json_object_is_type(value,json_type_double))) valid=0;
        else values[i]=json_object_get_double(value);
        if (!isfinite(values[i])) valid=0;
    }
    json_object_put(body);
    vqec_vision_rule_config config={1,(float)values[0],(float)values[1],(float)values[2],(float)values[3],.002f,
        values[4]==1 ? 1 : values[4]==-1 ? -1 : 0};
    vqec_vision_rule_engine *probe=NULL;
    if (!valid || vqec_vision_rules_engine_context_create(1,&probe) ||
        vqec_vision_rules_engine_context_start(probe,&config)) valid=0;
    vqec_vision_rules_engine_context_destroy(&probe);
    if (!valid) return 422;
    pthread_mutex_lock(&_self->lock);
    uint64_t version=_self->active.version;
    int pending=_self->pending.version!=0;
    pthread_mutex_unlock(&_self->lock);
    if (pending) return 409;
    if (version>=INT64_MAX) return 409;
    config.version=version+1;
    sqlite3_stmt *row=NULL;
    if (sqlite3_prepare_v2(_self->database,"INSERT OR REPLACE INTO attendance VALUES(1,?1,?2,?3,?4,?5,?6)",-1,&row,NULL)!=SQLITE_OK) return 500;
    int failed=sqlite3_bind_int64(row,1,(sqlite3_int64)config.version)!=SQLITE_OK ||
        sqlite3_bind_double(row,2,config.x1)!=SQLITE_OK || sqlite3_bind_double(row,3,config.y1)!=SQLITE_OK ||
        sqlite3_bind_double(row,4,config.x2)!=SQLITE_OK || sqlite3_bind_double(row,5,config.y2)!=SQLITE_OK ||
        sqlite3_bind_int(row,6,config.direction)!=SQLITE_OK;
    int rc=failed ? SQLITE_ERROR : sqlite3_step(row); sqlite3_finalize(row);
    if (rc!=SQLITE_DONE) return 503;
    /* Durable intent precedes boundary activation; fsync never holds the engine lock. */
    pthread_mutex_lock(&_self->lock); _self->pending=config; pthread_mutex_unlock(&_self->lock);
    return 202;
}
