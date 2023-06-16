"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mp3_split_1 = require("./mp3_split");
const fs_1 = require("fs");
const mp3File = (0, fs_1.readFileSync)(__dirname + '/A-ha - Take On Me.mp3');
console.log('Mp3_split:', mp3_split_1.Mp3_split, mp3_split_1.Mp3_split);
const mp3_split = new mp3_split_1.Mp3_split(mp3File, 1, 60, (k) => { console.log('[create]', k); return k; }, () => { console.log('[remove]'); });
mp3_split.create_m3u8().then(() => {
    for (let i = 0; i < 10; i++)
        console.log('[mp3_split]', mp3_split.m3u8[i]);
    for (let i = 0; i < 10; i++)
        (0, fs_1.writeFileSync)(i + '.mp3', mp3_split.get_file(i));
    setTimeout(() => {
        console.log('[setTimeout]', mp3_split.get_m3u8());
    }, 1000);
});
