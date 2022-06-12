const  sqlite3 = require('sqlite3').verbose();
const fs = require('fs')
const ID3v2_parse = require("./modules/ID3v2_parse").ID3v2_parse;
const MP3_parse = require("./modules/Mp3_parse").Mp3_parse;
const Crypto = require('crypto')
const MD5 = (data)=>Crypto.createHash('md5').update(data).digest('base64').toString()//require('./modules/md5');
const Get_music_info = require('./modules/get_music_info').Get_music_info
var mylog;

//db 폴더 없음 대비
if(!fs.existsSync('./db')) fs.mkdirSync('./db');
//로그 파일은 안정성을 위해서, 따로 보관.!
//전역변수로 설정!

////전역변수로 설정!
Db = {
    setlog:(logfn)=>{mylog = logfn},
    db: new sqlite3.Database('db/music_data.db'),
    isnone:(callback)=>{
        Db.db.serialize(()=>{

            Db.db.all("select name from sqlite_master where type='table'",  (err, tables)=>{
                callback(!tables.length)
            });
            /*
            Db.db.all("SELECT *", function(err, rows) {
                rows.forEach(function (row) {
                    mylog(row);
                })
            });	*/

        })
    },
    setting:(callback)=>{
        Db.db.serialize(()=>{

            Db.db.run("CREATE TABLE music (\
            id integer primary key autoincrement,\
            md5 TINYTEXT(11),\
            url TEXT NOT NULL,\
            file_name TEXT  NOT NULL,\
            name TEXT ,\
            melon_id INT(11),\
            album_id INT(11),\
            year INT(11),\
            lyric TEXT(11),\
            track INT(11),\
            genre TEXT(11),\
            file_len INT(11),\
            duration INT(11),\
            frequency INT(11),\
            blank_start INT(11),\
            blank_end INT(11)\
            );")
            // 
            
            Db.db.run("CREATE TABLE singer (\
                id integer primary key autoincrement,\
                name TEXT NOT NULL\
            );")
                
            Db.db.run("CREATE TABLE album (\
                id integer primary key autoincrement,\
                name TEXT NOT NULL,\
                melon_id INT(11),\
                genre TEXT(11),\
                year INT(11),\
                albumart LONGBLOB\
            );")

            Db.db.run("CREATE TABLE music_singer_map (\
                music_id INT(11) NOT NULL,\
                singer_id INT(11) NOT NULL,\
                PRIMARY KEY(music_id, singer_id)\
            );")

            Db.db.run("CREATE TABLE album_singer_map (\
                album_id INT(11) NOT NULL,\
                singer_id INT(11) NOT NULL,\
                PRIMARY KEY(album_id, singer_id)\
            );")
                
                
            // 필요 없는 것
            Db.db.run("CREATE TABLE album_music_map (\
                album_id INT(11) NOT NULL,\
                music_id INT(11) NOT NULL,\
                PRIMARY KEY(album_id, music_id)\
            );")

            callback()
        });

    },
    //음악이 존재하면 넣고, 아니면 없에고 등등 일 하기
    music_insert:async (url_list,callback)=>{
        //var updated_urls = []
        const sql_quary = `SELECT id,url,md5 FROM music;`
        console.log('[music_insert], url_list.length',url_list.length,url_list[0],sql_quary)
        Db.db.all(sql_quary,  async (err, data)=>{
            const exist_md5 = data.map(v=>v.md5)
            const exist_urls = data.map(v=>v.url)

            const new_file_urls = url_list.filter(url=>!exist_urls.includes(url)) //새롭게 추가된 파일의 주소
            const no_exist_file = data.filter(v=>!url_list.includes(v.url)) //더 이상 없는 파일들
            
            mylog('[music_insert] 파일 목록을 받아옴')
            for (let url of new_file_urls){
            //Promise.all(new_file_urls.map(url=>new Promise((resolve,rejects)=>{
                //새 주소의 파일이, 이미 존재하는 파일과 중복되는지 확인
                const md5 = MD5(fs.readFileSync(url))
                if(exist_md5.includes(md5)){
                    //기존의 파일이 새 파일로 옮겨진 것이다.
                    const exist_file = data[exist_md5.indexOf(md5)];
                    mylog('[music_insert] > 중복확인 > 옮김파일',exist_file.url, '=>', url)
                    //기존 파일은, 더 이상 없는 목록에서 삭제하자.
                    for(let i in no_exist_file){
                        if(no_exist_file[i].url == exist_file.url){
                            no_exist_file.splice(i,1);
                            break;
                        }
                    }
                    //새 주소로 업데이트하자.
                    const file_name = url.split('\\').splice(-1)[0].replace(/.mp3/,'')
                    const sql_quary = 'UPDATE music SET url=$url, file_name=$file_name WHERE id=$id;'
                    Db.db.run(sql_quary,{$id:exist_file.id,$url:url,$file_name:file_name},err=>err?console.log(err):'');// rejects(err):resolve());
                }else{
                    //신규 파일이다.
                    mylog('[music_insert] > 중복확인 > 신규파일',url)
                    try{await Db.insert_music_by_url(url)}
                    catch(err){console.log('errer at 신규 파일 추가, err:',err)}
                }

            //    })
            }
            //)).then(()=>{
            //존재하지 않은 파일을 삭제
            mylog('[music_insert] 존재하지 않은 파일을 삭제','no_exist_file',no_exist_file)
            //Promise.all(no_exist_file.map(d=>new Promise((resolve,rejects)=>{
            for(let d of no_exist_file){
                try{await new Promise(async resolve=>this.Db.get_info_one(d.id, false, true, data=>{
                    mylog('[music_insert] > 파일삭제 > 정보 받아옴', d,data)
                    this.Db.music_delete_by_id(data.music_id)
                    this.Db_log.update_deleted_music(data.music_id, data.url, data.album_id, data.album , data.year, data.name, data.singer, data.genre, data.duration, data.frequency, ()=>{
                        resolve()
                    })
                }))
                }catch(err){console.log('[오류임. 더 이상 진행할 수 없음]',err)}
            }
            //}))).then(()=>{
            callback()
            //})

            //}).catch((err)=>{
            //    
            //})
            


            // mylog('[들어있는 목록]',exits_urls[0], exits_urls.length)
            // let url_list_callback_cnt = 0
            // let url_list_callback_len = url_list.length

            // //없는 파일은 삭제하기.
            // exits_urls.forEach(url=>{
            //     if(url && !url_list.includes(url)){
            //         this.Db.db.music_delete_by_url(url)
            //     }
            // })
            
            // url_list.forEach(_url=>{
            //     if (exits_urls.includes(_url)){
            //         url_list_callback_len--;

            //         if (!url_list_callback_len) callback(updated_urls)
            //         return;
            //     } 
            //     //if ( _url.includes('\'') || _url.includes('\"') || _url.includes('\`') ) return;
            //     updated_urls.push(_url)
            //     var tmp = _url.split('\\')
            //     var file_name = tmp[tmp.length-1].replace(/.mp3/,'')
            //     var sql_quary = `INSERT INTO music (url, file_name) VALUES ($_url, $file_name );`
            //     //mylog('music_insert - sql_quary',sql_quary,_url)
            //     Db.db.run(sql_quary, {$_url:_url, $file_name:file_name}, ()=>{
            //         url_list_callback_cnt++;
            //         //mylog(url_list_callback_cnt,url_list_callback_len)
            //         if (url_list_callback_cnt==url_list_callback_len) callback(updated_urls)
                    
            //     });  
            // })
            //callback()
    }); 
    },
    music_delete_by_id:(id)=>{return new Promise(async (resolve,rejects)=>{
        //this.Db.db.all(`SELECT id FROM music WHERE url=$url ;`,{$url:url},(err,ids)=>{
           // var id = ids[0].id
            if(isNaN(id)) {rejects('id가 유효하지 않음, id:',id); return;}
            this.Db.db.serialize(()=>{
                console.log('[삭제됩니다!] id=',id,
                `DELETE FROM music WHERE id="${id}" ;\n`,
                `DELETE FROM music_singer_map WHERE music_id="${id}" ;`,
                `DELETE FROM album_music_map WHERE music_id="${id}" ;`)
                this.Db.db.run(`DELETE FROM music            WHERE id=${id} ;`)
                this.Db.db.run(`DELETE FROM music_singer_map WHERE music_id=${id};`)
                this.Db.db.run(`DELETE FROM album_music_map  WHERE music_id=${id} ;`)
                resolve()
            })
            //})
    })},
    insert_music_by_url: (url)=>{return new Promise(async (resolve,rejects)=>{
        if(typeof url != typeof 'a') {rejects('[Db > insert_music_by_url > url 타입 오류]');  return;}
        const file_name = url.split('\\').splice(-1)[0].replace(/.mp3/,'')

        const sql_quary = `INSERT INTO music (url, file_name) VALUES ($url, $file_name );`
        Db.db.run(sql_quary, {$url:url, $file_name:file_name}, async ()=>{
            await this.Db.upadte_music(url, undefined)
            resolve()
    })})},
    update_music_all:async (list)=>{//list가 없으면 이상한 음악을 모두 손 봐주겠다. list가 들어오면, list의 음악만 손 봐주겠다. 리스트는 string[]으로// url로 구성
        if(this.Db.update_music_all_play) return false;
        this.Db.update_music_all_play = true;

        if(!list){
            const sql_quary = 'SELECT url, md5 FROM music WHERE md5 IS NULL;'//WHERE name IS NULL
            Db.db.all(sql_quary,  (err, data)=>{
                if(!Array.isArray(data)) return;
                (async(data)=>{
                    for(let file_data of data){
                        mylog('[for / let file_data of data]...', url)
                        await this.Db.upadte_music(file_data.url, file_data)
                    }
                })(data);
                
            })
        }else{
            mylog('[update_music_all] [list]',list.length);
            (async(list)=>{
                for(let url of list){
                    //mylog('[for / let url of list]...', url);
                    await new Promise(res=>{
                        const sql_quary = `SELECT * FROM music WHERE url=$url ;`
                        Db.db.all(sql_quary,{$url:url},async (err, data)=>{
                            await this.Db.upadte_music(url,data[0],()=>{})
                            res();
                        })
                    }) 
                }
            })(list);
            return true;
        }

        this.Db.update_music_all_play = false
        return;
/*
        if(this.Db.update_music_all_paly) return false;

        this.Db.update_music_all_paly = true;
        console.log('[update_music_all]')
        var cnt = 0

        if (!list){
            var sql_quary = 'SELECT url FROM music WHERE md5 IS NULL;'//WHERE name IS NULL
            Db.db.all(sql_quary,  (err, exits_urls)=>{
                exits_urls = exits_urls.map(v=>v.url)
                mylog('[exits_urls]',exits_urls.length,exits_urls.slice(0,3))
                
                Db.setint = setInterval(() => {
                    if (cnt>=exits_urls.length){
                        mylog('out - setinderver')
                        this.Db.update_music_all_paly = false;
                        clearInterval(Db.setint);
                    }else{
                        var url = exits_urls[cnt]
                        var sql_quary = `SELECT * FROM music WHERE url=$url ;`
                        mylog('[update_music_all > setInterval] > sql_quary',sql_quary, url)
                        Db.db.all(sql_quary,{$url:url},(err, data)=>{this.Db.upadte_music(url,data?data[0]:data,()=>{})})
                    }
                    cnt++;
                    //중복방지용 무언가 필요함1
                }, 50);
            })
            return true;
        }else{
            mylog('[update_music_all] [list]',list.length)

            list.forEach(url=>{
                var sql_quary = `SELECT * FROM music WHERE url=$url ;`
                Db.db.all(sql_quary,{$url:url},(err, data)=>{this.Db.upadte_music(url,data[0],()=>{})})
            })
            this.Db.update_music_all_paly = false;
            return true;
        }*/
    },
    upadte_music:(url,data)=>{ return new Promise(resolve=>{
        if(!fs.existsSync(url)) {console.log('[upadte_music] 없는 파일 url:',url); resolve(); return;}

        const file = fs.readFileSync(url);
        const md5 = MD5(file)
        if (data && data.md5 == md5) {resolve();return;}
        mylog('[upadte_music] is...',url)
        let dru = {};
        try{dru=MP3_parse(file)}catch(err){
            console.log('[upadte_music] [error]',err);
            dru =  {
                file_len:null,
                duration:null,
                frequency:null,
                s:0,
                e:0,
            };
        }
        const id3 = ID3v2_parse(file)
        
        const [제목, 가수, 엘범, 트렉, 연도, 장르, 엘범아트, 가사] = [id3.제목, id3.가수, id3.엘범, id3.트렉, id3.연도, id3.장르, id3.엘범아트,  id3.가사]
        
        //if ((!제목 || 제목 == data.name) && !가수.length && !엘범) return;
        //mylog('[upadte_music st]',url.split('\\')[url.split('\\').length-1],제목, 가수, 엘범, 트렉, 연도, 장르)
        
        this.Db.db.serialize(()=>{
            const sql_quary = `UPDATE music SET file_len=$file_len, duration=$duration, frequency=$frequency, blank_start=$start, blank_end=$end WHERE url=$url ;`
            //mylog('[upadte_music] - DB IN > sql_quary',url, sql_quary)
            Db.db.run(sql_quary,{
                $file_len:dru.file_len,
                $duration:dru.duration?dru.duration:null,
                $frequency:dru.frequency?dru.frequency:null,
                $start:dru.s==undefined?null:dru.s,
                $end:dru.e==undefined?null:dru.e,
                $url:url,
            });

            var melon_album_id, melon_music_id;

            if (제목 && id3.가수 && 엘범 && 가사 && 트렉 && 연도 && 장르 && 엘범아트){
            }else{/*id3 = 멜론*/}

            const sql_quary_2 = `SELECT id FROM music WHERE url=$url;`
            //mylog('[upadte_music] => sql_quary',sql_quary)
            Db.db.all(sql_quary_2,  {$url:url}, (err, ids)=>{
                if (!ids){
                    console.error('[upadte_music] - id 목찾음 !',url, ids)
                    resolve();
                    return;
                }
                const id = ids[0].id
                //console.log(id3)
                Db.update_singer(id, id3.가수)
                Db.update_album(id, 가수, 엘범, 연도, 장르, 엘범아트, melon_album_id,(album_id)=>{
                    //mylog('[upadte_music end]',url,album_id,'md5', md5)
                    if(!isNaN(id)){
                        if(제목)     Db.db.run(`UPDATE music SET name=$name         WHERE id=${id}`, {$name:제목});
                        if(album_id) Db.db.run(`UPDATE music SET album_id=$album_id WHERE id=${id}`, {$album_id:album_id});
                        if(가사)     Db.db.run(`UPDATE music SET lyric=$lyric       WHERE id=${id}`, {$lyric:가사});
                        if(장르)     Db.db.run(`UPDATE music SET genre=$genre       WHERE id=${id}`, {$genre:장르});
                        if(연도)     Db.db.run(`UPDATE music SET year=$year         WHERE id=${id}`, {$year:연도});
                        if(트렉)     Db.db.run(`UPDATE music SET track=$track       WHERE id=${id}`, {$track:트렉});
                        if(md5)      Db.db.run(`UPDATE music SET md5=$md5           WHERE id=${id}`, {$md5:md5});
                    }
                    resolve();
                })
            })
        })

    })},update_singer:(music_id, singers)=>{
        if (!singers || !singers[0]) return
        mylog('[fn | update_singer]',music_id, singers)
        singers.forEach(singer_name=>{
        //mylog('이 곡과 관련된 곡 정보를 새로 쓸 것이다.', music_id, singers)
        //이 곡과 관련된 곡 정보를 새로 쓸 것이다.
        //싹 다 초기화 후, 다시 작성한다.
            this.Db.db.all('SELECT * FROM music_singer_map WHERE music_id=$music_id;',{$music_id:music_id}, (err,data)=>{this.Db.db.serialize(()=>{
                if(err) return;

                for(let d of data){
                    const  singer_id_tmp = d.singer_id
                    const  music_id_tmp = d.music_id

                    mylog('삭제된 영역으로 옮긴다!', singer_id_tmp, music_id_tmp)
                    //삭제된 영역으로 옮긴다!
                    Db.db.run(`DELETE FROM music_singer_map WHERE music_id=$song_id AND singer_id=$singer_id`,{$song_id:music_id_tmp, $singer_id:singer_id_tmp});
                    Db_log.db.all(`INSERT OR REPLACE INTO deleted_music_singer_map (music_id, singer_id) VALUES ($music_id, $singer_id)`,{$music_id:music_id_tmp,$singer_id:singer_id_tmp})

                }

                const sql_quary = `
                INSERT INTO singer (name)
                SELECT ($singer_name) 
                WHERE NOT EXISTS( SELECT id FROM singer WHERE name=$singer_name );
                `
                //https://stackoverflow.com/questions/19337029/insert-if-not-exists-statement-in-sqlite

                
                //mylog('[update_singer] [singer_name - ude] - check siner',music_id, singers)
                Db.db.run(sql_quary,{$singer_name:singer_name})
                //mylog('[update_singer] [singer_name - ude - END]check siner end ',music_id, singers)

                Db.db.all(`SELECT id FROM singer WHERE name=$singer_name;`,{$singer_name:singer_name},  (err, ids)=>{
                    //mylog('[update_singer] 응답 - 다시, ids',music_id,singer_name,ids)
                    const singer_id = ids[0]?.id;
                    if (!singer_id){
                        mylog('singer_id 없음 충격','music_id',music_id,'singer_name',singer_name,singer_id, ids, err)
                        return;
                    }
                    //mylog('[update_singer] [singer_id]',singer_name,singer_id)
                    
                    //var sql_quary = `INSERT OR REPLACE INTO music_singer_map (music_id, singer_id) VALUES (${music_id}, ${singer_id}) ;`
                    Db.db.all(`INSERT OR REPLACE INTO music_singer_map (music_id, singer_id) VALUES ($music_id, $singer_id)`,{$music_id:music_id,$singer_id:singer_id})
                    
                    //mylog('[update_singer] music_singer_map - end',singer_name,singer_id)
                })
            })
            })
        })

    },update_album:(music_id, singers, album_name, year, genre, albumart, melon_album_id, callback)=>{
        if (!album_name) {
            //엘범 없음.
            callback(undefined);
            return;
        }
        albumart=albumart?albumart.Picture_data:null
        mylog('[fn | update_album]',album_name,singers,'[music_id]',music_id)
        Db.db.serialize(()=>{
            //mylog(mylog('[fn | update_album] - 최초삽입ㄴ직전',album_name,singers,'[music_id]',music_id))
            Db.db.run(`
            INSERT INTO album (name) SELECT $name
            WHERE NOT EXISTS( SELECT id FROM album WHERE name=$name );
            `,{
                $name:album_name,
            });

            //업데이트하기.
            if(melon_album_id                 )  Db.db.run(`UPDATE album SET name=$album_name   WHERE name=$name`, {$name:album_name, $album_name:album_name});
            if(genre      && genre     .length)  Db.db.run(`UPDATE album SET genre=$genre       WHERE name=$name`, {$name:album_name, $genre:genre});
            if(year       && year      .length)  Db.db.run(`UPDATE album SET year=$year         WHERE name=$name`, {$name:album_name, $year:year});
            if(albumart instanceof Buffer && albumart.length)  Db.db.run(`UPDATE album SET albumart=$albumart WHERE name=$name`, {$name:album_name, $albumart:albumart});
            
            
            //this.Db.db.run(`INSERT OR REPLACE INTO album_music_map (album_id, music_id) VALUES ($album_id, $music_id) ;`)
            //var sql_quary = 

            //mylog('[fn | update_album] - 최초삽입 직후',album_name,singers,'[music_id]',music_id)
            //mylog('[update_album] ins2',`SELECT id FROM album WHERE name="${album_name}" ;`)

            Db.db.all(`SELECT id FROM album WHERE name=$album_name ;`, {$album_name:album_name},  (err, ids)=>{

                //mylog('[update_album] ins3',ids)

                if (!ids ||!ids.length || !ids[0].id){
                    mylog('엘범 정보없음!')
                    return;
                }
                const album_id = ids[0].id;
                callback(album_id)
                const sql_quary = `INSERT OR REPLACE INTO album_music_map (album_id, music_id) VALUES ($album_id, $music_id) ;`
                Db.db.all(sql_quary,{$album_id:album_id,$music_id:music_id})
                
                if(singers) singers.forEach(singer_name=>{
                    //mylog('[update_album] WHERE]',`SELECT id FROM singer WHERE name="${singer_name}" ;`)
                    Db.db.all(`SELECT id FROM singer WHERE name=$singer_name ;`,{$singer_name:singer_name},  (err, ids)=>{
                        if (!ids || !ids.length || !ids[0].id){
                            mylog('[update_album] 엘범아트 -> 가수 연결 실패')
                            return;
                        }
                        const singer_id = ids[0].id;
                        const sql_quary = `INSERT OR REPLACE INTO album_singer_map (album_id, singer_id) VALUES ($album_id, $singer_id) ;`
                        Db.db.all(sql_quary,{$album_id:album_id, $singer_id:singer_id})
                    })
                })
            })
        })

    },get_url_by_id:(music_id, callback)=>{
        mylog('[get_url_by_id]',music_id)
        if (!Number.isInteger(music_id)) {callback(null); return;}
        const sql_quary = `SELECT url FROM music WHERE id=$music_id `;
        mylog('[get_url_by_id]',sql_quary,music_id)
        this.Db.db.all(sql_quary,{$music_id:music_id},(err,data)=>{
            mylog('data',data)
            callback((data&&data.length) ? data[0].url: undefined)
        })
    },get_id_by_search:(mode, words,part, descending, callback)=>{//search_qurry
        //console.log('words',words
        if (!Array.isArray(words) || isNaN(part)) {callback(undefined); return;} //답 없는 경우
        
        
        mylog('[ser sql_quary]')
        const sql_quary = `SELECT music.id AS music_id, album.name AS aname, album_id, music.year, music.genre, lyric, file_name,  duration, frequency, blank_start, blank_end, singer.name AS sname, music.name AS name, music.track FROM music   
        LEFT OUTER JOIN album ON
        music.album_id = album.id
        LEFT OUTER JOIN music_singer_map ON
        music.id = music_singer_map.music_id
        LEFT OUTER JOIN singer ON
        music_singer_map.singer_id = singer.id`
        
        //WHERE file_name Like $search_qurry OR  album.name Like $search_qurry OR  singer.name Like $search_qurry
        const 정규식들 = words.map(v=>new RegExp(this.Db.정규식(v), 'i')) //'i'는 대소문자 구분X뜻. /a/i 
        //const 정규식들 = new RegExp(words.map(v=>('('+this.Db.정규식(v)+')')).join('|'), 'gi')
        let 검색할것;
        let 정렬할것;
        let 공백포함 = false;

        switch(mode){
            case 'music' : 검색할것 = ['name',  'aname', 'sname', 'file_name']; 정렬할것 = 'music_id'; 공백포함=true; break;
            case 'album' : 검색할것 = ['aname', 'sname']; 정렬할것 = 'album_id'; 공백포함=true; break;
            case 'year' : 검색할것 = ['year']; break;
            case 'genre' : 검색할것 = ['genre']; break;
            case 'singer' : 검색할것 = ['sname']; break;
            case 'lyric' : 검색할것 = ['lyric']; break;
            default: {callback(undefined); return;}
        }
        if(!정렬할것) 정렬할것 = 검색할것[0];

        function marking_my_regex_list(str, regex_list){
            if(typeof str !='string') return;
            //str='가나다라가';
            const k=new Array(str.length).fill(false);
            regex_list.forEach(x=>{
                let tt  = str.match(x);
                if(!tt) return;
                let ind = str.search(x);
                for(var i=0; i<tt[0].length; i++) k[ind+i]=true;
            })
            return k.map((v,i)=>v?`<mark>${str[i]}</mark>`:str[i]).join('')
        }
        
        Db.db.all(sql_quary,(err,data)=>{
            //console.log('Dball',data)
            data = data.filter(v=>{
                if(!공백포함) if (검색할것.every(key=>!v[key]) ) return false;
                return 검색할것.some(key=>정규식들.every(el=>el.test(v[key])))
                //return 검색할것.some(key=>정규식들.test(v[key]))
                }
            )

	//정렬하기
    //console.log('정렬',정렬할것, typeof data, data.sort);
    //console.log(data.map(v=>v[정렬할것]))
	let 방향인자 = descending?-1:1//역방향이면, -1을 곱하게...
    data.sort((a,b)=>{
        let t;
        if(a[정렬할것]==null) t= 1;
        else if(b[정렬할것]==null) t= -1;
        else t= a[정렬할것]>b[정렬할것]?1:-1
        return t*방향인자;
    });
    //console.log(data.map(v=>v[정렬할것]))
            //출력되는 범위 재한하기
            data = data.splice(part*50,50);

            // 검색한 것은 <mark>로 감싸기.
            data.forEach(v=>{
                검색할것.forEach(key=>{
                    if(["number", "string"].includes(typeof v[key])) v[key] = marking_my_regex_list(String(v[key]), 정규식들)
                })
            })
            
                mylog('[data]', 'data -> ',err,data?data.length:data,'[정규식]',정규식들)
            callback(data ? data: undefined)
        })
             
    },get_info_one:(song_id, do_crawling, get_url, callback)=>{
        //do_crawling: 인터넷에서 긁어오는 것을 할 것인가 여부임.
        if(isNaN(song_id)) {
            callback(null)
            return;
        }
        //mylog('[Db > get_info_one]', 'song_id',song_id, 'do_crawling',do_crawling)
        song_id = Number(song_id)

        const sql_quary = `SELECT music.id AS music_id, ${get_url?'url,':''} music.file_name, music.name, music.lyric, music.year, music.genre, music.track,  duration, frequency, blank_start, blank_end,
        singer.id AS singer_id, singer.name AS singer_name, album.id AS album_id, album.name AS album_name, albumart FROM music 
        LEFT OUTER JOIN album ON
        music.album_id = album.id
        LEFT OUTER JOIN music_singer_map ON
        music.id = music_singer_map.music_id
        LEFT OUTER JOIN singer ON
        music_singer_map.singer_id = singer.id
        WHERE music.id = $song_id`

        this.Db.db.all(sql_quary,{$song_id:song_id},(err,data)=>{
            if(!data || !data.length) {
                mylog('[Db > get_info_one], Db.db a11 1 data',data)
                callback(undefined)
                return;
            }
            const info = data[0];
            //mylog(!!data,!!info)
            info.singer = data.map(v=>v.singer_name)

            //mylog('[get_info_one]', info.singer,[info.singer_name])//info
            if(!do_crawling) callback(info)
            else if (info && info.name && info.year && info.lyric && info.album_id && info.singer_name && info.album_name && info.albumart){
                callback(info)
            }
            else{
                mylog(info.file_name, info.name, info.singer_name, info.album_name)
                var k = new Get_music_info(info.file_name, info.name, info.singer_name, info.album_name)
                k.get_music((data)=>{
                    mylog('[get_music]',song_id,info.toString(), !!data)
                    if (!data){
                        mylog('가져오기 실패함.')
                        callback(info)
                        return;
                    }


                    if (!info.name) info.name = data.music_name
                    if (!info.singer_name) info.singer = data.singer
                    if (!info.album_name) info.album_name = data.album_name
                    if (!info.lyric) info.lyric = data.lyric
                    if (!info.year) info.year = Number(data.year.split('.')[0])
                    if (!info.albumart) info.albumart = data.albumart
                    if (!info.genre) info.genre = data.genre

                    
                    Db.update_singer(song_id, info.singer)
                    Db.update_album(song_id, info.singer, info.album_name, info.year, info.genre, info.albumart, data.mellon_id ,(album_id)=>{
                        mylog('[upadte_music end]',url,album_id)
                        
                        callback({...info, album_id})
                        
                        if(!isNaN(album_id)){
                            if(info.album_name) Db.db.run(`UPDATE album SET name=$album_name   WHERE id=${album_id}`, {$album_name:info.album_name});
                            if(info.genre)      Db.db.run(`UPDATE album SET genre=$genre       WHERE id=${album_id}`, {$genre:info.genre});
                            if(info.year)       Db.db.run(`UPDATE album SET year=$year         WHERE id=${album_id}`, {$year:info.year});
                            if(info.albumart)   Db.db.run(`UPDATE album SET albumart=$albumart WHERE id=${album_id}`, {$albumart:info.albumart});
                        }
                        if(!isNaN(song_id)){
                            if(info.name)      Db.db.run(`UPDATE music SET name=$name          WHERE id=${song_id}`, {$name:info.name});
                            if(album_id)       Db.db.run(`UPDATE music SET album_id=$album_id  WHERE id=${song_id}`, {$album_id:album_id});
                            if(info.lyric)     Db.db.run(`UPDATE music SET lyric=$lyric        WHERE id=${song_id}`, {$lyric:info.lyric});
                            if(info.genre)     Db.db.run(`UPDATE music SET genre=$genre        WHERE id=${song_id}`, {$genre:info.genre});
                            if(info.year)      Db.db.run(`UPDATE music SET year=$year          WHERE id=${song_id}`, {$year:info.year});
                            if(data.mellon_id) Db.db.run(`UPDATE music SET melon_id=$mellon_id WHERE id=${song_id}`, {$mellon_id:data.mellon_id});    

                        }
                    })
            
                })
            }
            //var singer = singer[0].name
        })  

        
    },get_album_by_search(quary,callback){
        var sql_quary = `SELECT album.id AS album_id, album.name AS album_name, album.year, 
        music.name as music_name, music.id AS music_id, music.file_name,  duration, album.genre,
        track, frequency, blank_start, blank_end,
        singer.name AS singer_name FROM album
        
        LEFT OUTER JOIN album_music_map ON
        album.id = album_music_map.album_id
        LEFT OUTER JOIN music ON
        album_music_map.music_id = music.id
        LEFT OUTER JOIN music_singer_map ON
        music.id = music_singer_map.music_id
        LEFT OUTER JOIN singer ON
        music_singer_map.singer_id = singer.id
        WHERE (album_name Like $quary OR singer_name Like $quary ) and music.id NOT NULL
        ORDER BY album_id, track`

        mylog('[ser get_album_by_search]',sql_quary,quary)
        Db.db.all(sql_quary,{$quary:quary},(err,data)=>{
            mylog('data -> ',data.length)
            callback(data ? data: undefined)
        })
    },get_albumart(album_id, callback){
        album_id = Number(album_id)
        album_id+=0;
        if (isNaN(album_id)) {callback(undefined); return;}

        var sql_quary = `SELECT albumart FROM album WHERE id=$album_id`
        mylog('[album_id]',sql_quary,album_id)
        Db.db.all(sql_quary,{$album_id:album_id},(err,data)=>{
            //mylog('[album_id]',data)
            if (!data || !data.length) callback(undefined)
            else callback(data[0].albumart)
        })
        
    },
    get_music_langth(callback){
//        Db.db.all('SELECT count (*) FROM music',(err,data)=>{
        Db.db.all('SELECT id FROM music ORDER BY id DESC LIMIT 1',(err,data)=>{
            mylog(data[0])
//            callback(data[0]["count (*)"])
            callback(data[0]["id"])
        })
    },make_initial_search_quary(var_name, term){
        return '('+term.map(v=>`REGEXP('${Db.정규식(v)}', lower(${var_name}))`).join(' AND ') + ')'
    },정규식(x){
        //mylog('[db 정규식 ] x',x);
        return x.split('').map(v=>{
            if ('ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'.includes(v)) 
            return ['[가-낗]','[까-낗]','[나-닣]','[다-딯]','[따-띻]','[라-맇]','[마-밓]','[바-삫]','[빠-삫]','[사-앃]','[싸-앃]','[아-잏]','[자-찧]','[짜-찧]','[차-칳]','[카-킿]','[타-팋]','[파-핗]','[하-힣]']['ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'.indexOf(v) ]
            else if (/[a-z]|[A-Z]|[0-9]/.test(v)) return v.toLocaleLowerCase();
            else if (v=='\t') return '\\t';
            else if (/[\x00-\x1f]|[\x7f]/.test(v)) return '';
            else if (/[\x21-\x7e]/.test(v)) return '\\'+v;
            else if (/[가-힣]/.test(v)) {
                var tmp = v.charCodeAt(0)-44032
                var [a,b,c] = [Math.floor(tmp/588), Math.floor(tmp%588/28), tmp%28] //초성, 중성, 종성값 44032+a*588+b*28+27
                if(!c) return '['+v+'-'+String.fromCharCode(Math.floor(tmp/28)*28+27+44032)+']'
                else return v;
            }
            else return v;
            /*//이거. sql 넣을때 이렇게 해줘야 함.
            else if (v==`'`) return `''`;
            else if (v==`"`) return `""`;*/
        }).join('\\s*')
    },music_update_user(music_id, name, year, lyric, album_id, singers, genre, callback){
        //ToDo: 엘범 내 음악은 장르, 년도가 같아야 함. 보정해야.
        music_id = Number(music_id)
            if(isNaN(music_id) || music_id<0){console.error('[update_user]. 허용 범위 밖 id'); callback(); return;}
        
            if(name     && name.length)      Db.db.run(`UPDATE music SET name=$name          WHERE id=${music_id}`, {$name:name});
            //if(album_id && album_id.length)  Db.db.run(`UPDATE music SET album_id=$album_id  WHERE id=${song_id}`, {$album_id:album_id});
            if(lyric    && lyric.length)     Db.db.run(`UPDATE music SET lyric=$lyric        WHERE id=${music_id}`, {$lyric:lyric});
            if(genre    && genre.length)     Db.db.run(`UPDATE music SET genre=$genre        WHERE id=${music_id}`, {$genre:genre});
            if(year     && year.length)      Db.db.run(`UPDATE music SET year=$year          WHERE id=${music_id}`, {$year:year});
            
            //엘범 제목: 존재해야만, 업데이트
            if(album_id && !isNaN(album_id))
                Db.db.all('SELECT id, name FROM album WHERE id=$album_id',{$album_id:album_id},(err,data)=>{
                    if(!err && data && data.length){
                        Db.db.run(`UPDATE music SET album_id=$album_id  WHERE id=${music_id}`, {$album_id:album_id});
                        Db.db.run(`INSERT OR REPLACE INTO album_music_map (album_id) VALUES ($album_id)  WHERE music_id=${music_id}`, {$album_id:album_id});
                    }
                })
            
            //가수 목록 다시
            let delete_flag = false;
            if(Array.isArray(singers)) for(let s in singers) if(!isNaN(s) && s>=0){
                if(!delete_flag){
                    Db.db.run(`DELETE FROM music_singer_map WHERE music_id=$song_id`,{$song_id:music_id});
                    //일단 모두 삭제
                }
                delete_flag = true;
                Db.db.all('SELECT id FROM singer WHERE id=$singer_id',{$singer_id:s},(err,data)=>{
                    if(!err && data && data.length){
                        Db.db.run(`INSERT INTO music_singer_map (music_id, singer_id) VALUES (?,?)`,music_id, s);
                        //INSERT INTO log (date, url, song_id) VALUES (?,?,?)
                        //music_id INT(11) NOT NULL,\
                    }
                })
            }

            callback(true)
                
            //if(albumart  instanceof Buffer && albumart.length) Db.db.run(`UPDATE music SET albumart=$albumart WHERE id=${song_id}`, {$albumart:albumart});
            // 크롤링 체크: info && info.name && info.year && info.lyric && info.album_id && info.singer_name && info.album_name && info.albumart
        // 모든 정보 다시 가져오기 기능 앞에서는...

    },album_update_user(album_id, album_name, genre, year, albumart){
        if(!album_id || isNaN(album_id) || album_id<0) {console.err('[album_update_user]. 허용 범위 밖 id'); return;}
        if(album_name && album_name.length) Db.db.run(`UPDATE album SET name=$album_name   WHERE id=${album_id}`, {$album_name:album_name});
        if(genre      && genre     .length)  Db.db.run(`UPDATE album SET genre=$genre       WHERE id=${album_id}`, {$genre:genre});
        if(year       && year      .length)  Db.db.run(`UPDATE album SET year=$year         WHERE id=${album_id}`, {$year:year});
        if(albumart instanceof Buffer && albumart && albumart.length)  Db.db.run(`UPDATE album SET albumart=$albumart WHERE id=${album_id}`, {$albumart:albumart});
        return true;
    }
}

//기록을 저장하고 읽고 쓰는 부분을
Db_log = {
    db: Db.db,//new sqlite3.Database('db/log.db'),
    setting:(callback)=>{
        Db.db.serialize(()=>{
            Db_log.db.all("select name from sqlite_master where type='table'",  (err, tables)=>{
                //mylog('e',tables)
                if (tables.length) return;
            
                Db_log.db.run("CREATE TABLE log (\
                date DATETIME primary key NOT NULL,\
                url TEXT NOT NULL,\
                song_id INT\
                );")
                
                Db_log.db.run("CREATE TABLE deleted_music (\
                    song_id INT primary key NOT NULL,\
                    url TEXT NOT NULL,\
                    album_id INT(11),\
                    album_name TEXT,\
                    year INT(11),\
                    name TEXT,\
                    genre TEXT(11),\
                    duration INT(11),\
                    frequency INT(11)\
                );")

                Db.db.run("CREATE TABLE deleted_music_singer_map (\
                    music_id INT(11) NOT NULL,\
                    singer_id INT(11) NOT NULL,\
                    PRIMARY KEY(music_id, singer_id)\
                );")
            });
        });

    },log(url, song_id){
        mylog('[Db.log log]',url, song_id)
        const date = Number(new Date())
        if (!url || isNaN(song_id)) return
        var sql_quary = `INSERT INTO log (date, url, song_id) VALUES (?,?,?)`
        Db_log.db.run(sql_quary, date, url, song_id)
    },get_data(type, callback){
        //console.log('n-3', type, !['name', 'album', 'singer'].includes(type))
        //'album', 'singer' 제거함
        let sql_quary=''
        let add = ''
        if(!['song_id', 'url', 'singer', 'album', 'length', 'genre', 'year'].includes(type)){ //이상한 타입임
            callback(undefined)
            return;
        }else if(type=='singer'){
            add = 'singer.name AS singer'
        }else if(type=='album'){
            add = 'album.name AS album'
        }else if(type=='length'){
            add = `music.duration AS music_duration, music.frequency AS music_frequency,
            deleted_music.duration AS deleted_music_duration, deleted_music.frequency AS deleted_music_frequency`
        }else if(type=='genre'){
            add = `music.genre AS genre, deleted_music.genre AS deleted_genre`
        }else if(type=='year'){
            add = `music.year AS year, deleted_music.year AS deleted_year`
        }
        if(['song_id', 'url'].includes(type)){
            sql_quary = `select date, url, ${type} from log`
        }else{
            sql_quary = `SELECT date, log.song_id AS song_id, log.url AS url, ${add} FROM log
            LEFT OUTER JOIN music ON
            log.song_id = music.id
            LEFT OUTER JOIN album ON
            music.album_id = album.id
            LEFT OUTER JOIN music_singer_map ON
            music.id = music_singer_map.music_id
            LEFT OUTER JOIN deleted_music ON
            log.song_id = deleted_music.song_id
            LEFT OUTER JOIN deleted_music_singer_map ON
            deleted_music.song_id = deleted_music_singer_map.music_id
            LEFT OUTER JOIN singer ON
            music_singer_map.singer_id = singer.id or
            deleted_music_singer_map.singer_id = singer.id`
            //같은 엘범. 가수가 다르면 2건으로 검색되는 현상 생겨...
        }
        Db_log.db.all(sql_quary, (err,data)=>{
            if(err){console.log(err), callback(undefined)}
            // console.log(data);
            data = data.map(v=>{
                for(let i in v){
                    if(i.startsWith('deleted_') && v[i]==null)
                    delete v[i]
                    else if(!i.startsWith('deleted_') && v[i]==null && v['deleted_'+i]){
                        v[i] = v['deleted_'+i];
                        v['deleted_'+i] = ''
                    }
                    
                }
                if(type=='length'){
                    v[type] = 144*8*v.music_duration / v.music_frequency
                    if(!v[type]) v[type] = 144*8*v.deleted_music_duration / v.deleted_music_frequency
                }

                return v
            })//중복값이 있는 경우가 있다. 들은 시간이 같고, 원하는 속성값도 같은경우. 이를 제거한다.
            .filter((v,i,ar)=>!(i&&(v.date==ar[i-1].date&&v[type]==ar[i-1][type])))

            //console.log(data);
            callback(data);
        })
    },update_deleted_music(song_id,url,album_id,album_name,year,name,singer_ids,genre,duration,frequency,callback){
        if(isNaN(song_id) || !url) return
        const null_fn = (x)=>x==undefined?null:x;
        mylog('[Db.log > update_deleted_music],song_id,url,album_id,album_name,year,name,singer_ids,genre,duration,frequency',song_id,url,album_id,album_name,year,name,singer_ids,genre,duration,frequency)

        album_id = null_fn(album_id)
        album_name = null_fn(album_name)
        year = null_fn(year)
        name = null_fn(name)
        genre = null_fn(genre)
        duration = null_fn(duration)
        frequency = null_fn(frequency)

        const sql_quary = `INSERT INTO deleted_music (song_id,url,album_id,album_name,year,name,genre,duration,frequency) VALUES (?,?,?,?,?,?,?,?,?)`
        Db_log.db.run(sql_quary, song_id, url, album_id,album_name,year,name,genre,duration,frequency)
        if(Array.isArray(singer_ids)) 
        singer_ids.forEach(singer_id=>{
            if(singer_id)
            Db_log.db.all(`INSERT OR REPLACE INTO deleted_music_singer_map (music_id, singer_id) VALUES ($music_id, $singer_id)`,{$music_id:song_id,$singer_id:singer_id})
        })
        callback()
        /* 
        song_id primary key INT NOT NULL,\
                    url TEXT NOT NULL,\
                    album_id INT(11),\
                    year INT(11),\
                    name TEXT,\
                    album TEXT,\
                    singer TEXT\
                    genre TEXT(11),\
                    duration INT(11),\
                    frequency INT(11),\
        */

    }
}

module.exports.Db = Db
module.exports.Db_log = Db_log