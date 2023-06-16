import { Mp3_split } from './mp3_split'
import { readFileSync, writeFileSync } from 'fs';
const mp3File = readFileSync(__dirname+'/A-ha - Take On Me.mp3')
console.log('Mp3_split:',Mp3_split, Mp3_split)
const mp3_split = new Mp3_split(mp3File, 1, 60, (k:any)=>{console.log('[create]',k); return k}, ()=>{console.log('[remove]');});

mp3_split.create_m3u8().then(()=>{
    
    for (let i=0; i<10; i++) console.log('[mp3_split]',mp3_split.m3u8[i])
    for (let i=0; i<10; i++) writeFileSync(i+'.mp3',mp3_split.get_file(i))


    setTimeout(()=>{

    console.log('[setTimeout]',mp3_split.get_m3u8());
    }, 1000
    )
})

