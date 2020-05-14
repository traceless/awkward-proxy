'use strict'
const Koa = require('koa')
const http = require('http')
const uuid = require('uuid')

const { setRequestCache } = require('./setCache')
const { getResponseCache } = require('./getCache')
const app = new Koa()

const requestArray = [] // {url, method, headers, body }
let responseArray = [] // {  headers, body }
// 把请求进行封装
app.use(async(ctx, next) => {
  // 可以设置图片就不请求
  const url = ctx.request.url
  if (~url.indexOf('.png') || ~url.indexOf('.jpg') || ~url.indexOf('.ico') || ~url.indexOf('.gif')) {
    ctx.state = 404
    // return
  }
  const data = []
  ctx.req.on('data', chunk => {
    data.push(chunk)
  })
  // 不管什么内容，一律转base64,交给代理服务器server.js 处理
  ctx.request.body = await new Promise((resolve, reject) => {
    ctx.req.on('end', () => {
      resolve(Buffer.concat(data).toString('base64'))
    })
  })
  console.log('noheaders', ctx.request.headers)
  const { method, headers, body } = ctx.request
  // 测试代码，避免其他的连接请求影响
  if (!~url.indexOf('weixin')) {
    console.log('not do url', url)
    // return
  }
  // 请求对象, 如果是是http://s__开头的。 那么转换成https://，这里为了兼容https的代理
  const myurl = url.replace('http://s__', 'https://')
  headers.host = headers.host.replace('s__', '')
  console.log('ctx.request.myurl:', myurl)
  const requestData = { method, url: myurl, headers, body }
  requestData.createTime = new Date().getTime()
  requestData.reqId = uuid.v1()
  // 相应的时候 需要这个字段值
  ctx.request.reqId = requestData.reqId
  requestArray.push(requestData)
  // console.log('ctx.request', requestData)
  await next()
})

// 进行响应
app.use(async ctx => {
  const reqId = ctx.request.reqId
  // 轮询查看是否有数据回来了
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        console.log('@@ await response:', ctx.request.url)
        resolve()
      }, 2000)
    })
    const index = responseArray.findIndex(res => res.reqId === reqId)
    if (~index) {
      // delete responseArray[index].headers['accept-ranges']
      for (const field in responseArray[index].headers) {
        ctx.append(field, responseArray[index].headers[field])
      }
      if (~responseArray[index].headers['content-type'].indexOf('image')) {
        ctx.body = Buffer.from(responseArray[index].body, 'base64')
      } else if (responseArray[index].headers['accept-ranges'] === 'bytes') {
        ctx.body = Buffer.from(responseArray[index].body, 'base64')
      } else {
        ctx.body = Buffer.from(responseArray[index].body, 'base64').toString()
      }
      // 把html页面中的https 改成http, 这样才能请求
      if (~responseArray[index].headers['content-type'].indexOf('text/html')) {
        ctx.body = ctx.body.replace(/https:\/\//g, 'http://s__')
      }
      ctx.state = responseArray[index].state
      console.log('client get the response：', ctx.state)
      responseArray.splice(index, 1)
      // 删除请求
      const reqIndex = requestArray.findIndex(req => req.reqId === reqId)
      requestArray.splice(reqIndex, 1)
      return
    }
  }
  // 删除请求超时的连接，一般超时为20秒
  const reqIndex = requestArray.findIndex(req => req.reqId === reqId)
  requestArray.splice(reqIndex, 1)
})

// let reqCache = '{}'
let hasRead = true
let lastResponseCache = '{}'

// 轮询发送请求列表, 每次发送请求后，重置 allreadyRead = false
let lastRequestCache = '[]'
setInterval(async() => {
  // 发送请求，发送新请求
  const current = JSON.stringify(requestArray)
  if (lastRequestCache === JSON.stringify(requestArray)) {
    console.log('no request')
    return
  }
  lastRequestCache = current
  const res = await setRequestCache(JSON.stringify({ requestArray, allreadyRead: hasRead }))
  console.log('===============  set request ===============', res)
  hasRead = false
}, 2000)

// 轮询获取响应
setInterval(async() => {
  try {
    const responseCache = await getResponseCache()
    hasRead = true
    if (lastResponseCache === responseCache) {
      console.log('no response')
      return
    }
    lastResponseCache = responseCache
    const res = JSON.parse(responseCache)
    responseArray = responseArray.concat(res)
  } catch (err) {
    console.log(err)
  }
}, 2100)
const port = 9000
console.log('proxy-port:', port)
http.createServer(app.callback()).listen(port)
