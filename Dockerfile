FROM nginx:latest
LABEL maintainer="Jean-Avit Promis docker@katagena.com"

LABEL org.label-schema.vcs-url="https://github.com/nouchka/static.katagena.com"
LABEL version="latest"

COPY web/ /usr/share/nginx/html

##Kubernetes port 5000
RUN sed -i "s/80;/80;\n    listen\t 5000;/" /etc/nginx/conf.d/default.conf
EXPOSE 5000

