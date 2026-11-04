from django.db import migrations


SQL_FORWARD = """
CREATE OR REPLACE FUNCTION kardex_valorizado_inmutable()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'kardex_valorizado es inmutable: no se permite UPDATE ni DELETE';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kardex_valorizado_inmutable
BEFORE UPDATE OR DELETE ON kardex_valorizado
FOR EACH ROW EXECUTE FUNCTION kardex_valorizado_inmutable();
"""

SQL_REVERSE = """
DROP TRIGGER IF EXISTS trg_kardex_valorizado_inmutable ON kardex_valorizado;
DROP FUNCTION IF EXISTS kardex_valorizado_inmutable();
"""


class Migration(migrations.Migration):
    dependencies = [
        ("kardex", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(SQL_FORWARD, SQL_REVERSE),
    ]
