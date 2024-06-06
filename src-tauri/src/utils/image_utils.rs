use exif::{In, Tag};
use image::{imageops, RgbImage, RgbaImage};
use std::io::Cursor;

#[derive(Debug)]
pub enum NoFixNeededReason {
    AleadyCorrect,
    ParsingError(String),
    NoExif,
    NoOrientationTag,
    InvalidOrientationTagValue(Option<u32>),
}

pub fn get_orientation(raw_image: &[u8]) -> Result<u32, NoFixNeededReason> {
    let reader = exif::Reader::new();
    let mut cursor = Cursor::new(&raw_image);
    let exif_data = reader
        .read_from_container(&mut cursor)
        .map_err(|err| match err {
            exif::Error::NotFound(_) => NoFixNeededReason::NoExif,
            _ => NoFixNeededReason::ParsingError(format!("{:?}", err)),
        })?;
    let exif_field = exif_data
        .get_field(Tag::Orientation, In::PRIMARY)
        .ok_or(NoFixNeededReason::NoOrientationTag)?;

    match exif_field.value.get_uint(0) {
        Some(1) => Err(NoFixNeededReason::AleadyCorrect),
        Some(value @ 2..=8) => Ok(value),
        other => Err(NoFixNeededReason::InvalidOrientationTagValue(other)),
    }
}

pub fn fix_orientation_rgb(mut image: RgbImage, orientation: u32) -> RgbImage {
    if orientation > 8 {
        return image;
    }
    // https://magnushoff.com/articles/jpeg-orientation/
    let _orientation = orientation - 1;

    if _orientation & 0b100 != 0 {
        // Flip diagonal
        image = imageops::rotate90(&image);
        imageops::flip_horizontal_in_place(&mut image);
    }

    if _orientation & 0b010 != 0 {
        imageops::rotate180_in_place(&mut image);
    }

    if _orientation & 0b001 != 0 {
        imageops::flip_horizontal_in_place(&mut image);
    }

    image
}

pub fn fix_orientation_rgba(mut image: RgbaImage, orientation: u32) -> RgbaImage {
    if orientation > 8 {
        return image;
    }
    // https://magnushoff.com/articles/jpeg-orientation/
    let _orientation = orientation - 1;

    if _orientation & 0b100 != 0 {
        // Flip diagonal
        image = imageops::rotate90(&image);
        imageops::flip_horizontal_in_place(&mut image);
    }

    if _orientation & 0b010 != 0 {
        imageops::rotate180_in_place(&mut image);
    }

    if _orientation & 0b001 != 0 {
        imageops::flip_horizontal_in_place(&mut image);
    }

    image
}
