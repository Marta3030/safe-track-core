# Safety Guard Pro

Quiero desarrollar una aplicación web profesional responsive tipo PWA llamada temporalmente “Safety360 HSEQ”, enfocada en Seguridad y Salud en el Trabajo, Prevención de Riesgos y mejora continua.

La aplicación debe ser diseñada como una herramienta profesional para Ingenieros/as y Asesores/as en Prevención de Riesgos y debe permitir gestionar de principio a fin accidentes e incidentes laborales.

IMPORTANTE:

Antes de desarrollar funcionalidades complejas, analiza completamente esta especificación, define la arquitectura de datos, relaciones, permisos y navegación.

No generes soluciones improvisadas.

Prioriza código mantenible, componentes reutilizables, TypeScript correctamente tipado, arquitectura limpia, validaciones de formularios y manejo correcto de errores.

Utiliza React + TypeScript + Tailwind CSS y Supabase como backend.

Supabase debe utilizarse para:

- PostgreSQL Database

- Authentication

- Row Level Security

- Storage

- Edge Functions cuando corresponda

- Realtime únicamente donde aporte valor

El producto debe funcionar perfectamente en:

- desktop

- tablet

- smartphone

Debe tener diseño responsive y comportamiento tipo aplicación.

================================

1. OBJETIVO DEL PRODUCTO

================================

El objetivo es digitalizar el ciclo completo de investigación de accidentes e incidentes laborales y conectar la investigación con la gestión preventiva y la mejora continua.

El flujo principal debe ser:

Accidente

→ Investigación

→ Evidencias

→ Análisis causal

→ Causa raíz

→ Acción correctiva/preventiva

→ Responsable

→ Fecha de cumplimiento

→ Evidencia de cumplimiento

→ Verificación de eficacia

→ Actualización de MIPER

→ Capacitación si corresponde

→ Cierre.

El concepto fundamental del sistema es:

“Un accidente no se considera cerrado solo porque finalizó la investigación. El caso se cierra cuando las acciones fueron implementadas, verificadas y el aprendizaje fue incorporado al sistema de gestión preventiva”.

================================

2. IDENTIDAD VISUAL

================================

Utilizar una estética profesional de Seguridad y Salud Ocupacional.

Paleta principal:

Negro:

#000000

Grafito:

#191A1C

Grafito secundario:

#22211E

Dorado seguridad:

#D8A021

Dorado secundario:

#D4AE51

Crema:

#F8F7E0

Crema claro:

#FAF9E3

Blanco cálido:

#FCFCE6

El logo del proyecto será proporcionado como archivo.

Utilizar el logo en:

- login

- sidebar

- encabezado

- reportes

Estilo visual:

- profesional

- moderno

- limpio

- corporativo

- minimalista

- fácil de utilizar en terreno

- sin exceso de efectos visuales

- sin gradientes innecesarios

- sin aspecto infantil

Utilizar tarjetas con bordes suaves, sombras discretas y buena separación visual.

El dorado debe utilizarse como color de acento y no como fondo dominante.

Sidebar grafito oscuro.

Contenido principal claro.

Botones principales dorados.

Tipografía moderna y altamente legible.

Mantener contraste accesible.

================================

3. NAVEGACIÓN PRINCIPAL

================================

Crear sidebar lateral con los siguientes módulos:

1. Dashboard

2. Accidentes e Incidentes

3. Planes de Acción

4. MIPER

5. Capacitaciones

6. Reportes e Indicadores

7. Administración

Agregar también:

- buscador

- notificaciones

- perfil usuario

- cerrar sesión

En versión móvil usar navegación adaptativa y menú desplegable.

================================

4. AUTENTICACIÓN

================================

Implementar autenticación segura con Supabase Auth.

Pantallas:

- iniciar sesión

- recuperar contraseña

- cambiar contraseña

No implementar registro público inicialmente.

Los usuarios serán creados o invitados por administración.

================================

5. ROLES Y PERMISOS

================================

Implementar los siguientes roles:

ADMINISTRADOR

Acceso completo.

PREVENCIONISTA

Puede crear y gestionar casos, investigaciones, riesgos, acciones, verificaciones, MIPER, capacitaciones y reportes.

SUPERVISOR / RESPONSABLE

Puede visualizar casos asociados y gestionar las acciones que le fueron asignadas.

AUDITOR / VISUALIZADOR

Solo lectura.

Implementar permisos reales a nivel backend mediante Supabase Row Level Security.

No depender únicamente de ocultar botones en frontend.

================================

6. MULTIEMPRESA

================================

Preparar la arquitectura para manejar:

- empresas

- centros de trabajo

- áreas

- departamentos

Cada caso debe estar asociado al menos a:

empresa

centro de trabajo

área.

Permitir filtrar información por estas dimensiones.

================================

7. DASHBOARD

================================

Crear dashboard profesional.

Mostrar tarjetas KPI:

- accidentes abiertos

- investigaciones pendientes

- acciones abiertas

- acciones vencidas

- porcentaje de cumplimiento

- casos cerrados

- tiempo promedio de cierre

Agregar gráficos:

Accidentes por mes.

Accidentes por área.

Accidentes por tipo.

Principales causas raíz.

Acciones por estado.

Acciones vencidas vs cumplidas.

Tiempo promedio de cierre.

Agregar sección:

“Requiere atención”

Mostrar:

- acciones vencidas

- casos sin investigación

- verificaciones pendientes

- actualizaciones MIPER pendientes

- capacitaciones pendientes

Todos los indicadores deben provenir de datos reales de Supabase.

No hardcodear datos cuando la aplicación esté conectada al backend.

================================

8. MÓDULO ACCIDENTES E INCIDENTES

================================

Crear vista listado y vista expediente.

Listado con:

ID

fecha

tipo de evento

trabajador

empresa

centro

área

gravedad

responsable

estado

Permitir filtros por:

fecha

empresa

centro

área

tipo

gravedad

estado

responsable.

Agregar búsqueda.

Agregar botón:

“NUEVO CASO”.

================================

9. CREACIÓN DE CASO

================================

Crear formulario dividido en pasos.

PASO 1

Información del evento.

Campos:

ID automático.

Formato:

ACC-AAAA-0001

Tipo:

Accidente

Incidente

Casi accidente.

Fecha.

Hora.

Empresa.

Centro.

Área.

Lugar específico.

Descripción preliminar.

Gravedad inicial.

PASO 2

Persona involucrada.

Nombre.

Cargo.

Antigüedad.

Empresa.

Supervisor.

No almacenar información clínica sensible innecesaria.

PASO 3

Actividad.

Actividad que realizaba.

Equipo involucrado.

Herramienta.

Máquina.

Material.

Sustancia si corresponde.

PASO 4

Información inicial.

Supervisor informado.

Organismo administrador informado.

Atención médica requerida.

Observaciones.

Permitir guardar borrador.

================================

10. EXPEDIENTE DIGITAL DEL CASO

================================

Cada caso debe tener una página única con encabezado:

ACC-2026-0001

Mostrar:

estado

fecha

empresa

centro

área

tipo

gravedad

prevencionista responsable.

Crear pestañas:

Resumen

Investigación

Evidencias

Análisis causal

Plan de acción

MIPER

Capacitación

Historial.

================================

11. LÍNEA DE TIEMPO

================================

Cada caso tendrá línea de tiempo.

Ejemplo:

Caso creado.

Trabajador contactado.

Visita terreno realizada.

Entrevista completada.

Evidencia cargada.

Investigación terminada.

Causa raíz identificada.

Acción creada.

Acción completada.

Evidencia revisada.

MIPER actualizada.

Capacitación realizada.

Caso cerrado.

Registrar automáticamente:

fecha

hora

usuario

acción.

================================

12. INVESTIGACIÓN

================================

Crear formulario estructurado.

Secciones:

Descripción detallada del evento.

Actividad desarrollada.

Secuencia de acontecimientos.

Condiciones del lugar.

Equipos involucrados.

Procedimientos existentes.

Controles existentes.

Capacitación previa.

Supervisión.

Elementos de protección personal.

Factores organizacionales.

Observaciones.

================================

13. ENTREVISTAS

================================

Permitir registrar múltiples entrevistas.

Tipos:

trabajador afectado

supervisor

testigo

otro.

Campos:

persona

cargo

fecha

entrevistador

relato

observaciones.

Relacionar cada entrevista con el caso.

================================

14. EVIDENCIAS

================================

Implementar Supabase Storage.

Permitir:

fotografías

PDF

documentos

imágenes.

Cada evidencia debe registrar:

ID

caso

tipo

nombre

descripción

archivo

fecha

usuario que cargó.

No permitir archivos ejecutables.

Validar tamaño y tipos permitidos.

================================

15. ANÁLISIS CAUSAL

================================

Crear estructura diferenciada:

Causa inmediata.

Causa básica.

Causa organizacional.

Causa raíz.

Permitir múltiples causas.

Cada causa debe poder relacionarse posteriormente con una o varias acciones.

Agregar herramienta:

“5 Porqués”.

Debe permitir ingresar:

Problema inicial.

Por qué 1.

Por qué 2.

Por qué 3.

Por qué 4.

Por qué 5.

Conclusión.

No utilizar inteligencia artificial para determinar automáticamente una causa raíz.

La decisión final pertenece al profesional.

================================

16. PLAN DE ACCIÓN

================================

Crear acciones desde cualquier causa identificada.

Campos:

ID acción.

Caso relacionado.

Causa relacionada.

Descripción.

Tipo:

inmediata

correctiva

preventiva.

Jerarquía de control si aplica:

eliminación

sustitución

ingeniería

administrativo

EPP.

Prioridad:

crítica

alta

media

baja.

Responsable.

Fecha creación.

Fecha compromiso.

Estado.

Evidencia requerida.

Observaciones.

Estados:

Pendiente

En proceso

Evidencia cargada

En verificación

Eficaz

Cerrada

Vencida.

================================

17. CONTROL DE VENCIMIENTOS

================================

Calcular automáticamente:

días restantes.

Mostrar:

verde:

cumplida.

amarillo:

próxima a vencer.

rojo:

vencida.

Una acción vencida debe marcarse automáticamente como VENCIDA si supera la fecha compromiso y no está cerrada.

================================

18. EVIDENCIA DE CUMPLIMIENTO

================================

El responsable puede cargar evidencia.

Ejemplos:

foto

documento

procedimiento

registro

certificado.

Cargar evidencia NO debe cerrar automáticamente la acción.

Debe pasar a:

“En verificación”.

================================

19. VERIFICACIÓN DE EFICACIA

================================

Crear formulario exclusivo para Prevencionista.

Campos:

acción implementada:

sí/no.

evidencia revisada:

sí/no.

control implementado correctamente:

sí/no.

riesgo controlado:

sí/no.

resultado:

Eficaz

Parcialmente eficaz

No eficaz.

Observación técnica.

Fecha verificación.

Verificador.

Si resultado = No eficaz:

crear opción para generar automáticamente una nueva acción.

================================

20. MIPER

================================

Crear módulo de Matriz de Identificación de Peligros y Evaluación de Riesgos.

Campos principales:

empresa

centro

área

proceso

actividad

tarea

peligro

riesgo

personas expuestas

controles existentes

probabilidad

consecuencia

nivel de riesgo

medidas adicionales

responsable

fecha revisión.

Permitir configurar metodología de evaluación.

No hardcodear una única matriz.

Para demo se puede utilizar inicialmente matriz 5x5 configurable.

================================

21. CONEXIÓN ACCIDENTE ↔ MIPER

================================

Durante el cierre de investigación preguntar:

¿El peligro estaba identificado en la MIPER?

Sí / No.

Si NO:

generar solicitud de actualización MIPER.

Si SÍ:

preguntar:

¿la evaluación era adecuada?

¿los controles eran suficientes?

¿los controles estaban implementados?

Permitir asociar el accidente directamente con una fila MIPER.

Mostrar:

evaluación anterior.

evaluación posterior.

riesgo residual después de las medidas.

================================

22. CAPACITACIÓN

================================

Las acciones pueden generar una capacitación.

Campos:

tema

objetivo

empresa

centro

área

responsable

fecha

trabajadores

estado

evidencia.

Estados:

programada

realizada

cancelada.

Permitir vincular capacitación con:

accidente

acción

riesgo MIPER.

================================

23. REGLAS DE CIERRE DEL CASO

================================

No permitir cerrar un accidente si existen requisitos obligatorios pendientes.

Checklist de cierre:

Investigación completada.

Causa raíz definida.

Acciones críticas cerradas.

Evidencias verificadas.

Eficacia evaluada.

MIPER revisada cuando corresponde.

Capacitación realizada cuando corresponde.

Informe final completado.

Mostrar visualmente:

CHECKLIST DE CIERRE.

Cuando todo esté cumplido:

habilitar botón:

“CERRAR CASO”.

Registrar:

fecha cierre

usuario

observación.

================================

24. HISTORIAL Y AUDITORÍA

================================

Crear registro de auditoría.

Registrar acciones importantes:

creación

edición

eliminación lógica

cambio estado

asignación

carga evidencia

verificación

cierre.

Registrar:

usuario

acción

registro afectado

fecha

hora.

No permitir que usuarios normales borren el historial.

================================

25. REPORTES

================================

Crear módulo de reportes.

Filtros:

empresa

centro

área

fecha

tipo evento

estado.

Generar:

resumen accidentes.

estado acciones.

principales causas.

tiempo promedio cierre.

cumplimiento acciones.

accidentes por área.

================================

26. EXPERIENCIA DE USUARIO

================================

Priorizar facilidad de uso.

Los formularios extensos deben dividirse por secciones.

Mostrar progreso.

Utilizar:

breadcrumbs.

mensajes claros.

confirmaciones.

validación inline.

estados de carga.

skeleton loaders si corresponde.

toasts para confirmaciones.

Evitar modales innecesarios.

================================

27. RESPONSIVE

================================

Desktop:

sidebar fija.

Tablet:

sidebar colapsable.

Mobile:

menú tipo drawer.

Botones táctiles suficientemente grandes.

Formularios en una columna.

Tablas complejas deben transformarse en tarjetas en pantallas pequeñas.

================================

28. SEGURIDAD

================================

Aplicar Row Level Security en Supabase.

Nunca exponer service_role key en frontend.

Nunca guardar secretos en variables públicas.

Validar inputs.

Sanitizar contenido.

Limitar tipos de archivos.

Aplicar permisos por rol.

Evitar exposición de información entre empresas.

================================

29. BASE DE DATOS

================================

Diseñar tablas normalizadas.

Como mínimo considerar:

profiles

organizations

work_centers

areas

workers

cases

case_investigations

case_interviews

case_evidence

case_causes

five_whys

actions

action_evidence

effectiveness_checks

risk_matrix_entries

trainings

training_attendees

case_timeline

notifications

audit_logs.

Utilizar UUID como claves primarias.

Agregar:

created_at

updated_at

created_by

cuando corresponda.

Utilizar relaciones con foreign keys.

No duplicar información innecesariamente.

================================

30. BORRADO

================================

Evitar eliminación física de registros críticos.

Implementar soft delete cuando corresponda mediante:

deleted_at

especialmente para:

casos

acciones

MIPER

evidencias.

================================

31. DATOS DE DEMOSTRACIÓN

================================

Crear exclusivamente datos DEMO claramente identificados.

Empresa:

Industrial Demo SpA.

Centro:

Planta Santiago.

Área:

Mantenimiento.

Caso:

ACC-2026-0001.

Evento:

Durante una intervención de mantenimiento un trabajador sufre una lesión menor en una mano al entrar en contacto con un componente móvil.

Causa inmediata:

Contacto con componente móvil.

Causa básica:

Aislamiento insuficiente de energía.

Causa organizacional:

Deficiencia en la verificación del procedimiento.

Causa raíz:

Deficiencia del sistema de control operacional asociado a tareas de intervención del equipo.

Acciones demo:

1. Actualizar procedimiento de bloqueo.

2. Incorporar verificación de energía cero.

3. Capacitar al personal involucrado.

4. Ejecutar inspección extraordinaria.

5. Actualizar MIPER.

Todo dato debe identificarse como ficticio.

================================

32. PRIVACIDAD PARA PORTAFOLIO

================================

Esta aplicación será inicialmente un proyecto demostrativo para portafolio.

No incluir:

RUT reales

datos médicos reales

nombres reales

empresas reales

accidentes reales identificables.

Utilizar únicamente datos ficticios o anonimizados.

================================

33. CALIDAD DEL CÓDIGO

================================

Mantener:

TypeScript estricto.

Componentes reutilizables.

Separación entre UI, lógica y acceso a datos.

Nombres consistentes.

Evitar componentes gigantes.

Evitar duplicación.

Manejo centralizado de errores.

No usar any salvo necesidad absolutamente justificada.

No dejar imports rotos.

No dejar rutas inexistentes.

No dejar funciones placeholder en producción.

================================

34. VALIDACIONES

================================

Todos los formularios deben validar:

campos obligatorios.

fechas válidas.

relaciones obligatorias.

tipos correctos.

No permitir fecha de cierre anterior a fecha de accidente.

No permitir fecha compromiso inválida.

No permitir cerrar acciones sin verificación cuando sea obligatoria.

================================

35. PRUEBAS FUNCIONALES

================================

Antes de considerar un módulo terminado, verificar manualmente:

crear

leer

editar

filtrar

cambiar estado

guardar

recargar página

validar persistencia.

Probar además:

desktop

tablet

mobile.

Revisar consola.

No dejar errores JavaScript.

No dejar llamadas API fallidas.

No dejar errores Supabase.

================================

36. ORDEN DE CONSTRUCCIÓN

================================

NO intentes implementar todo simultáneamente.

Construir en este orden:

FASE 1

Design system + navegación + autenticación.

FASE 2

Supabase schema + roles + RLS.

FASE 3

Accidentes e incidentes.

FASE 4

Investigación + entrevistas + evidencias.

FASE 5

Análisis causal.

FASE 6

Planes de acción.

FASE 7

Verificación de eficacia.

FASE 8

MIPER.

FASE 9

Capacitación.

FASE 10

Dashboard y reportes.

FASE 11

Auditoría + notificaciones.

FASE 12

Testing responsive y corrección final.

Al terminar cada fase:

1. revisar que compile.

2. revisar TypeScript.

3. revisar consola.

4. probar CRUD.

5. probar persistencia Supabase.

6. corregir errores antes de avanzar.

================================

37. PRIMERA TAREA

================================

Para esta primera iteración NO construyas todavía toda la aplicación.

Primero:

1. analiza todos los requisitos;

2. define arquitectura;

3. define rutas;

4. define componentes principales;

5. define modelo de datos;

6. define relaciones;

7. define roles;

8. define políticas RLS necesarias;

9. crea el design system;

10. crea el layout responsive;

11. crea sidebar;

12. crea pantalla login;

13. crea dashboard visual inicial.

Después presenta un resumen de lo construido y los pasos pendientes.

No continúes con módulos complejos hasta que esta base funcione correctamente.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/223d63c7-4223-4bfd-9c80-9c06e5e07340).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
