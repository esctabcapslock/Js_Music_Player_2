const File_list = require('./File_list.js').File_list
const Db = require('./Db.js').Db

File_list.readsetting()
File_list.findfile(()=>{
    Db.isnone((flag)=>{
        console.log('db is none?',flag);
    
        var ins_and_update = ()=>{
            Db.music_insert(File_list.file_list, ()=>{
                Db.update_music_all()
            })
        }
    
        if (flag) Db.setting(ins_and_update)
        else ins_and_update()
        
    })
    
    
    console.log('File_list.file_list.length',File_list.file_list.length)

})


