"""Physical schema contract V3 for billing plans and subscription periods."""
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from app.core.schema_profiles_v2 import (
    apply_profile as apply_profile_v2,
    metadata_for_profile as metadata_for_profile_v2,
)


def _apply_v3_delta(metadata, profile):
    plans = metadata.tables["plans"]
    if "billing_period" not in plans.c:
        plans.append_column(
            sa.Column(
                "billing_period",
                sa.String(20),
                nullable=False,
                server_default="monthly",
            )
        )
    if "is_active" not in plans.c:
        plans.append_column(
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true"))
        )
    if "created_at" not in plans.c:
        plans.append_column(
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=profile == "debian",
                server_default=(
                    sa.text("CURRENT_TIMESTAMP") if profile == "debian" else None
                ),
            )
        )
    plans.c.billing_period.type = sa.String(20)
    plans.c.is_active.type = sa.Boolean()
    plans.c.created_at.type = sa.DateTime(timezone=True)
    plans.c.created_at.nullable = profile == "fresh"
    plans.c.created_at.server_default = (
        sa.text("CURRENT_TIMESTAMP") if profile == "debian" else None
    )

    subscriptions = metadata.tables["subscriptions"]
    if "start_date" not in subscriptions.c:
        subscriptions.append_column(
            sa.Column(
                "start_date",
                sa.DateTime(timezone=True),
                nullable=profile == "fresh",
                server_default=(
                    sa.text("CURRENT_TIMESTAMP") if profile == "debian" else None
                ),
            )
        )
    if "end_date" not in subscriptions.c:
        subscriptions.append_column(
            sa.Column("end_date", sa.DateTime(timezone=True), nullable=True)
        )
    if "auto_renew" not in subscriptions.c:
        subscriptions.append_column(
            sa.Column("auto_renew", sa.Boolean(), nullable=False, server_default=sa.text("false"))
        )
    subscriptions.c.start_date.type = sa.DateTime(timezone=True)
    subscriptions.c.start_date.nullable = profile == "fresh"
    subscriptions.c.start_date.server_default = (
        sa.text("CURRENT_TIMESTAMP") if profile == "debian" else None
    )
    subscriptions.c.end_date.type = sa.DateTime(timezone=True)
    subscriptions.c.auto_renew.type = sa.Boolean()
    for name in ("current_period_start", "current_period_end"):
        if name not in subscriptions.c:
            subscriptions.append_column(
                sa.Column(name, sa.DateTime(timezone=True), nullable=True)
            )
        else:
            subscriptions.c[name].type = sa.DateTime(timezone=True)
    invoices = metadata.tables["invoices"]
    if "pdf_metadata" not in invoices.c:
        invoices.append_column(sa.Column("pdf_metadata", JSONB(), nullable=True))
    else:
        invoices.c.pdf_metadata.type = JSONB()
    return metadata


def apply_profile(metadata, profile):
    if profile not in {"fresh", "debian"}:
        raise ValueError("Unknown schema profile.")
    apply_profile_v2(metadata, profile)
    return _apply_v3_delta(metadata, profile)


def metadata_for_profile(source, profile):
    if profile not in {"fresh", "debian"}:
        raise ValueError("Unknown schema profile.")
    metadata = metadata_for_profile_v2(source, profile)
    return _apply_v3_delta(metadata, profile)
