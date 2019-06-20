build:
	docker run -v "$$(pwd):/build/" python bash -c "mkdir /root/dd && cd /root/dd && pip install datadog-checks-dev[cli] && git clone https://github.com/DataDog/integrations-extras.git && cd /root/dd/integrations-extras && ddev release build reboot_required && mv /root/dd/integrations-extras/reboot_required/dist/*.whl /build/ && chown -R 1000:1000 /build/*.whl"
