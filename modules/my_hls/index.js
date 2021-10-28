"use strict";
exports.__esModule = true;
var fs = require("fs");
var crypto = require("crypto");
var child_process_1 = require("child_process");
//tmp, files 폴더 없으면 생성
if (!fs.existsSync('./tmp'))
    fs.mkdirSync('./tmp');
//tmp 폴더 내부의 모든 폴더 삭제
fs.readdirSync('./tmp').forEach(function (v) { return fs.unlinkSync('./tmp/' + v); });
var MD5 = function (txt) { return crypto.createHash('md5').update(txt).digest('hex'); };
var working_list = [];
var HLS = /** @class */ (function () {
    function HLS(url, duraction) {
        var _this = this;
        this.status = 'ready';
        this.url = url;
        this.dirpath = '/tmp/' + MD5(url);
        //
        setTimeout(function () {
            _this.remove();
        }, duraction * 2 * 1000);
    }
    //ffmpeg로 ts파일 생성, ts파일 리스트 반환
    HLS.prototype.create_ts = function (hls_time) {
        var _this = this;
        if (hls_time === void 0) { hls_time = 10; }
        return new Promise(function (resolve, rejects) {
            _this.status = 'create';
            if (working_list.includes(_this.url))
                working_list.push(_this.url);
            else {
                _this.status = 'end';
                rejects(false);
            }
            //폴더 만들기
            fs.mkdirSync(_this.dirpath);
            _this.status = 'working';
            var cmd = "ffmpeg -i " + _this.url + " -profile:v baseline -level 3.0 -start_number 0 -hls_time 10 -hls_list_size 0 -f hls index.m3u8";
            (0, child_process_1.exec)(cmd, { encoding: 'utf8' }, function (err, result, stderr) {
                fs.readFile(_this.dirpath + '/index.m3u8', function (err, data) {
                    resolve([]);
                });
            });
        });
    };
    //요청에 대해 파일 반환
    HLS.prototype.get_ts_file = function () {
        return Buffer.from([1]);
    };
    //파일제거
    HLS.prototype.remove = function () {
        working_list.splice(working_list.indexOf(this.url), 1);
        this.status = 'end';
        fs.unlinkSync(this.dirpath);
        return true;
    };
    return HLS;
}());
module.exports = HLS;
