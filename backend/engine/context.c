#include "private.h"
#include <stdlib.h>
#include <string.h>
#include <math.h>
vqec_vision_status vqec_vision_rules_engine_context_create(size_t _capacity,vqec_vision_rule_engine **_out)
{
    if (!_out) return VQEC_VISION_INVALID_ARGUMENT;
    *_out=NULL;
    if (!_capacity || _capacity>100000) return VQEC_VISION_INVALID_ARGUMENT;
    vqec_vision_rule_engine *self=calloc(1,sizeof(*self));
    if (!self) return VQEC_VISION_NO_MEMORY;
    self->slots=1; while (self->slots<_capacity*2) self->slots*=2;
    self->tracks=calloc(self->slots,sizeof(*self->tracks));
    if (!self->tracks) { free(self); return VQEC_VISION_NO_MEMORY; }
    *_out=self; return VQEC_VISION_OK;
}
vqec_vision_status vqec_vision_rules_engine_context_start(vqec_vision_rule_engine *_self,const vqec_vision_rule_config *_config)
{
    if (!_self || !_config || !_config->version || !isfinite(_config->x1) || !isfinite(_config->y1) ||
        !isfinite(_config->x2) || !isfinite(_config->y2) || !isfinite(_config->tolerance) ||
        _config->x1<0 || _config->x1>1 || _config->x2<0 || _config->x2>1 ||
        _config->y1<0 || _config->y1>1 || _config->y2<0 || _config->y2>1 ||
        hypotf(_config->x2-_config->x1,_config->y2-_config->y1)<.01f ||
        _config->tolerance<0 || _config->tolerance>.05f ||
        (_config->direction!=1 && _config->direction!=-1)) return VQEC_VISION_INVALID_ARGUMENT;
    _self->config=*_config; _self->epoch=_self->frame=_self->revision=_self->pts=0;
    memset(_self->tracks,0,_self->slots*sizeof(*_self->tracks)); _self->started=1;
    return VQEC_VISION_OK;
}
void vqec_vision_rules_engine_context_stop(vqec_vision_rule_engine *_self)
{ if (_self) _self->started=0; }
void vqec_vision_rules_engine_context_destroy(vqec_vision_rule_engine **_self)
{
    if (!_self || !*_self) return;
    free((*_self)->tracks); free(*_self); *_self=NULL;
}
const vqec_vision_rule_engine_ops *vqec_vision_rules_engine_context_operations(void)
{
    static const vqec_vision_rule_engine_ops g_ops={1,sizeof(g_ops),vqec_vision_rules_engine_context_create,
        vqec_vision_rules_engine_context_start,vqec_vision_rules_engine_context_stop,
        vqec_vision_rules_engine_process,vqec_vision_rules_engine_context_destroy};
    return &g_ops;
}
