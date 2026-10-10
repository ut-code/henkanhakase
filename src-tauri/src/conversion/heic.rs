use heif_oxide::{decode_file, Pixels};
use image::{DynamicImage, ImageFormat, RgbImage, RgbaImage};
use std::path::Path;

use super::types::{ConversionOptions, FileFormat, MediaDimensions};
use super::ConversionError;
use crate::conversion::ErrorCode;

/// HEICファイルをデコードして DynamicImage に変換する内部関数
fn decode_heic(input_path: &Path) -> Result<DynamicImage, ConversionError> {
    // decode_file 関数でパスから直接デコード
    let image =
        decode_file(input_path).map_err(|_| ConversionError::new(ErrorCode::ConversionFailed))?;

    let width = image.width;
    let height = image.height;

    // ピクセル形式（Pixels enum）に応じた変換
    match image.pixels {
        Pixels::Rgb8(data) => {
            let img = RgbImage::from_raw(width, height, data)
                .ok_or_else(|| ConversionError::new(ErrorCode::ConversionFailed))?;
            Ok(DynamicImage::ImageRgb8(img))
        }
        Pixels::Rgba8(data) => {
            let img = RgbaImage::from_raw(width, height, data)
                .ok_or_else(|| ConversionError::new(ErrorCode::ConversionFailed))?;
            Ok(DynamicImage::ImageRgba8(img))
        }
        _ => Err(ConversionError::new(ErrorCode::ConversionFailed)),
    }
}

/// HEIC -> PNG/JPEG/WebP への直接変換処理
pub fn convert_heic(
    input_path: &Path,
    output_path: &Path,
    output_format: FileFormat,
    options: &ConversionOptions,
) -> Result<(), ConversionError> {
    let mut img = decode_heic(input_path)?;

    // リサイズ処理 (オプションが設定されている場合)
    if let (Some(w), Some(h)) = (options.width, options.height) {
        let filter = if options.anti_aliasing.unwrap_or(true) {
            image::imageops::FilterType::Lanczos3
        } else {
            image::imageops::FilterType::Nearest
        };
        img = img.resize_exact(w, h, filter);
    }

    match output_format {
        FileFormat::Png => {
            img.save_with_format(output_path, ImageFormat::Png)
                .map_err(|_| ConversionError::new(ErrorCode::ConversionFailed))?;
        }
        FileFormat::Jpeg => {
            // JPEGはアルファチャンネル非対応のためRGB8に変換
            let rgb_img = img.to_rgb8();
            rgb_img
                .save_with_format(output_path, ImageFormat::Jpeg)
                .map_err(|_| ConversionError::new(ErrorCode::ConversionFailed))?;
        }
        FileFormat::Webp => {
            img.save_with_format(output_path, ImageFormat::WebP)
                .map_err(|_| ConversionError::new(ErrorCode::ConversionFailed))?;
        }
        _ => {
            return Err(ConversionError::new(ErrorCode::InvalidOptions));
        }
    }

    Ok(())
}

/// HEICの画像解像度を取得する
pub fn probe_heic_dimensions(input_path: &Path) -> Result<MediaDimensions, ConversionError> {
    let img = decode_heic(input_path)?;
    Ok(MediaDimensions {
        width: img.width(),
        height: img.height(),
    })
}

/// HEIC画像からサムネイル用JPEGバイトデータを生成する
pub fn generate_heic_thumbnail(input_path: &Path) -> Result<Vec<u8>, ConversionError> {
    let img = decode_heic(input_path)?;
    let thumbnail = img.thumbnail(640, 640);

    let mut buffer = std::io::Cursor::new(Vec::new());
    thumbnail
        .to_rgb8()
        .write_to(&mut buffer, ImageFormat::Jpeg)
        .map_err(|_| ConversionError::new(ErrorCode::ThumbnailFailed))?;

    Ok(buffer.into_inner())
}
