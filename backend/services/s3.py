"""
AWS S3 Service - העלאה והורדת מדיה (תמונות/סרטונים)
"""

import boto3
import os
from botocore.exceptions import ClientError
from botocore.config import Config

AWS_REGION     = os.getenv("AWS_REGION", "eu-central-1")
S3_BUCKET      = os.getenv("S3_BUCKET", "concretetrack-media")
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")

PRESIGNED_TTL = 3600

_s3 = None


def _get_s3():
    global _s3
    if _s3 is None:
        _s3 = boto3.client(
            "s3",
            region_name=AWS_REGION,
            aws_access_key_id=AWS_ACCESS_KEY,
            aws_secret_access_key=AWS_SECRET_KEY,
            config=Config(signature_version="s3v4")
        )
    return _s3


async def upload_to_s3(key: str, content: bytes, content_type: str) -> str:
    try:
        _get_s3().put_object(
            Bucket=S3_BUCKET,
            Key=key,
            Body=content,
            ContentType=content_type,
        )
        return key
    except ClientError as e:
        raise RuntimeError(f"S3 upload failed: {e}")


async def get_presigned_url(key: str) -> str:
    try:
        url = _get_s3().generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET, "Key": key},
            ExpiresIn=PRESIGNED_TTL
        )
        return url
    except ClientError:
        return None


async def delete_from_s3(key: str) -> bool:
    try:
        _get_s3().delete_object(Bucket=S3_BUCKET, Key=key)
        return True
    except ClientError:
        return False
