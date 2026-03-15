# Optimización de almacenamiento en Supabase

El límite de la capa gratuita es **500 MB** en total (acumulativo). Para no saturarlo:

## Qué crece en tu base de datos

| Tabla          | Crecimiento |
|----------------|-------------|
| **players**    | Una fila por wallet (único). Crecimiento acotado por usuarios únicos. |
| **daily_visits** | **Una fila por jugador por día.** Crece cada día × cada jugador. Es el principal consumidor de espacio. |

Por tanto, el riesgo está en **daily_visits**: si no borras datos antiguos, la tabla crece sin tope.

---

## No se pierde información importante

Al ejecutar la limpieza **no se pierde** la información de “qué días fueron los más concurridos”:

1. **Antes de borrar**, la función `clean-old-visits` **archiva** el resumen por fecha en la tabla **`crowded_days_archive`** (una fila por fecha con el total de visitas).
2. **get-stats** combina datos recientes de `daily_visits` con el histórico de `crowded_days_archive`, así el leaderboard de "Crowded days" puede seguir mostrando los días más concurridos **de todo el histórico**.

Solo se eliminan las filas detalladas (jugador + fecha) antiguas; el resumen por fecha se conserva y ocupa muy poco (una fila por día).

---

## Tabla necesaria: `crowded_days_archive`

Créala una vez en Supabase (SQL Editor o migración):

```sql
CREATE TABLE IF NOT EXISTS crowded_days_archive (
  visit_date date PRIMARY KEY,
  visits integer NOT NULL DEFAULT 0
);
```

También está en `supabase/migrations/20250306000000_crowded_days_archive.sql` si usas migraciones.

---

## Acciones implementadas

### 1. Función de retención + archivo: `clean-old-visits`

1. **Archiva:** para cada fecha anterior a hace N días, cuenta visitas en `daily_visits` y guarda (visit_date, visits) en **crowded_days_archive**.
2. **Borra:** elimina de `daily_visits` todas las filas con `visit_date` anterior a esa fecha.

Así reduces el tamaño de `daily_visits` sin perder el histórico de “días más concurridos”.

**Despliegue** (si usas Supabase CLI):

```bash
supabase functions deploy clean-old-visits
```

**Uso manual** (POST con tu clave de servicio o anon):

```bash
curl -X POST "https://TU_PROYECTO.supabase.co/functions/v1/clean-old-visits" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_ANON_KEY" \
  -d '{"retention_days": 90}'
```

- **retention_days** (opcional): días a conservar en `daily_visits`. Por defecto **90**. Lo anterior se archiva y luego se borra.

**Recomendación:** ejecutar al menos **una vez al mes** (manual o cron).

### 2. get-stats: "Crowded days" con histórico completo

get-stats obtiene:

- **Recientes:** agregado de `daily_visits` (últimos 365 días).
- **Histórico:** todo lo que está en `crowded_days_archive`.

Une ambas listas, ordena por visitas y devuelve el top 5. El leaderboard sigue mostrando la información importante de todos los periodos.

---

## Acciones recomendadas (opcionales)

### Programar la limpieza (cron)

- **Supabase:** en planes de pago se puede usar **pg_cron** para ejecutar SQL periódico (p. ej. borrar filas antiguas). En gratis no está disponible.
- **Alternativa:** usar un cron externo (GitHub Actions, Vercel Cron, etc.) que haga POST a `clean-old-visits` una vez al mes.

### Índice en `daily_visits`

Si la tabla crece, conviene un índice por fecha para el borrado y para get-stats:

```sql
CREATE INDEX IF NOT EXISTS idx_daily_visits_visit_date ON daily_visits(visit_date);
```

(En el SQL Editor de Supabase.)

### Reducir columnas si no las usas

- **daily_visits:** si solo te importa “visitó ese día” y no la hora, podrías dejar de guardar `visit_time` (y quitarla del esquema en una migración). Ahorra unos bytes por fila.
- **players:** mantener solo las columnas que usa el juego y el leaderboard.

### Revisar tamaño periódicamente

En el dashboard de Supabase: **Settings → Database → Database size**. Si te acercas a 500 MB, reduce `retention_days` (p. ej. 60) o ejecuta `clean-old-visits` más a menudo.

---

## Resumen

1. **Retención:** ejecutar `clean-old-visits` con `retention_days: 90` (o 365) al menos una vez al mes.
2. **get-stats:** ya limitado a 365 días para "Crowded days"; no hace falta cambiar nada.
3. **Opcional:** índice en `daily_visits(visit_date)`, quitar `visit_time` si no la usas, y programar la limpieza con un cron externo.

Con esto el almacenamiento se mantiene controlado y puedes seguir dentro del límite de 500 MB.
