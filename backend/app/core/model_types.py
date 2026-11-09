"""Application datetime contract: aware UTC values, without rewriting stored rows."""
from datetime import timezone
from sqlalchemy import DateTime
from sqlalchemy.types import TypeDecorator


class UTCDateTime(TypeDecorator):
    """TIMESTAMPTZ mapping, also reads the frozen fresh profile's UTC-naive fields.

    Fresh-profile connections must use UTC. Only that documented profile treats
    naive database values as UTC; no SQL type/data conversion is performed here.
    """
    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Datetime writes require an explicit timezone.")
        return value.astimezone(timezone.utc)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
