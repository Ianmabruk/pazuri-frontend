import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    _db_url = os.getenv('DATABASE_URL', 'sqlite:///pazurifish.db')
    # Render/Supabase/Neon provide postgres:// or postgresql:// — force psycopg2 driver
    if _db_url.startswith('postgres://'):
        _db_url = _db_url.replace('postgres://', 'postgresql+psycopg2://', 1)
    elif _db_url.startswith('postgresql://') and '+' not in _db_url.split('://')[0]:
        _db_url = _db_url.replace('postgresql://', 'postgresql+psycopg2://', 1)
    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'development-secret-key')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'development-jwt-secret')
    CDN_BASE_URL = os.getenv('CDN_BASE_URL', '')
    JSON_SORT_KEYS = False
