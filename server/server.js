var path = require('path')

var express = require('express')
var app = express()
var server = require('http').Server(app)

var nodeRoot = path.dirname(require.main.filename)
var publicPath = path.join(nodeRoot, 'client', 'public')

app.use(express.static(publicPath))

app.get('/', function (req, res) {
  res.sendFile(publicPath + '/index.html')
})

module.exports = server
