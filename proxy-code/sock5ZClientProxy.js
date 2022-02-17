'use strict'
const net = require('net')

function remoteClient(remoteAddr, remotePort, socket) {
  let remote = net.connect(remotePort, remoteAddr, () => {
    console.log(` remoteClient connecting : ${remoteAddr}:${remotePort}`)
    socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), (err) => {
      if (err) {
        console.error(`error:${err.message}`)
        return socket.destroy()
      }
      // remote.pipe(socket)
      // socket.pipe(remote)
    })
  })
  socket.on('data', data => {
    console.log('socketsdaaaaa', data.length)
    remote.write(data)
  })
  remote.on('data', data => {
    console.log('remotedaaaaa', data.length)
    socket.write(data)
  })
  remote.on('error', (err) => {
    console.error(`连接到远程服务器 ${remoteAddr}:${remoteAddr} 失败,失败信息:${err.message}`)
    remote.destroy()
    socket.destroy()
  })
}
let server = net.createServer(socket => {
  socket.once('data', data => {
    if (!data || data[0] !== 0x05) return socket.destroy()
    socket.write(Buffer.from([5, 0]), err => {
      if (err) socket.destroy()
      let addrtype = 0
      let remoteAddr = null
      let remotePort = null
      let addrLen = 0
      socket.once('data', (data) => {
        // 只支持 CONNECT
        if (data.length < 7 || data[1] !== 0x01) {
          return socket.destroy()
        }
        try {
          addrtype = data[3]// ADDRESS_TYPE 目标服务器地址类型
          if (addrtype === 3) { // 0x03 域名地址(没有打错，就是没有0x02)，
            addrLen = data[4] // 域名地址的第1个字节为域名长度，剩下字节为域名名称字节数组
          } else if (addrtype !== 1 && addrtype !== 4) {
            return socket.destroy()
          }
          remotePort = data.readUInt16BE(data.length - 2)// 最后两位为端口值
          if (addrtype === 1) { // 0x01 IP V4地址
            remoteAddr = data.slice(4, 8).join('.')
          } else if (addrtype === 4) { // 0x04 IP V6地址
            return socket.write(Buffer.from([0x05, 0x08, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])) // 不支持IP V6
          } else { // 0x03 域名地址(没有打错，就是没有0x02)，域名地址的第1个字节为域名长度，剩下字节为域名名称字节数组
            remoteAddr = data.slice(5, 5 + addrLen).toString('binary')
          }
          console.log(`target connecting : ${remoteAddr}:${remotePort}`)
          remoteClient(remoteAddr, remotePort, socket)
        } catch (e) {
          console.error(e)
        }
      })
    })
  })

  socket.on('error', err => { console.error(`error:${err.message}`) })
})
const port = 11100
console.log('port:', port)
server.listen(11100)
