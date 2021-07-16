const File_list = require('./File_list.js').File_list
const Db = require('./Db.js').Db
const Db_log = require('./Db.js').Db_log
const http = require('http')
const fs = require('fs')
const port = 80;
const asset_list = fs.readdirSync('./asset')
//console.log('asset_list',asset_list)

Db_log.setting()
File_list.readsetting()
File_list.findfile(()=>{
    Db.isnone((flag)=>{
        console.log('db is none?',flag);
    
        var ins_and_update = ()=>{
            Db.music_insert(File_list.file_list, (updated_urls)=>{
                Db.update_music_all()//updated_urls
            })
        }
    
        if (flag) Db.setting(ins_and_update)
        else ins_and_update()
        
    })
    
    
    console.log('File_list.file_list.length',File_list.file_list.length)

})




const server = http.createServer((req,res)=>{
    const url = req.url;
    const url_arr = req.url.split('/')
    const method = req.method
    console.log('[url]',url)

    function _404(res, url, err){
        console.error('_404 fn err', url, err)
        res.writeHead(404, {'Content-Type':'text/html; charset=utf-8'});
        res.end('404 Page Not Found');
    }

    function fs_readfile(res, url, encode, file_type, callback){
        console.log('fs_readfile', url)
        var name = url.toString().split('/').reverse()[0]
        var url_arr = url.split('/');
        if ( name.endsWith('.html')) file_type='text/html; charset=utf-8';
        if ( name.endsWith('.css')) file_type='text/css; charset=utf-8';
        if ( name.endsWith('.js')) file_type='text/javascript; charset=utf-8';
        
        fs.readFile(url, encode, (err,data)=>{
            if(err){ 
                console.error('[error] fs_readfile', err, url, encode, file_type)
                res.writeHead(404, {'Content-Type':'text/html; charset=utf-8'});
                res.end('Page Not Found');
            }else{
                if (encode=='utf8') res.writeHead(200, {'Content-Type':file_type});
                else res.writeHead(200, {'Content-Type':file_type, 'Content-Length': data.length});
                res.end(data)
            }
        })
    callback();
    }

    function POST (req, res, callback){
        var data=[];
        req.on('error', () => {callback(undefined) });
        req.on('data', (chunk) => {data.push(chunk) });
        req.on('end', () => { callback(res, Buffer.concat(data)) });
    }

    if(url=='/') fs_readfile(res,'asset/index.html', 'utf8', 'text/html; charset=utf-8', ()=>{})
    else if(asset_list.includes(url_arr[1])) fs_readfile(res,'asset/'+url_arr[1], 'utf8', '', ()=>{})
    else if(url_arr[1]=='info' && method=='GET') { // 파일 하나
        var id = url_arr[2]
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
            var data = JSON.parse(data.toString('utf8'))
            console.log(data)

            try{
                var quar_string = '%'+data.body.join('%')+'%'
            }catch{
                _404(res,url,'잘못된 검색값임...')   
                return;
            }
            
            if(data.mode=='music')
                Db.get_id_by_search(quar_string,(data)=>{
                    console.log('[get_id_by_search] out]',data?data.length:data)
                    res.writeHead('200', {'Content-Type': 'application/json; charset=utf8'});
                    res.end(JSON.stringify(data))
                })
            else if (data.mode=='album')
                Db.get_album_by_search(quar_string,(data)=>{
                    console.log('[get_id_by_search] out]',data?data.length:data)
                    res.writeHead('200', {'Content-Type': 'application/json; charset=utf8'});
                    res.end(JSON.stringify(data))
                })
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
            if (!data) _404(res, url, "엘범아트 없음")
            else {
                res.writeHead('200', {'Content-Type': 'image'});
                res.end(data)
            }
	
        })
    }
    else if(url_arr[1]=='log') {

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