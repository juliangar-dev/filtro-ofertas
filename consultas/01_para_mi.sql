SELECT id, puesto, zona, COALESCE(email, link) AS contacto
FROM ofertas
WHERE zona IN ('CABA', 'Argentina')
  AND exp_excluyente = 0
  AND (anios_exp IS NULL OR anios_exp <= 1)
  AND (nivel IS NULL OR nivel IN ('pasantía', 'jr'))
ORDER BY id;