#include "private.h"
#include <math.h>
int vqec_vision_rules_engine_geometry_side(const vqec_vision_rule_config *_config,float _x,float _y)
{
    float dx=_config->x2-_config->x1,dy=_config->y2-_config->y1;
    float value=dx*(_y-_config->y1)-dy*(_x-_config->x1);
    float tolerance=_config->tolerance*hypotf(dx,dy);
    return value>tolerance ? 1 : value < -tolerance ? -1 : 0;
}
int vqec_vision_rules_engine_geometry_cross(const vqec_vision_rule_config *_config,float _x,float _y,float _nx,float _ny)
{
    float dx=_config->x2-_config->x1,dy=_config->y2-_config->y1;
    float a=dx*(_y-_config->y1)-dy*(_x-_config->x1);
    float b=dx*(_ny-_config->y1)-dy*(_nx-_config->x1);
    if (a==b) return 0;
    float t=a/(a-b),ix=_x+t*(_nx-_x),iy=_y+t*(_ny-_y);
    float u=((ix-_config->x1)*dx+(iy-_config->y1)*dy)/(dx*dx+dy*dy);
    return t>=0 && t<=1 && u>=0 && u<=1;
}
