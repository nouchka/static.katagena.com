FROM nginx:latest
LABEL maintainer="Jean-Avit Promis docker@katagena.com"

LABEL org.label-schema.vcs-url="https://github.com/nouchka/static.katagena.com"
LABEL version="latest"

COPY public/ /usr/share/nginx/html
COPY kobe-fetch.sh /kobe-fetch.sh

RUN apt-get update && \
	DEBIAN_FRONTEND=noninteractive apt-get -yq --no-install-recommends install wget=* && \
	/kobe-fetch.sh && \
	apt-get remove -y wget && \
	apt-get autoremove -y && \
	rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

##Kubernetes port 5000
RUN sed -i "s/80;/80;\n    listen\t 5000;/" /etc/nginx/conf.d/default.conf
EXPOSE 5000

