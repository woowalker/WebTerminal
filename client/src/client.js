'use strict'
import io from 'socket.io-client'
import {Terminal} from 'xterm'
import {fit} from 'xterm/lib/addons/fit/fit'
import 'xterm/lib/xterm.css'
import 'xterm/lib/xterm'
import './client.less'

const terminal_dom = document.getElementById('terminal')
const xterm = new Terminal()
xterm.open(terminal_dom)
xterm.setOption('lineHeight', 1.5) // set lineHeight should behind 'open'
fit(xterm)

// connect to socket
const socket = io()
socket.on('connect', function () {
  // use for ssh connected shell
  socket.emit('standby', xterm.cols, xterm.rows)
  xterm.clear()
  xterm.writeln('请输入用户名和密码进行登录。')
})

socket.on('standby', function (host, port) {
  const hostIP = document.getElementsByClassName('hostIP')[0]
  const hostPort = document.getElementsByClassName('hostPort')[0]
  hostIP.value = host
  hostPort.value = port
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
    xterm.writeln('请稍后，正在登录...')
    // if advance panel show, then use advance panel`s host and port for main
    if (showAdvancePanel) {
      const host = document.getElementsByClassName('hostIP')[0].value
      const port = document.getElementsByClassName('hostPort')[0].value
      socket.emit('login', account, pw, host, port)
    } else {
      socket.emit('login', account, pw)
    }
  }
}

// wrong ip or port set
socket.on('invalidateIP', function () {
  xterm.writeln('登录失败，请检查IP地址或者端口是否设置正确。')
  xterm.writeln('可尝试在“高级”面板手动输入IP地址和端口号。')
})

// server connect success
socket.on('login', function (success) {
  if (success) {
    // when login set cursor blink and focus
    xterm.setOption('cursorBlink', true)
    xterm.focus()
    // disabled login button
    setLoginBtn(true)
  }
})

// handle ssh connect event
socket.on('SSH-ERROR', function (error) {
  xterm.writeln('连接出现错误，请尝试重新登录。如多次无法登录，请检查主机IP地址与端口号是否有效。')
  xterm.writeln(error)
  setLoginBtn(false)
})
socket.on('SSH-END', function () {
  xterm.writeln('连接已经断开。')
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
