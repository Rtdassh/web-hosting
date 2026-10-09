from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User, UserRole
from app.models.plan import Plan, Subscription
from app.schemas.user_schema import UserCreate, UserLogin, UserResponse, TokenResponse

router = APIRouter(prefix="/auth", tags=["Autenticación"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """RF-01: Registro de nuevos usuarios con rol Cliente y asignación de Plan Free."""
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un usuario registrado con este correo electrónico."
        )

    # Crear usuario
    db_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=UserRole.CLIENT,
        is_active=True,
        is_verified=True # Simulado para entorno local (RF-02)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Asignar suscripción Free por defecto (RF-08)
    free_plan = db.query(Plan).filter(Plan.name == "Free").first()
    if free_plan:
        sub = Subscription(user_id=db_user.id, plan_id=free_plan.id, status="active")
        db.add(sub)
        db.commit()

    return db_user

@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """RF-03: Autenticación segura y emisión de token JWT firmado."""
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales de acceso incorrectas.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Usuario inactivo.")

    access_token = create_access_token(subject=user.id, role=user.role.value)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

from app.core.security import get_current_user
from app.models.instance import Instance, InstanceStatus
from app.schemas.user_schema import UserMeResponse, PlanInfo

@router.get("/me", response_model=UserMeResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Obtiene el perfil del usuario autenticado y su cuota actual de instancias."""
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id, Subscription.status == "active").first()
    plan_info = None
    if sub and sub.plan:
        active_count = db.query(Instance).filter(
            Instance.user_id == current_user.id,
            Instance.status != InstanceStatus.FAILED
        ).count()
        plan_info = PlanInfo(
            name=sub.plan.name,
            max_instances=sub.plan.max_instances,
            max_ram_mb=sub.plan.max_ram_mb,
            cpu_quota=sub.plan.cpu_quota,
            active_instances=active_count,
            available_slots=max(0, sub.plan.max_instances - active_count)
        )
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
        "plan": plan_info
    }
