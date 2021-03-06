'use strict'
const request = require('request')
const config = require('./config')
const fs = require('fs')
const path = require('path')

const opts = {
  url: `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&lang=zh_CN&token=${config.token}&type=10&appmsgid=${config.responseAppmsgid}&fromview=list`,
  proxy: config.proxy || null,
  headers: {
    cookie: config.cookie,
    referer: 'https://mp.weixin.qq.com/cgi-bin/cgi-bin/appmsgtemplate?action=edit&appmsgid=100000020',
    Host: 'mp.weixin.qq.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
    Accept: 'text/html',
    Origin: 'https://mp.weixin.qq.com'
  }
}

function decode(fileBase64) {
  fileBase64 = fileBase64.replace(/,/g, '/').replace(/\*/g, '+').replace(/\$/g, '=')
  return fileBase64
}
const { gunzipSync } = require('zlib')
function getCache(appmsgid) {
  opts.url = `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&lang=zh_CN&token=${config.token}&type=10&appmsgid=${appmsgid}&fromview=list`
  return new Promise((resolve, reject) => {
    // 转为base64
    request(opts, (err, res) => {
      if (err) {
        reject(err)
        return
      }
      const starStr = '@*@'
      const start = res.body.indexOf(starStr)
      const end = res.body.indexOf('@_@')
      let data = res.body.substring(start + starStr.length, end)
      data = decode(data)
      try {
        data = gunzipSync(Buffer.from(data, 'base64')).toString()
      } catch (err) {
        reject(err)
      }
      resolve(data)
    })
  })
}
// 获取响应内容
let getResponseCache = async function() {
  return getCache(config.responseAppmsgid)
}
if (config.useFile) {
  getResponseCache = function() {
    return fs.readFileSync(path.resolve(__dirname, 'response.txt')).toString()
  }
}

// 获取请求内容
let getRequestCache = async function() {
  return getCache(config.requestAppmsgid)
}
if (config.useFile) {
  getRequestCache = async function() {
    return fs.readFileSync(path.resolve(__dirname, 'request.txt')).toString()
  }
}

module.exports = { getResponseCache, getRequestCache }
// 测试
// getResponseCache().then(data => {
//   console.log('getResponseCache：', data)
// })

// getRequestCache().then(data => {
//   console.log('getRequestCache：', data)
// })
