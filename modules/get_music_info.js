const cheerio = require('cheerio') 
const my_https = require('./my_https').my_https
console.time('get')



class Get_music_info{
    gettitle(x,괄호도제거해){
        function 괄호(str,gal){let out='', c=0;
        for(let i=-1; str[++i];){
        if(str[i]==gal[1]){if(c%2) c++;}
        else if(str[i]==gal[0]){if(!(c%2)) c++}
        else{if(!(c%2)) out+=str[i]}
        } return out} //괄호 제거
        
        x= x.replace(/<span>/g,"").replace(/<\/span>/g,"").replace(/"01\."/g, '').replace(/02\./g, '').replace(/03\./g, '').replace(/04\./g, '').replace(/05\./g, '').replace(/06\./g, '').replace(/07\./g, '').replace(/08\./g, '').replace(/09\./g, '').replace(/10\./g, '').replace(/11\./g, '').replace(/12\./g, '').replace(/13\./g, '').replace(/14\./g, '').replace(/1집/g, '').replace(/2집/g, '').replace(/3집/g, '').replace(/4집/g, '').replace(/5집/g, '').replace(/6집/g, '')
        //return 괄호도제거해 ? x.replace(/\(.*\)/gi, '').replace(/\[.*\]/gi, '') : x;
        return (괄호도제거해 ? 괄호(괄호(x,'()'),'[]') : x).replace(/\s+/g, ' ');
    }

    constructor(filename, music_name, singer_name, album_name, ){
        console.log('[Get_music_info]' ,filename, music_name, singer_name, album_name)
        this.filename=filename
        this.music_name=music_name
        this.singer=singer_name?[singer_name]:[]
        this.singer_name=singer_name
        this.album_name=album_name

        this.mellon_id = null
        this.album_id = null
        this.lyric = null
        this.year = null
        this.albumart = null
        this.genre = null

        if (music_name && album_name) this.search_string = `${singer_name} ${music_name}`
        else this.search_string = `${filename.replace(/-/g,'')}`
        console.timeLog('get',this.search_string)
        this.search_string = this.gettitle(this.search_string.replace(/\s+/g,' '),true)

        console.timeLog('get',this.search_string)
    }
    get_music(callback){
        this.callback = callback
        //var url = 'https://www.melon.com/search/keyword/index.json?query='+this.search_string
        //console.timeLog('get','1',url)
        //my_https(url,(data)=>{
            //var out = data.toString('utf8')
            //var out_json = JSON.parse(out)
            
            //if (!out_json.SONGCONTENTS || !out_json.SONGCONTENTS[0]){
                //console.log('바로 보내기 실패')

                const url = 'https://www.melon.com/search/song/index.htm?q='+this.search_string.replace(/\s/g,'+')
                console.timeLog('get','2',url)
                my_https(url,(data)=>{
                    if(!data){callback(undefined); return;} // 네트워크 연결 오류시 해결.

                    const html_data = data.toString('utf8')
                    
                    const $ = cheerio.load(html_data)
                    var kk = $('table tbody tr:first-child td')
                    if (!kk.html()){
                        console.log('검색 실패!')
                        this.callback(null)
                        return;
                    }
                    var m = $('table > tbody tr:first-child a').eq(0)
                    var name = m.text()
                    name = name.substr(0,name.length-' 상세정보 페이지 이동'.length)

                    var js = m[0].attribs.href

                    var m = $('table > tbody tr:first-child td #artistName').eq(0)
                    var ch = m.children()
                    var singer=[]
                    if (ch.length==1) {
                        singer.push(ch[0].children[0].data)
                    }
                    
                    else {
                        for (var i=0; i<ch.length; i++){
                            if (ch[i].name == 'a'){
                                singer.push(ch[i].children[0].data)
                            }
                        }
                    }
                    
                    var m = $('table > tbody tr:first-child td:nth-child(5) .ellipsis').eq(0)
                    var album = m.text().trim()
                    /*
                    console.log('kk',kk.html())
                    if(!this.music_name) this.music_name =   kk[1].children[0].data // 곡명
                    if(!this.singer_name) this.singer_name = kk[2].children[0].data // 가수명
                    if(!this.album_name) this.album_name =   kk[4].children[0].data // 엘범명
                    this.mellon_id = kk[1].attribs.href.split(')')[1].split('(')[1].split(',')[1].replace(/"/g,'') // 주소
                    this.get_lyric()
                    */

                    if(!this.music_name) this.music_name = name // 곡명
                    if(!this.singer[0])  this.singer     = singer // 가수명
                    if(!this.album_name) this.album_name = album // 엘범명
                    console.log('js',js)
                    //this.mellon_id = js.split(')')[1].split('(')[1].split(',')[1].replace(/"/g,'') // 주소
                    this.mellon_id = js.split(')')[1].split('(')[1].replace(/'/g,'')//js.split(')')[1].split('(')[1].split(',')[1].replace(/"/g,'') // 주소
                    this.get_lyric()
                })

            //}else{
            //    //console.log(out_json.SONGCONTENTS[0]);
            //    this.mellon_id = out_json.SONGCONTENTS[0].SONGID;
            //    this.album_id = out_json.SONGCONTENTS[0].ALBUMID;
            //    if(!this.music_name) this.music_name = out_json.SONGCONTENTS[0].SONGNAME;
            //    if(!this.singer.length) this.singer = [out_json.SONGCONTENTS[0].ARTISTNAME];
            //    if(!this.album_name) this.album_name = out_json.SONGCONTENTS[0].ALBUMNAME;
            //
            //    this.get_lyric(callback)
            //}
            
        //})
    }
    get_lyric(callback){
        //console.log(this)
        if (!this.mellon_id) return;
        const url = `https://www.melon.com/song/detail.htm?songId=`+this.mellon_id
        console.timeLog('get',url)
        my_https(url,(data)=>{
            const html_data = data.toString('utf8')
            //console.log(html_data)
            const $ = cheerio.load(html_data)
            this.lyric = $('#d_video_summary').html()
            if(this.lyric) this.lyric = this.lyric.replace(/<br>/g,'\n').replace(/<!--(.*?)-->/g,'').replace(/\t/g,'')
            .replace(/&amp;/gi,"&")
            .replace(/&lt;/gi,"<")
            .replace(/&gt;/gi,">")
            //console.log(kk)

            this.year = $('.list dd:nth-child(4)').html()
            this.genre = $('.list dd:nth-child(6)').html().replace(/&amp;/gi,"&")
            //console.log(`$('.wrap_info .thumb img')[0].attribs.src`,$('.wrap_info .thumb img')[0].attribs.src)
            my_https($('.wrap_info .thumb img')[0].attribs.src, (data)=>{
                //console.timeLog('get',callback)
                this.albumart = data
                this.callback({
                    music_name:this.music_name,
                    singer:this.singer,
                    album_name:this.album_name,
                    mellon_id:this.mellon_id,
                    lyric:this.lyric,
                    year:this.year,
                    albumart:this.albumart,
                    genre:this.genre
                })
            })
        })
    }
    
}

//var kk = new Get_music_info('이문세 - 붉은노을','','이문세','')
//var kk = new Get_music_info(`Beatles - Don't let me down`,'','Beatles','')
//kk.get_music(console.log)

module.exports.Get_music_info = Get_music_info