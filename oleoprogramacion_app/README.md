# Oleoflores Agronomía

Aplicación web de programación agronómica con almacenamiento centralizado y
sincronización multidispositivo mediante Firebase.

## Aislamiento obligatorio

Este repositorio no contiene credenciales ni configuración del Firebase anterior.
El código bloquea expresamente el proyecto `practical-ceremony-txhgq` para impedir
que la aplicación lea o escriba datos contaminados.

Antes de iniciar, conecte el proyecto a un Firebase completamente nuevo y reemplace
los valores `REPLACE_*` de `firebase-applet-config.json` con la configuración web
generada por Firebase. Se utiliza la base Firestore `(default)`.

No se necesitan archivos JSON de cuentas de servicio. En AI Studio se utiliza la
identidad administrada del entorno enlazado al proyecto nuevo.

## Semilla canónica

El backend carga de forma idempotente los datos validados de los Excel entregados:

- 178 personas seleccionables: 133 directas y 45 temporales.
- 1 conflicto de documento conservado para revisión administrativa.
- 49 labores y 195 actividades.
- 88 ubicaciones agrupadas por zona.
- 8 equipos y 8 operarios de maquinaria vigentes.
- 140 referencias de rendimiento.
- 4 novedades vigentes.
- 9 documentos de usuario, de los cuales 8 están activos.
- 6 supervisores reales activos, 1 directivo y 1 administrador.

La cuenta heredada vinculada a `SUP001` permanece inactiva porque el Excel presenta
una contradicción de identidad y rol. No se crea ninguna persona ficticia para
resolver ese conflicto.

Las colecciones operativas `programming`, `absences` y `machineryOperations`
comienzan vacías. La inicialización nunca purga colecciones ni reemplaza hashes de
PIN válidos.

## Comprobación

Después de configurar el Firebase nuevo, abra `/api/health`. El campo
`databaseReady` debe ser `true`, debe aparecer la versión
`excel-2026-08-13-v1` y los conteos deben coincidir con esta documentación.
