const  sqlite3 = require('sqlite3').verbose();
const fs = require('fs')
const ID3v2_parse = require("./modules/ID3v2_parse").ID3v2_parse;
const MP3_parse = require("./modules/Mp3_parse").Mp3_parse;
const Md5 = require('./modules/md5');
const Get_music_info = require('./modules/get_music_info').Get_music_info
// 안정성을 위해서, 따로 보관.!
Db_log = {
    db: new sqlite3.Database('asset/log.db'),
    setting:(callback)=>{
        Db.db.serialize(()=>{
            Db_log.db.all("select name from sqlite_master where type='table'",  (err, tables)=>{
                console.log('e',tables)
                if (tables.length) return;
            
                Db_log.db.run("CREATE TABLE log (\
                date DATETIME primary key NOT NULL,\
                url TEXT NOT NULL,\
                int song_id,\
                name TEXT,\
                album TEXT,\
                singer TEXT\
                )")
            });
        });

    },log(date, url, song_id, name, album, singer){
        if (!date || !url) return
        var sql_quary = `INSERT INTO log (date, url, song_id, name, album, singer) VALUES (?,?,?,?,?,?)`
        Db_log.run(sql_quary,
            date,
            url,
            song_id==undefined?null:song_id,
            name,
            album,
            singer.toString(),          
            )
    }
}

Db = {
    db: new sqlite3.Database('asset/music_data.db'),
    isnone:(callback)=>{
        Db.db.serialize(()=>{

            Db.db.all("select name from sqlite_master where type='table'",  (err, tables)=>{
                callback(!tables.length)
            });
            /*
            Db.db.all("SELECT *", function(err, rows) {
                rows.forEach(function (row) {
                    console.log(row);
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
                 INT(11),\
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

            
            Db.db.run("CREATE TABLE album_music_map (\
                album_id INT(11) NOT NULL,\
                music_id INT(11) NOT NULL,\
                PRIMARY KEY(album_id, music_id)\
            );")

            callback()
        });

    },
    music_insert:(url_list,callback)=>{
        var updated_urls = []
        var sql_quary = `SELECT id,url FROM music;`
        console.log('[music_insert], url_list.length',url_list.length,url_list.slice(0,3))
        Db.db.all(sql_quary,  (err, exits_urls)=>{
            
            exits_ids = exits_urls.map(v=>v.id)
            exits_urls = exits_urls.map(v=>v.url)


            console.log('[들어있는 목록]',exits_urls.slice(0,2), exits_urls.length)
            var url_list_callback_cnt = 0
            var url_list_callback_len = url_list.length

            //없는 파일은 삭제하기.
            exits_urls.forEach(url=>{
                if(url && !url_list.includes(url)){
                    this.Db.db.all(`SELECT id FROM music WHERE url="${url}" ;`,(err,ids)=>{
                        var id = ids[0].id
                        console.log('[삭제됩니다!] id=',id,
                            `DELETE FROM music WHERE id="${id}" ;\n`,
                            `DELETE FROM music_singer_map WHERE music_id="${id}" ;`,
                            `DELETE FROM album_music_map WHERE music_id="${id}" ;`)
                        this.Db.db.run(`DELETE FROM music            WHERE id=${id} ;`)
                        this.Db.db.run(`DELETE FROM music_singer_map WHERE music_id=${id};`)
                        this.Db.db.run(`DELETE FROM album_music_map  WHERE music_id=${id} ;`)
                    })
                }
            })
            
            url_list.forEach(_url=>{
                if (exits_urls.includes(_url)){
                    url_list_callback_len--;

                    if (!url_list_callback_len) callback(updated_urls)
                    return;
                } 
                //if ( _url.includes('\'') || _url.includes('\"') || _url.includes('\`') ) return;
                updated_urls.push(_url)
                var tmp = _url.split('\\')
                var file_name = tmp[tmp.length-1].replace(/.mp3/,'')
                var sql_quary = `INSERT INTO music (url, file_name) VALUES ("${_url}", "${file_name}" );`
                //console.log('music_insert - sql_quary',sql_quary)
                Db.db.run(sql_quary, ()=>{
                    url_list_callback_cnt++;
                    //console.log(url_list_callback_cnt,url_list_callback_len)
                    if (url_list_callback_cnt==url_list_callback_len) callback(updated_urls)
                    
                });  
            })
            //callback()
    }); 
    },
    update_music_all:(list)=>{
        if(this.Db.update_music_all_paly) return false;

        this.Db.update_music_all_paly = true;
        console.log('[update_music_all]')
        var cnt = 0

        if (!list){
            var sql_quary = 'SELECT url FROM music WHERE md5 IS NULL;'//WHERE name IS NULL
            Db.db.all(sql_quary,  (err, exits_urls)=>{
                exits_urls = exits_urls.map(v=>v.url)
                console.log('[exits_urls]',exits_urls.length,exits_urls.slice(0,3))
                
                Db.setint = setInterval(() => {
                    if (cnt>=exits_urls.length){
                        //console.log('out - setinderver')
                        this.Db.update_music_all_paly = false;
                        clearInterval(Db.setint);
                    }else{
                        var url = exits_urls[cnt]
                        var sql_quary = `SELECT * FROM music WHERE url="${url}" ;`
                        Db.db.all(sql_quary,(err, data)=>{this.Db.upadte_music(url,data[0],()=>{})})
                    }
                    cnt++;
                    //중복방지용 무언가 필요함1
                }, 50);
            })
            return true;
        }else{
            console.log('[update_music_all] [list]',list.length)

            list.forEach(url=>{
                var sql_quary = `SELECT * FROM music WHERE url="${url}" ;`
                Db.db.all(sql_quary,(err, data)=>{this.Db.upadte_music(url,data[0],()=>{})})
            })
            this.Db.update_music_all_paly = false;
            return true;
        }
    },
    upadte_music:(url,data,callback)=>{
        var file = fs.readFileSync(url);
        var md5 = Md5.base64(file)
        if (data && data.md5 == md5) return;
        else{
            var dru = MP3_parse(file)
            var id3 = ID3v2_parse(file)
        }
        
        
        var [제목, 가수, 엘범, 트렉, 연도, 장르, 엘범아트, 가사] = [id3.제목, id3.가수, id3.엘범, id3.트렉, id3.연도, id3.장르, id3.엘범아트,  id3.가사]
        
        //if ((!제목 || 제목 == data.name) && !가수.length && !엘범) return;
        console.log('[upadte_music st]',url.split('\\')[url.split('\\').length-1],제목, 가수, 엘범, 트렉, 연도, 장르)

        this.Db.db.serialize(()=>{
            var sql_quary = `UPDATE music SET file_len=${dru.file_len}, duration=${dru.duration?dru.duration:null}, frequency=${dru.frequency?dru.frequency:null}, blank_start=${dru.s==undefined?null:dru.s}, blank_end=${dru.e==undefined?null:dru.e} WHERE url="${url}";`
            console.log('[upadte_music] - DB IN',url, sql_quary)
            Db.db.run(sql_quary);



            var melon_album_id, melon_music_id;

            if (제목 && id3.가수 && 엘범 && 가사 && 트렉 && 연도 && 장르 && 엘범아트){
            }else{
                //id3 = 멜론
            }

            var sql_quary = `SELECT id FROM music WHERE url="${url}" ;`
            //console.log('[upadte_music]',sql_quary)
            Db.db.all(sql_quary,  (err, ids)=>{
                if (!ids){
                    console.error('[upadte_music] - id 목찾음 !',url, ids)
                    return;
                }
                var id = ids[0].id

                Db.update_singer(id, id3.가수)
                Db.update_album(id, 가수, 엘범, 연도, 장르, 엘범아트, melon_album_id,(album_id)=>{
                    console.log('[upadte_music end]',url,album_id)

                    if(제목) Db.db.run(`UPDATE music SET name="${제목}" WHERE id=${id}`);
                    if(album_id) Db.db.run(`UPDATE music SET album_id=${album_id} WHERE id=${id}`);
                    if(가사) Db.db.run(`UPDATE music SET lyric="${가사}" WHERE id=${id}`);
                    if(장르) Db.db.run(`UPDATE music SET genre="${장르}" WHERE id=${id}`);
                    if(연도) Db.db.run(`UPDATE music SET year=${연도} WHERE id=${id}`);
                    if(트렉) Db.db.run(`UPDATE music SET track=${트렉} WHERE id=${id}`);
                    if(md5)  Db.db.run(`UPDATE music SET md5="${md5}" WHERE id=${id}`);
                })
            })
        })
    },update_singer:(music_id, singers)=>{
        if (!singers) return
        console.log('[fn | update_singer]',music_id, singers)
        singers.forEach(singer_name=>{
            this.Db.db.serialize(()=>{

                var sql_quary = `
                INSERT INTO singer (name)
                SELECT ("${singer_name}") 
                WHERE NOT EXISTS( SELECT id FROM singer WHERE name="${singer_name}" );
                `
                //https://stackoverflow.com/questions/19337029/insert-if-not-exists-statement-in-sqlite

                
                //console.log('[update_singer] [singer_name - ude] - check siner',music_id, singers)
                Db.db.run(sql_quary)
                //console.log('[update_singer] [singer_name - ude - END]check siner end ',music_id, singers)

                Db.db.all(`SELECT id FROM singer WHERE name="${singer_name}" ;`,  (err, ids)=>{
                    //console.log('[update_singer] 응답 - 다시, ids',music_id,singer_name,ids)


                    var singer_id = ids[0].id;
                    if (!singer_id){
                        console.log('singer_id 없음 충격',singer_id)
                        return;
                    }
                    //console.log('[update_singer] [singer_id]',singer_name,singer_id)
                    
                    var sql_quary = `INSERT OR REPLACE INTO music_singer_map (music_id, singer_id) VALUES (${music_id}, ${singer_id}) ;`
                    Db.db.all(sql_quary)
                    
                    //console.log('[update_singer] music_singer_map - end',singer_name,singer_id)
                })
            })
        })

    },update_album:(music_id, singers, album_name, year, genre, albumart, melon_album_id, callback)=>{
        if (!album_name) return
        console.log('[fn | update_album]',album_name,singers,'[music_id]',music_id)
        Db.db.serialize(()=>{
            //console.log(console.log('[fn | update_album] - 최초삽입ㄴ직전',album_name,singers,'[music_id]',music_id))
            Db.db.run(`
            INSERT INTO album (name, melon_id, genre, year, albumart) SELECT  $name, $melon_id, $genre, $year, $albumart
            WHERE NOT EXISTS( SELECT id FROM album WHERE name="${album_name}" );
            `,{
                $name:album_name,
                $melon_id: melon_album_id,
                $genre: genre,
                $year: year,
                $albumart: albumart?albumart.Picture_data:null
                
            });
            console.log('[fn | update_album] - 최초삽입 직후',album_name,singers,'[music_id]',music_id)
            //console.log('[update_album] ins2',`SELECT id FROM album WHERE name="${album_name}" ;`)

            Db.db.all(`SELECT id FROM album WHERE name="${album_name}" ;`,  (err, ids)=>{

                //console.log('[update_album] ins3',ids)

                if (!ids ||!ids.length || !ids[0].id){
                    console.log('엘범 정보없음!')
                    return;
                }
                var album_id = ids[0].id;
                callback(album_id)
                var sql_quary = `INSERT OR REPLACE INTO album_music_map (album_id, music_id) VALUES (${album_id}, ${music_id}) ;`
                Db.db.all(sql_quary)
                
                if(singers) singers.forEach(singer_name=>{
                    //console.log('[update_album] WHERE]',`SELECT id FROM singer WHERE name="${singer_name}" ;`)
                    Db.db.all(`SELECT id FROM singer WHERE name="${singer_name}" ;`,  (err, ids)=>{
                        if (!ids || !ids.length || !ids[0].id){
                            console.log('[update_album] 엘범아트 -> 가수 연결 실패')
                            return;
                        }
                        var singer_id = ids[0].id;

                        var sql_quary = `INSERT OR REPLACE INTO album_singer_map (album_id, singer_id) VALUES (${album_id}, ${singer_id}) ;`
                        Db.db.all(sql_quary)      
                    })
                })  
            })
        })

    },get_url_by_id:(music_id, callback)=>{
        console.log('[get_url_by_id]',music_id)
        if (!Number.isInteger(music_id)) callback(null)
        var sql_quary = `SELECT url FROM music WHERE id=${music_id} `;
        console.log('[get_url_by_id]',sql_quary)
        this.Db.db.all(sql_quary,(err,data)=>{
            console.log('data',data)
            callback(data ? data[0].url: undefined)
        })
    },get_id_by_search:(search_qurry,callback)=>{
        var sql_quary = `SELECT music.id AS music_id, album.name, file_name,  duration, frequency, blank_start, blank_end, singer.name FROM music  
        LEFT OUTER JOIN album ON
        music.album_id = album.id
        LEFT OUTER JOIN music_singer_map ON
        music.id = music_singer_map.music_id
        LEFT OUTER JOIN singer ON
        music_singer_map.singer_id = singer.id
        WHERE file_name Like "%${search_qurry}%" OR  album.name Like "%${search_qurry}%" OR  singer.name Like "%${search_qurry}%" `

        console.log('[ser sql_quary]',sql_quary)
        this.Db.db.all(sql_quary,(err,data)=>{
            console.log('data -> ',data.length)
            callback(data ? data: undefined)
        })

        
    },get_info_one:(song_id, callback)=>{
        if(isNaN(song_id)) {
            callback(null)
            return;
        }
        song_id = Number(song_id)

        var sql_quary = `SELECT music.id AS music_id, music.file_name, music.name, music.lyric, music.year, music.genre, music.track,  duration,
        singer.id AS singer_id, singer.name AS singer_name, album.id AS album_id, album.name AS album_name, albumart FROM music 
        LEFT OUTER JOIN album ON
        music.album_id = album.id
        LEFT OUTER JOIN music_singer_map ON
        music.id = music_singer_map.music_id
        LEFT OUTER JOIN singer ON
        music_singer_map.singer_id = singer.id
        WHERE music.id = ${song_id}`

        this.Db.db.all(sql_quary,(err,data)=>{
            var info = (data||data.length)?data[0]:undefined
            info.singer = (data||data.length)?data.map(v=>v.singer_name):[]

            console.log('[get_info_one]', )//info
            if (info && info.name && info.year && info.lyric && info.album_id && info.singer_name && info.album_name){
                callback(info)
            }
            else{
                console.log(info.file_name, info.name, info.singer_name, info.album_name)
                var k = new Get_music_info(info.file_name, info.name, info.singer_name, info.album_name)
                k.get_music((data)=>{
                    console.log('[get_music]',song_id,info, data)
                    if (!data){
                        console.log('가져오기 실패함.')
                        callback(null)
                        return;
                    }


                    if (!info.name) info.name = data.music_name
                    if (!info.singer_name) info.singer = [data.singer_name]
                    if (!info.album_name) info.album_name = data.album_name
                    if (!info.lyric) info.lyric = data.lyric
                    if (!info.year) info.year = Number(data.year.split('.')[0])
                    if (!info.albumart) info.albumart = data.albumart
                    if (!info.genre) info.genre = data.genre

                    
                    Db.update_singer(song_id, info.singer)
                    Db.update_album(song_id, info.singer, info.album_name, info.year, info.genre, info.albumart, data.mellon_id ,(album_id)=>{
                        console.log('[upadte_music end]',url,album_id)
                        
                        callback({...info, album_id})

            //             Db.db.run(`
            // INSERT INTO album (name, melon_id, genre, year, albumart) SELECT  $name, $melon_id, $genre, $year, $albumart
            // WHERE NOT EXISTS( SELECT id FROM album WHERE name="${album_name}" );
            // `,{
            //     $name:album_name,
            //     $melon_id: melon_album_id,
            //     $genre: genre,
            //     $year: year,
            //     $albumart: albumart?albumart.toString('base64'):null
                
            // });
    
                        if(info.album_name) Db.db.run(`UPDATE album SET name="${info.album_name}"   WHERE id=${album_id}`);
                        if(info.genre)      Db.db.run(`UPDATE album SET genre="${info.genre}"       WHERE id=${album_id}`);
                        if(info.year)       Db.db.run(`UPDATE album SET year=${info.year}           WHERE id=${album_id}`);
                        if(info.albumart)   Db.db.run(`UPDATE album SET albumart=$albumart          WHERE id=${album_id}`, {$albumart:info.albumart});


                        if(info.name)      Db.db.run(`UPDATE music SET name="${info.name}"         WHERE id=${song_id}`);
                        if(album_id)       Db.db.run(`UPDATE music SET album_id=${album_id}        WHERE id=${song_id}`);
                        if(info.lyric)    Db.db.run(`UPDATE music SET lyric="${info.lyric}"      WHERE id=${song_id}`);
                        if(info.genre)     Db.db.run(`UPDATE music SET genre="${info.genre}"             WHERE id=${song_id}`);
                        if(info.year)      Db.db.run(`UPDATE music SET year=${info.year}           WHERE id=${song_id}`);
                        if(data.mellon_id) Db.db.run(`UPDATE music SET melon_id=${data.mellon_id} WHERE id=${song_id}`);
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
        WHERE (album_name Like "${quary}" OR singer_name Like "${quary}" ) and music.id NOT NULL
        ORDER BY album_id, track`

        console.log('[ser get_album_by_search]',sql_quary)
        Db.db.all(sql_quary,(err,data)=>{
            console.log('data -> ',data.length)
            callback(data ? data: undefined)
        })
    },get_albumart(album_id, callback){
        album_id = Number(album_id)
        album_id+=0;
        if (isNaN(album_id)) {callback(undefined); return;}

        var sql_quary = `SELECT albumart FROM album WHERE id=${album_id}`
        console.log('[album_id]',sql_quary)
        Db.db.all(sql_quary,(err,data)=>{
            console.log('[album_id]',data)
            if (!data || !data.length) callback(undefined)
            else callback(data[0].albumart)
        })
        
    },
    get_music_langth(callback){
        Db.db.all('SELECT count (*) FROM music',(err,data)=>{
            console.log(data[0])
            callback(data[0]["count (*)"])
        })
    }


}
/*
db.serialize(function() {
  db.run("CREATE TABLE user (\
    id INT(11) NOT NULL,\
    dt TEXT,\
    PRIMARY KEY(id) )");
  //AUTOINCREMENT

  var stmt = db.prepare("INSERT INTO user VALUES (?,?)");
  for (var i = 0; i < 10; i++) {
  
  var d = new Date();
  var n = d.toLocaleTimeString();
  stmt.run(i, n);
  }
  stmt.finalize();

  db.each("SELECT id, dt FROM user", function(err, row) {
      console.log("User id : "+row.id, row.dt);
  });
});

db.close();
*/




module.exports.Db = Db
module.exports.Db_log = Db_log