#ifndef VQEC_VISION_RULES_ENGINE_H
#define VQEC_VISION_RULES_ENGINE_H
#include "status.h"
#include <stddef.h>
#include <stdint.h>
typedef struct vqec_vision_rule_engine vqec_vision_rule_engine;
typedef struct vqec_vision_rule_config {
    uint64_t version;
    float x1,y1,x2,y2,tolerance; /* normalized geometry; bottom-center anchor */
    int direction; /* +1 negative→positive cross product, -1 reverse */
} vqec_vision_rule_config;
typedef struct vqec_vision_rule_object {
    uint64_t id,generation;
    float x,y;
    uint32_t category,observed,uncertain; /* 1 person, 2 pedestrian; explicit adapter mapping */
} vqec_vision_rule_object;
typedef struct vqec_vision_rule_batch {
    uint64_t epoch,frame,revision,pts;
    uint32_t available,gap,count;
    const vqec_vision_rule_object *objects; /* borrowed through process return */
} vqec_vision_rule_batch;
typedef struct vqec_vision_rule_hit { uint64_t id,generation; } vqec_vision_rule_hit;
typedef struct vqec_vision_rule_result {
    vqec_vision_rule_hit *hits; /* caller-owned, borrowed through return */
    uint32_t capacity,count,selected,lost;
} vqec_vision_rule_result;
vqec_vision_status vqec_vision_rules_engine_context_create(size_t _capacity, vqec_vision_rule_engine **_out);
vqec_vision_status vqec_vision_rules_engine_context_start(vqec_vision_rule_engine *_self,const vqec_vision_rule_config *_config);
vqec_vision_status vqec_vision_rules_engine_process(vqec_vision_rule_engine *_self,const vqec_vision_rule_batch *_input,vqec_vision_rule_result *_out);
void vqec_vision_rules_engine_context_stop(vqec_vision_rule_engine *_self);
void vqec_vision_rules_engine_context_destroy(vqec_vision_rule_engine **_self);
typedef struct vqec_vision_rule_engine_ops {
    uint32_t version; size_t size;
    vqec_vision_status (*create)(size_t _capacity,vqec_vision_rule_engine **_out);
    vqec_vision_status (*start)(vqec_vision_rule_engine *_self,const vqec_vision_rule_config *_config);
    void (*stop)(vqec_vision_rule_engine *_self);
    vqec_vision_status (*process)(vqec_vision_rule_engine *_self,const vqec_vision_rule_batch *_input,vqec_vision_rule_result *_out);
    void (*destroy)(vqec_vision_rule_engine **_self);
} vqec_vision_rule_engine_ops;
const vqec_vision_rule_engine_ops *vqec_vision_rules_engine_context_operations(void);
#endif
