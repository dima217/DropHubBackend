FROM mongo:7.0

COPY mongo-keyfile /etc/mongo-keyfile
COPY init-replica-set.js /usr/local/bin/init-replica-set.js
COPY docker-entrypoint-rs.sh /usr/local/bin/docker-entrypoint-rs.sh

RUN chmod 400 /etc/mongo-keyfile \
  && chown mongodb:mongodb /etc/mongo-keyfile \
  && sed -i 's/\r$//' /usr/local/bin/docker-entrypoint-rs.sh \
  && chmod +x /usr/local/bin/docker-entrypoint-rs.sh

ENV MONGO_RS_MEMBER_HOST=mongo.railway.internal:27017

ENTRYPOINT ["docker-entrypoint-rs.sh"]
CMD ["mongod"]
