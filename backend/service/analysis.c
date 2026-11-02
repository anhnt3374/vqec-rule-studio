#define _POSIX_C_SOURCE 200809L
#include "private.h"
#include <poll.h>
#include <sys/socket.h>
#include <unistd.h>
#include <string.h>
int vqec_vision_studio_service_analysis_process(vqec_vision_studio_service *_self,
    const unsigned char *_input,size_t _length,unsigned char *_out,int _reset)
{
    if (_length<104 || vqec_vision_rules_ipc_wire_get(_input,0)!=VQEC_VISION_RULE_IPC_MAGIC) return -1;
    uint64_t count=vqec_vision_rules_ipc_wire_get(_input,8),sequence=vqec_vision_rules_ipc_wire_get(_input,1);
    if (count>32 || _length!=104+count*48 || !sequence || (!_reset && sequence<=_self->sequence)) return -1;
    if (vqec_vision_rules_ipc_wire_get(_input,6)>1 || vqec_vision_rules_ipc_wire_get(_input,7)>1 ||
        vqec_vision_rules_ipc_wire_get(_input,11)!=2560 || vqec_vision_rules_ipc_wire_get(_input,12)!=1440) return -1;
    vqec_vision_rule_object objects[32];
    for (unsigned i=0;i<count;++i) {
        size_t n=13+i*6; uint64_t flags=vqec_vision_rules_ipc_wire_get(_input,n+5);
        if (flags>3 || vqec_vision_rules_ipc_wire_get(_input,n+4)>2) return -1;
        objects[i]=(vqec_vision_rule_object){vqec_vision_rules_ipc_wire_get(_input,n),vqec_vision_rules_ipc_wire_get(_input,n+1),
            vqec_vision_rules_ipc_wire_number(_input,n+2),vqec_vision_rules_ipc_wire_number(_input,n+3),
            (uint32_t)vqec_vision_rules_ipc_wire_get(_input,n+4),(uint32_t)(flags&1),(uint32_t)(flags>>1)};
    }
    vqec_vision_rule_batch batch={.epoch=vqec_vision_rules_ipc_wire_get(_input,2),.frame=vqec_vision_rules_ipc_wire_get(_input,3),
        .revision=vqec_vision_rules_ipc_wire_get(_input,4),.pts=vqec_vision_rules_ipc_wire_get(_input,5),
        .available=(uint32_t)vqec_vision_rules_ipc_wire_get(_input,6),
        .gap=_reset || sequence!=_self->sequence+1 || vqec_vision_rules_ipc_wire_get(_input,7) ||
            vqec_vision_rules_ipc_wire_get(_input,9)!=_self->ai_epoch || vqec_vision_rules_ipc_wire_get(_input,10)!=_self->gallery_epoch,.count=(uint32_t)count,.objects=objects};
    vqec_vision_rule_hit hits[32]; vqec_vision_rule_result result={.hits=hits,.capacity=32};
    uint64_t start=vqec_vision_studio_service_state_clock();
    pthread_mutex_lock(&_self->lock);
    if (_self->pending.version) {
        if (vqec_vision_rules_engine_context_start(_self->engine,&_self->pending)) { pthread_mutex_unlock(&_self->lock); return -1; }
        _self->active=_self->pending; _self->pending.version=0;
    }
    int status=_self->active.version ? vqec_vision_rules_engine_process(_self->engine,&batch,&result) : VQEC_VISION_UNSUPPORTED;
    uint64_t done=vqec_vision_studio_service_state_clock();
    _self->ai_epoch=vqec_vision_rules_ipc_wire_get(_input,9); _self->gallery_epoch=vqec_vision_rules_ipc_wire_get(_input,10);
    _self->sequence=sequence; ++_self->offered; ++_self->processed; _self->invalid+=status!=0;
    _self->gaps+=batch.gap!=0; _self->selected=result.selected; _self->frame=batch.frame;
    _self->pts=batch.pts; _self->source_epoch=batch.epoch; _self->last_ns=!status && batch.available && !result.lost ? done : 0;
    _self->eval_us=(done-start)/1000; if (_self->eval_us>_self->eval_max_us) _self->eval_max_us=_self->eval_us;
    uint64_t words[]={VQEC_VISION_RULE_IPC_MAGIC,sequence,(uint64_t)(status!=0),_self->epoch,_self->active.version,
        batch.epoch,batch.frame,batch.revision,batch.pts,result.selected,result.lost,result.count,(uint64_t)(int64_t)_self->active.direction};
    for (unsigned i=0;i<13;++i) vqec_vision_rules_ipc_wire_put(_out,i,words[i]);
    vqec_vision_rules_ipc_wire_float(_out,13,_self->active.x1); vqec_vision_rules_ipc_wire_float(_out,14,_self->active.y1);
    vqec_vision_rules_ipc_wire_float(_out,15,_self->active.x2); vqec_vision_rules_ipc_wire_float(_out,16,_self->active.y2);
    vqec_vision_rules_ipc_wire_put(_out,17,_self->ai_epoch); vqec_vision_rules_ipc_wire_put(_out,18,_self->gallery_epoch);
    for (unsigned i=0;i<result.count;++i) {
        vqec_vision_rules_ipc_wire_put(_out,19+i*2,hits[i].id); vqec_vision_rules_ipc_wire_put(_out,20+i*2,hits[i].generation);
        unsigned n=(unsigned)(_self->crossings++%12); _self->event_frames[n]=batch.frame;
        _self->event_tracks[n]=hits[i].id; _self->event_versions[n]=_self->active.version;
    }
    pthread_mutex_unlock(&_self->lock); return 152+(int)result.count*16;
}
void *vqec_vision_studio_service_analysis_run(void *_context)
{
    vqec_vision_studio_service *self=_context; int peer=-1,reset=1;
    unsigned char input[VQEC_VISION_RULE_IPC_REQUEST],output[VQEC_VISION_RULE_IPC_REPLY];
    while (!atomic_load(&self->stopping)) {
        struct pollfd fds[2]={{self->analysis_listener,POLLIN,0},{peer,POLLIN,0}};
        if (poll(fds,2,100)<0) continue;
        if (fds[0].revents&POLLIN) {
            int next=vqec_vision_studio_service_socket_accept(self->analysis_listener);
            if (peer<0) { peer=next; reset=1; } else if (next>=0) close(next);
        }
        if (peer<0 || !fds[1].revents) continue;
        ssize_t length=recv(peer,input,sizeof(input),MSG_TRUNC|MSG_DONTWAIT);
        int size=length>0 && length<=(ssize_t)sizeof(input) ?
            vqec_vision_studio_service_analysis_process(self,input,(size_t)length,output,reset) : -1;
        if (size<0 || send(peer,output,(size_t)size,MSG_NOSIGNAL|MSG_DONTWAIT)!=size) {
            close(peer); peer=-1;
            pthread_mutex_lock(&self->lock); self->last_ns=0; pthread_mutex_unlock(&self->lock);
        } else reset=0;
    }
    if (peer>=0) close(peer);
    return NULL;
}
