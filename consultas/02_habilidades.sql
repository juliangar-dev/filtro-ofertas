SELECT h.habilidad, COUNT(*) AS ofertas
FROM habilidades h
JOIN ofertas o ON o.id = h.oferta_id
WHERE o.zona IN ('CABA', 'GBA', 'Argentina')
GROUP BY h.habilidad
ORDER BY ofertas DESC;