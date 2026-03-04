import os

auth_path = r'c:\Users\asus\Desktop\lumina-app\backend\app\routers\auth.py'

with open(auth_path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'def export_data' not in content:
    export_code = '''
@router.get("/export", summary="Export all user data")
async def export_data(
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"Export all user data (JSON).\"\"\"
    user_id = current_user.user_id
    
    # Very basic export of user profile
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "user": {
            "email": user.email,
            "full_name": user.full_name,
            "created_at": user.created_at.isoformat() if user.created_at else None
        },
        "message": "Data export will be fully expanded in future updates."
    }
'''
    content += '\n' + export_code
    with open(auth_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added export route.")
