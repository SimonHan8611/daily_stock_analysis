# -*- coding: utf-8 -*-
"""
===================================
认证与鉴权服务 (Auth Service)
===================================

职责：
1. 密码哈希与验证 (bcrypt)
2. JWT 签发与验证
3. 用户认证核心逻辑
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
import jwt
import bcrypt

logger = logging.getLogger(__name__)

# JWT 配置
JWT_ALGORITHM = "HS256"
# JWT_SECRET: 从环境变量读取，或者使用 _get_session_secret 逻辑生成
# 在实际项目中应确保环境变量 JWT_SECRET 安全配置

def get_jwt_secret() -> str:
    """获取 JWT 签名密钥"""
    secret = os.getenv("JWT_SECRET")
    if not secret:
        # Fallback to the existing session secret generation mechanism if JWT_SECRET is not set
        from src.auth import _load_session_secret
        secret_bytes = _load_session_secret()
        if secret_bytes:
            return secret_bytes.hex()
        # Fallback to a hardcoded string ONLY for dev/testing. This should never happen in production if storage works.
        logger.warning("JWT_SECRET is not set and could not load session secret. Using fallback. This is unsafe for production.")
        return "fallback-secret-key-change-me"
    return secret

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证明文密码与哈希值是否匹配"""
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception as e:
        logger.error(f"Password verification failed: {e}")
        return False

def get_password_hash(password: str) -> str:
    """将明文密码转换为哈希值"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    创建 JWT 访问令牌
    
    Args:
        data: JWT payload 中的业务数据 (如 user_id, role)
        expires_delta: 令牌有效期
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # 默认 24 小时过期
        expire = datetime.utcnow() + timedelta(hours=24)
        
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, get_jwt_secret(), algorithm=JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    解析并验证 JWT 访问令牌
    
    Args:
        token: JWT 字符串
        
    Returns:
        解析后的 payload 字典，如果验证失败或过期则返回 None
    """
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("JWT token has expired")
        return None
    except jwt.PyJWTError as e:
        logger.warning(f"JWT validation failed: {e}")
        return None
