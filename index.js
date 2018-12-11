var server = require('./server/server')
var config = require('./config')

server.listen({
  host: config.server.host,
  port: config.server.port
})
