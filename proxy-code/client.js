'use strict'
const Koa = require('koa')
const http = require('http')
const uuid = require('uuid')

const { setRequestCache } = require('./setCache')
const { getResponseCache } = require('./getCache')
const { snowflake } = require('./snowflake')
const config = require('./config')
const base64 = require('./base64')
const mybase64 = new base64(config.secret)
const app = new Koa()
// 等待
async function sleep(time) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time || 1000);
  });
}
const httpsFlag = '_sssss'
// 判断链接
function matchHttpsUrl(html) {
  //  匹配https开始的，结尾是单引号或者双引号的连接
  let match = /(https:\/\/)+(www\.)?[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+(:\d+)?[^"\']*/g
  let result
  while (result = match.exec(html)) {
    const newUrl = result[0].replace('https:', 'http:') + httpsFlag
    html = html.replace(result[0], newUrl)
    // console.log(" ======match url========:", result[0], newUrl)
  }
  return html
}

const requestArray = [] // {url, method, headers, body }
let responseArray = [] // {  headers, body }
// 把请求进行封装
app.use(async (ctx, next) => {
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
      resolve(mybase64.encodeBase64(Buffer.concat(data)))
    })
  })
  // console.log('browser headers', ctx.request.headers)
  const { method, headers, body } = ctx.request
  let myurl = url
  if (url.indexOf(httpsFlag)) {
    myurl = url.replace(httpsFlag, '').replace('http:', 'https:')
  }
  console.log("======= myurl=======", myurl)
  const requestData = { method, url: myurl, headers, body }
  requestData.createTime = snowflake.shortNextId()
  requestData.reqId = uuid.v1()
  // 代理服务响应的时候，就需要这个字段值去匹配是哪个请求的响应
  ctx.request.reqId = requestData.reqId
  requestArray.push(requestData)
  await next()
})

// 下一步等待响应
app.use(async ctx => {
  const reqId = ctx.request.reqId
  // 轮询查看是否有数据回来了，轮训N次
  for (let i = 0; i < 30; i++) {
    // 睡眠等待1s，下次再看看是否已经返回
    await sleep(1000)
    const index = responseArray.findIndex(res => res.reqId === reqId)
    if (~index) {
      // 组装headers
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
      // 把html页面中的https改成http, 这样js，png那些链接才能继续请求
      if (~responseArray[index].headers['content-type'].indexOf('text/html')) {
        ctx.body = matchHttpsUrl(ctx.body)
        // 可以强制全部走https，比如某些域名下全部走https，这里交给大家去实现了
        // ctx.body = ctx.body.replace(/https:\/\//g, 'http://')
      }
      ctx.state = responseArray[index].state
      console.log('client get the response：', ctx.state)
      responseArray.splice(index, 1)
      // 删除已响应的请求
      const reqIndex = requestArray.findIndex(req => req.reqId === reqId)
      requestArray.splice(reqIndex, 1)
      return
    }
  }
  // 等待30次，还没有响应数据，那么就说明超时了，先不管了
  const reqIndex = requestArray.findIndex(req => req.reqId === reqId)
  requestArray.splice(reqIndex, 1)
  console.log(' ###request time out ', ctx.request.url)
})

// let reqCache = '{}'
let allreadyRead = true
let lastResponseCache = '{}'

// 轮询发送请求列表, 每次发送请求后，重置 allreadyRead = false
let lastRequestCache = '[]'
setInterval(async () => {
  // 发送请求，发送新请求
  const current = JSON.stringify(requestArray)
  if (lastRequestCache === current) {
    console.log('no request')
    return
  }
  lastRequestCache = current
  const res = await setRequestCache(JSON.stringify({ requestArray, allreadyRead }))
  console.log('===============  set request ===============', res)
  allreadyRead = false
}, 2000)

// 轮询获取响应
setInterval(async () => {
  try {
    const responseCache = await getResponseCache()
    allreadyRead = true
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
