#ifndef VQEC_VISION_RULES_ENGINE_PRIVATE_H
#define VQEC_VISION_RULES_ENGINE_PRIVATE_H
#include "engine.h"
typedef struct vqec_vision_rule_track {
    uint64_t id,generation,frame,pts;
    float x,y;
    int side,pending;
} vqec_vision_rule_track;
struct vqec_vision_rule_engine {
    vqec_vision_rule_config config;
    uint64_t epoch,frame,revision,pts;
    size_t slots;
    int started;
    vqec_vision_rule_track *tracks;
};
int vqec_vision_rules_engine_geometry_cross(const vqec_vision_rule_config *_config,float _x,float _y,float _nx,float _ny);
int vqec_vision_rules_engine_geometry_side(const vqec_vision_rule_config *_config,float _x,float _y);
#endif
