#define _GNU_SOURCE
#include "private.h"
#include <sys/socket.h>
#include <sys/un.h>
#include <sys/stat.h>
#include <unistd.h>
#include <string.h>
#include <stdio.h>
int vqec_vision_studio_service_socket_listen(const char *_path)
{
    struct sockaddr_un address={.sun_family=AF_UNIX};
    if (strlen(_path)>=sizeof(address.sun_path)) return -1;
    memcpy(address.sun_path,_path,strlen(_path)+1);
    /* Never unlink an existing listener; systemd owns a private runtime directory. */
    int fd=socket(AF_UNIX,SOCK_SEQPACKET|SOCK_CLOEXEC|SOCK_NONBLOCK,0);
    if (fd<0) return -1;
    if (bind(fd,(struct sockaddr *)&address,sizeof(address)) || chmod(_path,0600) || listen(fd,8)) {
        close(fd); return -1;
    }
    return fd;
}
int vqec_vision_studio_service_socket_accept(int _listener)
{
    int fd=accept4(_listener,NULL,NULL,SOCK_CLOEXEC|SOCK_NONBLOCK);
    if (fd<0) return -1;
    struct ucred peer; socklen_t size=sizeof(peer);
    if (getsockopt(fd,SOL_SOCKET,SO_PEERCRED,&peer,&size) || peer.uid!=geteuid()) { close(fd); return -1; }
    return fd;
}
