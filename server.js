const http = require('http')
const fs = require('fs');
const { Db, Db_log } = require('./Db');
const port = 6868;
const asset_list = fs.readdirSync('./asset').filter(v=>!fs.lstatSync('./asset/'+v).isDirectory())
const asset_src_list = fs.readdirSync('./asset/src').filter(v=>!fs.lstatSync('./asset/src/'+v).isDirectory())
const asset_img_list = fs.readdirSync('./asset/img')
//const File_list = require('./File_list.js').File_list
console.log('asset_list',asset_list, asset_img_list)

const server = http.createServer((req,res)=>{
    //console.log(Db)
    const url = req.url;
    const url_arr = req.url.split('/')
    const method = req.method
    if(!['album_img','img'].includes(url_arr[1]))console.log("\x1b[34m"+"\x1b[40m",'[url]',url,"\x1b[37m", url_arr) //파랑파랑

    function _404(res, url, err){
        if(err) console.error('_404 fn err', url, err)
        res.writeHead(404, {'Content-Type':'text/html; charset=utf-8'});
        res.end('404 Page Not Found');
    }

    function fs_readfile(res, url, encode, file_type, callback, range){
        console.log('fs_readfile', url)
        var name = url.toString().split('/').reverse()[0]
        if ( name.endsWith('.html')) file_type='text/html; charset=utf-8';
        if ( name.endsWith('.css')) file_type='text/css; charset=utf-8';
        if ( name.endsWith('.js')) file_type='text/javascript; charset=utf-8';
        if ( name.endsWith('.png')) {encode=''; file_type='image/png';}
        
        fs.stat(url, (err,stats)=>{
            if(err) _404(res,url,'[error] fs_file_not_exist');
            else if (encode=='utf8') { //택스트 파일인 경우
                res.writeHead(200, {'Content-Type':file_type});res.end(fs.readFileSync(url, encode))
            }else{ //바이너리 파일인 경우
                const parts = range==undefined ? undefined : range.replace(/bytes=/, "").replace(/\/([0-9|*]+)$/,'').split("-").map(v=>parseInt(v));
                if(!parts || parts.length!=2 || isNaN(parts[0]) || parts[0]<0 ){
                    res.writeHead(200, {
                        'Content-Type':file_type,
                        'Content-Length': stats.size, 
                        'Accept-Ranges': 'bytes',
                        'Cache-Control':'max-age=3600',//단위는 초
                    });
                    const readStream = fs.createReadStream(url)
                    readStream.pipe(res);
                }else{
                    const start = parts[0];
                    const MAX_CHUNK_SIZE = 1024*1024*8;
                    const end = Math.min(parts[1]<stats.size?parts[1]:stats.size, start+MAX_CHUNK_SIZE)-1
                    console.log('[file-분할전송 - else]',start, end);
                    const readStream = fs.createReadStream(url, {start, end});
                    res.writeHead(206, { //이어진다는 뜻
                        'Content-Type':file_type,
                        'Accept-Ranges': 'bytes',
                        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
                        'Content-Length': stats.size,
                    });
                    //-1 안 하면 다 안받은 걸로 생각하는듯?
                    readStream.pipe(res);
                }
            }

        })
    callback();
    }

    function POST (req, res, callback){
        const data=[];
        req.on('error', () => {callback(undefined) });
        req.on('data', (chunk) => {data.push(chunk) });
        req.on('end', () => { callback(res, Buffer.concat(data)) });
    }

    if(url=='/') fs_readfile(res,'asset/index_v2.html', 'utf8', 'text/html; charset=utf-8', ()=>{})
    else if(asset_list.includes(url_arr[1])) fs_readfile(res,'asset/'+url_arr[1], 'utf8', '', ()=>{})
    else if(url_arr[1]=='img' && asset_img_list.includes(url_arr[2])) fs_readfile(res,'./asset/img/'+url_arr[2], 'utf8', '', ()=>{})
    else if(url_arr[1]=='src' && asset_src_list.includes(url_arr[2])) fs_readfile(res,'./asset/src/'+url_arr[2], 'utf8', '', ()=>{})
    else if(url_arr[1]=='info' && method=='GET') { // 파일 하나
        const id = url_arr[2]
        if (isNaN(id)) {
            _404(res,url,'music id 형식(자연수)가 아님,')   
            return;
        }
        Db.get_info_one(id,(data)=>{
            console.log('[/info]')
            if (!data){
                _404(res,url,"/info 요청됬으나, 없음")
            }else{
                data2 = JSON.parse(JSON.stringify(data))
                data2.albumart = '';//data.albumart?data.albumart.toString('base64'):null
                
                res.writeHead('200', {'Content-Type': 'application/json; charset=utf8'});
                res.end(JSON.stringify(data2))
            }
            return;
        });
        
    } else if(url_arr[1]=='info' && method=='POST') {
        
    }
    else if(url_arr[1]=='search' && method=='POST') {
        console.log('post')
        POST(req,res,(res,data)=>{
            
            try{
                data = JSON.parse(data.toString('utf8'))
                console.log(data)
                var quar_string = '%'+data.body.join('%')+'%'

                if(['music', 'year', 'genre', 'singer','lyric', 'album'].includes(data.mode))
                Db.get_id_by_search(data.mode, data.body, data.part, data.descending, (data)=>{
                    //console.log('[get_id_by_search] out]',data?data.length:data)
                    res.writeHead('200', {'Content-Type': 'application/json; charset=utf8'});
                    res.end(JSON.stringify(data))
                })
                else _404(res,url,'잘못된 모드임...') 

            }catch {_404(res,url,'잘못된 검색값임...')}
        })
    }
    else if(url_arr[1]=='data') {
        Db.get_url_by_id(Number(url_arr[2]),url=>{
            console.log('[req.headers.range]',req.headers.range);
            const range = req.headers.range
            if(url) fs_readfile(res,url, null, 'audio/mpeg', ()=>{}, range)
            else _404(res,url, "/data 주소. 이상한거 요청함..")
        })
    }
    else if (url_arr[1]=='album_img'){
        Db.get_albumart(url_arr[2],(data)=>{
            if (!data){
                
                res.writeHead('302', {
                    'location':'../img/recode.png',
                });
                res.end('')
                return;
            // _404(res, url, null)
            }
            else {
                res.writeHead('200', {'Content-Type': 'image', 'Cache-Control':'max-age=86400'});
                res.end(data)
            }
	
        })
    }
    else if(url_arr[1]=='log') {
        const song_id = Number(url_arr[2])
        if(isNaN(song_id)){_404(res,url,"잘못된 숫자"); return};
        Db.get_info_one_url(song_id,(info)=>{
            if(!info) {_404(res,url,"db에 없는 듯 하다."); return};
            console.log('[server] /log', info.url, song_id, info.name, info.album_name, info.singer)
            Db_log.log(new Date(), info.url, song_id, info.name, info.album_name, info.singer)
            res.writeHead('200', {'Content-Type': 'image'});
            res.end('ok')
        })
    }
    else if(url_arr[1]=='length' && url_arr[2]=='music') {
        Db.get_music_langth((data)=>{
            console.log('[length] out]',data)
            res.writeHead('200', {'Content-Type': 'application/json; charset=utf8'});
            res.end(data.toString())
        })
    }
    else if(url_arr[1]=='refresh'){
        var ans = Db.update_music_all(File_list.file_list)
        res.writeHead('200', {'Content-Type': 'text; charset=utf-8'});
        res.end(ans.toString())
    }
    else if(url_arr[1]=='statistics' && method=='POST'){// 
        POST(req,res,(res,data)=>{
           try{
           data = JSON.parse(data.toString('utf8'))
           console.log(data)
                Db_log.get_data(data.type, (recode)=>{
                    if(!recode){
                        _404(res,url,'잘못된 요청값임...');
                    }else{
                        res.writeHead('200', {'Content-Type': 'application/json; charset=utf8'});
                        recode.forEach(v=>{
                            v.url = v.url.split('\\').splice(-1)[0]
                        })
                        res.end(JSON.stringify(recode))
                    }
                })
            
            }catch {
                _404(res,url,'잘못된 요청값임... c')
            }
        })
    }
    else _404(res,url, 'Page Not Found, else;');

})

server.listen(port,()=>{console.log(`Server is running at localhost:${port}`)})

module.exports.port = port;