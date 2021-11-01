const http = require('http')
const fs = require('fs');
const { Db, Db_log } = require('./Db');
const port = 6868;
const asset_list = fs.readdirSync('./asset').filter(v => !fs.lstatSync('./asset/' + v).isDirectory())
const asset_src_list = fs.readdirSync('./asset/src').filter(v => !fs.lstatSync('./asset/src/' + v).isDirectory())
const asset_img_list = fs.readdirSync('./asset/img')
//const File_list = require('./File_list.js').File_list
console.log('asset_list', asset_list, asset_img_list)

// const HLS_manage = require('./modules/my_hls')
// const hls_manage = new HLS_manage();
const Mp3_split_manage = require('./modules/mp3_split')
const mp3_split_manage = new Mp3_split_manage()

const server = http.createServer((req, res) => {
    //console.log(Db)
    const url = req.url;
    const url_arr = req.url.split('/')
    const method = req.method
    if (!['album_img', 'img'].includes(url_arr[1])) console.log("\x1b[34m" + "\x1b[40m", '[url]', url, "\x1b[37m", url_arr) //파랑파랑

    function _404(res, url, err) {
        if (err) console.error('_404 fn err', url, err)
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('404 Page Not Found');
    }

    function fs_readfile(res, url, encode, file_type, callback, range) {
        console.log('fs_readfile', url)
        var name = url.toString().split('/').reverse()[0]
        if (name.endsWith('.html')) file_type = 'text/html; charset=utf-8';
        if (name.endsWith('.css')) file_type = 'text/css; charset=utf-8';
        if (name.endsWith('.js')) file_type = 'text/javascript; charset=utf-8';
        if (name.endsWith('.png')) { encode = ''; file_type = 'image/png'; }
        if (name.endsWith('.ts')) { encode = ''; file_type = 'application/octet-stream'; }

        fs.stat(url, (err, stats) => {
            if (err) _404(res, url, '[error] fs_file_not_exist');
            else if (encode == 'utf8') { //택스트 파일인 경우
                res.writeHead(200, { 'Content-Type': file_type }); res.end(fs.readFileSync(url, encode))
            } else { //바이너리 파일인 경우
                const parts = range == undefined ? undefined : range.replace(/bytes=/, "").replace(/\/([0-9|*]+)$/, '').split("-").map(v => parseInt(v));
                if (!parts || parts.length != 2 || isNaN(parts[0]) || parts[0] < 0) {
                    res.writeHead(200, {
                        'Content-Type': file_type,
                        'Content-Length': stats.size,
                        'Accept-Ranges': 'bytes',
                        'Cache-Control': 'max-age=3600',//단위는 초
                    });
                    const readStream = fs.createReadStream(url)
                    readStream.pipe(res);
                } else {
                    const start = parts[0];
                    const MAX_CHUNK_SIZE = 1024 * 1024 * 8;
                    const end = Math.min((parts[1] < stats.size - 1) ? parts[1] : stats.size - 1, start + MAX_CHUNK_SIZE - 1)
                    console.log('[file-분할전송 - else]', start, end, '크기:', stats.size, parts);
                    const readStream = fs.createReadStream(url, { start, end });
                    res.writeHead((end == stats.size) ? 206 : 206, { //이어진다는 뜻
                        'Content-Type': file_type,
                        'Accept-Ranges': 'bytes',
                        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
                        'Content-Length': end - start + 1,
                    });
                    //-1 안 하면 다 안받은 걸로 생각하는듯?
                    readStream.pipe(res);
                }
            }

        })
        callback();
    }

    function POST(req, res, callback) {
        const data = [];
        req.on('error', () => { callback(undefined) });
        req.on('data', (chunk) => { data.push(chunk) });
        req.on('end', () => { callback(res, Buffer.concat(data)) });
    }

    if (url == '/') fs_readfile(res, 'asset/index_v2.html', 'utf8', 'text/html; charset=utf-8', () => { })
    else if (asset_list.includes(url_arr[1])) fs_readfile(res, 'asset/' + url_arr[1], 'utf8', '', () => { })
    else if (url_arr[1] == 'img' && asset_img_list.includes(url_arr[2])) fs_readfile(res, './asset/img/' + url_arr[2], 'utf8', '', () => { })
    else if (url_arr[1] == 'src' && asset_src_list.includes(url_arr[2])) fs_readfile(res, './asset/src/' + url_arr[2], 'utf8', '', () => { })
    else if (url_arr[1] == 'info' && method == 'GET') { // 파일 하나
        const id = url_arr[2]
        if (isNaN(id)) {
            _404(res, url, 'music id 형식(자연수)가 아님,')
            return;
        }
        Db.get_info_one(id, true, false, (data) => {
            console.log('[/info]')
            if (!data) {
                _404(res, url, "/info 요청됬으나, 없음")
            } else {
                data2 = JSON.parse(JSON.stringify(data))
                data2.albumart = '';//data.albumart?data.albumart.toString('base64'):null

                res.writeHead('200', { 'Content-Type': 'application/json; charset=utf8' });
                res.end(JSON.stringify(data2))
            }
            return;
        });

    } else if (url_arr[1] == 'info' && method == 'POST') {

    }
    else if (url_arr[1] == 'search' && method == 'POST') {
        console.log('post')
        POST(req, res, (res, data) => {

            try {
                data = JSON.parse(data.toString('utf8'))
                console.log(data)
                var quar_string = '%' + data.body.join('%') + '%'

                if (['music', 'year', 'genre', 'singer', 'lyric', 'album'].includes(data.mode))
                    Db.get_id_by_search(data.mode, data.body, data.part, data.descending, (data) => {
                        //console.log('[get_id_by_search] out]',data?data.length:data)
                        res.writeHead('200', { 'Content-Type': 'application/json; charset=utf8' });
                        res.end(JSON.stringify(data))
                    })
                else _404(res, url, '잘못된 모드임...')

            } catch { _404(res, url, '잘못된 검색값임...') }
        })
    }
    else if (url_arr[1] == 'data') {
        Db.get_url_by_id(Number(url_arr[2]), url => {
            console.log('[req.headers.range]', req.headers.range);
            const range = req.headers.range
            if (url) fs_readfile(res, url, null, 'audio/mpeg', () => { }, range)
            else _404(res, url, "/data 주소. 이상한거 요청함..")
        })
    }
    else if (url_arr[1] == 'album_img') {
        Db.get_albumart(url_arr[2], (data) => {
            if (!data) {

                res.writeHead('302', {
                    'location': '../img/recode.png',
                });
                res.end('')
                return;
                // _404(res, url, null)
            }
            else {
                res.writeHead('200', { 'Content-Type': 'image', 'Cache-Control': 'max-age=86400' });
                res.end(data)
            }

        })
    }
    else if (url_arr[1] == 'log') {
        const song_id = Number(url_arr[2])
        if (isNaN(song_id)) { _404(res, url, "잘못된 숫자"); return };
        Db.get_info_one(song_id, false,false,  (info) => {
            if (!info) { _404(res, url, "db에 없는 듯 하다."); return };
            console.log('[server] /log', info.url, song_id, info.name, info.album_name, info.singer)
            Db_log.log(info.url, song_id)//info.name, info.album_name, info.singer
            res.writeHead('200', { 'Content-Type': 'image' });
            res.end('ok')
        })
    }
    else if (url_arr[1] == 'length' && url_arr[2] == 'music') {
        Db.get_music_langth((data) => {
            console.log('[length] out]', data)
            res.writeHead('200', { 'Content-Type': 'application/json; charset=utf8' });
            res.end(data.toString())
        })
    }
    else if (url_arr[1] == 'refresh') {
        var ans = Db.update_music_all(File_list.file_list)
        res.writeHead('200', { 'Content-Type': 'text; charset=utf-8' });
        res.end(ans.toString())
    }
    else if (url_arr[1] == 'statistics' && method == 'POST') {// 
        POST(req, res, (res, data) => {
            try {
                data = JSON.parse(data.toString('utf8'))
                console.log(data)
                Db_log.get_data(data.type, (recode) => {
                    if (!recode) {
                        _404(res, url, '잘못된 요청값임...');
                    } else {
                        res.writeHead('200', { 'Content-Type': 'application/json; charset=utf8' });
                        recode.forEach(v => {
                            v.url = v.url.split('\\').splice(-1)[0]
                        })
                        res.end(JSON.stringify(recode))
                    }
                })

            } catch {
                _404(res, url, '잘못된 요청값임... c')
            }
        })
    } else if (url_arr[1] == 'stream' && method == 'POST') { //스트리밍 관련 처리하기!
        POST(req, res, (res, data) => {
            try {data = JSON.parse(data.toString('utf8'))}
            catch { _404(res, url, '잘못된 요청값임... c');return;}
            console.log('[server > stream > POST]',data);

            if(!data.music_id || isNaN(data.music_id)){_404(res,url,'이상한 번호임'); return;}
            Db.get_info_one(data.music_id, false, true, (d) => {
                //console.log('2345678 - f항ㄹ')
                if (!d || !d.url) { _404(res, url, '없는 음악 파일임'); return;}
                const file_url = d.url;
                if (data.type == 'create') {
                    const r =  mp3_split_manage.add_mp3(file_url, (index) => {
                        console.log('[server > stream > mp3_split_manage.add_HLS]',index)
                        if (!index) {_404(res, url, '뭔가 이상함'); return;}
                        res.writeHead('200', { 'Content-Type': 'application/json; charset=utf8' });
                        res.end(JSON.stringify(index))
                        return;
                    }, (d) => {
                        console.log('[server > stream > mp3_split_manage.add_HLS] created',d.m3u8.length)
                    })
                    if(r==false){
                        const m3u8_data = mp3_split_manage.get_m3u8(file_url)
                        if(!m3u8_data){_404(res, url, '뭔가 이상함'); return}
                        res.writeHead('200', { 'Content-Type': 'application/json; charset=utf8' });
                        res.end(JSON.stringify(m3u8_data))
                    }
                }
                else if (data.type == 'get_m3u8') {
                    const m3u8_data = mp3_split_manage.get_m3u8(file_url)
                    if(!m3u8_data){_404(res, url, '뭔가 이상함');return;}
                    res.writeHead('200', { 'Content-Type': 'application/json; charset=utf8' });
                    res.end(JSON.stringify(m3u8_data))
                }
                else if (data.type == 'get_ts') {
                    if(isNaN(data.index) || data.index<0) {_404(res,url, "이상한 요청임ㄷㄷ"); return;}
                    const mp3_data = mp3_split_manage.get_mp3(file_url,Number(data.index))
                    if(!mp3_data) {_404(res,url, "ts_url -> 주소 없음"); return;}
                    res.writeHead('200', { 'Content-Type': 'application/octet-stream', 'Content-Length': mp3_data.length, 'Cache-Control': 'max-age=86400'})//단위는 초 });
                    res.end(mp3_data)
                }
                else { _404(res, url, '잘못된 타입이 요청됨!')}
            })
        })
    }
    else _404(res, url, 'Page Not Found, else;');

})

server.listen(port, () => { console.log(`Server is running at localhost:${port}`) })

module.exports.port = port;