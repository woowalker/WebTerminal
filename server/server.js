// node
var path = require('path')

// express && http && socket && ssh2
var express = require('express')
var app = express()
var server = require('http').Server(app)
var io = require('socket.io')(server, {serveClient: false})
var SSH = require('ssh2').Client

// cookie
var cookieParser = require('cookie-parser')

// config
var config = require('../config')
var nodeRoot = path.dirname(require.main.filename)
var publicPath = path.join(nodeRoot, 'client', 'public')

// tool
var validator = require('validator')

// express option
app.use(express.static(publicPath))
app.use(cookieParser())

// hide something about server information
app.disable('x-powered-by')

// match http url
app.get('/:host?', function (req, res) {
  // validator String only, otherwise will always occur error
  res.cookie('host', validator.isIP(req.params.host + '') ? req.params.host : config.ssh.host, {maxAge: 60000}) // set cookie expire time in million seconds
  res.cookie('port', req.query.port && validator.isPort(req.query.port + '') ? req.query.port : config.ssh.port, {maxAge: 60000})
  res.sendFile(publicPath + '/index.html')
})

// socket connection
var xterm = {
  cols: '',
  rows: ''
}
// when client connect success, event 'connection' will be fired, whatever situation always, for example: socket.connect()
io.on('connection', function (socket) {
  // emit cookie host and port
  var cookies = socket.request.headers.cookie, cookieHost = config.ssh.host, cookiePort = config.ssh.port
  if (cookies) {
    cookies = cookies.split(';')
    for (var i = 0, j = cookies.length; i < j; i++) {
      if (cookies[i].indexOf('host') !== -1) {
        cookieHost = cookies[i].split('=')[1].trim()
      }
      if (cookies[i].indexOf('port') !== -1) {
        cookiePort = cookies[i].split('=')[1].trim()
      }
    }
  }
  socket.emit('standby', cookieHost, cookiePort)
  // custom event
  socket.on('standby', function (cols, rows) {
    xterm.cols = cols
    xterm.rows = rows
  })
  socket.on('login', function (account, password, host, port) {
    console.log('attempt to login, host:', host, ';port:', port)
    if (!validator.isIP(host) || !validator.isPort(port)) {
      socket.emit('invalidateIP')
      return
    }

    // get ssh2 to login
    var conn = new SSH()

    // when server upon connection ,ssh2 will trigger 'banner' event
    conn.on('banner', function connOnBanner (data) {
      // need to convert to cr/lf for proper formatting
      data = data.replace(/\r?\n/g, '\r\n')
      socket.emit('data', data.toString('utf8'))
    })

    // ssh2 connect to server success and authentication was successful and connect stable
    conn.on('ready', function () {
      console.log('connect to server ready!')
      // login success and then client should disable login button
      socket.emit('login', true)
      // socket server event
      socket.on('error', function (error) {
        // when conn.end() fired, SSH event 'end' will be trigger
        console.log('socket connect error!', error)
        conn.end()
      })
      socket.on('disconnect', function (reason) {
        // when page refresh, event fired sequence: disconnecting -> disconnect, so only handle 'disconnect' event
        // when conn.end() fired, SSH event 'end' will be trigger
        console.log('socket connect disconnect!', reason)
        conn.end()
      })

      conn.shell({
        term: config.shell.term,
        cols: xterm.cols,
        rows: xterm.rows
      }, function (err, stream) {
        if (err) {
          // when conn.end() fired, SSH event 'end' will be trigger
          conn.end()
          return
        }

        // stream get server data, see node.js stream: http://nodejs.cn/api/stream.html
        stream.on('data', function (data) {
          socket.emit('data', data.toString('utf8'))
        })

        // socket get client input
        socket.on('data', function (data) {
          stream.write(data)
        })

        // socket get client resize event
        socket.on('resize', function (rows, cols) {
          stream.setWindow(rows, cols)
        })

        // handle stream event: writable && readable
        stream.on('close', function () {
          // event fired sequence: finish -> end -> close, so only handle 'close' event
          // when conn.end() fired, SSH event 'end' will be trigger
          console.log('stream close!')
          conn.end()
        })
        stream.on('error', function (error) {
          // when error occur, the stream close not yet
          console.log('stream error!', error)
          conn.end()
        })
      })
    })

    // handle something error situation
    conn.on('error', function (error) {
      // connect occur error, fire sequence: error -> end -> close
      console.log('connect to server error!', error)
      socket.emit('SSH-ERROR', error)
      // once upon disconnect, any next socket.emit() will lose, so when error occur, client will only receive SSH-ERROR event, and SSH-END event and SSH-CLOSE event will lose
      socket.disconnect(true)
    })
    conn.on('end', function () {
      // connect end, fire sequence: end -> close
      // when call conn.end(), the 'end' event will be trigger
      console.log('connect to server end!')
      socket.emit('SSH-END')
      // once upon disconnect, any next socket.emit() will lose, so when end occur, client will only receive SSH-END event, and SSH-CLOSE event will lose
      socket.disconnect(true)
    })
    conn.on('close', function (hadError) {
      // connect close, fire sequence: end -> close
      // when call conn.end(), the 'close' event will be trigger, if this was due to error, hadError will be set to true
      console.log('connect to server close!', hadError)
      socket.emit('SSH-CLOSE', hadError)
      // once upon disconnect, any next socket.emit() will lose, so maybe SSH-CLOSE event will always lose
      socket.disconnect(true)
    })
    conn.on('keyboard-interactive', function (name, instructions, instructionsLang, prompts, finish) {
      // server asking for a keyboard interactive
      finish([password])
    })

    // connect to server
    conn.connect({
      host: host,
      port: port,
      username: account,
      password: password,
      tryKeyboard: config.ssh.tryKeyboard,
      keepaliveInterval: config.ssh.keepaliveInterval,
      keepaliveCountMax: config.ssh.keepaliveCountMax,
      readyTimeout: config.ssh.readyTimeout,
      algorithms: config.ssh.algorithms
    })
  })
})

module.exports = server
