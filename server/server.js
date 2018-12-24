// node
var path = require('path')

// express && http && socket && ssh2
var express = require('express')
var app = express()
var server = require('http').Server(app)
var io = require('socket.io')(server, {serveClient: false})
var SSH = require('ssh2').Client

// config
var config = require('../config')
var nodeRoot = path.dirname(require.main.filename)
var publicPath = path.join(nodeRoot, 'client', 'public')

// tool
var validator = require('validator')

// express option
app.use(express.static(publicPath))

// match http url
var HP = {
  host: config.ssh.host,
  port: config.ssh.port
}
app.get('/:host?', function (req, res) {
  // validator String only, otherwise will always occur error
  HP.host = validator.isIP(req.params.host + '') && req.params.host
  HP.port = req.query.port ? (validator.isPort(req.query.port + '') ? req.query.port : false) : config.ssh.port

  res.sendFile(publicPath + '/index.html')
})

// socket connection
var xterm = {
  cols: '',
  rows: ''
}
io.on('connection', function (socket) {
  // custom event
  socket.on('standby', function (cols, rows) {
    xterm.cols = cols
    xterm.rows = rows
  })
  socket.on('login', function (account, password, host, port) {
    // if advance option set host and port
    if (host && port && (!validator.isIP(host) || !validator.isPort(port))) {
      socket.emit('invalidateIP')
    } else if (!HP.host || !HP.port) {
      socket.emit('invalidateIP')
    } else {
      // get ssh2 to login
      var conn = new SSH()

      // when server upon connection ,ssh2 will trigger 'banner' event
      conn.on('banner', function connOnBanner (data) {
        // need to convert to cr/lf for proper formatting
        data = data.replace(/\r?\n/g, '\r\n')
        socket.emit('data', data.toString('utf8'))
      })

      // ssh2 connect to server success and connect stable
      conn.on('ready', function () {
        console.log('connect to server ready!')
        // login success and then client should disable login button
        socket.emit('login', true)

        conn.shell({
          term: config.shell.term,
          cols: xterm.cols,
          rows: xterm.rows
        }, function (err, stream) {
          // stream get server data
          stream.on('data', function (data) {
            socket.emit('data', data.toString('utf8'))
          })

          // socket get client input
          socket.on('data', function (data) {
            stream.write(data)
          })
        })
      })

      // handle something error situation
      conn.on('error', function (err) {
        // occur some error
        console.log('connect to server error!')
      })
      conn.on('close', function (hadError) {
        // socket close, if this was due to error, hadError will be set to true
        console.log('connect to server close!')
      })
      conn.on('end', function () {
        // socket disconnected
        console.log('connect to server end!')
      })

      // connect to server
      conn.connect({
        host: host ? host : HP.host,
        port: port ? port : HP.port,
        username: account,
        password: password,
        tryKeyboard: config.ssh.tryKeyboard,
        keepaliveInterval: config.ssh.keepaliveInterval,
        keepaliveCountMax: config.ssh.keepaliveCountMax,
        readyTimeout: config.ssh.readyTimeout,
        algorithms: config.ssh.algorithms
      })
    }
  })
  // socket server event
  socket.on('error', function (error) {
    console.log('socket connect error!')
  })
  socket.on('disconnecting', function (reason) {
    console.log('socket connect disconnecting!')
  })
  socket.on('disconnect', function (reason) {
    console.log('socket connect disconnect!')
  })
})

module.exports = server
