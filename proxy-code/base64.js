'use strict'
// 自定义的base64加密

function Base64(_secret) {
  const secret = _secret || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
  const chars = secret.split('')
  const mapChars = {}
  chars.forEach((e, index) => {
    mapChars[e] = index
  })
  // 编码加密
  this.encodeBase64 = function encodeBase64(bufferOrStr, encoding = 'utf-8') {
    const buffer = bufferOrStr instanceof Buffer ? bufferOrStr : Buffer.from(bufferOrStr, encoding)
    let result = ''
    let arr = [], bt = [], char
    for (let i = 0; i < buffer.length; i += 3) {
      if (i + 3 > buffer.length) {
        arr = buffer.slice(i, buffer.length)
        break
      }
      bt = buffer.slice(i, i + 3)
      char = chars[bt[0] >> 2] + chars[((bt[0] & 3) << 4) | (bt[1] >> 4)] + chars[((bt[1] & 15) << 2) | (bt[2] >> 6)] + chars[bt[2] & 63]
      result += char
    }
    if (buffer.length % 3 === 1) {
      char = chars[arr[0] >> 2] + chars[((arr[0] & 3) << 4)] + chars[64] + chars[64]
      result += char
    } else if (buffer.length % 3 === 2) {
      char = chars[arr[0] >> 2] + chars[((arr[0] & 3) << 4) | (arr[1] >> 4)] + chars[((arr[1] & 15) << 2)] + chars[64]
      result += char
    }
    return result
  }
  // 编码解密
  this.decodeBase64 = function decodeBase64(base64Str) {
    let size = base64Str.length / 4 * 3
    let j = 0
    if (~base64Str.indexOf(chars[64] + '' + chars[64])) {
      size -= 2
    } else if (~base64Str.indexOf(chars[64])) {
      size -= 1
    }
    let buffer = Buffer.alloc(size)
    let enc1, enc2, enc3, enc4, i = 0;
    while (i < base64Str.length) {
      enc1 = mapChars[base64Str.charAt(i++)]
      enc2 = mapChars[base64Str.charAt(i++)]
      enc3 = mapChars[base64Str.charAt(i++)]
      enc4 = mapChars[base64Str.charAt(i++)]
      buffer.writeUInt8(enc1 << 2 | enc2 >> 4, j++)
      if (enc3 !== 64) {
        buffer.writeUInt8(((enc2 & 15) << 4) | (enc3 >> 2), j++)
      }
      if (enc4 !== 64) {
        buffer.writeUInt8(((enc3 & 3) << 6) | enc4, j++)
      }
    }
    return buffer
  }

}

Base64.randomSecret = function () {
  // 不能使用 = 号，url穿参数不支持
  const source = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789,*$'
  let chars = source.split('')
  const newChars = []
  while (chars.length > 0) {
    let index = Math.floor(Math.random() * chars.length);
    newChars.push(chars[index])
    chars.splice(index, 1);
  }
  return newChars.join('')
}

module.exports = Base64
function test() {
  let secret = Base64.randomSecret()
  console.log('secret:', secret)
  let mybase64 = new Base64(secret)
  let test = "test123456"
  let encodeStr = mybase64.encodeBase64(test)
  let bufferData = mybase64.decodeBase64(encodeStr)
  let encodeFromBuffer = mybase64.encodeBase64(bufferData)
  console.log(encodeStr, encodeFromBuffer, bufferData.toString())
}
// test()