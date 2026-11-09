"""Validate a reviewed legacy manifest, complete payments and add three 80% tables."""
from alembic import context, op
from alembic_debian.reconcile import upgrade as reconcile
from alembic_debian.verify import require

revision = "d0001_adopt_debian"
down_revision = None
branch_labels = ("debian",)
depends_on = None


def upgrade():
    config = context.config
    evidence = config.attributes.get("debian_evidence")
    digest = config.attributes.get("debian_digest")
    require(evidence is not None and digest, "Reviewed manifest and evidence_sha256 are required.")
    reconcile(op.get_bind(), op, evidence, digest)


def downgrade():
    raise RuntimeError("Legacy adoption cannot be reversed by deleting data or schema.")
