-- Tabla para guardar el resumen de visitas por fecha (antes de borrar daily_visits antiguos).
-- Así no se pierde la info de "qué días fueron los más concurridos".
CREATE TABLE IF NOT EXISTS crowded_days_archive (
  visit_date date PRIMARY KEY,
  visits integer NOT NULL DEFAULT 0
);

COMMENT ON TABLE crowded_days_archive IS 'Resumen histórico: total de visitas por día. Se rellena al ejecutar clean-old-visits antes de borrar filas antiguas de daily_visits.';
