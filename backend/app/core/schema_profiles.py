"""Current profile API. V1, V2 and V3 remain frozen for existing histories.

Future physical contract changes require a new version and reviewed revisions;
never modify schema_profiles_v1 after adopting d0001.
"""
from app.core.schema_profiles_v1 import (
    ENUMS, DEBIAN_TIMESTAMPS, FROZEN_NAIVE, DEBIAN_FKS,
    fk_matches,
)
from app.core.schema_profiles_v4 import apply_profile, metadata_for_profile
