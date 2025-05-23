#!/usr/bin/env bash

echo "Am i running?"

## Shell setting
if [[ -n "$DEBUG" ]]; then
    set -ex
else
    set -e
fi

shopt -s nullglob

## Local IP address setting

LOCAL_IP=$(hostname -i | grep -oE '((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])\.){3}(25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])' | head -n 1)

export EMQX_NAME="${EMQX_NAME:-emqx}"

## EMQX_NODE_NAME or EMQX_NODE__NAME to indicate the full node name to be used by EMQX
## If both are set EMQX_NODE_NAME takes higher precedence than EMQX_NODE__NAME
if [[ -z "${EMQX_NODE_NAME:-}" ]] && [[ -z "${EMQX_NODE__NAME:-}" ]]; then
    # No node name is provide from environment variables
    # try to resolve from other settings
    if [[ -z "$EMQX_HOST" ]]; then
        if [[ "$EMQX_CLUSTER__DISCOVERY_STRATEGY" == "dns" ]] && \
            [[ "$EMQX_CLUSTER__DNS__RECORD_TYPE" == "srv" ]] && \
            grep -q "$(hostname).$EMQX_CLUSTER__DNS__NAME" /etc/hosts; then
                EMQX_HOST="$(hostname).$EMQX_CLUSTER__DNS__NAME"
        elif [[ "$EMQX_CLUSTER__DISCOVERY_STRATEGY" == "k8s" ]] && \
            [[ "$EMQX_CLUSTER__K8S__ADDRESS_TYPE" == "dns" ]] && \
            [[ -n "$EMQX_CLUSTER__K8S__NAMESPACE" ]]; then
                EMQX_CLUSTER__K8S__SUFFIX=${EMQX_CLUSTER__K8S__SUFFIX:-"pod.cluster.local"}
                EMQX_HOST="${LOCAL_IP//./-}.$EMQX_CLUSTER__K8S__NAMESPACE.$EMQX_CLUSTER__K8S__SUFFIX"
        elif [[ "$EMQX_CLUSTER__DISCOVERY_STRATEGY" == "k8s" ]] && \
            [[ "$EMQX_CLUSTER__K8S__ADDRESS_TYPE" == 'hostname' ]] && \
            [[ -n "$EMQX_CLUSTER__K8S__NAMESPACE" ]]; then
                EMQX_CLUSTER__K8S__SUFFIX=${EMQX_CLUSTER__K8S__SUFFIX:-'svc.cluster.local'}
                EMQX_HOST=$(grep -h "^$LOCAL_IP" /etc/hosts | grep -o "$(hostname).*.$EMQX_CLUSTER__K8S__NAMESPACE.$EMQX_CLUSTER__K8S__SUFFIX")
        else
            EMQX_HOST="$LOCAL_IP"
        fi
        export EMQX_HOST
    fi
    export EMQX_NODE_NAME="$EMQX_NAME@$EMQX_HOST"
fi

# The default rpc port discovery 'stateless' is mostly for clusters
# having static node names. So it's troulbe-free for multiple emqx nodes
# running on the same host.
# When start emqx in docker, it's mostly one emqx node in one container
# i.e. use port 5369 (or per tcp_server_port | ssl_server_port config) for gen_rpc
export EMQX_RPC__PORT_DISCOVERY="${EMQX_RPC__PORT_DISCOVERY:-manual}"


# Added for configuration
# Fail if required envs aren't set
: "${SERVER_HOST:?Missing SERVER_HOST}"
: "${SERVER_PORT:?Missing SERVER_PORT}"
: "${MQTT_SECRET_KEY:?Missing MQTT_SECRET_KEY}"
: "${MQTT_ADMIN_PASSWORD:?Missing MQTT_ADMIN_PASSWORD}"

# Build the final EMQX auth URL
AUTH_URL="https://${SERVER_HOST}:${SERVER_PORT}/mqtt/auth"

# Patch EMQX configuration
cat <<EOF > /opt/emqx/etc/emqx.conf
node {
  name = "emqx@127.0.0.1"
  cookie = "emqxsecretcookie"
  data_dir = "data"
}

cluster {
  name = emqxcl
  discovery_strategy = manual
}

dashboard {
    listeners {
        http.bind = 18083
        # https.bind = 18084
        # https {
        #     ssl_options {
        #         certfile = "${EMQX_ETC_DIR}/certs/cert.pem"
        #         keyfile = "${EMQX_ETC_DIR}/certs/key.pem"
        #     }
        # }
    }

    default_password = "${MQTT_ADMIN_PASSWORD}"
}

telemetry {
    enable = false
}

mqtt {
    max_packet_size = "4KB"
}

authentication {
    enable = true
    mechanism = "password_based"
    backend = "http"

    method = post
    url = "${AUTH_URL}"

    body {
        clientid = "\${clientid}"
        username = "\${username}"
        password = "\${password}"
        token = "${MQTT_SECRET_KEY}"
    }

    headers {
        "Content-Type" = "application/json"
        "X-Request-Source" = "EMQX"
    }

    ssl {
        enable = true
    }

    connect_timeout = "5s"
    request_timeout = "5s"
}

api_key = {
    bootstrap_file = "etc/api_key.conf"
}
EOF

# Add api key config
cat <<EOF > /opt/emqx/etc/api_key.conf
systemctl:${MQTT_SECRET_KEY}
EOF

exec "$@"