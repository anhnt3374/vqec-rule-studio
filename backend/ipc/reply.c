#include "../service/private.h"
int vqec_vision_studio_ipc_reply_write(vqec_vision_studio_service *_self,const vqec_vision_rule_batch *_batch,
    const vqec_vision_rule_result *_result,uint64_t _sequence,int _status,unsigned char *_out)
{
    vqec_vision_studio_highlight_action draws[32];
    if (_status) _self->highlight.count=0;
    unsigned count=_status ? 0 : vqec_vision_studio_highlight_state_process(&_self->highlight,_batch,_result,_self->active_color,draws);
    uint64_t words[]={VQEC_VISION_RULE_IPC_MAGIC,_sequence,(uint64_t)(_status!=0),_self->epoch,_self->active.version,
        _batch->epoch,_batch->frame,_batch->revision,_batch->pts,_result->selected,_result->lost,_result->count,
        (uint64_t)(int64_t)_self->active.direction};
    for (unsigned i=0;i<13;++i) vqec_vision_rules_ipc_wire_put(_out,i,words[i]);
    vqec_vision_rules_ipc_wire_float(_out,13,_self->active.x1); vqec_vision_rules_ipc_wire_float(_out,14,_self->active.y1);
    vqec_vision_rules_ipc_wire_float(_out,15,_self->active.x2); vqec_vision_rules_ipc_wire_float(_out,16,_self->active.y2);
    vqec_vision_rules_ipc_wire_put(_out,17,_self->ai_epoch); vqec_vision_rules_ipc_wire_put(_out,18,_self->gallery_epoch);
    vqec_vision_rules_ipc_wire_put(_out,19,count); vqec_vision_rules_ipc_wire_put(_out,20,1); /* fixed Attendance trigger */
    for (unsigned i=0;i<_result->count;++i) {
        vqec_vision_rules_ipc_wire_put(_out,21+i*2,_result->hits[i].id); vqec_vision_rules_ipc_wire_put(_out,22+i*2,_result->hits[i].generation);
        unsigned n=(unsigned)(_self->crossings++%12); _self->event_frames[n]=_batch->frame;
        _self->event_tracks[n]=_result->hits[i].id; _self->event_versions[n]=_self->active.version;
    }
    size_t first=21+_result->count*2;
    for (unsigned i=0;i<count;++i) {
        vqec_vision_rules_ipc_wire_put(_out,first+i*3,draws[i].id);
        vqec_vision_rules_ipc_wire_put(_out,first+i*3+1,draws[i].generation);
        vqec_vision_rules_ipc_wire_put(_out,first+i*3+2,draws[i].color);
    }
    return 168+(int)_result->count*16+(int)count*24;
}
