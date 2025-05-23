FROM debian:12-slim

ENV EMQX_VERSION=5.8.6
ENV AMD64_SHA256=430f69c24c0d659a9ce2e902d018c6dd20565519925e0cc893980d824b0a952e
ENV ARM64_SHA256=dcabedb9d3888e0fb6e8138da6ae3d8ef1afce1f85e4580f26f19d65115ed5c3
ENV LC_ALL=C.UTF-8 LANG=C.UTF-8

RUN set -eu; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates procps curl; \
    arch=$(dpkg --print-architecture); \
    if [ ${arch} = "amd64" ]; then sha256="$AMD64_SHA256"; fi; \
    if [ ${arch} = "arm64" ]; then sha256="$ARM64_SHA256"; fi; \
    . /etc/os-release; \
    pkg="emqx-${EMQX_VERSION}-${ID}${VERSION_ID}-${arch}.tar.gz"; \
    curl -f -O -L https://www.emqx.com/en/downloads/broker/v${EMQX_VERSION}/${pkg}; \
    echo "$sha256 *$pkg" | sha256sum -c; \
    mkdir /opt/emqx; \
    tar zxf $pkg -C /opt/emqx; \
    find /opt/emqx -name 'swagger*.js.map' -exec rm {} +; \
    ln -s /opt/emqx/bin/* /usr/local/bin/; \
    groupadd -r -g 1000 emqx; \
    useradd -r -m -u 1000 -g emqx emqx; \
    chown -R emqx:emqx /opt/emqx; \
    rm -f $pkg; \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN mkdir -p /opt/emqx/log && \
    mkdir -p /opt/emqx/data && \
    chown -R emqx:emqx /opt/emqx/log && \
    chown -R emqx:emqx /opt/emqx/data

WORKDIR /opt/emqx

USER root

COPY docker-entrypoint.sh /usr/bin/
RUN chmod +x /usr/bin/docker-entrypoint.sh

COPY acl.conf /opt/emqx/etc/acl.conf

USER emqx

# emqx will occupy these port:
# - 1883 port for MQTT
# - 8083 for WebSocket/HTTP
# - 8084 for WSS/HTTPS
# - 8883 port for MQTT(SSL)
# - 18083 for dashboard and API
# - 4370 default Erlang distribution port
# - 5369 for backplain gen_rpc
EXPOSE 1883 18083

ENTRYPOINT ["/usr/bin/docker-entrypoint.sh"]

CMD ["/opt/emqx/bin/emqx", "foreground"]