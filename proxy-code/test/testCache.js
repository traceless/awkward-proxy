'use strict'
const { setRequestCache, setResponseCache } = require('../setCache')
const { getResponseCache, getRequestCache } = require('../getCache')
setTimeout(() => {
  // 延迟执行
  setResponseCache('{"data": "this is ResponseCache again"}').then(data => {
    console.log('setResponseCache success? ', data)
  })
  setRequestCache('{"data": "this is RequestCache again"}').then(data => {
    console.log('RequestCache success? ', data)
  })
}, 2500)

setTimeout(() => {
  // 延迟执行
  getResponseCache().then(data => {
    console.log('getResponseCache：', data)
  })

  getRequestCache().then(data => {
    console.log('getRequestCache：', data)
  })
}, 4000)
