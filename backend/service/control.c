#define _POSIX_C_SOURCE 200809L
#include "private.h"
#include <sys/socket.h>
#include <poll.h>
#include <unistd.h>
#include <string.h>
void *vqec_vision_studio_service_control_run(void *_context)
{
    vqec_vision_studio_service *self=_context;
    struct pollfd fds[9]; uint64_t deadlines[9]={0};
    fds[0]=(struct pollfd){self->control_listener,POLLIN,0};
    for (unsigned i=1;i<9;++i) fds[i]=(struct pollfd){-1,POLLIN,0};
    while (!atomic_load(&self->stopping)) {
        if (poll(fds,9,100)<0) continue;
        if (fds[0].revents&POLLIN) {
            int fd=vqec_vision_studio_service_socket_accept(self->control_listener); unsigned i=1;
            while (i<9 && fds[i].fd>=0) ++i;
            if (i==9) { if (fd>=0) close(fd); }
            else { fds[i].fd=fd; deadlines[i]=vqec_vision_studio_service_state_clock()+UINT64_C(2000000000); }
        }
        for (unsigned i=1;i<9;++i) if (fds[i].fd>=0) {
            if (fds[i].revents&POLLIN) {
                char input[514],output[8192];
                ssize_t length=recv(fds[i].fd,input,sizeof(input)-1,MSG_TRUNC|MSG_DONTWAIT);
                int status=422;
                if (length>0 && length<(ssize_t)sizeof(input) && !memchr(input,0,(size_t)length)) {
                    input[length]=0;
                    if (input[0]=='G' && length==1) status=200;
                    else if (input[0]=='P') status=vqec_vision_studio_service_config_apply(self,input+1);
                }
                if (!vqec_vision_studio_service_status_write(self,status,output,sizeof(output)))
                    (void)send(fds[i].fd,output,strlen(output),MSG_NOSIGNAL|MSG_DONTWAIT);
                close(fds[i].fd); fds[i].fd=-1;
            } else if (fds[i].revents || vqec_vision_studio_service_state_clock()>deadlines[i]) {
                close(fds[i].fd); fds[i].fd=-1;
            }
        }
    }
    for (unsigned i=1;i<9;++i) if (fds[i].fd>=0) close(fds[i].fd);
    return NULL;
}
