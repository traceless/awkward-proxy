'use strict'
const net = require('net')
const { getRequestCache } = require('./getCache')
const { setResponseCache } = require('./setCache')
const { snowflake } = require('./snowflake')

class RequestInfo {
  constructor({ socketId, remoteAddr, remotePort, body, createTime }) {
    this.socketId = socketId
    this.remoteAddr = remoteAddr
    this.remotePort = remotePort
    this.body = body
    this.createTime = createTime
  }
}

const sockMap = {}
function remoteConnect({ remoteAddr, remotePort, body, socketId, createTime }) {
  console.log('socketId ======socketId:', socketId)
  if (sockMap[socketId] != null) {
    console.log('remoteConnect body', socketId)
    // 转为二进制
    const data = Buffer.from(body, 'base64')
    sockMap[socketId].write(data)
    return
  }
  // 新的socketId，那么服务也是要创建新的连接
  let remote = net.connect(remotePort, remoteAddr, () => {
    console.log(` remoteConnect connecting : ${remoteAddr}:${remotePort}`)
    const data = Buffer.from(body, 'base64')
    sockMap[socketId].write(data)
  })
  remote.on('data', data => {
    console.log('remotedaaaaa', data.length)
    // 把response信息写入到列表，会被定时写入到缓冲区
    const body = data.toString('base64')
    const responseObj = { createTime, socketId, body }
    resultResponse.push(responseObj)
  })
  remote.on('error', (err) => {
    console.error(`连接到远程服务器 ${remoteAddr}:${remoteAddr} 失败,失败信息:${err.message}`)
    remote.destroy()
    // 删除引用
    delete sockMap[socketId]
  })
  // 保持引用
  sockMap[socketId] = remote
  if (sockMap[socketId]) {
    console.log('socketId ======socketId', socketId)
  }
}

// 这里从请求缓冲区获取 请求的报文
let writeable = false
let resultResponse = []
let lastTime = snowflake.shortNextId()
setInterval(async () => {
  try {
    const reqCache = await getRequestCache()
    const { requestArray = [], allreadyRead = false } = JSON.parse(reqCache)
    // 判断是否可写，当客户端读取过响应后后，才能重新写入到repsonseCache中
    writeable = allreadyRead
    console.log('you request allreadyRead:', allreadyRead, requestArray.length)
    if (requestArray.length === 0) {
      return
    }
    // 请求url 把响应放到 队列
    for (let i = 0; i < requestArray.length; i++) {
      const request = new RequestInfo(requestArray[i])
      // 根据时间线是否过期的请求，createTime是增序的
      if (request.createTime <= lastTime || !request.socketId) {
        continue
      }
      lastTime = request.createTime
      remoteConnect(request)
    }
  } catch (err) {
    console.log('err: getRequestCache', err)
  }
}, 1000)

// 轮询 写入响应
setInterval(async () => {
  if (!writeable) {
    console.info('not writeable')
    return
  }
  writeable = false
  if (resultResponse.length === 0) {
    return
  }
  //  返回新数组副本
  const copyResponseArr = resultResponse.concat([])
  // 设置响应后，后置为空（不用等待响应是否成功写入，不然数据不同步，也可以在失败后恢复数组）
  resultResponse = []
  const res = await setResponseCache(JSON.stringify(copyResponseArr))
  if (res && !~res.toString().indexOf('"ret":0')) {
    console.log('===============err===============', res)
  }
}, 1200)
