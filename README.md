## WebTerminal
* xterm.js
* express
* socket.io
* ssh2

一个基于Node.js服务的网页终端，用于在浏览器上进行实例或者虚拟机的远程登录

## 安装
- ``git clone https://github.com/woowalker/WebTerminal.git``
- ``cd WebTerminal``
- ``npm install``
- ``npm run builddev``
- ``npm start``

## 使用
- 打开浏览器，访问： ``http://localhost:8090/``
- 输入用户名和密码，点击登录

## 技巧
- 高级面板中可以设置需要远程访问实例的 IP 地址和端口号
- 支持访问格式： ``http://localhost:8090/123.4.56.78?port=8090`` 则会自动设置高级面板中的 IP 地址和端口号
