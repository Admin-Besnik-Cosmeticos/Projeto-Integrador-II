ALTER TABLE pedidos
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'Pendente';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'pedidos_status_check'
          AND conrelid = 'pedidos'::regclass
    ) THEN
        ALTER TABLE pedidos
            ADD CONSTRAINT pedidos_status_check
            CHECK (status IN (
                'Pendente',
                'Em Preparo',
                'Pago',
                'Enviado',
                'Entregue',
                'Cancelado'
            ));
    END IF;
END;
$$;
