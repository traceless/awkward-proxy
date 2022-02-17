'use strict'
const net = require('net')
const uuid = require('uuid')
const { setRequestCache } = require('./setCache')
const { getResponseCache } = require('./getCache')

class RequestInfo {
  constructor({ socketId, remoteAddr, remotePort, body, createTime }) {
    this.socketId = socketId
    this.remoteAddr = remoteAddr
    this.remotePort = remotePort
    this.body = body
    this.createTime = createTime
  }
}
const requestArray = [] // {url, method, headers, body }

const sockMap = {}
let server = net.createServer(socket => {
  const socketId = uuid.v1()
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
          delete sockMap[socketId]
          return socket.destroy()
        }
        try {
          addrtype = data[3]// ADDRESS_TYPE 目标服务器地址类型
          if (addrtype === 3) { // 0x03 域名地址(没有打错，就是没有0x02)，
            addrLen = data[4] // 域名地址的第1个字节为域名长度，剩下字节为域名名称字节数组
          } else if (addrtype !== 1 && addrtype !== 4) {
            delete sockMap[socketId]
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
          console.log(`ready to connecting target : ${remoteAddr}:${remotePort}`)
          // 告诉浏览器，可以进行传输数据了
          socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), (err) => {
            if (err) {
              console.error(`socket error:${err.message}`)
              delete sockMap[socketId]
              return socket.destroy()
            }
            // 监听把浏览器请求的信息，封装请求对象，然后定时写入到缓冲区
            sockMap[socketId] = socket
            socket.on('data', data => {
              console.log('socket data', data.length)
              const body = data.toString('base64')
              const requestData = new RequestInfo({ reqId: uuid.v1(), socketId, remoteAddr, remotePort, body, createTime: new Date().getTime() })
              // remote.write(data)
              requestArray.push(requestData)
            })
          })
        } catch (e) {
          delete sockMap[socketId]
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

// 轮询发送请求列表, 每次发送请求后，重置 allreadyRead = false
let hasRead = true
let lastRequestCache = '[]'
setInterval(async () => {
  // 删除那些过期消息
  const now = new Date().getTime()
  for (let i = 0; i < requestArray.length; i++) {
    if (requestArray[i].createTime + 1000 * 10 < now) {
      requestArray.splice(i, 1)
      i--
    }
  }
  console.log('requestArray length ', requestArray.length)
  // 发送请求，发送新请求
  const current = JSON.stringify(requestArray)
  if (lastRequestCache === current) {
    console.log('no request')
    return
  }
  lastRequestCache = current
  const res = await setRequestCache(JSON.stringify({ requestArray, allreadyRead: hasRead }))
  console.log('===============  set request ===============', res)
  hasRead = false
}, 1000)

let lastResponseCache = '{}'
// 轮询获取响应
setInterval(async () => {
  try {
    const responseCache = await getResponseCache()
    hasRead = true
    if (lastResponseCache === responseCache) {
      console.log('no response')
      return
    }
    lastResponseCache = responseCache
    const respList = JSON.parse(responseCache)
    respList.forEach(respInfo => {
      const reqIndex = requestArray.findIndex(req => req.reqId < respInfo.reqId)
      if (~reqIndex) {
        requestArray.splice(reqIndex, 1)
      }
      if (sockMap[respInfo.socketId]) {
        const data = Buffer.from(respInfo.body, 'base64')
        sockMap[respInfo.socketId].write(data)
      }
    })
    console.log('requestArray length ', requestArray.length)
    // responseArray = responseArray.concat(res)
  } catch (err) {
    console.log(err)
  }
}, 1100)
