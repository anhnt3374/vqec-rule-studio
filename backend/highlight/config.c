#include "state.h"
#include <json-c/json.h>
#include <string.h>
int vqec_vision_studio_highlight_config_read(struct json_object *_body,uint32_t *_color)
{
    *_color=0;
    struct json_object *highlight=NULL,*enabled=NULL,*color=NULL,*lifetime=NULL;
    if (!json_object_object_get_ex(_body,"highlight",&highlight)) return 0;
    if (!json_object_is_type(highlight,json_type_object) ||
        !json_object_object_get_ex(highlight,"enabled",&enabled) || !json_object_is_type(enabled,json_type_boolean)) return -1;
    if (json_object_object_get_ex(highlight,"lifetime",&lifetime) &&
        (!json_object_is_type(lifetime,json_type_string) || strcmp(json_object_get_string(lifetime),"track"))) return -1;
    if (!json_object_get_boolean(enabled)) return 0;
    if (!json_object_object_get_ex(highlight,"color",&color) || !json_object_is_type(color,json_type_string)) return -1;
    const char *text=json_object_get_string(color);
    if (strlen(text)!=7 || text[0]!='#') return -1;
    uint32_t rgb=0;
    for (unsigned i=1;i<7;++i) {
        unsigned c=(unsigned char)text[i],digit=c>='0' && c<='9' ? c-'0' :
            c>='a' && c<='f' ? c-'a'+10 : c>='A' && c<='F' ? c-'A'+10 : 16;
        if (digit==16) return -1;
        rgb=(rgb<<4)|digit;
    }
    *_color=UINT32_C(0xff000000)|rgb; return 0;
}
