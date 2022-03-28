'use strict'
const request = require('request')
const { getRequestCache } = require('./getCache')
const { setResponseCache } = require('./setCache')
const { snowflake } = require('./snowflake')
const config = require('./config')
// 睡眠，交出执行权
async function sleep(time) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time || 1000);
  });
}

// ############################## 外网pc端服务 ##################################
async function executeRequest(requestObj) {
  const opts = Object.assign({}, requestObj)
  opts.proxy = config.proxy || null
  //  使用解压
  opts.gzip = true
  return new Promise((resolve, reject) => {
    request(opts, (err, res) => {
      if (err) {
        console.log('err', err)
        reject(err)
        return
      }
      res.reqId = requestObj.reqId
      res.createTime = requestObj.createTime
      resolve(res)
    }).encoding = 'base64'
  })
}

let writeable = false
let resultResponse = []
let lastTime = snowflake.shortNextId()
// 定时轮训，去获取client存放的requestArray
setInterval(async () => {
  try {
    const reqCache = await getRequestCache()
    const { requestArray = [], allreadyRead = false } = JSON.parse(reqCache)
    // 设置是否可写，当客户端client（浏览器）读取过响应后后，server才能重新写入响应到repsonseCache中
    writeable = allreadyRead
    console.log('you request allreadyRead:', allreadyRead, requestArray.length)
    if (requestArray.length === 0) {
      return
    }
    // 请求url 把响应放到 队列
    for (let i = 0; i < requestArray.length; i++) {
      const request = requestArray[i]
      // 根据时间线来判断是否已经处理过这个请求了，因为浏览器的代理，不会一直更新这个请求缓存区的。它要等对应的响应到了，才会删除requestArray的数据。
      if (request.createTime <= lastTime || !request.url) {
        continue
      }
      lastTime = request.createTime
      // 如果是上传文件或者图片，那么就改成字节，这里没有实现，可以判断Content-Type="multipart/form-data"
      // 进行设置 request multipart参数 https://github.com/request/request
      request.body = Buffer.from(request.body, 'base64').toString()
      console.log('get you requestUrl', request.url)
      try {
        executeRequest(request).then(res => {
          const responseObj = {}
          // console.log('resbody headers', res.headers)
          responseObj.state = res.statusCode
          responseObj.body = res.body
          // 这里client已经解压过了，就不要设置gzip了
          delete res.headers['content-encoding']
          delete res.headers['transfer-encoding']
          responseObj.headers = res.headers
          // 异步，在req 赋值了
          responseObj.createTime = res.createTime
          responseObj.reqId = res.reqId
          console.log('get you response reqId', res.reqId)
          resultResponse.push(responseObj)
        })
      } catch (err) {
        console.log(err)
      }
      if (i % 10 === 0) {
        await sleep(1000)
      }
    }
  } catch (err) {
    console.log('err: getRequestCache', err)
  }
}, 2000)

// 轮询 写入响应
setInterval(async () => {
  if (!writeable) {
    console.info('it can not write now', writeable)
    return
  }
  writeable = false
  if (resultResponse.length === 0) {
    return
  }
  // 设置响应后，后置为空（不用等待响应是否成功写入，不然数据不同步，也可以在失败后恢复数组）
  const copyRespArray = resultResponse.concat([])
  resultResponse = []
  const res = await setResponseCache(JSON.stringify(copyRespArray))
  if (res && !~res.toString().indexOf('"ret":0')) {
    console.log('===============err===============', res)
  }
}, 2200)
