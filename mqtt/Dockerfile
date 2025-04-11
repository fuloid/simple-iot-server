FROM docker.io/library/emqx:5.8
#TODO(sm): include TLS certificates

COPY docker-entrypoint.sh /usr/bin/
COPY docker-healthcheck /usr/local/bin/

# Chmod to executable
RUN chmod +x /usr/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-healthcheck && \
    mkdir -p /opt/emqx/logs && \
    chown -R emqx:emqx /opt/emqx/logs

HEALTHCHECK CMD ["docker-healthcheck"]

# ENTRYPOINT ["/usr/bin/env", "bash", "-c", "( sleep 10; docker-healthcheck ) & /usr/bin/docker-entrypoint.sh"]
ENTRYPOINT ["/usr/bin/docker-entrypoint.sh"]
CMD ["/opt/emqx/bin/emqx", "foreground"]