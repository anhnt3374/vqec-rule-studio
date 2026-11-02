#include "private.h"
#include <json-c/json.h>
#include <stdio.h>
#include <string.h>
int vqec_vision_studio_service_status_write(vqec_vision_studio_service *_self,int _code,char *_out,size_t _capacity)
{
    struct json_object *root=json_object_new_object(),*d=json_object_new_object(),*line=json_object_new_object();
    struct json_object *events=json_object_new_array(),*latency=json_object_new_object();
    if (!root || !d || !line || !events || !latency) {
        json_object_put(root); json_object_put(d); json_object_put(line); json_object_put(events); json_object_put(latency); return -1;
    }
    json_object_object_add(root,"code",json_object_new_int(_code));
    json_object_object_add(root,"message",json_object_new_string("studio.attendance"));
    json_object_object_add(root,"details",d);
    json_object_object_add(d,"owner",json_object_new_string("rule-studio-backend"));
    json_object_object_add(d,"kind",json_object_new_string("attendance"));
    json_object_object_add(d,"anchor",json_object_new_string("bottom-center"));
    pthread_mutex_lock(&_self->lock);
    json_object_object_add(d,"activeVersion",json_object_new_int64(_self->active.version));
    json_object_object_add(d,"pendingVersion",json_object_new_int64(_self->pending.version));
    char epoch[32]; snprintf(epoch,sizeof(epoch),"%llu",(unsigned long long)_self->epoch);
    json_object_object_add(d,"engineEpoch",json_object_new_string(epoch));
    uint64_t now=vqec_vision_studio_service_state_clock();
    json_object_object_add(d,"configured",json_object_new_boolean(_self->active.version!=0));
    json_object_object_add(d,"available",json_object_new_boolean(_self->active.version && _self->last_ns && now>=_self->last_ns && now-_self->last_ns<UINT64_C(3000000000)));
    json_object_object_add(line,"x1",json_object_new_double(_self->active.x1));
    json_object_object_add(line,"y1",json_object_new_double(_self->active.y1));
    json_object_object_add(line,"x2",json_object_new_double(_self->active.x2));
    json_object_object_add(line,"y2",json_object_new_double(_self->active.y2));
    json_object_object_add(line,"direction",json_object_new_int(_self->active.direction));
    json_object_object_add(d,"line",line);
    const char *keys[]={"offered","processed","invalid","gaps","crossingCount","categoryCount","frameId"};
    uint64_t values[]={_self->offered,_self->processed,_self->invalid,_self->gaps,_self->crossings,_self->selected,_self->frame};
    for (unsigned i=0;i<7;++i) json_object_object_add(d,keys[i],json_object_new_int64(values[i]));
    json_object_object_add(latency,"evaluate",json_object_new_int64(_self->eval_us));
    json_object_object_add(latency,"evaluateMax",json_object_new_int64(_self->eval_max_us));
    /* No fabricated p99; backend reports only measured evaluation latency. */
    json_object_object_add(d,"latencyUs",latency);
    uint64_t first=_self->crossings>12 ? _self->crossings-11 : 1;
    for (uint64_t i=first;i<=_self->crossings;++i) {
        unsigned n=(unsigned)((i-1)%12); struct json_object *event=json_object_new_object();
        json_object_object_add(event,"sequence",json_object_new_int64(i));
        snprintf(epoch,sizeof(epoch),"%llu",(unsigned long long)_self->event_tracks[n]);
        json_object_object_add(event,"trackId",json_object_new_string(epoch));
        json_object_object_add(event,"frameId",json_object_new_int64(_self->event_frames[n]));
        json_object_object_add(event,"version",json_object_new_int64(_self->event_versions[n]));
        json_object_array_add(events,event);
    }
    json_object_object_add(d,"events",events);
    struct json_object *highlight=json_object_new_object();
    char hex[8]; snprintf(hex,sizeof(hex),"#%06x",_self->active_color&0xffffff);
    json_object_object_add(highlight,"enabled",json_object_new_boolean(_self->active_highlight));
    json_object_object_add(highlight,"color",json_object_new_string(hex));
    json_object_object_add(highlight,"lifetime",json_object_new_string("track"));
    json_object_object_add(d,"highlight",highlight);
    pthread_mutex_unlock(&_self->lock);
    json_object_object_add(d,"actionTelemetryAvailable",json_object_new_boolean(0));
    const char *text=json_object_to_json_string_ext(root,JSON_C_TO_STRING_PLAIN);
    size_t length=strlen(text); int status=length<_capacity ? 0 : -1;
    if (!status) memcpy(_out,text,length+1);
    json_object_put(root); return status;
}
