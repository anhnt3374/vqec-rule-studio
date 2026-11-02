#ifndef VQEC_VISION_STUDIO_HIGHLIGHT_STATE_H
#define VQEC_VISION_STUDIO_HIGHLIGHT_STATE_H
#include "../engine/engine.h"
struct json_object;
typedef struct vqec_vision_studio_highlight_action {
    uint64_t id,generation;
    uint32_t color;
} vqec_vision_studio_highlight_action;
typedef struct vqec_vision_studio_highlight_state {
    uint64_t epoch,pts;
    unsigned count;
    vqec_vision_studio_highlight_action subjects[32];
} vqec_vision_studio_highlight_state;
int vqec_vision_studio_highlight_config_read(struct json_object *_body,uint32_t *_color);
unsigned vqec_vision_studio_highlight_state_process(vqec_vision_studio_highlight_state *_self,
    const vqec_vision_rule_batch *_batch,const vqec_vision_rule_result *_result,uint32_t _color,
    vqec_vision_studio_highlight_action *_out);
#endif
