const { MongoMemoryServer } = require('mongodb-memory-server')

;(async () => {
  const mongod = await MongoMemoryServer.create({ instance: { port: 27099, dbName: 'turnero' } })
  console.log('MONGO_URI=' + mongod.getUri('turnero'))
  process.on('SIGTERM', async () => { await mongod.stop(); process.exit(0) })
})()
