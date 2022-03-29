'use strict'
const fs = require('fs')
const path = require('path')
const request = require('request')
const config = require('./config')

const opts = {
  url: `https://mp.weixin.qq.com/cgi-bin/operate_appmsg?t=ajax-response&sub=update&type=10&token=${config.token}&lang=zh_CN`,
  proxy: config.proxy || null,
  headers: {
    cookie: config.cookie,
    // referer: 'https://mp.weixin.qq.com/cgi-bin/cgi-bin/appmsgtemplate?action=edit&appmsgid=100000020',
    Host: 'mp.weixin.qq.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
    Accept: 'application/json',
    Origin: 'https://mp.weixin.qq.com',
    // 'Accept-Encoding': 'gzip, deflate', // 不需要压缩
    'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': 'https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&type=10&appmsgid=100000028&token=1681347483&lang=zh_CN'
  }
}
// 请求参数，每次都需要
function createBody(content, appmsgid, dataSeq) {
  content = '@*@' + content + '@_@'
  const body = `token=${config.token}&lang=zh_CN&f=json&ajax=1&random=0.8267605760212564&AppMsgId=${appmsgid}&count=1&data_seq=${dataSeq}&operate_from=Firefox&isnew=0&ad_video_transition0=&can_reward0=0&reward_reply_id0=&related_video0=&is_video_recommend0=-1&title0=cache_${appmsgid}&author0=22doctor&writerid0=0&fileid0=&digest0=response-content&auto_gen_digest0=1&content0=%3Cp%3E${content}%3Cbr%3E%3C%2Fp%3E&sourceurl0=&need_open_comment0=0&only_fans_can_comment0=0&only_fans_days_can_comment0=0&cdn_url0=&cdn_235_1_url0=&cdn_1_1_url0=&cdn_url_back0=&crop_list0=&music_id0=&video_id0=&voteid0=&voteismlt0=&supervoteid0=&cardid0=&cardquantity0=&cardlimit0=&vid_type0=&show_cover_pic0=0&shortvideofileid0=&copyright_type0=0&releasefirst0=&platform0=&reprint_permit_type0=&allow_reprint0=&allow_reprint_modify0=&original_article_type0=&ori_white_list0=&video_ori_status0=&hit_nickname0=&free_content0=&fee0=0&ad_id0=&guide_words0=&is_share_copyright0=0&share_copyright_url0=&source_article_type0=&reprint_recommend_title0=&reprint_recommend_content0=&share_page_type0=0&share_imageinfo0=%7B%22list%22%3A%5B%5D%7D&share_video_id0=&dot0=%7B%7D&share_voice_id0=&insert_ad_mode0=&categories_list0=%5B%5D&compose_info0=%7B%22list%22%3A%5B%7B%22blockIdx%22%3A1%2C%22content%22%3A%22%3Cp+style%3D%5C%22overflow-y%3A+hidden%3B%5C%22%3Etest-content%3Cmpchecktext+id%3D%5C%221589426622468_0.7019304859993029%5C%22+contenteditable%3D%5C%22false%5C%22%3E%3C%2Fmpchecktext%3E%3Cbr%3E%3C%2Fp%3E%22%2C%22width%22%3A578%2C%22height%22%3A27%2C%22topMargin%22%3A0%2C%22marginBottom%22%3A0%2C%22contentEditable%22%3Anull%2C%22blockType%22%3A9%2C%22background%22%3A%22rgba(0%2C+0%2C+0%2C+0)%22%2C%22text%22%3A%22test-content%22%2C%22textColor%22%3A%22rgb(51%2C+51%2C+51)%22%2C%22textFontSize%22%3A%2217px%22%2C%22textBackGround%22%3A%22rgba(0%2C+0%2C+0%2C+0)%22%7D%5D%7D&is_pay_subscribe0=0&pay_fee0=&pay_preview_percent0=&pay_desc0=&appmsg_album0=&remind_flag=`
  // const body = `token=${config.token}&lang=zh_CN&f=json&ajax=1&random=0.4266195415809638&AppMsgId=${appmsgid}&count=1&data_seq=${dataSeq}&operate_from=Firefox&isnew=0&ad_video_transition0=&can_reward0=0&reward_reply_id0=&related_video0=&is_video_recommend0=0&title0=cache_${appmsgid}&author0=doctor&writerid0=0&fileid0=&digest0=***&auto_gen_digest0=0&content0=%3Cp%3E%40%40%40%3Cbr%3E%3C%2Fp%3E&sourceurl0=&need_open_comment0=0&only_fans_can_comment0=0&only_fans_days_can_comment0=0&cdn_url0=&cdn_235_1_url0=&cdn_1_1_url0=&cdn_url_back0=&crop_list0=&music_id0=&video_id0=&voteid0=&voteismlt0=&supervoteid0=&cardid0=&cardquantity0=&cardlimit0=&vid_type0=&show_cover_pic0=0&shortvideofileid0=&copyright_type0=0&releasefirst0=&platform0=&reprint_permit_type0=&allow_reprint0=&allow_reprint_modify0=&original_article_type0=&ori_white_list0=&video_ori_status0=&hit_nickname0=&free_content0=&fee0=0&ad_id0=&guide_words0=&is_share_copyright0=0&share_copyright_url0=&source_article_type0=&reprint_recommend_title0=&reprint_recommend_content0=&share_page_type0=0&share_imageinfo0=%7B%22list%22%3A%5B%5D%7D&share_video_id0=&dot0=%7B%7D&share_voice_id0=&insert_ad_mode0=&categories_list0=%5B%5D&compose_info0=%7B%22list%22%3A%5B%7B%22blockIdx%22%3A1%2C%22content%22%3A%22%3Cp+style%3D%5C%22overflow-y%3A+hidden%3B%5C%22%3E%40%40%40%3Cbr%3E%3C%2Fp%3E%22%2C%22width%22%3A578%2C%22height%22%3A27%2C%22topMargin%22%3A0%2C%22marginBottom%22%3A0%2C%22contentEditable%22%3Anull%2C%22blockType%22%3A9%2C%22background%22%3A%22rgba(0%2C+0%2C+0%2C+0)%22%2C%22text%22%3A%22%40%40%40%22%2C%22textColor%22%3A%22rgb(51%2C+51%2C+51)%22%2C%22textFontSize%22%3A%2217px%22%2C%22textBackGround%22%3A%22rgba(0%2C+0%2C+0%2C+0)%22%7D%5D%7D&is_pay_subscribe0=0&pay_fee0=&pay_preview_percent0=&pay_desc0=&appmsg_album0=&remind_flag=`
  return body
}
 
// 这里需要自己重新实现的方法
const { gzipSync } = require('zlib')
let setCache = function(requestCache, appmsgid, dataSeq = '1339542083857891328') {
  return new Promise((resolve, reject) => {
    // // 发送前先压缩 转为base64
    let data = gzipSync(requestCache).toString('base64')
    opts.body = createBody(data, appmsgid, dataSeq)
    request.post(opts, (err, res) => {
      if (err) {
        reject(err)
        return
      }
      resolve(res.body)
    })
  })
}

const dataSeqData = {}
// 设置响应信息
let setResponseCache = async function(data) {
  const resData = await setCache(data, config.responseAppmsgid, dataSeqData[config.responseAppmsgid])
  const res = JSON.parse(resData)
  dataSeqData[config.responseAppmsgid] = res.data_seq
  return res
}

// 设置请求信息
let setRequestCache = async function(data) {
  const resData = await setCache(data, config.requestAppmsgid, dataSeqData[config.requestAppmsgid])
  const res = JSON.parse(resData)
  dataSeqData[config.requestAppmsgid] = res.data_seq
  return res
}

// 使用本地文件测试
if (config.useFile) {
  setRequestCache = function(data) {
    fs.writeFileSync(path.resolve(__dirname, 'request.txt'), data)
  }
  setResponseCache = function(data) {
    fs.writeFileSync(path.resolve(__dirname, 'response.txt'), data)
  }
} else {
  // 这里避免第一次请求报错，简单处理
  setRequestCache('{"data": "this is RequestCache"}')
  setResponseCache('{"data": "this is ResponseCache"}')
}

module.exports = { setResponseCache, setRequestCache }
