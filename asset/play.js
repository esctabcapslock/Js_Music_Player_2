//2
Player = {
    setup:()=>{
        Player.Audios[0].addEventListener('end',()=>{Player.change_audio()})
        Player.Audios[1].addEventListener('end',()=>{Player.change_audio()})

        Player.intervar = setInterval(()=>{




            var pre_audio = Player.Audios[Player.Audios_select]
            var pre_music = Player.musics[Player.Audios_select]
            
            if(!pre_music || pre_audio.paused) return;
            if (pre_audio.duration - pre_audio.currentTime - 144*pre_music.blank_end/pre_music.frequency*8){
                Player.playmusic()
            }

        },150)
    },
    speed:0,
    volume:0,
    Audios: [new Audio, new Audio],
    musics: [undefined, undefined],
    Audios_select:0,
    volume_master:()=>{},

    playmusic(){
        if(!Queue.list.length || Queue.top>=Queue.list.length ) return; // 재생할 곡이 없음

        console.log('[Player] [playmusic]')
        music = Queue.list[Queue.top++]
        if (isNaN(music.blank_start)) music.blank_start = 0
        if (isNaN(music.frequency)) music.frequency = 0
        if (isNaN(music.blank_end)) music.blank_end = 0
        // 멈춰있다가, 시작..
        if (Player.is_not_played() ){
            Player.Audios[Player.Audios_select].src = './data/'+music.id
            Player.Audios[Player.Audios_select].play()
            Player.Audios[Player.Audios_select].currentTime = 144*music.blank_start/music.frequency*8
            Player.musics[Player.Audios_select] = music

            //Player.Audios_select = Number(!Player.Audios_select)
        }
        else{ // 다음 오디오 설정함.
            var next = Number(!Player.Audios_select)
            Player.Audios[next].src = './data/'+music.id
            Player.Audios[next].currentTime = 144*music.blank_start/music.frequency*8
            Player.musics[next] = music
        }

    },
    change_audio(){
        console.log('[Player] [change_audio]')

        Player.Audios_select = Number(!Player.Audios_select)
        Player.Audios_select.play()

    },
    change_view(music){ // 가사, 엘범아트 등 변경.

    },is_not_played(){
        console.log('[Player] [is_not_played]')
        return (
            ( !Player.Audios[0].src && !Player.Audios[1].src ) ||
            ( Player.Audios[0].paused && Player.Audios[1].paused )     
        )
        // 주소가 없거나, 재생 x거나,
            
    }
    ,play(){
        console.log('[Player] [play]')
        var pre_audio = Player.Audios[Player.Audios_select]
        if(!pre_audio.src) return;

        else if(pre_audio.paused) pre_audio.play()
        else pre_audio.paused()
    }
}

123678654




