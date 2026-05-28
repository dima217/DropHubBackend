#!/usr/bin/env bash
set -euo pipefail

KEYFILE=/etc/mongo-keyfile
MEMBER_HOST="${MONGO_RS_MEMBER_HOST:-mongo.railway.internal:27017}"

/docker-entrypoint.sh "$@" \
  --replSet rs0 \
  --bind_ip_all \
  --keyFile "$KEYFILE" &

MONGO_PID=$!

for i in $(seq 1 90); do
  if mongosh --quiet --eval 'db.adminCommand({ ping: 1 }).ok' >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

for i in $(seq 1 90); do
  if MONGO_RS_MEMBER_HOST="$MEMBER_HOST" mongosh --quiet /usr/local/bin/init-replica-set.js; then
    break
  fi
  sleep 2
done

for i in $(seq 1 90); do
  if mongosh --quiet --eval 'rs.status().members.some(m => m.stateStr === "PRIMARY")' >/dev/null 2>&1; then
    echo "Replica set rs0 PRIMARY is ready"
    break
  fi
  sleep 1
done

wait "$MONGO_PID"
