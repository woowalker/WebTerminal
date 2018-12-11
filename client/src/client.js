'use strict'
import {Terminal} from 'xterm'
import {fit} from 'xterm/lib/addons/fit/fit'
import 'xterm/lib/xterm.css'
import 'xterm/lib/xterm'
import './client.less'

const terminal_dom = document.getElementById('terminal')
const xterm = new Terminal()
xterm.setOption('cursorBlink', true)
xterm.open(terminal_dom)
xterm.focus()
fit(xterm)

