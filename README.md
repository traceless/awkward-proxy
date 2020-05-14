# awkward-proxy
  基于公司代理的白名单域名上访问互联网，解决部分访问互联网的限制，也就是内网办公的限制。

## 背景
  目前有一些传统但又打着互联网的公司经常会做一些愚蠢且无聊的事情。已经2020年了，还是有不少公司是内网办公的，大多数数传统的银行，金融，安全类的公司就是这样操作的，不给员工上网，那么怎么解决这个问题？解决的前提是你得能访问一些代理白名单的外网，一般这样的公司都会预留一些域名白名单的来允许你访问部分的网站，比如允许你访问CSDN，访问微信开发者中心等一些常用的技术网站，如果这些都没有，那么就不用看下去了。

## 实现的思路
如图：
 ![image](https://github.com/traceless/awkward-proxy/blob/master/WX20200514.png)

1. 把内网pc的请求信息存放到文章req中，通常请求信息有url, param, header等
2. 外网pc定时从文章req拿到请求信息，然后通过外网获取链接内容
3. 将链接内容写入到文章res中，通常就是包含header，body信息等
4. 内网pc定时从文章res获取到响应信息，然后返回给浏览器

## 具体实现细节

### 客户端client.js
- 所有浏览器请求先存放到requestArray中，然后定时把请求列表写入文章req中
- 定时获取文章res内容，把内容存放到responseArray
- 然后等待轮询responseArray, 根据reqId匹配对应的响应返回给浏览器

### 服务端server.js
- 定时获取文章req内容，解析得到requestArray，遍历requestArray，请求链接的内容，并且存放到resultResponse数组中
- 定时把resultResponse内容写入到文章res中，客户端会定时拉取这些响应

## 配置信息
1. 例子中使用的是微信公众平台的文章，所以需要公众号账号，登录后获取cookie和token，然后需要素材文章的appmsgid 2个，一个请求，一个响应。
2. 测试时候可以使用文件作为中间交互的载体

## 注意
1. 例子中使用的是微信公众平台的文章作为中间存放信息交互的载体。目前还不支持https代理，不过已经做了折中的方式，如果要访问https的网站，请变通比如 http://s__www.baidu.com, 给域名添加前缀来解决。支持https涉及到证书问题，我这里就不做太复杂的实现了。按思路理论上可以实现sock5代理。
不过目前看来实现http就已经很慢了。加入定时2秒轮询的话，访问一个网页大概需要10秒，反正总比没有要强把。
2. 暂时没实现上传的支持，看看源码请自行实现，不难。下载文件理论上可以的，还没测试过。不过按文章存放的字数限制来说，测试过2.5M文件能存到文章中，更大的10M就挂了，其他大小没测试了，反正当下载没啥必要。
3. BTW: base64是比较方便的编码设计，这次案例中学到了编码的姿势。
