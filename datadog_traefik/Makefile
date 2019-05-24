traefik.whl:
	docker run -v "$$(pwd):/build/" python bash -c "mkdir /root/dd && cd /root/dd && pip install datadog-checks-dev[cli] && git clone https://github.com/DataDog/integrations-extras.git && cd /root/dd/integrations-extras && ddev release build traefik && mv /root/dd/integrations-extras/traefik/dist/*.whl /build/traefik.whl && chown -R 1000:1000 /build/traefik.whl"

