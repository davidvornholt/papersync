-- Timetable days now list distinct subject ids instead of period slots.
-- Collapse repeated periods to one entry in first-seen order and drop free
-- periods (null subject). The revision changes so open browsers reload.
UPDATE "school_settings"
SET
  "payload" = jsonb_set(
    "payload",
    '{timetable}',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'day', day_entry -> 'day',
            'subjectIds', COALESCE(
              (
                SELECT jsonb_agg(subject_id ORDER BY first_position)
                FROM (
                  SELECT slot ->> 'subjectId' AS subject_id, min(position) AS first_position
                  FROM jsonb_array_elements(day_entry -> 'slots') WITH ORDINALITY AS slots(slot, position)
                  WHERE slot ->> 'subjectId' IS NOT NULL
                  GROUP BY slot ->> 'subjectId'
                ) AS distinct_subjects
              ),
              '[]'::jsonb
            )
          )
          ORDER BY day_position
        )
        FROM jsonb_array_elements("payload" -> 'timetable') WITH ORDINALITY AS days(day_entry, day_position)
      ),
      '[]'::jsonb
    )
  ),
  "revision" = gen_random_uuid()::text
WHERE "payload" -> 'timetable' @> '[]'::jsonb
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements("payload" -> 'timetable') AS days(day_entry)
    WHERE day_entry ? 'slots'
  );
