import sqlite3

con = sqlite3.connect("ofertas.db")

con.executescript("""
CREATE TABLE IF NOT EXISTS ofertas (
    id INTEGER PRIMARY KEY,
    fecha TEXT,
    fuente TEXT,
    puesto TEXT,
    zona TEXT,
    modalidad TEXT,
    nivel TEXT,
    anios_exp INTEGER,
    exp_excluyente INTEGER,
    email TEXT,
    link TEXT,
    texto TEXT UNIQUE,
    postulado INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS habilidades (
    oferta_id INTEGER REFERENCES ofertas(id),
    habilidad TEXT
);
""")

con.close()
print("Base creada: ofertas.db")