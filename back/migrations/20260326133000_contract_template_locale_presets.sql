-- Contract templates: per-template locale, tenant jurisdiction (country), system preset catalog.

ALTER TABLE tenant ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) NULL;

ALTER TABLE staff_contract_template ADD COLUMN IF NOT EXISTS locale VARCHAR(16) NULL;

CREATE TABLE IF NOT EXISTS staff_contract_template_preset (
    id SERIAL PRIMARY KEY,
    region_code VARCHAR(8) NOT NULL,
    locale VARCHAR(16) NOT NULL,
    template_key VARCHAR(64) NOT NULL,
    name VARCHAR(256) NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    kind staff_contract_kind NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_staff_contract_template_preset_region_locale_key UNIQUE (region_code, locale, template_key)
);

CREATE INDEX IF NOT EXISTS ix_staff_contract_template_preset_region ON staff_contract_template_preset(region_code);
CREATE INDEX IF NOT EXISTS ix_staff_contract_template_preset_locale ON staff_contract_template_preset(locale);

-- Seeded presets (idempotent). region_code: ISO 3166-1 alpha-2 or * = global fallback.
INSERT INTO staff_contract_template_preset (region_code, locale, template_key, name, body, kind) VALUES
(
    'ES',
    'es',
    'es_empleado_temporal',
    'Contrato temporal — España (modelo orientativo)',
    $ctes$
<h1>Contrato de trabajo temporal (modelo orientativo)</h1>
<p><em>Documento de ejemplo con {{placeholders}}; no sustituye asesoramiento legal.</em></p>
<p>Entre <strong>{{employer_name}}</strong>, con domicilio en {{employer_address}} e identificación fiscal {{employer_tax_id}}, en adelante la empresa, y <strong>{{worker_name}}</strong> ({{worker_email}}), en adelante el trabajador, se acuerda lo siguiente:</p>
<h2>1. Objeto y categoría profesional</h2>
<p>El trabajador prestará sus servicios como <strong>{{role_title}}</strong> (contrato de naturaleza {{kind}}).</p>
<h2>2. Duración</h2>
<p>Fecha de inicio: {{start_date}}. Fecha de finalización (si procede): {{end_date}}.</p>
<h2>3. Retribución</h2>
<p>{{compensation_summary}}</p>
<h2>4. Pagos y condiciones</h2>
<p>{{payment_terms}}. Estructura de pago: {{payment_structure}}.</p>
<h2>5. Legislación y notas</h2>
<p>{{jurisdiction_note}}</p>
<p>Versión del expediente: {{contract_version}} · Estado: {{contract_status}}.</p>
$ctes$,
    'employee'
),
(
    'IN',
    'en',
    'in_employee_basic',
    'Employment agreement — India (sample outline)',
    $ctin$
<h1>Employment agreement (sample outline)</h1>
<p><em>Example template with {{placeholders}}; seek local legal review before use.</em></p>
<p>This agreement is between <strong>{{employer_name}}</strong> (address: {{employer_address}}, tax ID: {{employer_tax_id}}) and <strong>{{worker_name}}</strong> ({{worker_email}}).</p>
<h2>1. Role</h2>
<p>The worker will serve as <strong>{{role_title}}</strong> ({{kind}}).</p>
<h2>2. Term</h2>
<p>Start date: {{start_date}}. End date (if fixed-term): {{end_date}}.</p>
<h2>3. Compensation</h2>
<p>{{compensation_summary}}</p>
<h2>4. Payment terms</h2>
<p>{{payment_terms}}. Payment structure: {{payment_structure}}.</p>
<h2>5. Jurisdiction / notes</h2>
<p>{{jurisdiction_note}}</p>
<p>Record version: {{contract_version}} · Status: {{contract_status}}.</p>
$ctin$,
    'employee'
),
(
    '*',
    'en',
    'en_employee_basic',
    'Basic employment template (English)',
    $cten$
<h1>Employment contract (basic template)</h1>
<p><em>Sample only — adapt to your jurisdiction and obtain legal advice.</em></p>
<p>Between <strong>{{employer_name}}</strong> ({{employer_address}}, tax ID {{employer_tax_id}}) and <strong>{{worker_name}}</strong> ({{worker_email}}).</p>
<h2>1. Position</h2>
<p>Title: <strong>{{role_title}}</strong>. Type: {{kind}}.</p>
<h2>2. Dates</h2>
<p>Start: {{start_date}}. End (if any): {{end_date}}.</p>
<h2>3. Compensation</h2>
<p>{{compensation_summary}}</p>
<h2>4. Payment</h2>
<p>{{payment_terms}} (structure: {{payment_structure}}).</p>
<h2>5. Other</h2>
<p>{{jurisdiction_note}}</p>
<p>Version {{contract_version}} · {{contract_status}}</p>
$cten$,
    'employee'
)
ON CONFLICT (region_code, locale, template_key) DO NOTHING;
