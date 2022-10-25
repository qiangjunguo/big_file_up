import http from './http'
function getFileMD5Api(url, path, fileName, fileSize) {
    const params = {
        path: path,
        fileName: fileName,
        fileSize: fileSize
    }
    return http.get(url, { params })
}


function initMultiPartApi(url, path, fileName, partCount) {
    var params = new FormData();
    params.append("path", path);
    params.append("fileName", fileName);
    params.append("partCount", partCount);
    return http.post(url, params)
}


function uploadMultiPartApi(url, uploadId, path, fileName, partNumber, file, opt) {
    var params = new FormData();
    params.append("uploadId", uploadId);
    params.append("path", path);
    params.append("fileName", fileName);
    params.append("partNumber", partNumber);
    params.append(opt.fileObjName, file);
    return http.post(url, params)
}

function completeMultiPartApi(url, uploadId, path, fileName, partETagList, mts) {
    var params = new FormData();
    params.append("uploadId", uploadId);
    params.append("path", path);
    params.append("fileName", fileName);
    params.append("partETags", JSON.stringify(partETagList));
    params.append("mts", mts);
    return http.post(url, params)
}

export { getFileMD5Api, initMultiPartApi, uploadMultiPartApi, completeMultiPartApi }
