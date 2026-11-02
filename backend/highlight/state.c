#include "state.h"
#include <string.h>
unsigned vqec_vision_studio_highlight_state_process(vqec_vision_studio_highlight_state *_self,
    const vqec_vision_rule_batch *_batch,const vqec_vision_rule_result *_result,uint32_t _color,
    vqec_vision_studio_highlight_action *_out)
{
    if (!_color || !_batch->available || _batch->gap || _self->epoch!=_batch->epoch ||
        _batch->pts<_self->pts || _batch->pts-_self->pts>UINT64_C(500000000)) _self->count=0;
    unsigned count=0;
    for (unsigned i=0;i<_batch->count && _color && _batch->available;++i) {
        const vqec_vision_rule_object *object=&_batch->objects[i];
        if (!object->observed || object->uncertain || !object->category) continue;
        int armed=0;
        for (unsigned j=0;j<_self->count;++j)
            armed|=_self->subjects[j].id==object->id && _self->subjects[j].generation==object->generation;
        for (unsigned j=0;j<_result->count;++j)
            armed|=_result->hits[j].id==object->id && _result->hits[j].generation==object->generation;
        if (armed) _out[count++]=(vqec_vision_studio_highlight_action){object->id,object->generation,_color};
    }
    memcpy(_self->subjects,_out,count*sizeof(*_out)); _self->count=count;
    _self->epoch=_batch->epoch; _self->pts=_batch->pts;
    return count;
}
