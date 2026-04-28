from fastapi import HTTPException, Depends
from auth import get_current_active_user, User

def get_current_role(current_user: User = Depends(get_current_active_user)):
    return current_user.role

def admin_only(current_user: User = Depends(get_current_active_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user.role