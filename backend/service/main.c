#define _POSIX_C_SOURCE 200809L
#include "private.h"
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/stat.h>
#include <string.h>
static int vqec_vision_studio_service_main_run(int _argc,char **_argv)
{
    if (_argc!=3) { fprintf(stderr,"usage: studio-backend PRIVATE_RUNTIME_DIRECTORY DATABASE\n"); return 2; }
    char analysis[108],control[108];
    if (snprintf(analysis,sizeof(analysis),"%s/analysis.sock",_argv[1])>=(int)sizeof(analysis) ||
        snprintf(control,sizeof(control),"%s/control.sock",_argv[1])>=(int)sizeof(control)) return 2;
    struct stat info;
    if (lstat(_argv[1],&info) || !S_ISDIR(info.st_mode) || info.st_uid!=geteuid() || (info.st_mode&0077)) return 2;
    sigset_t signals; sigemptyset(&signals); sigaddset(&signals,SIGINT); sigaddset(&signals,SIGTERM);
    if (pthread_sigmask(SIG_BLOCK,&signals,NULL)) return 1;
    vqec_vision_studio_service *self=calloc(1,sizeof(*self));
    if (!self) return 1;
    self->analysis_listener=self->control_listener=-1; atomic_init(&self->stopping,0);
    if (pthread_mutex_init(&self->lock,NULL)) { free(self); return 1; }
    pthread_t analysis_thread,control_thread; int analysis_ready=0,control_ready=0,result=1;
    if (vqec_vision_studio_service_state_open(self,_argv[2])) goto done;
    self->analysis_listener=vqec_vision_studio_service_socket_listen(analysis);
    self->control_listener=vqec_vision_studio_service_socket_listen(control);
    if (self->analysis_listener<0 || self->control_listener<0) goto done;
    if (pthread_create(&analysis_thread,NULL,vqec_vision_studio_service_analysis_run,self)) goto done;
    analysis_ready=1;
    if (pthread_create(&control_thread,NULL,vqec_vision_studio_service_control_run,self)) goto done;
    control_ready=1;
    pthread_mutex_lock(&self->lock);
    int configured=self->active.version!=0;
    pthread_mutex_unlock(&self->lock);
    fprintf(stderr,"studio_backend_ready configured=%d\n",configured);
    int received; result=sigwait(&signals,&received)!=0;
done:
    atomic_store(&self->stopping,1);
    if (analysis_ready) pthread_join(analysis_thread,NULL);
    if (control_ready) pthread_join(control_thread,NULL);
    if (self->analysis_listener>=0) { close(self->analysis_listener); unlink(analysis); }
    if (self->control_listener>=0) { close(self->control_listener); unlink(control); }
    vqec_vision_rules_engine_context_destroy(&self->engine);
    sqlite3_close(self->database); pthread_mutex_destroy(&self->lock); free(self);
    return result;
}
int main(int _argc,char **_argv) { return vqec_vision_studio_service_main_run(_argc,_argv); }
