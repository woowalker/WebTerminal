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
  xterm.writeln('请输入用户名和密码进行登录。')
})

// get account and pw to login
const loginBtn = document.getElementsByClassName('submit')[0]
loginBtn.onclick = function () {
  // login button blur to prevent repeat click
  loginBtn.blur()

  const account = document.getElementsByClassName('account')[0].value
  const pw = document.getElementsByClassName('password')[0].value
  if (!account || !pw) {
    alert('请输入用户名和密码进行登录')
  } else {
    xterm.writeln('请稍后，正在登陆...')
    socket.emit('login', account, pw)
  }
}

// wrong ip or port set
socket.on('invalidateIP', function () {
  xterm.writeln('请检查IP地址或者端口是否设置正确。')
})

// server connect success
socket.on('login', function (success) {
  if (success) {
    console.log('login success!')
    // when login set cursor blink and focus
    xterm.setOption('cursorBlink', true)
    xterm.focus()
    // disabled login button
    loginBtn.disabled = true
  }
})

// get socket server data
socket.on('data', function (data) {
  xterm.write(data)
})

// post socket client data to server
xterm.on('data', function (data) {
  socket.emit('data', data)
})