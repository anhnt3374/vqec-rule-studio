#include "private.h"
#include <math.h>
#include <string.h>
static vqec_vision_rule_track *vqec_vision_rules_engine_process_slot(vqec_vision_rule_engine *_self,
    const vqec_vision_rule_object *_object,uint64_t _pts)
{
    size_t start=(size_t)((_object->id*UINT64_C(11400714819323198485))>>16)&(_self->slots-1);
    vqec_vision_rule_track *reuse=NULL;
    for (size_t i=0;i<_self->slots;++i) {
        vqec_vision_rule_track *track=&_self->tracks[(start+i)&(_self->slots-1)];
        if (track->id==_object->id && track->generation==_object->generation) return track;
        if (!track->id) return reuse ? reuse : track;
        if (!reuse && _pts>track->pts && _pts-track->pts>UINT64_C(2000000000)) reuse=track;
    }
    return reuse;
}
static void vqec_vision_rules_engine_process_object(vqec_vision_rule_engine *_self,
    const vqec_vision_rule_batch *_input,const vqec_vision_rule_object *_object,vqec_vision_rule_result *_out)
{
    vqec_vision_rule_track *track=vqec_vision_rules_engine_process_slot(_self,_object,_input->pts);
    if (!track) { ++_out->lost; return; }
    if (track->id!=_object->id || track->generation!=_object->generation)
        *track=(vqec_vision_rule_track){.id=_object->id,.generation=_object->generation};

    int side=vqec_vision_rules_engine_geometry_side(&_self->config,_object->x,_object->y);
    int continuous=track->frame && _input->pts>track->pts && _input->pts-track->pts<=UINT64_C(500000000);
    if (!_object->observed || _object->uncertain || (_object->category!=1 && _object->category!=2)) {
        track->side=track->pending=0; track->frame=_input->frame; track->pts=_input->pts; return;
    }
    if (track->frame==_input->frame) return; /* metadata revision is not motion */
    if (!continuous) track->side=track->pending=0;
    if (continuous) {
        float dx=_self->config.x2-_self->config.x1,dy=_self->config.y2-_self->config.y1;
        float before=dx*(track->y-_self->config.y1)-dy*(track->x-_self->config.x1);
        float after=dx*(_object->y-_self->config.y1)-dy*(_object->x-_self->config.x1);
        if (before!=after && ((before<=0 && after>=0) || (before>=0 && after<=0)))
            track->pending=vqec_vision_rules_engine_geometry_cross(&_self->config,track->x,track->y,
                _object->x,_object->y) ? (after>before ? 1 : -1) : 0;
    }
    if (continuous && side && track->side==-_self->config.direction && side==_self->config.direction &&
        track->pending==_self->config.direction) {
        if (_out->count<_out->capacity) _out->hits[_out->count++]=(vqec_vision_rule_hit){_object->id,_object->generation};
        else ++_out->lost;
    }
    if (side) { track->side=side; track->pending=0; }
    track->x=_object->x; track->y=_object->y;
    track->frame=_input->frame; track->pts=_input->pts;
}
vqec_vision_status vqec_vision_rules_engine_process(vqec_vision_rule_engine *_self,
    const vqec_vision_rule_batch *_input,vqec_vision_rule_result *_out)
{
    if (!_self || !_self->started || !_input || !_out || !_input->epoch || !_input->frame || !_input->revision ||
        _input->count>100000 || (_input->count && !_input->objects) || (_out->capacity && !_out->hits))
        return VQEC_VISION_INVALID_ARGUMENT;
    _out->count=_out->selected=_out->lost=0;
    if (_self->epoch==_input->epoch && (_input->frame<_self->frame || _input->pts<_self->pts ||
        _input->revision<=_self->revision)) return VQEC_VISION_INVALID_ARGUMENT;
    for (unsigned i=0;i<_input->count;++i) {
        const vqec_vision_rule_object *o=&_input->objects[i];
        if (!o->id || !o->generation || !isfinite(o->x) || !isfinite(o->y) || o->x<0 || o->x>1 || o->y<0 || o->y>1)
            return VQEC_VISION_INVALID_ARGUMENT;
    }
    if (_self->epoch!=_input->epoch || _input->gap || !_input->available || !_input->count)
        memset(_self->tracks,0,_self->slots*sizeof(*_self->tracks));
    _self->epoch=_input->epoch; _self->frame=_input->frame; _self->revision=_input->revision; _self->pts=_input->pts;
    if (!_input->available) return VQEC_VISION_OK;
    for (unsigned i=0;i<_input->count;++i) {
        const vqec_vision_rule_object *object=&_input->objects[i];
        if (object->observed && (object->category==1 || object->category==2)) ++_out->selected;
        vqec_vision_rules_engine_process_object(_self,_input,object,_out);
    }
    return VQEC_VISION_OK;
}
