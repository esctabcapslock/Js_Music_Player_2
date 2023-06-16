import * as sharp from 'sharp';
import * as fs from 'fs';

export async function cropToSquare(imageData: Buffer, targetWidth: number, targetHeight:number): Promise<Buffer> {
    targetWidth = Number(targetWidth)
    targetHeight = Number(targetHeight)
    // console.log('[targetHeight]',targetHeight, targetWidth)
    if (targetWidth>3000 || targetHeight>3000) throw("에러 - 크기")
  try {
    // 이미지 로드
    const image = sharp(imageData);

    // 이미지의 메타데이터 가져오기
    const metadata = await image.metadata();

    // 원본 이미지의 가로길이와 세로길이
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;

    // console.log('[originalWidth]',originalWidth, originalHeight)
    // 가로길이와 세로길이 비율 계산
    const originalAspectRatio = originalWidth / originalHeight;
    const targetAspectRatio = targetWidth / targetHeight;

    // 확대/축소할 비율 결정
    let resizeRatio: number;
    // if (targetAspectRatio < 1) {
    // } else {
    //   resizeRatio = ;
    // }
    resizeRatio = Math.max(  targetHeight / originalHeight, targetWidth / originalWidth);

    // console.log('[resizeRatio]',resizeRatio, Math.round(originalWidth * resizeRatio), Math.round(originalHeight * resizeRatio))

    // 이미지 확대/축소
    const resizedImage = sharp(await image.resize(Math.round(originalWidth * resizeRatio), Math.round(originalHeight * resizeRatio)).toBuffer());
    const resizemetadata = await resizedImage.metadata()

    // 중앙 부분 좌표 계산
    const left = Math.max(0, Math.round((resizemetadata.width - targetWidth) / 2));
    const top = Math.max(0, Math.round((resizemetadata.height - targetHeight) / 2));

    // console.log('[left,top]',left,top)
    // console.log('[resize-size',resizemetadata.width,  resizemetadata.height)
    // 이미지 잘라내기
    return resizedImage.extract({ left, top, width: targetWidth, height: targetHeight }).toBuffer()
  } catch (error) {
    console.error('이미지 잘라내기 오류:', error);
  }
}
