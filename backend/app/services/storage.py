import uuid
from typing import BinaryIO
import boto3
from botocore.config import Config
from app.core.config import settings


class StorageService:
    def __init__(self):
        self.s3 = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL or None,
            aws_access_key_id=settings.S3_ACCESS_KEY_ID,
            aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
            region_name=settings.S3_REGION,
            config=Config(signature_version="s3v4"),
        )
        self.bucket = settings.S3_BUCKET_NAME

    def ensure_bucket(self):
        try:
            self.s3.head_bucket(Bucket=self.bucket)
        except Exception:
            self.s3.create_bucket(Bucket=self.bucket)

    def upload_file(
        self, file_data: BinaryIO, agency_id, filename: str,
        content_type: str = "application/pdf", use_raw_key: bool = False,
    ) -> str:
        if use_raw_key:
            s3_key = filename
        else:
            s3_key = f"agencies/{agency_id}/documents/{uuid.uuid4()}/{filename}"
        self.s3.upload_fileobj(
            file_data,
            self.bucket,
            s3_key,
            ExtraArgs={
                "ContentType": content_type,
                "ServerSideEncryption": "AES256",
            },
        )
        return s3_key

    def download_file(self, s3_key: str) -> bytes:
        response = self.s3.get_object(Bucket=self.bucket, Key=s3_key)
        return response["Body"].read()

    def delete_file(self, s3_key: str):
        self.s3.delete_object(Bucket=self.bucket, Key=s3_key)

    def generate_presigned_url(self, s3_key: str, expiration: int = 3600) -> str:
        return self.s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": s3_key},
            ExpiresIn=expiration,
        )


storage_service = StorageService()
