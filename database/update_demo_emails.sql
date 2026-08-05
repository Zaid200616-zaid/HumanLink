-- Actualiza correos de demostración a @humanlink.mx (sin borrar datos).
-- Ejecutar si los perfiles de acceso rápido no coinciden con la BD.
-- mysql -u humanlink -p humanlink < database/update_demo_emails.sql

UPDATE usuario SET email = 'guillermo.ochoa@humanlink.mx' WHERE email = '0324108169@ut-tijuana.edu.mx';
UPDATE empleado SET email = 'guillermo.ochoa@humanlink.mx' WHERE email = '0324108169@ut-tijuana.edu.mx';

UPDATE usuario SET email = 'ernesto.gutierrez@humanlink.mx' WHERE email = '0324108067@ut-tijuana.edu.mx';
UPDATE empleado SET email = 'ernesto.gutierrez@humanlink.mx' WHERE email = '0324108067@ut-tijuana.edu.mx';

UPDATE usuario SET email = 'ramses.dejesus@humanlink.mx' WHERE email = '0324108126@ut-tijuana.edu.mx';
UPDATE empleado SET email = 'ramses.dejesus@humanlink.mx' WHERE email = '0324108126@ut-tijuana.edu.mx';

UPDATE usuario SET email = 'carol.olaiz@humanlink.mx' WHERE email = '0324108073@ut-tijuana.edu.mx';
UPDATE empleado SET email = 'carol.olaiz@humanlink.mx' WHERE email = '0324108073@ut-tijuana.edu.mx';
