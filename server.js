const http = require('http')
const fs = require('fs');
const { Db } = require('./Db');
const port = 6868;
const asset_list = fs.readdirSync('./asset').filter(v=>!fs.lstatSync('./asset/'+v).isDirectory())
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

    function fs_readfile(res, url, encode, file_type, callback){
        console.log('fs_readfile', url)
        var name = url.toString().split('/').reverse()[0]
        if ( name.endsWith('.html')) file_type='text/html; charset=utf-8';
        if ( name.endsWith('.css')) file_type='text/css; charset=utf-8';
        if ( name.endsWith('.js')) file_type='text/javascript; charset=utf-8';
        if ( name.endsWith('.png')) {encode=''; file_type='image/png';}
        
        fs.readFile(url, encode, (err,data)=>{  
            if(err){ 
                console.error('[error] fs_readfile', err, url, encode, file_type)
                res.writeHead(404, {'Content-Type':'text/html; charset=utf-8'});
                res.end('Page Not Found');
            }else{
                if (encode=='utf8') res.writeHead(200, {'Content-Type':file_type});
                else res.writeHead(200, {
                    'Content-Type':file_type,
                    'Content-Length': data.length, 
                    'Accept-Ranges': 'bytes',
                    'Cache-Control':'max-age=86400',//단위는 초
                });
                res.end(data)
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
            data = JSON.parse(data.toString('utf8'))
            console.log(data)

            try{
                var quar_string = '%'+data.body.join('%')+'%'
            }catch{
                _404(res,url,'잘못된 검색값임...')   
                return;
            }
            
            if(['music', 'year', 'genre', 'singer','lyric', 'album'].includes(data.mode))
                Db.get_id_by_search(data.mode, data.body, data.part, (data)=>{
                    //console.log('[get_id_by_search] out]',data?data.length:data)
                    res.writeHead('200', {'Content-Type': 'application/json; charset=utf8'});
                    res.end(JSON.stringify(data))
                })
            // else if (data.mode=='')
            //     Db.get_album_by_search(quar_string,(data)=>{
            //         //console.log('[get_id_by_search] out]',data?data.length:data)
            //         res.writeHead('200', {'Content-Type': 'application/json; charset=utf8'});
            //         res.end(JSON.stringify(data))
            //     })
            else{
                _404(res,url,'잘못된 모드임...')   
                return;
            }
        })
    }
    else if(url_arr[1]=='data') {
        Db.get_url_by_id(Number(url_arr[2]),url=>{
            if(url) fs_readfile(res,url, null, 'audio/mpeg', ()=>{})
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
    else _404(res,url, 'Page Not Found, else;');

})

server.listen(port,()=>{console.log(`Server is running at localhost:${port}`)})

module.exports.port = port;