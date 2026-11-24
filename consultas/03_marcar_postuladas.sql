-- Poné entre los paréntesis los mails a los que ya enviaste tu CV
UPDATE ofertas
SET postulado = 1
WHERE email IN ('seleccion@empresa-ejemplo.com.ar', 'cv@atencion-ejemplo.com.ar')
   OR texto LIKE '%texto-que-identifique-la-oferta%';
