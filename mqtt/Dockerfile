FROM docker.io/library/emqx:5.8
#TODO(sm): include TLS certificates

# Chmod to executable
RUN chmod +x ./docker-entrypoint.sh
RUN chmod +x ./docker-healthcheck
RUN chmod +x /opt/emqx/bin/emqx

COPY docker-entrypoint.sh /usr/bin/
COPY docker-healthcheck /usr/local/bin/

HEALTHCHECK CMD ["docker-healthcheck"]

# ENTRYPOINT ["/usr/bin/env", "bash", "-c", "( sleep 10; docker-healthcheck ) & /usr/bin/docker-entrypoint.sh"]
ENTRYPOINT ["/usr/bin/docker-entrypoint.sh"]
CMD ["/opt/emqx/bin/emqx", "foreground"]