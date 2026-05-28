try {
  const status = rs.status();
  if (status.members.some((m) => m.stateStr === 'PRIMARY')) {
    print('Replica set rs0 already has PRIMARY');
    quit(0);
  }
  print('Replica set exists, waiting for PRIMARY...');
  quit(1);
} catch (e) {
  const host = process.env.MONGO_RS_MEMBER_HOST || 'mongo.railway.internal:27017';
  rs.initiate({ _id: 'rs0', members: [{ _id: 0, host }] });
  print(`Replica set rs0 initiated with member ${host}`);
  quit(0);
}
