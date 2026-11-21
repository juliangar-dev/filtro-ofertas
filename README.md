# Filtro de ofertas laborales

Lee ofertas de trabajo publicadas en canales de WhatsApp y boletines de empleo, las guarda en una base de datos SQLite y permite filtrarlas y analizarlas con SQL.

## Cómo funciona

1. `crear_db.py` crea la base con dos tablas: `ofertas` y `habilidades`.
2. `leer.py` separa el texto en ofertas y detecta con reglas: zona, modalidad, nivel, años de experiencia, si la experiencia es excluyente, mail, link y habilidades pedidas.
3. `consultar.py` ejecuta una consulta SQL de la carpeta `consultas/` y muestra el resultado como tabla.

## Uso

```
python crear_db.py
python leer.py
python consultar.py consultas/01_para_mi.sql
```

Las ofertas van en `datos-privados/` (no se suben al repositorio).

## Consultas

| Archivo | Qué responde | SQL usado |
|---|---|---|
| 01_para_mi.sql | Ofertas junior en CABA sin experiencia excluyente | SELECT, WHERE, IN, IS NULL, COALESCE |
| 02_habilidades.sql | Habilidades más pedidas | JOIN, GROUP BY, COUNT |
| 03_marcar_postuladas.sql | Marca ofertas a las que ya se envió el CV | UPDATE, LIKE |
| 04_pendientes.sql | Ofertas que encajan y faltan enviar | SELECT con filtro de estado |