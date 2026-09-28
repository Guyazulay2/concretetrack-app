"""
Cloudinary Service - העלאת תמונות וסרטונים
pip install cloudinary
"""

import cloudinary
import cloudinary.uploader
import cloudinary.api
import os

cloudinary.config(
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key    = os.getenv("CLOUDINARY_API_KEY"),
    api_secret = os.getenv("CLOUDINARY_API_SECRET"),
    secure     = True
)

FOLDER = "concretetrack"


async def upload_media(file_bytes: bytes, filename: str, content_type: str) -> dict:
    """
    מעלה קובץ ל-Cloudinary.
    מחזיר: { url, public_id, media_type, thumbnail_url }
    """
    is_video   = content_type.startswith("video")
    media_type = "video" if is_video else "image"
    resource_type = "video" if is_video else "image"

    result = cloudinary.uploader.upload(
        file_bytes,
        folder          = FOLDER,
        public_id       = filename.rsplit(".", 1)[0],
        resource_type   = resource_type,
        # תמונות: שמור מקסימום 1920px, compress אוטומטי
        transformation  = [{"quality": "auto", "fetch_format": "auto"}] if not is_video else [],
        overwrite       = False,
    )

    # Thumbnail לסרטון - פריים ראשון
    thumbnail_url = None
    if is_video:
        thumbnail_url = cloudinary.utils.cloudinary_url(
            result["public_id"],
            resource_type = "video",
            format        = "jpg",
            transformation = [{"width": 320, "height": 240, "crop": "fill"}]
        )[0]

    return {
        "url":           result["secure_url"],
        "public_id":     result["public_id"],
        "media_type":    media_type,
        "thumbnail_url": thumbnail_url or result["secure_url"],
    }


async def delete_media(public_id: str, media_type: str = "image") -> bool:
    try:
        resource_type = "video" if media_type == "video" else "image"
        cloudinary.uploader.destroy(public_id, resource_type=resource_type)
        return True
    except Exception:
        return False


def get_thumbnail(public_id: str, width: int = 320, height: int = 240) -> str:
    """URL מוקטן לתצוגה בטבלה"""
    return cloudinary.utils.cloudinary_url(
        public_id,
        transformation=[{"width": width, "height": height, "crop": "fill", "quality": "auto"}]
    )[0]
