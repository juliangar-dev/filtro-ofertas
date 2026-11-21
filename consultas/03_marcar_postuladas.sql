UPDATE ofertas
SET postulado = 1
WHERE email IN ('empleos@farmacity.com.ar', 'm.miguel@acebey.com', 'rrhh.mutual22@gmail.com',
                'conectarggrrhh@gmail.com', 'lizarriaga@cstechlab.com',
                'oficina@airabuenosaires.com.ar', 'carlagi@epidataconsulting.com')
   OR texto LIKE '%rrhh@msklatam.com%'
   OR texto LIKE '%Atención al Cliente / SOI%'
   OR texto LIKE '%busquedas@evolucionrh.com.ar%'
   OR link LIKE '%g1YBZq%';