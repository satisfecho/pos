-- Staff / HR contracts (employee vs freelancer), versions, signed document metadata.
-- Files live under uploads/{tenant_id}/contracts/ and are served only via authenticated API.

DO $$ BEGIN
    CREATE TYPE staff_contract_kind AS ENUM ('employee', 'freelancer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE staff_contract_status AS ENUM (
        'draft',
        'pending_signature',
        'active',
        'expired',
        'superseded'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE staff_contract_payment_structure AS ENUM ('payroll', 'invoice');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS staff_contract (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    contract_group_id UUID NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    subject_user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
    kind staff_contract_kind NOT NULL,
    status staff_contract_status NOT NULL DEFAULT 'draft',
    role_title VARCHAR(256) NOT NULL DEFAULT '',
    start_date DATE,
    end_date DATE,
    compensation_summary TEXT,
    tax_identifier_subject VARCHAR(128),
    payment_structure staff_contract_payment_structure NOT NULL DEFAULT 'payroll',
    payment_terms TEXT,
    jurisdiction_note TEXT,
    template_key VARCHAR(64),
    notes_internal TEXT,
    document_filename VARCHAR(512),
    document_uploaded_at TIMESTAMP WITH TIME ZONE,
    created_by_user_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_contract_group_version
    ON staff_contract (contract_group_id, version);

CREATE INDEX IF NOT EXISTS ix_staff_contract_tenant_id ON staff_contract (tenant_id);
CREATE INDEX IF NOT EXISTS ix_staff_contract_subject_user_id ON staff_contract (subject_user_id);
CREATE INDEX IF NOT EXISTS ix_staff_contract_tenant_group ON staff_contract (tenant_id, contract_group_id);
