"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cropToSquare = void 0;
const sharp = require("sharp");
function cropToSquare(imageData, targetWidth, targetHeight) {
    return __awaiter(this, void 0, void 0, function* () {
        targetWidth = Number(targetWidth);
        targetHeight = Number(targetHeight);
        // console.log('[targetHeight]',targetHeight, targetWidth)
        if (targetWidth > 3000 || targetHeight > 3000)
            throw ("에러 - 크기");
        try {
            // 이미지 로드
            const image = sharp(imageData);
            // 이미지의 메타데이터 가져오기
            const metadata = yield image.metadata();
            // 원본 이미지의 가로길이와 세로길이
            const originalWidth = metadata.width || 0;
            const originalHeight = metadata.height || 0;
            // console.log('[originalWidth]',originalWidth, originalHeight)
            // 가로길이와 세로길이 비율 계산
            const originalAspectRatio = originalWidth / originalHeight;
            const targetAspectRatio = targetWidth / targetHeight;
            // 확대/축소할 비율 결정
            let resizeRatio;
            // if (targetAspectRatio < 1) {
            // } else {
            //   resizeRatio = ;
            // }
            resizeRatio = Math.max(targetHeight / originalHeight, targetWidth / originalWidth);
            // console.log('[resizeRatio]',resizeRatio, Math.round(originalWidth * resizeRatio), Math.round(originalHeight * resizeRatio))
            // 이미지 확대/축소
            const resizedImage = sharp(yield image.resize(Math.round(originalWidth * resizeRatio), Math.round(originalHeight * resizeRatio)).toBuffer());
            const resizemetadata = yield resizedImage.metadata();
            // 중앙 부분 좌표 계산
            const left = Math.max(0, Math.round((resizemetadata.width - targetWidth) / 2));
            const top = Math.max(0, Math.round((resizemetadata.height - targetHeight) / 2));
            // console.log('[left,top]',left,top)
            // console.log('[resize-size',resizemetadata.width,  resizemetadata.height)
            // 이미지 잘라내기
            return resizedImage.extract({ left, top, width: targetWidth, height: targetHeight }).toBuffer();
        }
        catch (error) {
            console.error('이미지 잘라내기 오류:', error);
        }
    });
}
exports.cropToSquare = cropToSquare;
