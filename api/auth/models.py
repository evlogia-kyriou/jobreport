# auth/models.py

from dataclasses import dataclass
from enum import Enum

class UserRole(str, Enum):
    WORKER     = "worker"
    ADMIN      = "admin"
    SUPERVISOR = "supervisor"

@dataclass
class AuthenticatedUser:
    id:        str
    name:      str
    role:      UserRole
    is_active: bool
    email:     str