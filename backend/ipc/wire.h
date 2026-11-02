#ifndef VQEC_VISION_RULES_IPC_WIRE_H
#define VQEC_VISION_RULES_IPC_WIRE_H
#include <stdint.h>
#include <stddef.h>
#include <string.h>
/* Attendance projection v2. Explicit LE u64 words, float32 IEEE bits in low32.
 * No pointers/FD/raw pixels. One connection owns one ordered source session.
 * Request: magic,sequence,epoch,frame,revision,pts,available,gap,count,aiEpoch,galleryEpoch,canvasWidth,canvasHeight;
 * object: id,generation,x,y,category,flags(observed=1,uncertain=2).
 * Reply: magic,sequence,status,engineEpoch,configVersion,epoch,frame,revision,
 * pts,selected,lost,count,direction,x1,y1,x2,y2,aiEpoch,galleryEpoch,drawCount,triggerEvent; hit: id,generation;
 * draw: id,generation,opaque ARGB32. Draws are current backend decisions, not TTL leases.
 * Reply ACK is analytic completion, never durable event delivery. On loss,
 * disconnect and reset continuity; never replay a completed pulse blindly. */
enum { VQEC_VISION_RULE_IPC_REQUEST=1640, VQEC_VISION_RULE_IPC_REPLY=1448,
    VQEC_VISION_RULE_IPC_REQUEST_WORDS=13,VQEC_VISION_RULE_IPC_REPLY_WORDS=21 };
#define VQEC_VISION_RULE_IPC_MAGIC UINT64_C(0x5651454352554c32)
#define VQEC_VISION_RULE_IPC_ROOT "/run/vqec-rule-studio"
static inline void vqec_vision_rules_ipc_wire_put(unsigned char *_data,size_t _word,uint64_t _value)
{ for (unsigned i=0;i<8;++i) _data[_word*8+i]=(unsigned char)(_value>>(i*8)); }
static inline uint64_t vqec_vision_rules_ipc_wire_get(const unsigned char *_data,size_t _word)
{ uint64_t value=0; for (unsigned i=0;i<8;++i) value|=(uint64_t)_data[_word*8+i]<<(i*8); return value; }
static inline void vqec_vision_rules_ipc_wire_float(unsigned char *_data,size_t _word,float _value)
{ uint32_t bits; memcpy(&bits,&_value,4); vqec_vision_rules_ipc_wire_put(_data,_word,bits); }
static inline float vqec_vision_rules_ipc_wire_number(const unsigned char *_data,size_t _word)
{ uint32_t bits=(uint32_t)vqec_vision_rules_ipc_wire_get(_data,_word); float value; memcpy(&value,&bits,4); return value; }
#endif
