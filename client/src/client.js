'use strict'
import io from 'socket.io-client'
import {Terminal} from 'xterm'
import {fit} from 'xterm/lib/addons/fit/fit'
import {detectIE} from './utils'
import 'xterm/lib/xterm.css'
import 'xterm/lib/xterm'
import './client.less'

const terminal_dom = document.getElementById('terminal')
const xterm = new Terminal()
xterm.open(terminal_dom)
xterm.setOption('lineHeight', 1.5) // set lineHeight should behind 'open'
xterm.setOption('scrollback', 10000)
fit(xterm)

// connect to socket
const socket = io({
  reconnectionAttempts: 10
})
// whatever that upon connect success, event 'connect' will be fired, for example: socket.connect()
socket.on('connect', function () {
  // use for ssh connected shell
  socket.emit('standby', xterm.cols, xterm.rows)
})

var reconnect = false
socket.on('standby', function (host, port) {
  // when socket.connect(), event 'connect' will be fired, and client will also receive event 'standby', but reconnect we hope not clear screen
  if (!reconnect) {
    const hostIP = document.getElementsByClassName('hostIP')[0]
    const hostPort = document.getElementsByClassName('hostPort')[0]
    hostIP.value = host
    hostPort.value = port

    xterm.clear()
    xterm.writeln('请输入用户名和密码进行登录。')
    setLoginBtn(false)
  }
})

// get advance panel click
var showAdvancePanel = false
const advanceBtn = document.getElementsByClassName('advance')[0]
const advancePanel = document.getElementsByClassName('advancePanel')[0]
advanceBtn.onclick = function () {
  showAdvancePanel = !showAdvancePanel
  advanceBtn.className = showAdvancePanel ? 'extendPanel advance' : 'advance'
  advancePanel.style.display = showAdvancePanel ? 'inline-block' : 'none'
}

// get account and pw to login
const loginBtn = document.getElementsByClassName('submit')[0]
const setLoginBtn = function (disabled) {
  loginBtn.disabled = disabled
}
loginBtn.onclick = function () {
  // login button blur to prevent repeat click
  loginBtn.blur()

  const account = document.getElementsByClassName('account')[0].value
  const pw = document.getElementsByClassName('password')[0].value
  if (!account || !pw) {
    alert('请输入用户名和密码进行登录')
  } else {
    // get socket whether is disconnected
    const isDisconnected = reconnect = socket.disconnected
    if (isDisconnected) socket.connect()

    const host = document.getElementsByClassName('hostIP')[0].value
    const port = document.getElementsByClassName('hostPort')[0].value

    xterm.writeln('尝试连接到：' + host + ' 端口：' + port)
    xterm.writeln('请稍后，正在登录...')
    // if advance panel show, then use advance panel`s host and port for main
    if (showAdvancePanel) {
      socket.emit('login', account, pw, host, port)
    } else {
      socket.emit('login', account, pw)
    }

    // disabled login button
    setLoginBtn(true)
  }
}

// wrong ip or port set
socket.on('invalidateIP', function () {
  xterm.writeln('登录失败，请检查IP地址或者端口是否设置正确。')
  xterm.writeln('可尝试在“高级”面板手动输入IP地址和端口号。')
  setLoginBtn(false)
})

// server connect success
socket.on('login', function (success) {
  if (success) {
    // when login set cursor blink and focus
    xterm.clear()
    xterm.setOption('cursorBlink', true)
    xterm.focus()
  }
})

// handle ssh connect event
socket.on('SSH-ERROR', function (error) {
  xterm.writeln('连接出现错误，请尝试重新登录。')
  if (error && error.level === 'client-authentication') {
    xterm.writeln('校验失败：错误的用户名或者密码。')
  } else {
    xterm.writeln('请检查主机IP地址与端口号是否有效。')
    xterm.writeln('错误信息：' + JSON.stringify(error))
  }
  setLoginBtn(false)
})
socket.on('SSH-END', function () {
  xterm.writeln('连接已经断开。请重新登录。')
  setLoginBtn(false)
})
socket.on('SSH-CLOSE', function (hadError) {
  xterm.writeln(hadError ? '连接因为出现错误而被关闭，请重新登录。如多次无法登录，请检查主机IP地址与端口号是否有效。' : '连接已经关闭，请重新登录。如多次无法登录，请检查主机IP地址与端口号是否有效。')
  setLoginBtn(false)
})

// get socket server data
socket.on('data', function (data) {
  xterm.write(data)
})

// post socket client data to server
xterm.on('data', function (data) {
  socket.emit('data', data)
})

// handle socket connect error situation
socket.on('reconnecting', function (attemptNumber) {
  xterm.writeln('请检查网络情况，尝试重连次数：' + attemptNumber)
})
socket.on('reconnect_error', function (error) {
  xterm.writeln('尝试重连失败：' + error.message)
})
socket.on('reconnect_failed', function () {
  xterm.writeln('尝试重连一共10次，重连失败，请检查网络状况。')
  setLoginBtn(false)
})

// when windows size change, fit xterm
window.addEventListener('resize', function () {
  fit(xterm)
  socket.emit('resize', xterm.rows, xterm.cols)
}, false)

// xterm supported ie >= 11
window.onload = function () {
  var IEVersion = detectIE()
  if (IEVersion && IEVersion < 11) {
    alert('暂不支持当前浏览器使用，请更换其他高级浏览器以访问该网站。')
    // ie11 do not support Template String
    document.getElementsByTagName('body')[0].innerHTML = '<div style="text-align: center; color: black;"><h2><s>IE' + IEVersion + '</s></h2><p>' + window.navigator.userAgent + '</p></div>'
  }
}
