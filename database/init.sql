-- Conectar a la base de datos correcta asegura que se ejecuta en: ticketsdb
-- \c ticketsdb; -- Comentado, ya que el entrypoint lo hace basado en POSTGRES_DB

-- Crear la tabla de usuarios SI NO EXISTE
CREATE TABLE IF NOT EXISTS users (
    firebase_uid TEXT PRIMARY KEY,
    name TEXT,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mensaje informativo en los logs de PostgreSQL
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE 'Table users created.';
    ELSE
        RAISE NOTICE 'Table users already exists.';
    END IF;
END $$;


-- Crear la tabla de validaciones de tickets SI NO EXISTE
CREATE TABLE IF NOT EXISTS ticket_validations (
    validation_id SERIAL PRIMARY KEY,
    ticket_number TEXT NOT NULL,
    validated_by_uid TEXT NOT NULL, -- FK se añade después si la tabla users ya existe
    validation_status TEXT NOT NULL CHECK (validation_status IN ('validated', 'not_found', 'owner_mismatch', 'validation_failed')),
    validation_details TEXT,
    ticket_name TEXT,
    event_name TEXT,
    validated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mensaje informativo en los logs de PostgreSQL
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_validations') THEN
        RAISE NOTICE 'Table ticket_validations created.';
    ELSE
        RAISE NOTICE 'Table ticket_validations already exists.';
    END IF;
END $$;


-- Añadir la Foreign Key SI NO EXISTE (más seguro hacerlo después de crear ambas tablas)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_ticket_validations_user' AND table_name = 'ticket_validations'
    ) THEN
        ALTER TABLE ticket_validations
        ADD CONSTRAINT fk_ticket_validations_user
        FOREIGN KEY (validated_by_uid) REFERENCES users(firebase_uid) ON DELETE CASCADE;

        RAISE NOTICE 'Foreign key fk_ticket_validations_user added.';
    ELSE
         RAISE NOTICE 'Foreign key fk_ticket_validations_user already exists.';
    END IF;
END $$;


-- Crear índices SI NO EXISTEN
CREATE INDEX IF NOT EXISTS idx_ticket_validations_ticket_number ON ticket_validations(ticket_number);
CREATE INDEX IF NOT EXISTS idx_ticket_validations_validated_by_uid ON ticket_validations(validated_by_uid);

DO $$ BEGIN
    RAISE NOTICE 'Indexes checked/created.';
END $$;