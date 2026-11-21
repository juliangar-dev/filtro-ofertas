import sqlite3
import sys

# Uso: python consultar.py consultas/01_para_mi.sql
sql = open(sys.argv[1], encoding="utf-8").read()

con = sqlite3.connect("ofertas.db")
cursor = con.execute(sql)
columnas = [c[0] for c in cursor.description]
filas = cursor.fetchall()
con.close()

anchos = [min(50, max(len(str(x)) for x in [col] + [f[i] for f in filas])) for i, col in enumerate(columnas)]
print("  ".join(col.ljust(a) for col, a in zip(columnas, anchos)))
print("  ".join("-" * a for a in anchos))
for fila in filas:
    print("  ".join(str(x)[:a].ljust(a) for x, a in zip(fila, anchos)))
print(f"\n{len(filas)} filas")