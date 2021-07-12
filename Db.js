const  sqlite3 = require('sqlite3').verbose();
const fs = require('fs')
const ID3v2_parse = require("./moudules/ID3v2_parse").ID3v2_parse;
const MP3_parse = require("./moudules/Mp3_parse").Mp3_parse;


Db = {
    db: new sqlite3.Database('asset/abcd.db'),
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
            name TEXT,\
            melon_id INT(11),\
            album_id INT(11),\
            year INT(11),\
            lyric TEXT(11),\
            url TEXT NOT NULL,\
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
                albumart BLOB\
            );")

            Db.db.run("CREATE TABLE music_singer_map (\
                music_id INT(11) NOT NULL,\
                singer_id INT(11) NOT NULL\
            );")

            Db.db.run("CREATE TABLE album_singer_map (\
                album_id INT(11) NOT NULL,\
                singer_id INT(11) NOT NULL\
            );")

            
            Db.db.run("CREATE TABLE album_music_map (\
                album_id INT(11) NOT NULL,\
                music_id INT(11) NOT NULL\
            );")

            callback()
        });

    },
    music_insert:(url_list,callback)=>{
        var sql_quary = `SELECT url FROM music;`
        console.log('[music_insert]',url_list.length)
        Db.db.all(sql_quary,  (err, exits_urls)=>{
            
            exits_urls = exits_urls.map(v=>v.url)
            console.log('들어있는 목록',exits_urls.slice(0,2), exits_urls.length)
            
            url_list.forEach(_url=>{
                if (exits_urls.includes(_url)) return
                //if ( _url.includes('\'') || _url.includes('\"') || _url.includes('\`') ) return;
                var sql_quary = `INSERT INTO music (url) VALUES ("${_url}");`
                //console.log('sql_quary',sql_quary)
                Db.db.run(sql_quary);
            })

            callback()
    }); 
    },
    update_music_all:()=>{
        console.log('[update_music_all]')
        this.Db.update_music_all_paly = true;
        var sql_quary = 'SELECT url FROM music WHERE name IS NULL;'
        Db.db.all(sql_quary,  (err, exits_urls)=>{
            exits_urls = exits_urls.map(v=>v.url)
            var cnt = 0
            Db.db.setint = setInterval(() => {
                if (cnt>=exits_urls.length){
                    this.Db.update_music_all_paly = false;
                    clearInterval(Db.db.setint);
                }
                
                this.Db.upadte_music(exits_urls[cnt],()=>{})
                cnt++;
            }, 200);
        })
        
    },
    upadte_music:(url,callback)=>{
        var file = fs.readFileSync(url);
        var dru = MP3_parse(file)
        var id3 = ID3v2_parse(file)
        
        //console.log(id,dru)
        
        var sql_quary = `UPDATE music SET file_len=${dru.file_len}, duration=${dru.duration}, frequency=${dru.frequency}, blank_start=${dru.s}, blank_end=${dru.e} WHERE url="${url}";`
        console.log(url)
        Db.db.run(sql_quary);

        var [제목, 가수, 엘범, 트렉, 연도, 장르, 엘범아트, 가사] = [id3.제목, id3.가수, id3.엘범, id3.트렉, id3.연도, id3.장르, id3.엘범아트,  id3.가사]


        var melon_album_id, melon_music_id;

        if (제목 && id3.가수 && 엘범 && 가사 && 트렉 && 연도 && 장르 && 엘범아트){
        }else{
            //멜론에서 곡정보 받아오기.
            var tmp = url.split('/')
            tmp = tmp[tmp.length-1].split('\\')
            var search_name = tmp[tmp.length-1]
            
            //id3 = 멜론
        }

        var sql_quary = `SELECT id FROM music WHERE url="${url}" ;`
        Db.db.all(sql_quary,  (err, ids)=>{
            if (!ids){
                console.error('[upadte_music] - id 목찾음 !',url, ids)
                return;
            }
            var id = ids[0].id

            Db.update_singer(id, id3.가수)
            var album_id = Db.update_album(id, 가수, 엘범, 연도, 장르, 엘범아트, melon_album_id)
            
            if(제목) Db.db.run(`UPDATE music SET name="${제목}" WHERE id="${id}"`);
            //if(album_id) Db.db.run(`UPDATE music SET album_id=${album_id} WHERE id="${id}"`);
            if(가사) Db.db.run(`UPDATE music SET lyric="${가사}" WHERE id="${id}"`);
            if(장르) Db.db.run(`UPDATE music SET genre="${장르}" WHERE id="${id}"`);
            if(연도) Db.db.run(`UPDATE music SET year=${연도} WHERE id="${id}"`);
            if(트렉) Db.db.run(`UPDATE music SET track=${트렉} WHERE id="${id}"`);
        })


    },update_singer:(music_id, singers)=>{
        if (!singers) return
        console.log('[fn | update_singer]',music_id, singers)
        singers.forEach(singer_name=>{

            console.log('[sin - ude]',singer_name,`SELECT id FROM singer WHERE name="${singer_name}" ;`)
            Db.db.all(`SELECT id FROM singer WHERE name="${singer_name}" ;`,  (err, ids)=>{
                console.log('응답 - ids',ids)

                var 관계추가 = ()=>{
                    Db.db.all(`SELECT id FROM singer WHERE name="${singer_name}" ;`,  (err, ids)=>{
                        console.log('응답 - 다시, ids',singer_name,ids)
                        singer_id = ids[0].id;
                        console.log('[singer_id]',singer_id)
                        var sql_quary = `INSERT INTO music_singer_map (music_id, singer_id) VALUES (${music_id}, ${singer_id}) ;`
                        Db.db.run(sql_quary);
            
                    })
                }
                if (!ids.length){
                    sql_quary = `INSERT INTO singer (name) VALUES ("${singer_name}");`
                    console.log('짧아.',sql_quary)
                    Db.db.run(sql_quary,관계추가);
                }else 관계추가()
                
                
            })

        })


    },update_album:(id, singers, album_name, year, genre, albumart, melon_album_id)=>{
        if (!album_name) return
        console.log('[fn | update_album]',album_name)
        Db.db.all(`SELECT id FROM album WHERE name="${album_name}" ;`,  (err, ids)=>{
            console.log('ins0',ids)


            var 관계추가 = ()=>{
                console.log('ins2')
                Db.db.all(`SELECT id FROM album WHERE name="${album_name}" ;`,  (err, ids)=>{
                    console.log('ins3',ids)
                    if (!ids ||!ids.length){
                        console.log('엘범 정보없음!')
                        return;
                    }
                    var album_id = ids[0].id;


                    var sql_quary = `INSERT INTO album_music_map (album_id, music_id) VALUES (${album_id}, ${id}) ;`
                    Db.db.run(sql_quary);

                    singers.forEach(singer_name=>{
                        Db.db.all(`SELECT id FROM singer WHERE name="${singer_name}" ;`,  (err, ids)=>{
                            if (!ids){
                                console.log('엘범아트 -> 가수 연결 실패')
                                return;
                            }
                            singer_id = ids[0].id;
                            var sql_quary = `INSERT INTO album_singer_map (album_id, singer_id) VALUES (${album_id}, ${singer_id}) ;`
                             Db.db.run(sql_quary);
                        })
                    })
                    
        
                })
            }


            if (!ids||!ids.length){
                console.log('[엘범 정보 추가할거임!!]')
                
                Db.db.run(`INSERT INTO album (name, melon_id, genre, year, albumart) VALUES ($name, $melon_id, $genre, $year, $albumart);`,{
                    $name:album_name,
                    $melon_id: melon_album_id,
                    $genre: genre,
                    $year: year,
                    $albumart: Buffer.from(albumart, 'hex'),
                    
                }, 관계추가);
            }else 관계추가()
            
            
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