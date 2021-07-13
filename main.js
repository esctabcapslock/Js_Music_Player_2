const File_list = require('./File_list.js').File_list
const Db = require('./Db.js').Db
const Db_log = require('./Db.js').Db_log
const http = require('http')
const fs = require('fs')
const port = 80;
const asset_list = fs.readdirSync('./asset')
console.log('asset_list',asset_list)

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
        //console.error('_404 fn err', url, err)
        res.writeHead(404, {'Content-Type':'text/html; charset=utf-8'});
        res.end('404 Page Not Found');
    }

    function fs_readfile(res, url, encode, file_type, callback){
        //console.log('fs_readfile', url)
        var name = url.split('/').reverse()[0]
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
    else if(url_arr[1]=='info') {

    }
    else if(url_arr[1]=='search' && method=='POST') {
        console.log('post')
        POST(req,res,(res,data)=>{
            var data = JSON.parse(data.toString('utf8')).body
            console.log(data)

            try{
                var quar_string = '%'+data.join('%')+'%'
            }catch{
                _404(res,url,'잘못된 검색값임...')   
                return;
            }

            Db.get_id_by_search(quar_string,(data)=>{
                console.log('[get_id_by_search] out]',data)
                res.writeHead('200', {'Content-Type': 'application/json; charset=utf8'});
                res.end(JSON.stringify(data))
            })
    
        })
    }
    else if(url_arr[1]=='data') {
        Db.get_url_by_id(Number(url_arr[2]),url=>{
            fs_readfile(res,url, null, 'audio/mpeg', ()=>{})
        })
    }
    else if(url_arr[1]=='log') {

    }
    else _404(res,url, 'Page Not Found, else;');

})

server.listen(port,()=>{console.log(`Server is running at localhost:${port}`)})