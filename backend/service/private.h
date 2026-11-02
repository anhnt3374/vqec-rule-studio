#ifndef VQEC_VISION_STUDIO_SERVICE_PRIVATE_H
#define VQEC_VISION_STUDIO_SERVICE_PRIVATE_H
#include "../engine/engine.h"
#include "../ipc/wire.h"
#include <pthread.h>
#include <sqlite3.h>
#include <stdatomic.h>
typedef struct vqec_vision_studio_service {
    pthread_mutex_t lock;
    vqec_vision_rule_engine *engine; /* analysis worker owns process; lock at boundary */
    vqec_vision_rule_config active,pending;
    sqlite3 *database; /* control worker only, full synchronous commits */
    uint64_t epoch,last_ns,sequence,offered,processed,invalid,gaps,crossings,selected;
    uint64_t frame,pts,source_epoch,ai_epoch,gallery_epoch,eval_us,eval_max_us;
    uint64_t event_frames[12],event_tracks[12],event_versions[12];
    atomic_int stopping;
    int analysis_listener,control_listener;
} vqec_vision_studio_service;
uint64_t vqec_vision_studio_service_state_clock(void);
int vqec_vision_studio_service_state_open(vqec_vision_studio_service *_self,const char *_path);
int vqec_vision_studio_service_config_apply(vqec_vision_studio_service *_self,const char *_text);
int vqec_vision_studio_service_status_write(vqec_vision_studio_service *_self,int _code,char *_out,size_t _capacity);
void *vqec_vision_studio_service_analysis_run(void *_context);
void *vqec_vision_studio_service_control_run(void *_context);
int vqec_vision_studio_service_socket_listen(const char *_path);
int vqec_vision_studio_service_socket_accept(int _listener);
int vqec_vision_studio_service_analysis_process(vqec_vision_studio_service *_self,
    const unsigned char *_input,size_t _length,unsigned char *_out,int _reset);
#endif
