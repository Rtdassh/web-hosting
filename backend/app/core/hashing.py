"""
Funciones puras de hashing de contraseñas.
No dependen de FastAPI, base de datos ni modelos.
"""
from passlib.context import CryptContext

# Hashing seguro con Bcrypt (RNF-06: factor de coste estándar)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contraseña en texto plano contra su hash bcrypt."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Genera un hash bcrypt seguro de la contraseña proporcionada."""
    return pwd_context.hash(password)
