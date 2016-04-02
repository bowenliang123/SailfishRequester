/**
 * Created by bowen on 16/3/31.
 */

'use strict';

console.log('background.js');

// 监听 Browser Actions 按钮点击事件
chrome.browserAction.onClicked.addListener(function (tab) {
    //打开选项页
    chrome.tabs.create({'url': chrome.extension.getURL('html/main.html')}, function (tab) {
    });
});

//监听所有请求，header发出前对请求进行修改
//https://developer.chrome.com/extensions/webRequest#event-onBeforeRequest
chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
        //console.log(details);

        //检查 URL 参数并加入
        //if (details.url.indexOf('#34567') < 0) {
        //    return {redirectUrl: details.url + '#34567'}
        //}
    },
    {urls: ["<all_urls>"]},
    ["blocking"]);


//监听所有请求，header发出前对请求进行修改
//https://developer.chrome.com/extensions/webRequest#event-onBeforeSendHeaders
chrome.webRequest.onBeforeSendHeaders.addListener(
    function (details) {
        //console.log(details);

        modifyHeaders(details);
        modifyUserAgent(details);

        return {requestHeaders: details.requestHeaders};
    },
    {urls: ["<all_urls>"]},
    ["blocking", "requestHeaders"]);

//监听请求
chrome.extension.onRequest.addListener(
    function (request, sender, sendResponse) {
        if (request.action == "getAllCases") {
            getAllCases((cases)=> {
                sendResponse({cases: cases});
            });

        }

        else if (request.action == "saveAllCases") {
            let cases = JSON.parse(request.casesStr);
            saveAllCases(cases);
        }

        //激活用例
        else if (request.action == "activateCase") {
            activateCase(request.caseStr);
        }

        //关闭用例
        else if (request.action == "deactivateCase") {
            deactivateCase(request.caseStr);
        }

        //获取激活的用例
        else if (request.action == "getActiveCase") {
            let simCase = getActiveCase();
            sendResponse({activeCase: simCase});
        }

        else
            sendResponse({}); // snub them.
    });

function appendHeaders(requestHeaders, additionalHeaders) {
    if (!additionalHeaders || additionalHeaders.length < 1) {
        return;
    }

    //遍历自定义headers
    let keys = Object.keys(additionalHeaders);
    keys.forEach((key)=> {
        //添加到真正的header
        requestHeaders.push({name: key, value: additionalHeaders[key]});
    })
}

let activeCase;
let demoCases = [
    {
        caseId: 0,
        name: 'UC',
        ua: 'Mozilla/5.0 (Linux; U; Android 4.4.4; zh-CN; MI 4LTE Build/KTU84P) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 UCBrowser/10.9.2.712 U3/0.8.0 Mobile',
        headers: "headerKey:headerValue0"
    },
    {
        caseId: 1,
        name: 'Wechat',
        ua: 'mozilla/5.0 (linux; u; android 4.1.2; zh-cn; mi-one plus build/jzo54k) applewebkit/534.30 (khtml, like gecko) version/4.0 mobile safari/534.30 micromessenger/5.0.1.352                ',
        headers: "headerKey:headerValue1"
    },
    {
        caseId: 2,
        name: 'Weibo',
        ua: 'Mozilla/5.0 (Linux; U; Android 4.0.4; zh-cn; HTC Sensation XE with Beats Audio Z715e Build/IML74K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
        headers: "key1:value1\nkey2:value2"
    }
];

function getAllCases(callback) {
    //https://developer.chrome.com/extensions/storage#property-sync
    chrome.storage.sync.get('allCases', (items) => {
        callback && callback(items['allCases']);
    });
}

function saveAllCases(cases) {
    if (!cases) {
        return;
    }

    // Save it using the Chrome extension storage API.
    //https://developer.chrome.com/extensions/storage#property-sync
    chrome.storage.sync.set({'allCases': cases}, () => {
        console.log('saveAllCases finished.');
    });
}

function activateCase(caseStr) {
    activeCase = JSON.parse(caseStr);

    //设置 badge 文本
    chrome.browserAction.setBadgeText({text: activeCase.name});

    //清除 browser action title
    chrome.browserAction.setTitle({title: `Name:  ${activeCase.name}\n\nUser Agent:\n${activeCase.ua}\n\nHeaders:\n${activeCase.headers}`});
}

function deactivateCase() {
    activeCase = undefined;

    //清除 badge 文本
    chrome.browserAction.setBadgeText({text: ''});

    //清除 browser action title
    chrome.browserAction.setTitle({title: ''});
}

function modifyHeaders(details) {
    if (!activeCase || !activeCase.headers) {
        return;
    }

    //准备自定义header
    let modHeaderLines = activeCase.headers.split('\n');
    if (!modHeaderLines || modHeaderLines.length < 1) {
        return;
    }

    let customHeaders = {};
    modHeaderLines.forEach((modHeaderStr)=> {
        if (!modHeaderStr || modHeaderStr.indexOf(':') < 0) {
            return;
        }

        let index = modHeaderStr.indexOf(':');
        if (index <= 0 || index == modHeaderStr.length - 1) {
            return;
        }

        let headerKey = modHeaderStr.slice(0, index);
        let headerValue = modHeaderStr.slice(index + 1, modHeaderStr.length);
        //加入自定义header
        customHeaders[headerKey] = headerValue;
    });

    //增加到请求的 header
    appendHeaders(details.requestHeaders, customHeaders);
}


function modifyUserAgent(details) {
    if (!activeCase || !activeCase.ua) {
        return;
    }

    details.requestHeaders.forEach((requestHeader)=> {
        let headerName = requestHeader.name.toLowerCase();
        if (!headerName || headerName.indexOf('user') < 0 || headerName.indexOf('agent') < 0) {
            return;
        }

        requestHeader.value = activeCase.ua;
    });
}

function getActiveCase() {
    return activeCase;
}