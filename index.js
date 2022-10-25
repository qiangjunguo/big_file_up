import { getFileMD5Api, initMultiPartApi, uploadMultiPartApi, completeMultiPartApi } from './request'

export async function upBigFileFn(file, baseUrl) {
    const result = {};
    const fileObj = {
        uploadId: "",
        totalPartCount: 0,
        uploadedCount: 0,
        partETagList: [],
        uploadIdKey: "",
        uploadedPartEtagsKey: "",
    };
    let percentage = 0;
    let multiParts = [];
    let uploadingParts = [];
    let maxUploadingCount = 5;
    let errLogInfos = { "log-all": 0 };
    let uploadCancel = false;
    let url = '';
    let uploadId = '';
    let path = '';
    let fileName = '';


    /**
 * 两个数组相减, 此函数仅适用本场景
 * @param arr1  arr1:[1,2,3,4,...]
 * @param arr2  arr2:[Object,Object,"","",...]
 * @returns arr1-arr2的结果
 */
    const arraySubtract = function (arr1, arr2) {
        for (var i = arr1.length - 1; i >= 0; i--) {
            if (arr2[i] !== "") {
                arr1.splice(i, 1);
            }
        }
        return arr1;
    }


    /**
     * 上传配置
     */
    const opt = {
        chunkSize: 1024 * 1024 * 10, //文件分片大小
        method: 'post', //请求方式
        path: "",
        fileObjName: 'file', //后台接收的文件名（后台使用spring mvc时此项不必要）
        fileMD5Url: `${baseUrl}/multipart/MD5`,
        initUploadUrl: `${baseUrl}/multipart/init`,
        uploadUrl: `${baseUrl}/multipart/upload`, //文件上传地址
        completeUploadUrl: `${baseUrl}/multipart/complete`,
        abortUploadUrl: `${baseUrl}/multipart/abort`,
    };


    const nextBeiginUpload = async function (url, uploadId, path, fileName) {
        multiParts = [];
        uploadingParts = [];
        errLogInfos = { "log-all": 0 };
        uploadCancel = false;

        for (var i = 1; i <= fileObj.totalPartCount; i++) {
            multiParts[i - 1] = i;
        }
        //两个数组相减
        multiParts = arraySubtract(multiParts, fileObj.partETagList);

        // this.url = url;
        // this.uploadId = uploadId;
        // this.path = path;
        // this.fileName = fileName;
        if (multiParts.length !== 0) {
            for (var i = 0; i < maxUploadingCount && multiParts.length > 0; i++) {
                var curPart = multiParts.shift();
                uploadingParts.push(curPart);
             await   uploadMultiPart(url, uploadId, path, fileName, curPart, getMultiPart(curPart, fileObj.oldFile));
            }
        } else {
          await  completeMultiPart(opt.completeUploadUrl, uploadId, path, fileName, fileObj.partETagList, false);
        }
    }

    /**
* 完成分片上传
* @param url
* @param uploadId
* @param path
* @param fileName
* @param partETagList
*/
    const completeMultiPart = async function (url, uploadId, path, fileName, partETagList, mts) {
       await completeMultiPartApi(url, uploadId, path, fileName, partETagList, mts).then((res) => {
            console.log('complete', res.data)
            if (res.data.code === 0) {
                window.sessionStorage.removeItem(fileObj.uploadIdKey);
                window.sessionStorage.removeItem(fileObj.uploadedPartEtagsKey);
                window.sessionStorage.setItem('kgVideo', res.data.url)
            } else {
                alert(res.data.codeMsg)
            }
        }).catch(err => {
            console.log(err)
        })
    }

    /**
     * 分割文件
     * @param partNumber 1 ~ partCount
     * @param file
     * @returns {string|Blob|Array.<T>|ArrayBuffer|*}
     */
    const getMultiPart = function (partNumber, file) {
        if (fileObj.totalPartCount === partNumber) {
            return file.slice((partNumber - 1) * opt.chunkSize);
        } else {
            return file.slice((partNumber - 1) * opt.chunkSize, partNumber * opt.chunkSize);
        }
    }


    /**
 * 进度条处理
 * @param file
 * @param loaded
 * @param size
 */
    const onProgress = function (upLoadCount, totalCount) {
        const p = ((upLoadCount / totalCount) * 100).toFixed(2);
        p < 100 ? fileurl = '' : ''
        percentage = Number(p)
    }

    const uploadedPart = async function (curPart) {
        if (uploadCancel) {
            alert("分片上传失败次数达到阈值，请网络稳定后再重传！");
            return;
        }
        for (var i = 0; i < uploadingParts.length; i++) {
            if (curPart === uploadingParts[i]) {
                uploadingParts.splice(i, 1);
                break;
            }
        }
        console.log('multiParts', multiParts.length)
        if (multiParts.length > 0) {
            var part = multiParts.shift();
            uploadingParts.push(part);
         await   uploadMultiPart(opt.uploadUrl, fileObj.uploadId, opt.path, fileObj.name, part, getMultiPart(part, fileObj.oldFile));
        } else {
            if (uploadingParts.length === 0) {
                //检查是否所有分片都有partETag
                var allUploaded = true;
                for (var i = 0; i < fileObj.totalPartCount; i++) {
                    if (fileObj.partETagList[i] !== "") {
                        allUploaded = false;
                        break;
                    }
                }
                console.log('allUploaded', allUploaded)
                if (allUploaded) {
                  await  completeMultiPart(opt.completeUploadUrl, uploadId, path, fileName, fileObj.partETagList, false);
                } else {
                  await  nextBeiginUpload(opt.uploadUrl, fileObj.uploadId, opt.path, fileObj.name);
                }
            }
        }
    }


    const selectFile = async function () {
        fileObj.name = file.name;
        fileObj.size = file.size;//文件初始大小
        fileObj.oldFile = file;
        await upload();
    };

    const upload = async function () {
        if (!window.sessionStorage) {
            alert("请使用支持sessionStorage的浏览器");
        }
        // const path = 'gonghui/upVideo';
        const path = 'suyun/fe/tianjingonghui';
        if (path.match(/^\s*$/)) {
            if (confirm("path为空，是否继续上传？") === false) {
                return;
            } else {
                opt.path = "";
            }
        } else {
            opt.path = path;
        }

        const fileMD5 = await getFileMD5(opt.fileMD5Url, path, fileObj.name, fileObj.size);
        if (fileMD5 === "") {
            return;
        }


        //检查此文件之前是否有上传但未成功
        fileObj.uploadIdKey = "multiupload" + fileMD5 + "UploadId";
        fileObj.uploadedPartEtagsKey = "multiupload" + fileMD5 + "PartEtags";
        fileObj.totalPartCount = Math.ceil(fileObj.size / opt.chunkSize);   //向上取整
        if (sessionStorage.getItem(fileObj.uploadIdKey) == null) {
            await initMultiPart(opt.initUploadUrl, opt.path, fileObj.name, fileObj.totalPartCount, fileObj, opt);
        }
        else {
            fileObj.uploadId = window.sessionStorage.getItem(fileObj.uploadIdKey);
            if (window.sessionStorage.getItem(fileObj.uploadedPartEtagsKey) == null) {
                fileObj.partETagList = [];
                for (var i = 0; i < fileObj.totalPartCount; i++) {
                    fileObj.partETagList[i] = "";
                }
                fileObj.uploadedCount = 0;
            } else {
                fileObj.partETagList = JSON.parse(window.sessionStorage.getItem(fileObj.uploadedPartEtagsKey));
                fileObj.uploadedCount = 0;
                for (var i = 0; i < fileObj.partETagList.length; i++) {
                    if (fileObj.partETagList[i] != "") {
                        fileObj.uploadedCount++;
                    }
                }
            }
            await nextBeiginUpload(opt.uploadUrl, fileObj.uploadId, opt.path, fileObj.name);
        }
    }

    const getFileMD5 = async function (url, path, fileName, fileSize) {
        var result = "";
        await getFileMD5Api(url, path, fileName, fileSize).then(res => {
            if (res.data.code === 0) {
                result = res.data.codeMsg;
            } else {
                alert(res.data.codeMsg);
            }
        }).catch(err => { alert("操作失败!") })
        return result;
    }

    const uploadMultiPart = async  function (url, uploadId, path, fileName, partNumber, file) {

      await  uploadMultiPartApi(url, uploadId, path, fileName, partNumber, file, opt).then(async res => {
            if (res.data.code === 0) {
                fileObj.partETagList[partNumber - 1] = JSON.parse(res.data.codeMsg);
                window.sessionStorage.setItem(fileObj.uploadedPartEtagsKey, JSON.stringify(fileObj.partETagList));
                fileObj.uploadedCount++;
                // onProgress(fileObj.uploadedCount, fileObj.totalPartCount);
             await   uploadedPart(partNumber);
            } else {
                // this.errLog(partNumber);
            }
        }).catch(err => {
            // this.errLog(partNumber);
        })

    }


    const initMultiPart = async function (url, path, fileName, partCount, fileObj, opt) {
        await initMultiPartApi(url, path, fileName, partCount).then(async res => {
            console.log('init', res)
            if (res.data.code === 0) {
                //init  赋值
                fileObj.uploadId = res.data.codeMsg
                window.sessionStorage.setItem(fileObj.uploadIdKey, res.data.codeMsg)
                await beiginUpload(opt.uploadUrl, fileObj.uploadId, opt.path, fileObj.name);
            } else {
                alert(res.data.codeMsg)
            }
        })
    }

    const beiginUpload = async function (url, uploadId, path, fileName) {
        multiParts = [];
        uploadingParts = [];
        errLogInfos = { "log-all": 0 };
        uploadCancel = false;
        fileObj.partETagList = [];

        for (var i = 0; i < fileObj.totalPartCount; i++) {
            fileObj.partETagList[i] = "";
        }
        fileObj.uploadedCount = 0;

        for (var i = 1; i <= fileObj.totalPartCount; i++) {
            multiParts[i - 1] = i;    //[1,2,3,4,...]
        }
        // url = url;
        // uploadId = uploadId;
        // path = path;
        // fileName = fileName;
        for (var i = 0; i < maxUploadingCount && multiParts.length > 0; i++) {
            var curPart = multiParts.shift();
            uploadingParts.push(curPart);
            console.log('begin', uploadingParts)
          await  uploadMultiPart(url, uploadId, path, fileName, curPart, getMultiPart(curPart, fileObj.oldFile));
        }
    }
    await selectFile()
}
