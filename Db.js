const  sqlite3 = require('sqlite3').verbose();
const fs = require('fs')
var l = fs.readdirSync('asset');


Db = {
    'db': new sqlite3.Database('asset/abcd.db'),
    'isnone':(callback)=>{
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
    'setting':(callback)=>{
        Db.db.serialize(()=>{

            Db.db.run("CREATE TABLE music (\
            id integer primary key autoincrement,\
            name TEXT,\
            melon_id INT(11),\
            album_id INT(11),\
            lyric TEXT(11),\
            url TEXT NOT NULL,\
            year INT(11),\
            track INT(11),\
            runtime INT(11),\
            blank_start INT(11),\
            blank_end INT(11)\
            );")
            
            Db.db.run("CREATE TABLE singer (\
                id INT(11) NOT NULL,\
                name TEXT NOT NULL,\
                PRIMARY KEY(id) \
            )")
                
            Db.db.run("CREATE TABLE album (\
                id INT(11) NOT NULL,\
                melon_id INT(11),\
                name TEXT NOT NULL,\
                albumart BLOB,\
                PRIMARY KEY(id) \
            );")

            Db.db.run("CREATE TABLE music_singer_map (\
                music_id INT(11) NOT NULL,\
                singer_id INT(11) NOT NULL\
            );")

            Db.db.run("CREATE TABLE album_singer_map (\
                singer_id INT(11) NOT NULL,\
                album_id INT(11) NOT NULL\
            )")

            callback()
        });

    },
    'music_insert':(url_list)=>{
        var sql_quary = `SELECT url FROM music;`
        Db.db.all(sql_quary,  (err, exits_urls)=>{
            console.log('들어있는 목록',exits_urls[0], exits_urls.length)
            url_list.forEach(_url=>{
                if (exits_urls.includes(_url)) return
                if ( _url.includes('\'') || _url.includes('\"') || _url.includes('\`') ) return;
                var sql_quary = `INSERT INTO music (url) VALUES ("${_url}");`
                //console.log('sql_quary',sql_quary)
                Db.db.run(sql_quary);
            })
    }); 
    },
    'update_music':()=>{
        var sql_quary = 'SELECT * FROM music WHERE name IS NULL;'
        Db.db.all(sql_quary,  (err, exits_urls)=>{
            var cnt = 0
            Db.db.setint = setInterval(() => {
                var file = fs.readFileSync(exits_urls[cnt]);
                //ID3, MP3분석
                //멜론 검색요청

                cnt++;
            }, 1000);
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