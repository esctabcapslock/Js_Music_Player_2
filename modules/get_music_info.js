const cheerio = require('cheerio') 
const my_https = require('./my_https').my_https
console.time('get')

class Get_music_info{
    constructor(filename, music_name, singer_name, album_name, ){
        this.filename=filename
        this.music_name=music_name
        this.singer_name=singer_name
        this.album_name=album_name

        this.mellon_id = null
        this.album_id = null
        this.lyrics = null
        this.year = null
        this.albumart = null
        this.genre = null

        if (music_name && album_name) this.search_string = `${singer_name} ${music_name}`
        else this.search_string = `${filename.replace(/-/g,'')}`
        console.timeLog('get',this.search_string)
        this.search_string = this.search_string.replace(/\s+/g,' ')

        console.timeLog('get',this.search_string)
    }
    get_music(callback){
        this.callback = callback
        var url = 'https://www.melon.com/search/keyword/index.json?query='+this.search_string
        my_https(url,(data)=>{
            var out = data.toString('utf8')
            var out_json = JSON.parse(out)
            
            if (!out_json.SONGCONTENTS){
                console.log('바로 보내기 실패')

                var url = 'https://www.melon.com/search/song/index.htm?q='+this.search_string.replace(/\s/g,'+')
                console.timeLog('get',url)
                my_https(url,(data)=>{
                    
                    var html_data = data.toString('utf8')
                    var $ = cheerio.load(html_data)
                    kk = $('table tbody tr:first-child a')
                    if(!this.music_name) this.music_name = kk[1].children[0].data // 곡명
                    if(!this.singer_name) this.singer_name = kk[2].children[0].data // 가수명
                    if(!this.album_name) this.album_name = kk[4].children[0].data // 엘범명
                    this.mellon_id = kk[1].attribs.href.split(')')[1].split('(')[1].split(',')[1].replace(/"/g,'') // 주소
                    this.get_lyrics()
                })

            }else{
                console.log(out_json.SONGCONTENTS[0]);
                this.mellon_id = out_json.SONGCONTENTS[0].SONGID;
                this.album_id = out_json.SONGCONTENTS[0].ALBUMID;
                if(!this.music_name) this.music_name = out_json.SONGCONTENTS[0].SONGNAME;
                if(!this.singer_name) this.singer_name = out_json.SONGCONTENTS[0].ARTISTNAME;
                if(!this.album_name) this.album_name = out_json.SONGCONTENTS[0].ALBUMNAME;

                this.get_lyrics(callback)
            }
            
        })
    }
    get_lyrics(callback){
        //console.log(this)
        if (!this.mellon_id) return;
        var url = `https://www.melon.com/song/detail.htm?songId=`+this.mellon_id
        console.timeLog('get',url)
        my_https(url,(data)=>{
            var html_data = data.toString('utf8')
            //console.log(html_data)
            var $ = cheerio.load(html_data)
            this.lyrics = $('#d_video_summary').html().replace(/<br>/g,'\n').replace(/<!--(.*?)-->/g,'').replace(/\t/g,'').trim()
            //console.log(kk)

            this.year = $('.list dd:nth-child(4)').html()
            this.genre = $('.list dd:nth-child(6)').html()

            my_https($('.wrap_info .thumb img')[0].attribs.src, (data)=>{
                console.timeLog('get',data,callback)
                this.albumart = data
                this.callback({
                    music_name:this.music_name,
                    album_name:this.album_name,
                    mellon_id:this.mellon_id,
                    lyrics:this.lyrics,
                    year:this.year,
                    albumart:this.albumart,
                    genre:this.genre
                })
            })
        })
    }
    
}

var kk = new Get_music_info('이문세 - 붉은노을','','이문세','')
//var kk = new Get_music_info(`Beatles - Don't let me down`,'','Beatles','')
kk.get_music(console.log)