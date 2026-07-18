# Plan Maestro — Calculadora de Nómina (Venezuela)

## 0. Resumen del proyecto

Aplicación web para analistas de nómina en Venezuela. Permite gestionar empleados, calcular salarios en Bs a partir de referencias en USD y la tasa BCV vigente, aplicar bonos/asignaciones (alimentación, bono nocturno, horas extra), deducciones legales (IVSS, RPE, FAOV), y calcular prestaciones sociales/vacaciones. Genera reportes consolidados de nómina por periodo y mantiene un historial auditable de tasas BCV.

**Stack confirmado:**
- Frontend: React 19 + Vite (ya inicializado en el repo)
- Backend/DB: Supabase (Postgres + Auth + RLS)
- Roles: `admin`, `usuario` (analista de nómina)
- Integración externa: API pública de tasa BCV (ej. pydolarve u equivalente), con fallback a carga manual si la API falla

---

## 1. Estructura de carpetas

```
CALCULADORA APP/
├── public/
├── src/
│   ├── assets/
│   ├── components/           # UI reutilizable (botones, tablas, modales, inputs)
│   │   ├── ui/                # átomos genéricos (Button, Input, Select, Badge, Modal)
│   │   ├── layout/             # Sidebar, Navbar, PageContainer
│   │   ├── empleados/
│   │   ├── nomina/
│   │   ├── bcv/
│   │   └── reportes/
│   ├── pages/                 # una carpeta o archivo por ruta
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Empleados/
│   │   ├── Nomina/
│   │   ├── Reportes/
│   │   └── Configuracion/
│   ├── hooks/                 # useAuth, useBcvRate, useNomina, useEmpleados...
│   ├── context/                # AuthContext, RoleContext
│   ├── services/               # capa de acceso a datos (Supabase queries) por dominio
│   │   ├── supabaseClient.js
│   │   ├── empleadosService.js
│   │   ├── nominaService.js
│   │   ├── bcvService.js
│   │   └── reportesService.js
│   ├── lib/                    # motor de cálculos puro (sin dependencias de UI/DB)
│   │   ├── calculoNomina.js
│   │   ├── calculoDeducciones.js
│   │   ├── calculoBonos.js
│   │   └── calculoPrestaciones.js
│   ├── routes/                  # definición de rutas + guards por rol
│   ├── utils/                    # formateo de moneda, fechas, validadores
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── supabase/
│   ├── migrations/               # SQL versionado de esquema + RLS
│   └── functions/                  # Edge Functions (ej. cron diario de tasa BCV)
├── tests/
│   ├── unit/                       # lib/ motor de cálculos
│   └── integration/
├── PLAN_MAESTRO.md
└── README.md
```

---

## 2. Base de datos (Supabase / Postgres)

### 2.1 Tablas principales

**`profiles`** (extiende `auth.users`)
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | = auth.users.id |
| nombre_completo | text | |
| rol | text | `admin` \| `usuario` |
| activo | boolean | default true |
| created_at | timestamptz | |

**`empleados`**
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| owner_id | uuid FK → profiles.id | quién lo creó/gestiona |
| nombre_completo | text | |
| cedula | text unique | |
| cargo | text | |
| fecha_ingreso | date | usado para prestaciones/antigüedad |
| salario_base_usd | numeric | referencia en USD |
| tipo_nomina | text | `mensual` \| `quincenal` |
| activo | boolean | |
| created_at / updated_at | timestamptz | |

**`tasas_bcv`**
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| fecha | date unique | una tasa por día |
| tasa | numeric | Bs por USD |
| origen | text | `api` \| `manual` |
| creado_por | uuid FK → profiles.id nullable | null si es automática |
| created_at | timestamptz | |

**`periodos_nomina`**
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| nombre | text | ej. "Quincena 1 - Julio 2026" |
| fecha_inicio | date | |
| fecha_fin | date | |
| tasa_bcv_id | uuid FK → tasas_bcv.id | tasa aplicada al periodo |
| estado | text | `borrador` \| `calculado` \| `cerrado` |
| creado_por | uuid FK → profiles.id | |
| created_at | timestamptz | |

**`nomina_detalle`** (una fila por empleado por periodo)
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| periodo_id | uuid FK → periodos_nomina.id | |
| empleado_id | uuid FK → empleados.id | |
| salario_base_usd | numeric | snapshot al momento del cálculo |
| salario_base_bs | numeric | snapshot calculado |
| horas_extra | numeric | **novedad** (entrada del analista) |
| horas_nocturnas | numeric | **novedad** — añadido en Fase 5, ver nota abajo |
| dias_trabajados | numeric | **novedad** — añadido en Fase 5, ver nota abajo |
| bono_nocturno_bs | numeric | calculado |
| bono_alimentacion_bs | numeric | calculado |
| total_asignaciones_bs | numeric | calculado |
| deduccion_ivss_bs | numeric | calculado |
| deduccion_rpe_bs | numeric | calculado |
| deduccion_faov_bs | numeric | calculado |
| total_deducciones_bs | numeric | calculado |
| neto_a_pagar_bs | numeric | calculado |
| created_at / updated_at | timestamptz | |

> **Nota (Fase 5):** el diseño original de esta tabla no incluía `horas_nocturnas` ni `dias_trabajados`, pero el motor de cálculo de la Fase 4 (`calcularBonoNocturno`, `calcularBonoAlimentacion`) requiere ambos como entradas ("novedades") que el analista carga antes de calcular. Se agregaron ambas columnas como corrección de esquema al implementar la Fase 5 — ver sección 25.

**`prestaciones_sociales`** (histórico acumulado por empleado)
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| empleado_id | uuid FK → empleados.id | |
| periodo_id | uuid FK → periodos_nomina.id | |
| dias_acumulados | numeric | |
| monto_acumulado_bs | numeric | |
| tipo | text | `garantia` \| `vacaciones` \| `utilidades` |
| created_at | timestamptz | |

**`config_parametros_legales`** (parametrizable, no hardcodeado)
| campo | tipo | notas |
|---|---|---|
| clave | text PK | ej. `PORCENTAJE_IVSS`, `PORCENTAJE_RPE`, `PORCENTAJE_FAOV`, `CESTA_TICKET_BS` |
| valor | numeric | |
| vigente_desde | date | permite versionar cambios legales en el tiempo |

### 2.2 Relaciones (resumen)
- `profiles 1—N empleados` (owner_id)
- `periodos_nomina N—1 tasas_bcv`
- `periodos_nomina 1—N nomina_detalle`
- `empleados 1—N nomina_detalle`
- `empleados 1—N prestaciones_sociales`
- `periodos_nomina 1—N prestaciones_sociales`

### 2.3 RLS (Row Level Security)
- `profiles`: usuario solo lee/edita su propia fila; `admin` lee todas.
- `empleados`: `usuario` solo ve/edita empleados donde `owner_id = auth.uid()`; `admin` ve todos.
- `periodos_nomina` / `nomina_detalle` / `prestaciones_sociales`: acceso filtrado por relación indirecta a `empleados.owner_id`, o directamente abierto a todos los `usuario` autenticados si la nómina es compartida a nivel de empresa (**decisión pendiente en Fase 2**, ver Riesgos).
- `tasas_bcv`: lectura para todos los autenticados; escritura (manual) solo `admin`.
- `config_parametros_legales`: lectura para todos los autenticados; escritura solo `admin`.

---

## 3. Casos de uso

1. Analista inicia sesión y ve dashboard con resumen del periodo activo.
2. Analista registra un nuevo empleado con su salario base en USD.
3. Sistema obtiene automáticamente la tasa BCV del día (o el analista la ingresa manualmente si la API falla).
4. Analista crea un nuevo periodo de nómina y selecciona la tasa BCV a aplicar.
5. Analista ingresa horas extra / novedades por empleado para el periodo.
6. Sistema calcula automáticamente: salario en Bs, bonos, deducciones legales, neto a pagar.
7. Analista revisa y cierra el periodo de nómina (bloquea edición).
8. Analista genera reporte consolidado del periodo.
9. Analista consulta historial de tasas BCV usadas por periodo (auditoría).
10. Admin gestiona parámetros legales (% IVSS, RPE, FAOV, monto cesta ticket).
11. Admin gestiona usuarios y roles del sistema.
12. Sistema calcula prestaciones sociales acumuladas por empleado tras cada periodo cerrado.

---

## 4. Historias de usuario

- **Como analista**, quiero registrar empleados con su salario en USD para no depender de conversiones manuales.
- **Como analista**, quiero que la tasa BCV se cargue automáticamente cada día para no tener que buscarla yo mismo.
- **Como analista**, quiero poder sobrescribir la tasa BCV manualmente en caso de que la API falle o esté desactualizada.
- **Como analista**, quiero calcular la nómina de un periodo con un clic para reducir errores manuales.
- **Como analista**, quiero ver un desglose claro de asignaciones y deducciones por empleado.
- **Como analista**, quiero generar un reporte consolidado del periodo para entregarlo a contabilidad.
- **Como analista**, quiero consultar qué tasa BCV se usó en periodos anteriores para responder auditorías.
- **Como admin**, quiero configurar los porcentajes legales (IVSS, RPE, FAOV) sin tocar código, porque cambian por ley.
- **Como admin**, quiero gestionar qué usuarios tienen acceso al sistema y con qué rol.
- **Como analista**, quiero ver el acumulado de prestaciones sociales de cada empleado a lo largo del tiempo.

---

## 5. Módulos

1. **Autenticación** — login, sesión, recuperación de contraseña, roles.
2. **Empleados** — CRUD de empleados.
3. **Tasa BCV** — obtención automática, historial, override manual.
4. **Periodos de nómina** — creación, cálculo, cierre.
5. **Motor de cálculo** — lógica pura de nómina (sin UI ni DB).
6. **Prestaciones sociales** — acumulación y consulta.
7. **Reportes** — consolidado por periodo, historial de tasas.
8. **Configuración/Parámetros legales** — solo admin.
9. **Administración de usuarios** — solo admin.

---

## 6. Servicios (capa `src/services/`)

- `supabaseClient.js` — instancia única del cliente Supabase.
- `authService.js` — login, logout, sesión actual, rol actual.
- `empleadosService.js` — CRUD empleados.
- `bcvService.js` — fetch API externa + fallback + guardar en `tasas_bcv`.
- `nominaService.js` — CRUD periodos y `nomina_detalle`, orquesta el motor de cálculo.
- `prestacionesService.js` — lectura/escritura de `prestaciones_sociales`.
- `reportesService.js` — queries agregadas para reportes consolidados.
- `parametrosService.js` — CRUD de `config_parametros_legales`.
- `usuariosService.js` — listado y edición de `profiles` (rol/activo) para el panel admin (añadido en Fase 8, ver sección 25).

---

## 7. API / integraciones externas

- **API tasa BCV**: proveedor externo (ej. pydolarve.org o similar). Se consulta vía Supabase Edge Function programada (cron diario) que inserta en `tasas_bcv` con `origen = 'api'`.
- Si la Edge Function falla (proveedor caído), el frontend muestra alerta y permite carga manual (`origen = 'manual'`).
- No se expone la API key/URL externa directamente al frontend; la consulta ocurre server-side (Edge Function) para evitar CORS y ocultar detalles de implementación.

---

## 8. Componentes (UI)

- `ui/`: `Button`, `Input`, `Select`, `Table`, `Modal`, `Badge`, `Alert`, `Spinner`.
- `layout/`: `Sidebar`, `Navbar`, `PageContainer`, `ProtectedRoute`.
- `empleados/`: `EmpleadoForm`, `EmpleadoTable`, `EmpleadoDetalle`.
- `nomina/`: `PeriodoForm`, `NominaTable`, `NovedadesForm`, `ResumenPeriodo`.
- `bcv/`: `TasaBcvBadge`, `TasaBcvHistorialTable`, `TasaBcvManualForm`.
- `reportes/`: `ReporteConsolidadoTable`, `ExportPdfButton`.

---

## 9. Estados (state management)

- Estado de servidor (datos remotos): manejado vía hooks + Supabase (considerar `@tanstack/react-query` para cache/reintentos — **decisión de arquitectura**, ver sección 20).
- Estado de sesión/rol: `AuthContext`.
- Estado de formularios: local (`useState`) por formulario, sin librería global salvo que la complejidad lo justifique.
- Sin Redux/Zustand a menos que aparezca necesidad real de estado compartido complejo entre módulos no relacionados.

---

## 10. Hooks

- `useAuth()` — usuario actual, rol, login/logout.
- `useEmpleados()` — listado/CRUD empleados con estado de carga/error.
- `useBcvRate()` — tasa BCV del día, estado de origen (api/manual), función para override manual.
- `useNominaPeriodo(periodoId)` — datos del periodo, cálculo, cierre.
- `useRole()` — helper para chequear permisos (`isAdmin`, `canEdit`).

---

## 11. Contextos

- `AuthContext` — sesión Supabase, usuario, rol, funciones de login/logout.
- (Opcional) `ThemeContext` si se requiere modo oscuro — no prioritario.

---

## 12. Seguridad

- Autenticación vía Supabase Auth (email/password mínimo viable).
- Autorización de UI: rutas protegidas por rol (`ProtectedRoute`) — **complementaria, no sustituta** de RLS.
- Autorización real de datos: **RLS en Postgres** (sección 2.3) — la UI nunca es la única barrera.
- Nunca exponer `service_role key` en el frontend; solo `anon key`.
- Parámetros legales y tasas manuales: solo editables por `admin` (enforced en RLS, no solo en UI).
- Validación de inputs numéricos (salarios, horas) en frontend y con `CHECK` constraints en DB donde aplique (ej. `salario_base_usd >= 0`).

---

## 13. Roles

| Rol | Permisos |
|---|---|
| `admin` | Todo lo de `usuario` + gestión de usuarios, edición de parámetros legales, carga manual de tasa BCV, acceso a todos los empleados/periodos. |
| `usuario` (analista) | CRUD de sus propios empleados, creación/cálculo/cierre de periodos, consulta de reportes, consulta de historial BCV (solo lectura). |

---

## 14. RLS (detalle de políticas — a implementar en Fase 2)

Para cada tabla sensible: `SELECT`, `INSERT`, `UPDATE`, `DELETE` policies separadas, usando `auth.uid()` y una función helper `is_admin(uid)` que consulta `profiles.rol`. Se definirá el SQL exacto en la fase de implementación (no en este plan).

---

## 15. Sistema de autenticación

- Supabase Auth con email/password.
- `profiles` se crea automáticamente vía trigger `on_auth_user_created` al registrarse.
- Rol por defecto al crear cuenta: `usuario` (el `admin` se promueve manualmente o vía seed inicial).
- Recuperación de contraseña vía flujo estándar de Supabase (magic link/reset email).

---

## 16. Flujo de navegación

```
/login
/dashboard (protegida)
/empleados
/empleados/:id
/nomina
/nomina/periodos/:id          → detalle + cálculo
/reportes
/reportes/historial-bcv
/configuracion (solo admin)
/usuarios (solo admin)
```

Guard: si no hay sesión → redirige a `/login`. Si rol insuficiente → redirige a `/dashboard` con mensaje.

---

## 17. Flujo de datos

```
UI (componente) 
  → hook (ej. useNominaPeriodo) 
    → service (nominaService.js) 
      → Supabase (query/RPC) 
      → [para cálculo] lib/calculoNomina.js (función pura, recibe datos, devuelve resultado)
    ← respuesta
  ← estado actualizado → re-render
```

El motor de cálculo (`lib/`) **nunca** llama directamente a Supabase — recibe datos ya cargados y devuelve resultados puros, testeables sin mocks de red.

---

## 18. Motor de cálculos (`src/lib/`)

Funciones puras, sin efectos secundarios, 100% testeables unitariamente:

- `calcularSalarioBs(salarioUsd, tasaBcv)`
- `calcularBonoAlimentacion(diasTrabajados, montoCestaTicket)`
- `calcularBonoNocturno(horasNocturnas, salarioHoraBs)`
- `calcularHorasExtra(horas, salarioHoraBs, recargo)`
- `calcularDeduccionIvss(salarioBs, porcentajeIvss)`
- `calcularDeduccionRpe(salarioBs, porcentajeRpe)`
- `calcularDeduccionFaov(salarioBs, porcentajeFaov)`
- `calcularNetoAPagar({ asignaciones, deducciones })`
- `calcularPrestacionesAcumuladas(empleado, periodo, parametrosLegales)`

Todas reciben los porcentajes/parámetros legales como argumento (desde `config_parametros_legales`), nunca hardcodeados.

---

## 19. Integración BCV

- Edge Function (`supabase/functions/fetch-tasa-bcv`) ejecutada por cron diario (Supabase Scheduled Functions o `pg_cron`).
- Llama a la API externa, parsea la tasa, hace `upsert` en `tasas_bcv` con `fecha = hoy`, `origen = 'api'`.
- Si la función falla o no hay tasa para hoy, el frontend detecta ausencia de tasa del día y ofrece formulario de carga manual (`origen = 'manual'`, requiere rol `admin`).
- Selección de tasa al crear un periodo: por defecto la más reciente, editable antes de calcular.

---

## 20. Reportes

- **Reporte consolidado por periodo**: tabla con todos los empleados, asignaciones, deducciones, neto — exportable a PDF/CSV.
- **Historial de tasas BCV**: tabla fecha/tasa/origen, filtrable por rango de fechas.
- Generación de PDF: librería cliente (ej. `@react-pdf/renderer` o `jspdf`) — **decisión de arquitectura**, evaluar en fase de reportes.

---

## 21. Testing

- **Unitario** (prioridad alta): todo `src/lib/` (motor de cálculo) — sin mocks, funciones puras.
- **Integración**: `services/` contra una instancia de Supabase local (`supabase start`) o entorno de staging.
- **Componentes**: pruebas de render/interacción para formularios críticos (`NovedadesForm`, `PeriodoForm`) con Vitest + Testing Library.
- **E2E** (opcional, fase tardía): flujo completo login → crear empleado → calcular periodo → generar reporte.

---

## 22. Despliegue

- Frontend: ~~Vercel o Netlify~~ **Netlify** (decisión resuelta en la Fase 10, ver sección 25) — build estático de Vite, configurado en `netlify.toml`.
- Backend: Supabase (proyecto cloud gestionado) — el mismo proyecto usado durante todo el desarrollo (`qktzpulvngcrstwzzzkp`).
- Variables de entorno: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (nunca `service_role`) — se configuran en el dashboard de Netlify, nunca en el repositorio.
- Migraciones: versionadas en `supabase/migrations/`, aplicadas vía `supabase db push` en CI/CD antes de deploy de frontend.
- Entornos sugeridos: `dev` (local con `supabase start`) y `prod` (proyecto Supabase cloud).

---

## 23. Roadmap (visión de alto nivel — el detalle por fase está en la sección 25)

1. Fase 1 — Fundaciones (proyecto, Supabase, esquema base, auth).
2. Fase 2 — Módulo Empleados + RLS.
3. Fase 3 — Integración BCV (automática + manual).
4. Fase 4 — Motor de cálculo de nómina (unitario, sin UI).
5. Fase 5 — Módulo Periodos de Nómina (UI + orquestación).
6. Fase 6 — Prestaciones sociales.
7. Fase 7 — Reportes y exportación.
8. Fase 8 — Panel admin (usuarios + parámetros legales).
9. Fase 9 — Testing de integración + E2E.
10. Fase 10 — Despliegue y hardening de seguridad.

---

## 24. Riesgos técnicos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| API externa de tasa BCV cae o cambia formato | Bloquea cálculo diario | Fallback manual + Edge Function con manejo de errores y alertas |
| Cambios legales en porcentajes IVSS/RPE/FAOV | Cálculos desactualizados | Parámetros en tabla versionada (`vigente_desde`), no hardcodeados |
| Definición ambigua de "visibilidad de nómina entre analistas" (¿cada analista ve solo sus empleados, o toda la empresa ve todo?) | Bloquea diseño correcto de RLS | **Debe resolverse antes de Fase 2** — decisión pendiente con el usuario |
| Cálculo de prestaciones sociales tiene reglas legales complejas y cambiantes (LOTTT) | Errores de cálculo con impacto legal/financiero | Aislar en funciones puras y testeables, validar con un caso real conocido antes de confiar en producción |
| Exposición accidental de `service_role key` | Vulnerabilidad crítica | Revisar en cada PR que solo `anon key` esté en el bundle del frontend |
| Falta de RLS bien probada | Fuga de datos entre analistas | Escribir tests de integración específicos por política RLS antes de cerrar Fase 2 |

---

## 25. Decisiones de arquitectura (pendientes o tomadas)

- ✅ Supabase como backend (confirmado por el usuario).
- ✅ Roles `admin` / `usuario` (confirmado).
- ✅ Tasa BCV automática vía API con opción manual (confirmado).
- ✅ **Resuelto (2026-07-17, antes de Fase 2)**: los empleados/nómina son visibles únicamente por el analista (`usuario`) que los creó, más el `admin` que ve todo. No se requiere tabla `empresas`/`organizaciones`. RLS de `empleados` filtra por `owner_id = auth.uid()` con excepción para `admin`, siguiendo el mismo patrón ya usado en `profiles` (Fase 1).
- ℹ️ **Nota de arquitectura (detectada durante Fase 8, sin acción retroactiva)**: la sección 6 nombra `authService.js` como capa de servicio para login/logout/sesión/rol, pero en la Fase 1 esa lógica se implementó directamente dentro de `src/context/AuthContext.jsx` (no como un archivo `services/` separado). Funciona correctamente y `useAuth()` expone la misma API que tendría un `authService.js`, así que **no se refactoriza** — sería tocar código de la Fase 1 que funciona sin que exista un error, contra la instrucción de no modificar funcionalidad ya implementada salvo error. Se documenta como desviación conocida entre plan e implementación.
- ✅ **Corrección de esquema (2026-07-17, durante Fase 5)**: se agregaron las columnas `horas_nocturnas` y `dias_trabajados` a `nomina_detalle` (sección 2.1) — el motor de cálculo de la Fase 4 las requiere como entradas y no existían en el diseño original. No afecta datos existentes (la tabla no existía aún; se creó ya con estas columnas en `0004_periodos_nomina.sql`).
- ✅ **Corrección de asignación de fase (2026-07-17, durante Fase 5)**: la tabla `config_parametros_legales` (sección 2.1) no estaba asignada a ninguna fase de creación — la Fase 8 solo preveía construir la UI de administración (`parametrosService.js`) asumiendo que la tabla ya existía. Como la orquestación de cálculo de la Fase 5 depende de leer estos parámetros, la tabla y sus políticas RLS se crearon en `0004_periodos_nomina.sql` (junto con `periodos_nomina` y `nomina_detalle`), dejando para la Fase 8 únicamente la interfaz de administración sobre una tabla ya existente. Se sembró con valores de referencia marcados como pendientes de verificación profesional (mismos citados en la Fase 4), incluyendo `CESTA_TICKET_BS = 0` como placeholder explícito hasta que un admin configure el monto vigente real.
- ⏳ **Pendiente**: librería de manejo de estado de servidor (`@tanstack/react-query` recomendado vs. hooks manuales).
- ✅ **Resuelto (2026-07-17, antes de Fase 7)**: librería de generación de PDF = **jspdf + jspdf-autotable**, confirmado por el usuario.
- ✅ **Corrección de esquema (2026-07-17, durante Fase 8)**: la política RLS de `profiles` de la Fase 1 (`profiles_update_own`) solo permitía a un usuario editar su propia fila — sin política adicional, un `admin` no podía cambiar el `rol`/`activo` de otro usuario, algo que la Fase 8 requiere explícitamente ("gestionar usuarios/roles"). Se agregó la política `profiles_update_admin` en `0006_admin_panel.sql` (RLS combina políticas permisivas del mismo comando con OR; no se tocó ni reemplazó la política existente de la Fase 1).
- ✅ **Adición documentada (2026-07-17, durante Fase 8)**: se creó `src/services/usuariosService.js`, no enumerado en la sección 6 original — necesario para que la página `Usuarios` liste y edite `profiles`. Se añade aquí como ampliación de la sección 6.
- ✅ **Resuelto (2026-07-17, antes de Fase 10)**: hosting de frontend = **Netlify**, confirmado por el usuario (el plan original dejaba "Vercel o Netlify" sin decidir).
- ✅ **Resuelto (2026-07-17, antes de Fase 3)**: proveedor de la API de tasa BCV = **pydolarve.org** (`https://pydolarve.org/api/v1/dollar?page=bcv`), confirmado por el usuario. No requiere API key.
- ⚠️ **Riesgo nuevo detectado durante la Fase 3**: el entorno de este agente no tiene acceso a red (falla de DNS al intentar `curl`/`WebFetch` contra `pydolarve.org`), por lo que **no fue posible verificar el esquema real de la respuesta JSON** de la API antes de escribir el parser de la Edge Function. Se implementó `extractPrice()` en `supabase/functions/fetch-tasa-bcv/index.ts` probando varias rutas de campo conocidas/documentadas públicamente (`monitors.bcv.price`, `price`, `precio`, `promedio`) como mitigación, pero **debe verificarse manualmente contra la respuesta real antes de confiar en el cron en producción** (ver checklist de la Fase 3 más abajo).

---

## 26. Convenciones de código

- Componentes en `PascalCase.jsx`, hooks en `useCamelCase.js`, servicios en `camelCaseService.js`.
- Funciones del motor de cálculo: puras, sin `async`, sin importar `services/`.
- Un archivo por componente; sin componentes de más de ~200 líneas (dividir si crece).
- Nombrado de tablas/columnas en DB: `snake_case`, en español (consistente con el dominio del negocio).
- Commits siguiendo Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`).
- ESLint (ya configurado) debe pasar sin warnings antes de cada commit.

---

## 27. Checklist de calidad (aplicable a cada fase)

- [ ] El motor de cálculo tiene tests unitarios con casos conocidos (incluyendo edge cases: salario 0, tasa BCV ausente, horas negativas).
- [ ] Las políticas RLS fueron probadas con al menos 2 usuarios distintos (uno no debe ver datos del otro salvo que el diseño lo permita).
- [ ] Ningún parámetro legal está hardcodeado en el motor de cálculo.
- [ ] `service_role key` no aparece en ningún archivo del frontend ni en el bundle de build.
- [ ] Todo formulario numérico valida rangos válidos antes de enviar a Supabase.
- [ ] El build de producción (`vite build`) no genera warnings críticos.
- [ ] Documentado en README cómo levantar Supabase local para desarrollo.

---

## 28. Fases detalladas del proyecto

### Fase 0 — Resolución de decisiones pendientes
- **Objetivo**: cerrar las decisiones de arquitectura abiertas (sección 25) antes de escribir esquema o código.
- **Archivos involucrados**: ninguno (decisión, no código).
- **Dependencias**: ninguna.
- **Resultado esperado**: respuestas confirmadas sobre visibilidad de nómina entre analistas, librería de estado de servidor, librería de PDF, proveedor de API BCV.
- **Cómo validar**: este documento (`PLAN_MAESTRO.md`) actualizado con las decisiones marcadas como ✅ en la sección 25.

### Fase 1 — Fundaciones del proyecto ✅ COMPLETADA (2026-07-17)
- **Objetivo**: dejar el proyecto listo para desarrollo: Supabase conectado, estructura de carpetas creada, autenticación básica funcionando.
- **Archivos involucrados**: `src/services/supabaseClient.js`, `.env`, estructura completa de carpetas de la sección 1, `supabase/migrations/0001_init.sql` (tabla `profiles` + trigger).
- **Dependencias**: Fase 0 completada; proyecto Supabase creado por el usuario (URL + anon key disponibles).
- **Resultado esperado**: login/logout funcional contra Supabase real, `profiles` se autocrea al registrar usuario.
- **Cómo validar**: registrar un usuario de prueba, confirmar fila en `profiles` con `rol = 'usuario'`, login/logout sin errores en consola.

**Entregado:**
- Dependencias añadidas: `@supabase/supabase-js`, `react-router-dom`.
- Estructura de carpetas completa de la sección 1 creada bajo `src/`, `supabase/`, `tests/`.
- `.env.local` (gitignorado vía `*.local`) con las credenciales reales del proyecto Supabase; `.env.example` como plantilla.
- `src/services/supabaseClient.js` — cliente único de Supabase.
- `src/context/authContextBase.js` + `src/context/AuthContext.jsx` — sesión, perfil, `signIn`/`signUp`/`signOut` (separados en dos archivos para cumplir la regla de Fast Refresh de ESLint sobre exportar solo componentes).
- `src/hooks/useAuth.js` — hook de acceso al contexto de auth.
- `src/components/layout/ProtectedRoute.jsx` — guard de rutas autenticadas.
- `src/pages/Login.jsx` y `src/pages/Dashboard.jsx` — UI mínima de login/registro y panel autenticado.
- `src/routes/AppRoutes.jsx` — definición de rutas `/login`, `/dashboard`.
- `src/App.jsx` reescrito (router + `AuthProvider`); se **eliminó** el contenido previo de demo (calculadora con formulario de pago falso, no relacionado con el proyecto) y `src/App.css` (huérfano tras el reemplazo).
- `supabase/migrations/0001_init.sql` — tabla `profiles`, RLS (`select` propio o admin, `update` propio) y trigger `on_auth_user_created` que autocrea el perfil con `rol = 'usuario'`.

**⚠️ Pendiente de acción manual del usuario (fuera del alcance de este agente):**
La migración SQL **no se ha aplicado** al proyecto Supabase — no hay acceso a la base de datos (solo se recibió la `anon key`, que no permite ejecutar DDL). Para completar la validación real:
1. Abrir el SQL Editor del proyecto Supabase (`qktzpulvngcrstwzzzkp`).
2. Pegar y ejecutar el contenido de `supabase/migrations/0001_init.sql`.
3. Ejecutar `npm run dev`, registrar un usuario de prueba en `/login`, confirmar en el dashboard de Supabase que aparece la fila correspondiente en `profiles` con `rol = 'usuario'`, y verificar login/logout sin errores en consola.

**Verificación técnica ejecutada por el agente:**
- ✔ Compila (`npm run build` exitoso).
- ✔ Sin errores de TypeScript — *no aplica*: el proyecto es JavaScript puro (no hay `tsconfig.json` ni `typescript` como dependencia); se verificó en su lugar con ESLint.
- ✔ Sin imports rotos (verificado por inspección de todos los `import` relativos del árbol `src/`).
- ✔ Sin archivos innecesarios (se eliminó `src/App.css`, huérfano tras el reemplazo de `App.jsx`).
- ✔ `npm run lint` sin errores ni warnings.
- ✔ Coincide con el plan maestro (sección 1, 2.1 `profiles`, 2.3 RLS, 15 sistema de autenticación).
- ℹ️ Vulnerabilidad `high` preexistente en `vite` (reportada por `npm audit`), no introducida por esta fase — pendiente de evaluar en una fase de mantenimiento/despliegue.

### Fase 2 — Módulo Empleados + RLS ✅ COMPLETADA (2026-07-17)
- **Objetivo**: CRUD completo de empleados con seguridad a nivel de fila ya resuelta según la decisión de Fase 0.
- **Archivos involucrados**: `supabase/migrations/0002_empleados.sql` (tabla + RLS), `src/services/empleadosService.js`, `src/hooks/useEmpleados.js`, `src/components/empleados/*`, `src/pages/Empleados/*`.
- **Dependencias**: Fase 1.
- **Resultado esperado**: un analista puede crear, editar, listar y desactivar empleados; un segundo analista de prueba no ve los empleados del primero (o sí, según lo decidido en Fase 0).
- **Cómo validar**: test de integración con 2 usuarios distintos verificando aislamiento (o compartición) de datos según política definida.

**Decisión resuelta antes de implementar** (ver sección 25): visibilidad de empleados/nómina = **solo el creador (`owner_id`) + admin**. No se requiere tabla `empresas`.

**Entregado:**
- `supabase/migrations/0002_empleados.sql` — tabla `empleados` (según esquema de la sección 2.1: `owner_id`, `nombre_completo`, `cedula` único, `cargo`, `fecha_ingreso`, `salario_base_usd` con `check >= 0`, `tipo_nomina`, `activo`), función helper `public.is_admin(uid)`, políticas RLS de `select`/`insert`/`update` (propietario o admin), y trigger `set_updated_at`. Se omitió deliberadamente la política de `delete` — Fase 2 solo contempla "desactivar" (`activo = false`); sin política, RLS deniega los deletes por defecto (documentado en el propio SQL).
- `src/services/empleadosService.js` — `listEmpleados`, `getEmpleado`, `createEmpleado` (inyecta `owner_id` desde el usuario autenticado), `updateEmpleado`, `setEmpleadoActivo`.
- `src/hooks/useEmpleados.js` — estado de listado, carga y error; expone `addEmpleado`, `editEmpleado`, `toggleActivo`.
- `src/components/empleados/EmpleadoForm.jsx` (reutilizable para alta y edición vía `initialValues`/`submitLabel`) y `EmpleadoTable.jsx` (listado con acciones Editar/Desactivar-Activar).
- `src/pages/Empleados/index.jsx` — orquesta alta, edición inline y listado.
- Ruta protegida `/empleados` añadida en `src/routes/AppRoutes.jsx`; enlace agregado en `src/pages/Dashboard.jsx` (cambio aditivo, no se modificó la funcionalidad existente de login/logout de la Fase 1).

**⚠️ Pendiente de acción manual del usuario:**
Igual que en la Fase 1, la migración `0002_empleados.sql` **no se ha aplicado** — ejecutarla en el SQL Editor de Supabase (requiere que `0001_init.sql` ya esté aplicado, porque `empleados.owner_id` referencia `profiles`). Luego, para validar el aislamiento por analista: crear 2 usuarios de prueba, registrar un empleado con cada uno desde `/empleados`, y confirmar que cada analista solo ve el suyo (el `admin`, si se promueve manualmente un usuario en `profiles.rol`, debe ver ambos).

**Verificación técnica ejecutada por el agente:**
- ✔ Compila (`npm run build` exitoso).
- ✔ Sin errores de TypeScript — no aplica (proyecto JS puro); verificado con ESLint.
- ✔ Sin imports rotos.
- ✔ Sin archivos innecesarios.
- ✔ `npm run lint` sin errores ni warnings (se ajustó el patrón async dentro de `useEffect` en `useEmpleados.js` para cumplir la regla `react-hooks/set-state-in-effect`, mismo patrón ya usado en `AuthContext.jsx` de la Fase 1).
- ✔ Coincide con el plan maestro (secciones 2.1 `empleados`, 2.3 RLS, 6 servicios, 9-10 hooks, 8 componentes).
- ✔ No se modificó funcionalidad ya implementada de la Fase 1 salvo el cambio aditivo (enlace de navegación en Dashboard).

### Fase 3 — Integración BCV ✅ COMPLETADA (2026-07-17)
- **Objetivo**: tasa BCV disponible automáticamente cada día, con fallback manual.
- **Archivos involucrados**: `supabase/functions/fetch-tasa-bcv/*`, `supabase/migrations/0003_tasas_bcv.sql`, `src/services/bcvService.js`, `src/hooks/useBcvRate.js`, `src/components/bcv/*`.
- **Dependencias**: Fase 1 (auth), decisión de proveedor de API (Fase 0).
- **Resultado esperado**: cron diario inserta tasa en `tasas_bcv`; si falla, UI permite carga manual restringida a `admin`.
- **Cómo validar**: ejecutar la Edge Function manualmente y confirmar inserción; simular fallo de API y confirmar que aparece el formulario manual.

**Decisión resuelta antes de implementar**: proveedor = pydolarve.org (sección 25).

**Entregado:**
- `supabase/migrations/0003_tasas_bcv.sql` — tabla `tasas_bcv` (`fecha` única, `tasa > 0`, `origen` en `api`/`manual`, `creado_por`), RLS: lectura para cualquier autenticado, inserción solo para `admin` y únicamente con `origen = 'manual'` (las inserciones automáticas usan la `service_role key` dentro de la Edge Function, que bypassa RLS por diseño — nunca se expone al frontend, ver sección 12 Seguridad).
- `supabase/functions/fetch-tasa-bcv/index.ts` — Edge Function Deno: consulta `https://pydolarve.org/api/v1/dollar?page=bcv`, extrae la tasa y hace `upsert` en `tasas_bcv` con `fecha = hoy`, `origen = 'api'`.
- `src/services/bcvService.js` — `getTasaHoy`, `getUltimaTasa`, `createTasaManual`.
- `src/hooks/useBcvRate.js` — expone `tasaHoy`, `ultimaTasa`, `faltaTasaHoy`, `submitTasaManual`.
- `src/components/bcv/TasaBcvBadge.jsx` y `TasaBcvManualForm.jsx`.
- Integrado en `src/pages/Dashboard.jsx` (cambio aditivo): muestra la tasa del día; si falta y el usuario es `admin`, muestra el formulario de carga manual. `TasaBcvHistorialTable` (sección 8) se **difiere a la Fase 7 (Reportes)**, donde el plan la ubica explícitamente (sección 20) — no se construyó en esta fase para no adelantar trabajo fuera de su alcance.

**⚠️ Riesgo/limitación documentada (ver sección 25):** no se pudo verificar el esquema real de la respuesta de pydolarve.org por falta de acceso a red en este entorno. El parser (`extractPrice`) prueba varias rutas de campo conocidas como mitigación, pero debe confirmarse manualmente contra la API real.

**⚠️ Pendiente de acción manual del usuario (fuera del alcance de este agente — no hay CLI/dashboard de Supabase conectado):**
1. Aplicar `0003_tasas_bcv.sql` en el SQL Editor de Supabase (después de `0001` y `0002`).
2. Desplegar la Edge Function: `supabase functions deploy fetch-tasa-bcv` (requiere Supabase CLI vinculado al proyecto).
3. Invocarla una vez manualmente (`supabase functions invoke fetch-tasa-bcv` o desde el dashboard) y **verificar en los logs y en la tabla `tasas_bcv` que el campo `tasa` se extrajo correctamente** — si `pydolarve.org` devuelve un esquema distinto al esperado, ajustar `extractPrice()` en `supabase/functions/fetch-tasa-bcv/index.ts`.
4. Configurar la programación diaria (cron) desde el dashboard de Supabase → Edge Functions → Schedules, o vía `pg_cron`/`pg_net` si se prefiere manejarlo desde la base de datos.
5. Para probar el fallback manual: promover un usuario a `rol = 'admin'` en `profiles`, entrar a `/dashboard` un día sin tasa registrada, confirmar que aparece el formulario y que el envío crea la fila con `origen = 'manual'`.

**Verificación técnica ejecutada por el agente:**
- ✔ Compila (`npm run build` exitoso).
- ✔ Sin errores de TypeScript en el frontend — no aplica (proyecto JS puro); verificado con ESLint. La Edge Function (`.ts`, Deno) queda fuera del alcance de ESLint/tsc del proyecto Vite (build system distinto), como corresponde a Supabase Edge Functions.
- ✔ Sin imports rotos.
- ✔ Sin archivos innecesarios.
- ✔ `npm run lint` sin errores ni warnings.
- ✔ Coincide con el plan maestro (secciones 2.1 `tasas_bcv`, 2.3 RLS, 7 API/integraciones, 19 integración BCV).
- ✔ No se modificó funcionalidad ya implementada de Fases 1-2 salvo el cambio aditivo en `Dashboard.jsx`.

### Fase 4 — Motor de cálculo de nómina ✅ COMPLETADA (2026-07-17)
- **Objetivo**: implementar toda la lógica de cálculo como funciones puras, testeadas antes de tener UI.
- **Archivos involucrados**: `src/lib/calculoNomina.js`, `calculoDeducciones.js`, `calculoBonos.js`, `calculoPrestaciones.js`, `tests/unit/lib/*`.
- **Dependencias**: Fase 0 (parámetros legales definidos), no depende de Supabase.
- **Resultado esperado**: funciones puras cubiertas por tests unitarios con casos reales conocidos (al menos un caso de nómina calculado a mano para comparar).
- **Cómo validar**: `npm run test` en verde, cobertura de casos límite (salario 0, sin horas extra, tasa BCV ausente manejada como error explícito).

**⚠️ Decisión/riesgo documentado antes de implementar:** la dependencia "parámetros legales definidos" de la Fase 0 nunca se cerró con valores concretos (% IVSS, RPE, FAOV, recargos de hora extra/bono nocturno, días de garantía de prestaciones). Se consultó al usuario, quien confirmó **no tener un caso real de nómina a mano** para usar como referencia exacta. Se decidió, con su aprobación:
- Implementar las funciones de `src/lib/` de forma genérica, **sin ningún porcentaje ni monto hardcodeado** — todos los parámetros legales se reciben como argumentos (confirma el diseño ya previsto en la sección 18).
- Usar en los tests unitarios porcentajes de referencia comúnmente citados en la LOTTT (IVSS 4%, RPE 0.5%, FAOV 1%, recargo hora extra 50% Art. 118, recargo bono nocturno 30% Art. 156, garantía de prestaciones 15 días/trimestre Art. 142), **marcados explícitamente en los comentarios del código y de los tests como "pendientes de verificación profesional"** — no deben tratarse como los valores reales vigentes hasta que se confirmen (ver también el riesgo ya registrado en la sección 24 sobre cambios legales).
- Este mismo riesgo aplica al cálculo de prestaciones sociales (`calcularPrestacionesAcumuladas`), implementado como una simplificación del Art. 142 LOTTT (prorrateo lineal de 15 días de salario integral por trimestre) que **no contempla antigüedad especial ni topes** — requiere revisión profesional antes de un uso real en producción.

**Entregado:**
- `src/lib/calculoNomina.js` — `calcularSalarioBs` (lanza error explícito si `tasaBcv` es 0/null/undefined) y `calcularNetoAPagar`.
- `src/lib/calculoBonos.js` — `calcularBonoAlimentacion`, `calcularBonoNocturno`, `calcularHorasExtra`.
- `src/lib/calculoDeducciones.js` — `calcularDeduccionIvss`, `calcularDeduccionRpe`, `calcularDeduccionFaov` (todas lanzan error explícito si falta el porcentaje).
- `src/lib/calculoPrestaciones.js` — `calcularPrestacionesAcumuladas`.
- `tests/unit/lib/*.test.js` — 19 tests (Vitest) cubriendo casos normales, límites (salario/horas en 0) y errores explícitos por parámetros faltantes.
- Se agregó `vitest` como dependencia de desarrollo y el script `npm run test` (`vitest run`), no existía runner de tests previamente en el proyecto.

**Verificación técnica ejecutada por el agente:**
- ✔ `npm run test` → 4 archivos, 19 tests, todos en verde.
- ✔ Compila (`npm run build` exitoso).
- ✔ Sin errores de TypeScript — no aplica (proyecto JS puro); verificado con ESLint.
- ✔ Sin imports rotos.
- ✔ Sin archivos innecesarios.
- ✔ `npm run lint` sin errores ni warnings.
- ✔ Coincide con el plan maestro (sección 18 — funciones puras, parámetros legales nunca hardcodeados; sección 21 — testing unitario con Vitest).
- ✔ No se modificó ninguna funcionalidad ya implementada de las Fases 1-3.
- ℹ️ Vulnerabilidad `high` preexistente en `vite` (reportada por `npm audit`), no relacionada con esta fase ni con `vitest` — sigue pendiente de evaluar en una fase de mantenimiento/despliegue (ya reportada en la Fase 1).

### Fase 5 — Módulo Periodos de Nómina (UI + orquestación) ✅ COMPLETADA (2026-07-17)
- **Objetivo**: permitir crear un periodo, cargar novedades por empleado, ejecutar el cálculo y cerrar el periodo.
- **Archivos involucrados**: `supabase/migrations/0004_periodos_nomina.sql`, `nomina_detalle`, `src/services/nominaService.js`, `src/hooks/useNominaPeriodo.js`, `src/components/nomina/*`, `src/pages/Nomina/*`.
- **Dependencias**: Fase 2, Fase 3, Fase 4.
- **Resultado esperado**: flujo completo crear periodo → ingresar novedades → calcular → ver resultados → cerrar periodo (bloquea edición posterior).
- **Cómo validar**: crear un periodo de prueba con 2-3 empleados, verificar que los montos calculados coinciden con el motor de cálculo (Fase 4) probado por separado.

**Correcciones de esquema documentadas antes de implementar** (ver sección 25 y la nota en 2.1):
1. Se agregaron `horas_nocturnas` y `dias_trabajados` a `nomina_detalle` — faltaban en el diseño original y son entradas requeridas por el motor de cálculo de la Fase 4.
2. Se creó la tabla `config_parametros_legales` en esta fase (no en la Fase 8 como sugería implícitamente el plan original) porque la orquestación de cálculo depende de leerla; se sembró con los mismos valores de referencia "pendientes de verificación profesional" ya documentados en la Fase 4 (incluyendo `CESTA_TICKET_BS = 0` como placeholder explícito).

**Entregado:**
- `supabase/migrations/0004_periodos_nomina.sql` — tablas `config_parametros_legales` (+ seed de referencia), `periodos_nomina` (`estado` borrador/calculado/cerrado, `check fecha_fin >= fecha_inicio`) y `nomina_detalle` (`unique(periodo_id, empleado_id)`), con RLS: visibilidad de periodos y detalle atada al `creado_por` del periodo (o admin), consistente con la decisión ya tomada en la Fase 2; parámetros legales de lectura para autenticados y escritura solo admin.
- `src/services/nominaService.js` — `listPeriodos`, `getPeriodo`, `listNominaDetalle`, `getParametrosLegales`, `createPeriodo` (crea el periodo y genera automáticamente una fila de `nomina_detalle` por cada empleado activo del analista, con snapshot de `salario_base_usd` y `dias_trabajados` por defecto según `tipo_nomina`), `updateNovedades`, `calcularPeriodo` (orquesta las funciones puras de `src/lib/` de la Fase 4 con la tasa BCV del periodo y los parámetros legales, persiste los resultados y marca el periodo como `calculado`), `cerrarPeriodo`.
- Se agregó `listTasas()` a `src/services/bcvService.js` (aditivo) — necesario para poblar el selector de tasa al crear un periodo; no es la tabla de historial completa de la Fase 7, solo una lista simple.
- `src/hooks/useNominaPeriodo.js`, componentes `src/components/nomina/{PeriodoForm,NovedadesForm,NominaTable,ResumenPeriodo}.jsx`, páginas `src/pages/Nomina/index.jsx` (listado + creación) y `src/pages/Nomina/Periodo.jsx` (detalle: novedades editables mientras `estado='borrador'`, botón calcular, botón cerrar, resumen).
- Rutas `/nomina` y `/nomina/periodos/:id` añadidas; enlace agregado en `Dashboard.jsx` (cambio aditivo, no se tocó la lógica existente de auth/BCV).

**⚠️ Pendiente de acción manual del usuario:**
1. Aplicar `0004_periodos_nomina.sql` en el SQL Editor de Supabase (después de `0001`-`0003`).
2. Antes de confiar en un cálculo real: como `admin`, revisar/ajustar los valores sembrados en `config_parametros_legales` (especialmente `CESTA_TICKET_BS`, que quedó en 0) — la UI de administración para esto se construye recién en la Fase 8, así que por ahora requiere editarlos directamente en el SQL Editor o Table Editor de Supabase.
3. Probar el flujo completo: crear 2-3 empleados (Fase 2), asegurar que existe una tasa BCV (Fase 3), crear un periodo, cargar novedades, calcular, y confirmar que el neto coincide con lo esperado a mano usando los mismos parámetros.

**Verificación técnica ejecutada por el agente:**
- ✔ `npm run test` → 19/19 tests siguen en verde (no se modificó `src/lib/`, solo se reutiliza).
- ✔ Compila (`npm run build` exitoso).
- ✔ Sin errores de TypeScript — no aplica (proyecto JS puro); verificado con ESLint. La Edge Function `.ts` sigue fuera del alcance de ESLint/build de Vite.
- ✔ Sin imports rotos.
- ✔ Sin archivos innecesarios.
- ✔ `npm run lint` sin errores ni warnings.
- ✔ Coincide con el plan maestro, incluyendo las dos correcciones de esquema documentadas antes de aplicarse.
- ✔ No se modificó funcionalidad ya implementada de las Fases 1-4, salvo los cambios aditivos ya señalados (enlace en Dashboard, nueva función en `bcvService.js`).

### Fase 6 — Prestaciones sociales ✅ COMPLETADA (2026-07-17)
- **Objetivo**: acumular y consultar prestaciones sociales por empleado tras cada cierre de periodo.
- **Archivos involucrados**: `supabase/migrations/0005_prestaciones_sociales.sql`, `src/services/prestacionesService.js`, integración en `nominaService.js` (trigger al cerrar periodo), UI en `Empleados/Detalle`.
- **Dependencias**: Fase 5 (requiere periodos cerrados).
- **Resultado esperado**: al cerrar un periodo, se genera automáticamente el registro de prestaciones correspondiente; el historial es consultable por empleado.
- **Cómo validar**: cerrar un periodo de prueba y confirmar la fila nueva en `prestaciones_sociales` con el monto esperado.

**Alcance acotado documentado antes de implementar:** el motor de cálculo de la Fase 4 (`calcularPrestacionesAcumuladas`) solo modela la **garantía de prestaciones** (Art. 142 LOTTT, simplificada). El esquema de `prestaciones_sociales.tipo` permite `garantia`/`vacaciones`/`utilidades`, pero esta fase **solo genera automáticamente el tipo `garantia`** al cerrar un periodo — no existen todavía reglas de cálculo confirmadas para vacaciones ni utilidades, así que no se inventaron. Quedan como valores válidos del esquema para una fase futura.

**Entregado:**
- `supabase/migrations/0005_prestaciones_sociales.sql` — tabla `prestaciones_sociales` (`unique(empleado_id, periodo_id, tipo)` para evitar duplicados), RLS atada al `owner_id` del empleado (o admin), mismo criterio que el resto del esquema.
- `src/services/prestacionesService.js` — `listPrestacionesPorEmpleado`, `generarPrestacionesParaPeriodo` (reutiliza `calcularPrestacionesAcumuladas` de la Fase 4 con el `salario_base_bs` snapshot de cada fila de `nomina_detalle` y `DIAS_GARANTIA_POR_TRIMESTRE` de `config_parametros_legales`; usa `upsert` con `ignoreDuplicates` para ser segura ante reintentos).
- `src/services/nominaService.js` → `cerrarPeriodo` ahora: (1) exige que el periodo esté en estado `calculado` antes de cerrar (guarda adicional vía `.eq('estado', 'calculado')`, coherente con lo que ya exigía la UI de la Fase 5), y (2) llama a `generarPrestacionesParaPeriodo` tras cerrar. Es una extensión aditiva explícitamente prevista por esta fase, no una modificación de comportamiento existente fuera de alcance.
- `src/components/empleados/EmpleadoDetalle.jsx` (componente previsto desde la sección 8 pero diferido en la Fase 2) + `src/pages/Empleados/Detalle.jsx`, ruta `/empleados/:id` (ya prevista en la sección 16 de navegación pero no creada hasta ahora), enlace "Ver" agregado en `EmpleadoTable.jsx` (cambio aditivo).

**⚠️ Pendiente de acción manual del usuario:**
1. Aplicar `0005_prestaciones_sociales.sql` en el SQL Editor de Supabase (después de `0001`-`0004`).
2. Probar el flujo: calcular y cerrar un periodo de prueba (Fase 5), luego entrar a `/empleados/:id` de un empleado de ese periodo y confirmar que aparece la fila de prestaciones con el monto esperado.

**Verificación técnica ejecutada por el agente:**
- ✔ `npm run test` → 19/19 tests siguen en verde (no se modificó `src/lib/`).
- ✔ Compila (`npm run build` exitoso).
- ✔ Sin errores de TypeScript — no aplica (proyecto JS puro); verificado con ESLint.
- ✔ Sin imports rotos.
- ✔ Sin archivos innecesarios.
- ✔ `npm run lint` sin errores ni warnings.
- ✔ Coincide con el plan maestro, incluyendo el alcance acotado documentado antes de implementar.
- ✔ No se modificó funcionalidad ya implementada de las Fases 1-5, salvo la extensión aditiva de `cerrarPeriodo` prevista explícitamente por esta fase y el enlace "Ver" en `EmpleadoTable.jsx`.

### Fase 7 — Reportes y exportación ✅ COMPLETADA (2026-07-17)
- **Objetivo**: generar reporte consolidado por periodo y el historial de tasas BCV, exportables.
- **Archivos involucrados**: `src/services/reportesService.js`, `src/components/reportes/*`, `src/pages/Reportes/*`, librería de PDF elegida en Fase 0.
- **Dependencias**: Fase 5 (necesita periodos calculados), Fase 3 (historial BCV).
- **Resultado esperado**: reporte consolidado descargable en PDF/CSV con totales correctos; tabla de historial BCV filtrable por fecha.
- **Cómo validar**: comparar manualmente los totales del PDF exportado contra los datos en `nomina_detalle` de un periodo de prueba.

**Decisión resuelta antes de implementar**: librería de PDF = jspdf + jspdf-autotable (sección 25).

**Entregado:**
- `src/services/reportesService.js` — `listPeriodosCalculados` (filtra periodos en estado `calculado`/`cerrado`), `getReporteConsolidado` (reutiliza `getPeriodo`/`listNominaDetalle` de `nominaService.js`, sin duplicar queries), `getHistorialTasasBcv({desde, hasta})`.
- `src/utils/exportNomina.js` — `exportarReporteCsv` (sin dependencias nuevas) y `exportarReportePdf`.
- `src/components/reportes/{ReporteConsolidadoTable,ExportPdfButton}.jsx`.
- `src/components/bcv/TasaBcvHistorialTable.jsx` — el componente que se había diferido explícitamente desde la Fase 3, construido ahora en el lugar donde el plan lo ubica (sección 20).
- `src/pages/Reportes/index.jsx` (selector de periodo + tabla consolidada + exportación) y `src/pages/Reportes/HistorialBcv.jsx` (filtro por rango de fechas).
- Rutas `/reportes` y `/reportes/historial-bcv`; enlace agregado en `Dashboard.jsx` (aditivo).

**Ajuste técnico realizado durante la implementación (no es cambio de plan, es una optimización dentro del alcance):** `jspdf` arrastra `html2canvas` y otras dependencias pesadas; importarlo de forma estática inflaba el bundle principal de **toda la app** a ~900 KB (Vite emitió warning de chunk >500 KB) solo por la página de Reportes. Se cambió `exportarReportePdf` a `import()` dinámico de `jspdf`/`jspdf-autotable`, de forma que solo se cargan cuando el analista efectivamente exporta un PDF. El bundle principal bajó a ~471 KB y el build ya no emite warnings.

**⚠️ Pendiente de acción manual del usuario:**
Ninguna migración nueva en esta fase (no se tocó el esquema). Para validar: calcular y cerrar un periodo de prueba (Fases 5-6), entrar a `/reportes`, exportar el PDF/CSV y comparar los montos contra `nomina_detalle` en Supabase.

**Verificación técnica ejecutada por el agente:**
- ✔ `npm run test` → 19/19 tests siguen en verde.
- ✔ Compila (`npm run build` exitoso, sin warnings de tamaño de chunk tras el ajuste).
- ✔ Sin errores de TypeScript — no aplica (proyecto JS puro); verificado con ESLint.
- ✔ Sin imports rotos.
- ✔ Sin archivos innecesarios.
- ✔ `npm run lint` sin errores ni warnings (mismo ajuste de patrón async-en-effect que en fases anteriores, aplicado en `pages/Reportes/index.jsx`).
- ✔ Coincide con el plan maestro (sección 20 Reportes, sección 6 servicios, sección 8 componentes).
- ✔ No se modificó funcionalidad ya implementada de las Fases 1-6, salvo el enlace aditivo en `Dashboard.jsx`.
- ℹ️ Vulnerabilidad `high` preexistente en `vite` (reportada por `npm audit`), no relacionada con esta fase — sigue pendiente (ya reportada desde la Fase 1).

### Fase 8 — Panel de administración (usuarios + parámetros legales) ✅ COMPLETADA (2026-07-17)
- **Objetivo**: permitir a `admin` gestionar usuarios/roles y los parámetros legales sin tocar código.
- **Archivos involucrados**: `src/pages/Configuracion/*`, `src/pages/Usuarios/*`, `src/services/parametrosService.js`, políticas RLS específicas para `admin` en `config_parametros_legales` y `profiles`.
- **Dependencias**: Fase 1 (auth/roles), Fase 4 (motor de cálculo debe leer estos parámetros dinámicamente, no hardcodeados).
- **Resultado esperado**: cambiar un porcentaje (ej. IVSS) desde la UI afecta el próximo cálculo sin necesidad de deploy.
- **Cómo validar**: cambiar un parámetro, recalcular un periodo de prueba y confirmar que el resultado usa el nuevo valor.

**Correcciones/adiciones documentadas antes de implementar** (ver sección 25): (1) política RLS nueva `profiles_update_admin` para que un admin pueda cambiar rol/estado de otros usuarios — no existía; (2) `usuariosService.js` añadido a la sección 6; (3) nota informativa sobre `authService.js` (implementado dentro de `AuthContext.jsx` desde la Fase 1, sin refactor retroactivo).

**Entregado:**
- `supabase/migrations/0006_admin_panel.sql` — política `profiles_update_admin`.
- `src/services/parametrosService.js` — `listParametros`, `updateParametro` (también actualiza `vigente_desde` a la fecha del cambio, preservando el versionado por fecha ya previsto en el esquema de `config_parametros_legales`).
- `src/services/usuariosService.js` — `listUsuarios`, `updateUsuario`.
- `src/pages/Configuracion/index.jsx` — tabla editable de parámetros legales con aviso de que los valores sembrados son de referencia (coherente con las advertencias ya dejadas en las Fases 4-5).
- `src/pages/Usuarios/index.jsx` — tabla de usuarios con cambio de rol y activo/inactivo.
- `src/components/layout/ProtectedRoute.jsx` extendido con prop opcional `requireAdmin` (por defecto `false`, no cambia el comportamiento de ninguna ruta existente) para las nuevas rutas `/configuracion` y `/usuarios`.
- **Corrección de una condición de carrera descubierta al construir el guard de admin**: `AuthContext.jsx` solo exponía `loading` para la sesión, no para el perfil (`profiles`, de donde sale `rol`), que se resuelve en un segundo efecto asíncrono. Un `admin` entrando directo a `/usuarios` podía ser redirigido por un instante porque `rol` aún era `null`. Se agregó `profileLoading` (aditivo) a `AuthContext.jsx`, usado solo por `ProtectedRoute` cuando `requireAdmin` es `true` — no cambia el `loading` que ya consumen las demás rutas ni el resto de la Fase 1.
- Rutas `/configuracion` y `/usuarios` (`requireAdmin`); enlaces condicionados a `rol === 'admin'` agregados en `Dashboard.jsx` (aditivo).

**⚠️ Pendiente de acción manual del usuario:**
1. Aplicar `0006_admin_panel.sql` en el SQL Editor de Supabase (después de `0001`-`0005`).
2. Promover manualmente al menos un usuario a `rol = 'admin'` en Supabase (Table Editor sobre `profiles`) si aún no lo has hecho — es el único paso que sigue siendo manual porque no hay todavía ningún admin desde el cual auto-promoverse.
3. Probar el flujo: como admin, entrar a `/configuracion`, cambiar `PORCENTAJE_IVSS`, ir a un periodo en estado `borrador` (Fase 5), calcularlo y confirmar que `deduccion_ivss_bs` usa el nuevo valor.

**Verificación técnica ejecutada por el agente:**
- ✔ `npm run test` → 19/19 tests siguen en verde.
- ✔ Compila (`npm run build` exitoso, sin warnings).
- ✔ Sin errores de TypeScript — no aplica (proyecto JS puro); verificado con ESLint.
- ✔ Sin imports rotos.
- ✔ Sin archivos innecesarios.
- ✔ `npm run lint` sin errores ni warnings.
- ✔ Coincide con el plan maestro, incluyendo las correcciones documentadas antes de aplicarse.
- ✔ No se modificó el comportamiento de funcionalidad ya implementada de las Fases 1-7: las extensiones a `AuthContext.jsx` y `ProtectedRoute.jsx` son aditivas (nuevos campos/props opcionales con default que preserva el comportamiento previo) y corrigen una condición de carrera real detectada al construir esta fase, no un cambio arbitrario.

### Fase 9 — Testing de integración y E2E ⚠️ COMPLETADA CON LIMITACIÓN DOCUMENTADA (2026-07-17)
- **Objetivo**: cubrir los flujos críticos de punta a punta y las políticas RLS con pruebas automatizadas.
- **Archivos involucrados**: `tests/integration/*`, configuración de Supabase local para CI.
- **Dependencias**: Fases 1–8 completas.
- **Resultado esperado**: suite de pruebas que corre en CI, incluyendo al menos un test por política RLS crítica y un flujo E2E completo (login → cálculo → reporte).
- **Cómo validar**: pipeline de CI en verde; ejecución local de `supabase start` + `npm run test` sin fallos.

**⚠️ Limitación de entorno descubierta antes de implementar (documentada, no es una decisión de diseño):** este entorno de agente no tiene Docker ni el CLI de Supabase instalados (`which supabase`/`which docker` → not found), y ya se había confirmado desde la Fase 3 que tampoco tiene acceso a red. Los tests de integración/RLS de esta fase **requieren por definición una instancia real de Postgres con las políticas RLS aplicadas** (vía `supabase start`) — no se pueden ejecutar de forma significativa con mocks sin perder el propósito mismo de probar RLS. Por lo tanto:
- Se implementó todo lo que **sí** es verificable en este entorno: tests de componentes (`NovedadesForm`, `PeriodoForm`, exactamente los que pide la sección 21) y la suite de integración de RLS completa, pero **gateada** para no ejecutarse aquí ni accidentalmente contra el proyecto Supabase real del usuario.
- El flujo E2E completo (login → cálculo → reporte) **no se implementó** — la propia sección 21 lo marca como "opcional, fase tardía", y añadir Playwright/Cypress sin poder ejecutarlo ni una sola vez en este entorno habría sido código no verificado; se deja explícitamente pendiente, no se inventó una implementación no probada.
- **La suite de integración de RLS no pudo ejecutarse ni verificarse en este entorno.** Queda como responsabilidad del usuario correrla localmente (instrucciones abajo) o vía el workflow de CI ya configurado.

**Entregado:**
- `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` como devDependencies (no existían); `vite.config.js` ahora incluye `test: { environment: 'jsdom', setupFiles: ['./tests/setup.js'] }`; `tests/setup.js` registra `@testing-library/jest-dom` y limpia el DOM entre tests (`afterEach(cleanup)`), necesario para que los tests de componentes no interfieran entre sí.
- `tests/unit/components/NovedadesForm.test.jsx` y `PeriodoForm.test.jsx` — 7 tests cubriendo precarga de valores, envío con datos válidos, validación de campos obligatorios y de fechas, y estado `disabled`.
- `tests/integration/rls.integration.test.js` — cubre 3 políticas RLS críticas: aislamiento de `empleados` por `owner_id` (la decisión central de la Fase 2), escritura de `tasas_bcv` restringida a admin (Fase 3), escritura de `config_parametros_legales` restringida a admin (Fase 5/8). Se activa **solo** si existen `SUPABASE_TEST_URL`/`SUPABASE_TEST_ANON_KEY` (variables distintas de `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`), para que sea imposible que corra por accidente contra el proyecto real del usuario; sin ellas, se omite (`skip`), no falla.
- `.github/workflows/ci.yml` — lint + build + `supabase start` (Docker, vía `supabase/setup-cli`) + `npm run test` (unitarios, componentes e integración juntos) en cada push/PR. Nota: este repositorio **todavía no es un repositorio git** (confirmado por el entorno), así que este workflow queda inerte hasta que el usuario inicialice el repo y lo suba a GitHub — es un entregable correcto de esta fase, su activación depende de la Fase 10 (Despliegue).
- Se agregó un override de ESLint (`eslint.config.js`) con `globals.node` solo para `tests/integration/**`, ya que esos archivos corren en Node (usan `process.env`) a diferencia del resto del proyecto (browser).

**⚠️ Pendiente de acción manual del usuario (fuera del alcance de este agente — requiere Docker/Supabase CLI/red):**
1. Instalar Docker y el CLI de Supabase localmente.
2. Ejecutar `supabase start` en la raíz del proyecto (aplica automáticamente las migraciones de `supabase/migrations/`).
3. Tomar la `anon key` que imprime `supabase start` (siempre la misma por defecto en local) y exportarla junto con la URL antes de correr los tests:
   ```
   SUPABASE_TEST_URL=http://127.0.0.1:54321 SUPABASE_TEST_ANON_KEY=<anon-key-local> npm run test
   ```
4. Confirmar que las 3 suites de RLS pasan (actualmente se ven como `skipped` en este entorno, no como `passed`).
5. Si se decide implementar el E2E opcional de la sección 21, evaluar Playwright (recomendado para apps Vite/React) en una fase posterior.

**Verificación técnica ejecutada por el agente:**
- ✔ `npm run test` → 26/26 tests ejecutables en verde, 4 tests de integración RLS correctamente `skipped` (comportamiento esperado sin credenciales de un Supabase local/test).
- ✔ Compila (`npm run build` exitoso, sin warnings).
- ✔ Sin errores de TypeScript — no aplica (proyecto JS puro); verificado con ESLint.
- ✔ Sin imports rotos.
- ✔ Sin archivos innecesarios.
- ✔ `npm run lint` sin errores ni warnings.
- ✔ No se modificó el comportamiento de ningún test ni código de las Fases 1-8 ya implementado; los cambios en `vite.config.js` y `eslint.config.js` son aditivos (nuevas claves de configuración, no se removió ninguna existente).
- ⚠️ **No se pudo verificar el "resultado esperado" completo de esta fase** (pipeline de CI en verde contra Supabase real) por las limitaciones de entorno ya documentadas — es la primera fase donde la verificación queda parcialmente en manos del usuario, no por elección sino por restricción técnica del entorno de este agente.

### Fase 10 — Despliegue y hardening de seguridad ⚠️ COMPLETADA CON ALCANCE ACOTADO (2026-07-17)
- **Objetivo**: llevar la app a producción de forma segura.
- **Archivos involucrados**: configuración de Vercel/Netlify, `supabase/migrations/*` aplicadas a proyecto prod, variables de entorno de producción.
- **Dependencias**: Fase 9 completada (tests en verde).
- **Resultado esperado**: app accesible en producción, RLS activo y verificado en el proyecto Supabase real, sin `service_role key` expuesta.
- **Cómo validar**: checklist de seguridad (sección 27) completo; auditoría manual del bundle de producción buscando claves sensibles; prueba de login real en producción.

**⚠️ Dependencia no completamente satisfecha, documentada antes de proceder:** la Fase 9 requería "tests en verde", pero los tests de integración RLS quedaron `skipped` (no `passed`) por la falta de Docker/Supabase CLI/red en este entorno — ya documentado en su momento. Se consultó al usuario cómo proceder dado que además: (a) el destino de hosting nunca se decidió formalmente entre Vercel/Netlify, y (b) este agente no tiene credenciales para desplegar de verdad (cuenta de hosting, contraseña de la base de datos de producción, ni un repositorio git conectado — el proyecto sigue sin ser un repo git). El usuario confirmó: hosting = **Netlify**, y pidió preparar todo lo posible más un checklist/runbook manual, en vez de detener la fase o fingir un despliegue que no se puede ejecutar aquí.

**Entregado (lo que sí está en el alcance de este agente):**
- `netlify.toml` — build (`npm run build` → `dist`) + regla de redirect SPA (`/* → /index.html`, status 200), necesaria porque la app usa `react-router` en modo cliente (sin esto, recargar `/empleados/123` daría 404 en Netlify).
- `README.md` reescrito por completo (todavía tenía el contenido por defecto de la plantilla de Vite) — instrucciones de configuración, variables de entorno, cómo levantar Supabase local, cómo correr los tests de integración, y referencia al runbook de despliegue. Esto cierra el punto pendiente del checklist de la sección 27 ("Documentado en README cómo levantar Supabase local para desarrollo").
- **Fix de un gap real en `src/pages/Configuracion/index.jsx` (Fase 8)**: `handleGuardar` no validaba el valor antes de enviarlo a Supabase (podía enviar `NaN` si el campo quedaba vacío o con texto inválido) — el checklist de la sección 27 exige que "todo formulario numérico valide rangos válidos antes de enviar a Supabase", y este no lo hacía. Se agregó la validación (`Number.isNaN` / `< 0`), igual que ya tenían `EmpleadoForm` y `TasaBcvManualForm`. Es una corrección de un defecto real, no un cambio de diseño.
- **Auditoría de seguridad ejecutada:** se buscó `service_role` en todo `src/` y `supabase/` (solo aparece como comentario explicativo y como `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` dentro de la Edge Function, leída en runtime server-side — nunca hardcodeada); se generó el build de producción y se buscaron JWT (`eyJ...`) dentro de `dist/` — solo aparece la `anon key` (`"role":"anon"` en su payload decodificado), que es pública y segura de exponer por diseño (protegida por RLS). Ninguna `service_role key` presente en el bundle.
- **Checklist de la sección 27, verificado punto por punto:**
  - ✔ Motor de cálculo con tests unitarios y edge cases (Fase 4).
  - ⚠️ Políticas RLS: tests escritos y cubriendo las 3 políticas críticas (Fase 9), pero **no ejecutados/verificados** en este entorno — pendiente de que el usuario los corra localmente.
  - ✔ Ningún parámetro legal hardcodeado en el motor de cálculo (Fases 4-5).
  - ✔ `service_role key` no aparece en el frontend ni en el bundle (verificado arriba).
  - ✔ Formularios numéricos validan rango — incluyendo el fix aplicado en esta fase a `Configuracion/index.jsx`.
  - ✔ `vite build` sin warnings críticos.
  - ✔ README documenta cómo levantar Supabase local (reescrito en esta fase).

**⚠️ Pendiente de acción manual del usuario (despliegue real — fuera del alcance de este agente):**
1. **Verificar RLS de verdad**: correr `supabase start` + `SUPABASE_TEST_URL=... SUPABASE_TEST_ANON_KEY=... npm run test` (ver README) y confirmar que las 3 suites de integración pasan, antes de confiar en que las políticas funcionan como se diseñaron.
2. **Inicializar git y subir a GitHub**: `git init`, commit, crear repositorio remoto y `git push` — necesario tanto para Netlify (deploy por push) como para que `.github/workflows/ci.yml` (Fase 9) empiece a ejecutarse.
3. **Crear el sitio en Netlify**: conectar el repositorio de GitHub: Netlify detecta `netlify.toml` automáticamente (build command y publish dir ya configurados).
4. **Configurar variables de entorno en Netlify** (Site settings → Environment variables): `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` — **nunca** la `service_role key`.
5. **Aplicar todas las migraciones al proyecto Supabase de producción** (si no se hizo ya durante las fases anteriores): `supabase link --project-ref qktzpulvngcrstwzzzkp` seguido de `supabase db push`, o pegarlas manualmente en el SQL Editor en orden (`0001` a `0006`).
6. **Desplegar la Edge Function** `fetch-tasa-bcv` a producción y configurar su cron diario (ver Fase 3).
7. **Promover al primer usuario admin** en el proyecto de producción (Table Editor → `profiles` → `rol = 'admin'`).
8. **Probar login real en producción** y recorrer el flujo completo (empleados → periodo → cálculo → reporte) contra el sitio ya desplegado.
9. Opcional: resolver `npm audit` (vulnerabilidad `high` en `vite`, señalada desde la Fase 1) antes de considerar el hardening completo.

**Verificación técnica ejecutada por el agente:**
- ✔ `npm run test` → 26/26 tests ejecutables en verde (sin cambios respecto a la Fase 9).
- ✔ Compila (`npm run build` exitoso, sin warnings).
- ✔ Sin errores de TypeScript — no aplica (proyecto JS puro); verificado con ESLint.
- ✔ Sin imports rotos.
- ✔ Sin archivos innecesarios.
- ✔ `npm run lint` sin errores ni warnings.
- ✔ No se modificó el comportamiento de ninguna funcionalidad ya implementada, salvo el fix de validación en `Configuracion/index.jsx` (defecto real corregido, no cambio de diseño) y la reescritura de `README.md` (que no contenía documentación real del proyecto, solo el texto por defecto de la plantilla).
- ⚠️ **El "resultado esperado" de esta fase (app accesible en producción, RLS verificado contra el proyecto real) no se pudo completar** — es una acción que requiere credenciales y accesos que este agente no tiene. Se documentó el motivo, se resolvió lo que sí estaba al alcance, y se dejó un runbook explícito para que el usuario complete el resto.

---

## 29. Auditoría de base de datos (2026-07-17)

Auditoría completa de `supabase/migrations/0001` a `0006` tras cerrar las 10 fases. Metodología: lectura de las 6 migraciones existentes, revisión cruzada contra el código de `src/services/*.js` que las consume, y verificación de compilación/tests tras cada cambio. **No se pudo ejecutar contra una base de datos real** (mismas limitaciones de entorno documentadas en la Fase 9: sin Docker/Supabase CLI/red) — los hallazgos son de revisión estática de SQL, no de `EXPLAIN ANALYZE` real.

### Hallazgos y qué se hizo con cada uno

| # | Categoría | Hallazgo | Severidad | Acción |
|---|---|---|---|---|
| 1 | **Seguridad / RLS** | **Crítico**: `profiles_update_own` (Fase 1) solo validaba `id = auth.uid()`, sin restringir columnas. Cualquier usuario autenticado podía ejecutar `update profiles set rol = 'admin' where id = auth.uid()` y auto-promoverse a admin, saltándose por completo la UI de la Fase 8. | 🔴 Crítica | ✅ Aplicado — trigger `protect_profile_privileged_columns` (0007) fuerza `rol`/`activo` a su valor anterior salvo que quien ejecuta la actualización ya sea admin. Defensa en profundidad: funciona sin importar qué política RLS permitió el UPDATE. |
| 2 | **RLS** | `nomina_detalle_update_own_or_admin` (Fase 5) no tenía `WITH CHECK`, así que reutilizaba el `USING` — que solo valida el `periodo_id`, no el `empleado_id`. Un usuario podía reasignar una fila de `nomina_detalle` a un empleado que no le pertenece (el `INSERT` sí lo validaba; el `UPDATE`, no). | 🟠 Alta | ✅ Aplicado — se agregó `WITH CHECK` a la política, espejando la validación de propiedad de `empleado_id` que ya tenía el `INSERT`. |
| 3 | **Foreign keys** | `empleados.owner_id` y `periodos_nomina.creado_por` tenían `ON DELETE CASCADE` hacia `profiles`. Borrar un usuario (no solo desactivarlo) arrastraría en cascada todos sus empleados, periodos, `nomina_detalle` y `prestaciones_sociales` — pérdida silenciosa de un histórico con implicancia legal/fiscal. | 🟠 Alta | ✅ Aplicado — cambiado a `ON DELETE RESTRICT`: borrar un `profile` con datos asociados ahora falla explícitamente, forzando una decisión consciente (reasignar u archivar) en vez de perder datos en silencio. |
| 4 | **Índices duplicados** | `nomina_detalle_periodo_id_idx` es redundante: el `UNIQUE(periodo_id, empleado_id)` de la misma tabla ya crea un índice cuyo prefijo izquierdo (`periodo_id`) sirve para las mismas consultas. Mismo caso con `prestaciones_sociales_empleado_id_idx` frente a `UNIQUE(empleado_id, periodo_id, tipo)`. | 🟡 Media | ✅ Aplicado — ambos índices redundantes eliminados (`DROP INDEX`); el `UNIQUE` que los hacía innecesarios se conserva. |
| 5 | **Índices faltantes** | Columnas FK sin índice: `tasas_bcv.creado_por`, `periodos_nomina.tasa_bcv_id`, `nomina_detalle.empleado_id`, `prestaciones_sociales.periodo_id`. Postgres no indexa automáticamente las columnas FK. | 🟡 Media | ✅ Aplicado — los 4 índices creados. |
| 6 | **Consultas lentas** | `periodos_nomina_creado_por_idx` (columna simple) no cubre eficientemente el patrón real de `listPeriodos()`: filtro RLS por `creado_por` + `order by created_at desc`. | 🟡 Media | ✅ Aplicado — reemplazado por un índice compuesto `(creado_por, created_at desc)`. |
| 7 | **Consultas lentas** | `nominaService.calcularPeriodo()` (Fase 5) actualizaba cada fila de `nomina_detalle` con un `UPDATE` individual dentro de un `Promise.all` — N round-trips a la base de datos por cada empleado del periodo. | 🟡 Media | ✅ Aplicado (código, no SQL) — se cambió a un único `upsert()` por lote. Se tuvo cuidado de incluir también las columnas not-null ya existentes (`horas_extra`, `horas_nocturnas`, `dias_trabajados`, etc.), no solo las calculadas: `upsert` es un `INSERT ... ON CONFLICT DO UPDATE`, y omitir esas columnas habría aplicado su `DEFAULT` (`0`), **borrando las novedades ya cargadas por el analista** — se verificó este detalle antes de aplicar el cambio para no introducir una regresión. |
| 8 | **Constraints faltantes** | `nomina_detalle` (`horas_extra`, `horas_nocturnas`, `dias_trabajados` y todas las columnas `_bs` calculadas), `prestaciones_sociales` (`dias_acumulados`, `monto_acumulado_bs`) y `config_parametros_legales` (`valor`) no tenían `CHECK >= 0` — solo se validaba en el frontend, no en la base de datos. | 🟠 Alta | ✅ Aplicado — `CHECK >= 0` agregado a las 14 columnas (permitiendo `NULL` en las que aún no se han calculado). |
| 9 | **Constraints** | `tasas_bcv` no exigía `creado_por is not null` cuando `origen = 'manual'` — dependía solo de que el código de `bcvService.createTasaManual` siempre lo enviara. | 🟡 Media | ✅ Aplicado — `CHECK (origen = 'api' or (origen = 'manual' and creado_por is not null))`. |
| 10 | **Integridad / máquina de estados** | Nada en la base de datos impedía que una llamada REST directa (sin pasar por `nominaService.js`) moviera `periodos_nomina.estado` de `'borrador'` a `'cerrado'` saltándose el cálculo, o modificara un periodo ya `'cerrado'`. El guard existente (`.eq('estado','calculado')` en `cerrarPeriodo`) solo protege el camino que usa la app. | 🟠 Alta | ✅ Aplicado — trigger `enforce_periodo_estado_transition` en `periodos_nomina`: solo permite `borrador→calculado`, `calculado→borrador` (recálculo) y `calculado→cerrado`; cualquier otra transición (incluyendo tocar un periodo `cerrado`) lanza una excepción explícita. |
| 11 | **Tablas duplicadas** | Ninguna encontrada. Las 7 tablas (`profiles`, `empleados`, `tasas_bcv`, `config_parametros_legales`, `periodos_nomina`, `nomina_detalle`, `prestaciones_sociales`) tienen responsabilidades disjuntas. | — | Sin acción. |
| 12 | **Normalización** | `config_parametros_legales` tiene `clave` como PK único (no compuesto con `vigente_desde`), pero la sección 2.1 documenta la intención de "versionar cambios legales en el tiempo". En la implementación real, `parametrosService.updateParametro()` hace `UPDATE`, así que **cada cambio sobrescribe y destruye el valor anterior** — no hay histórico real, pese a lo que sugiere el comentario del esquema. Si algún día se recalcula un periodo cerrado antiguo, usaría los porcentajes *actuales*, no los vigentes cuando se calculó originalmente. | 🟡 Media (propuesta, **no aplicada**) | ⏳ **Pendiente de decisión del usuario** — ver abajo. No se aplicó porque implica cambiar el comportamiento de `updateParametro` (de `UPDATE` a `INSERT` de una nueva versión) y la lógica de `calcularPeriodo` (elegir el parámetro vigente a la fecha del periodo, no siempre "el último"), lo cual excede una corrección de esquema/índices/constraints y altera semántica de negocio ya implementada — se prefirió documentar y preguntar antes de tocarlo. |

### Propuesta pendiente de decisión: versionado real de `config_parametros_legales`

Si se quiere que `vigente_desde` cumpla lo que su nombre promete, el cambio sería: PK compuesta `(clave, vigente_desde)`, `updateParametro` pasa a **insertar** una fila nueva en vez de actualizar la existente, y `getParametrosLegales`/`calcularPeriodo` deberían resolver "el valor vigente a la fecha del periodo" (`vigente_desde <= fecha_periodo`, tomando el más reciente por `clave`) en lugar de simplemente "el único valor que existe". Esto es deseable para un sistema de nómina con implicancia legal (poder auditar y recalcular con los parámetros históricos correctos), pero es un cambio de comportamiento, no solo de esquema — **no se implementó en esta auditoría**, queda como recomendación explícita para una fase futura si el usuario lo confirma.

### Verificación técnica ejecutada por el agente

- ✔ `npm run test` → 26/26 tests ejecutables en verde tras el cambio en `nominaService.calcularPeriodo` (sin regresiones).
- ✔ Compila (`npm run build` exitoso, sin warnings).
- ✔ `npm run lint` sin errores ni warnings.
- ✔ Sin imports rotos.
- ⚠️ La migración `0007_db_audit_hardening.sql` **no se ha aplicado** a ningún proyecto Supabase real (mismas limitaciones de entorno de las Fases 3/9/10: sin Docker/CLI/red). No se pudo correr `EXPLAIN ANALYZE` ni confirmar en vivo que los índices nuevos se usan — el análisis de índices faltantes/redundantes es por inspección de las columnas de `WHERE`/`ORDER BY`/`JOIN` usadas en `src/services/*.js`, no por planes de ejecución reales.

### ⚠️ Pendiente de acción manual del usuario

1. Aplicar `0007_db_audit_hardening.sql` en el SQL Editor de Supabase (después de `0001`-`0006`). **Si falla por datos existentes que violan los nuevos `CHECK`** (por ejemplo, alguna fila con un valor negativo cargado antes de esta auditoría), habrá que corregir esas filas primero — revisar el mensaje de error de Postgres, que indica la fila y constraint exactos.
2. Probar el fix crítico de seguridad: con un usuario no-admin, intentar `update profiles set rol='admin' where id=auth.uid()` directamente vía el cliente de Supabase y confirmar que `rol` no cambia.
3. Decidir si se implementa el versionado real de `config_parametros_legales` (ver propuesta arriba) en una fase futura.

---

## 30. Auditoría CTO pre-lanzamiento (2026-07-17)

Revisión de todo el proyecto simulando una auditoría de un CTO antes de un lanzamiento comercial, cubriendo: arquitectura, código, seguridad, escalabilidad, UI/UX, base de datos, Supabase, Netlify, variables de entorno, documentación, testing, rendimiento, accesibilidad, SEO básico, errores TypeScript/ESLint, build y dependencias. **Veredicto: el código está listo; el despliegue no está verificado.** No se declara el sistema "preparado para desplegar" — ver el motivo al final de esta sección.

### Hallazgos corregidos en esta auditoría

| Categoría | Hallazgo | Acción |
|---|---|---|
| **Dependencias** | Vulnerabilidad `high` en `vite` (arrastrada desde la Fase 1, nunca resuelta). | ✅ `npm audit fix` — `vite` actualizado dentro de su rango semver (`^8.0.12`) a `8.1.5`. `npm audit` ahora reporta **0 vulnerabilidades**. Se re-verificó test/lint/build tras el cambio. |
| **SEO básico** | `index.html` tenía `lang="en"` (app en español), título genérico `calculadora-app`, sin meta description, sin directiva de indexación. | ✅ `lang="es-VE"`, título `Calculadora de Nómina`, meta description agregada, y `<meta name="robots" content="noindex, nofollow">` — **intencional**: es una app privada con datos de nómina detrás de login, no debe indexarse en buscadores. |
| **Código / limpieza** | `src/assets/hero.png`, `react.svg`, `vite.svg` y `public/icons.svg` eran huérfanos de la plantilla original de Vite/demo — nunca referenciados por ningún archivo del proyecto (confirmado por búsqueda exhaustiva). | ✅ Eliminados los 4 archivos y la carpeta `src/assets/` vacía. |
| **Robustez / manejo de errores** | La app no tenía ningún Error Boundary de React. Un error de render no controlado en cualquier pantalla dejaba una página en blanco sin recuperación posible para el usuario. | ✅ Agregado `src/components/layout/ErrorBoundary.jsx`, envolviendo toda la app en `App.jsx`. Muestra un mensaje y un botón para volver al dashboard en vez de pantalla en blanco. |
| **Seguridad (Netlify)** | No había cabeceras de seguridad HTTP configuradas para el sitio desplegado. | ✅ Agregadas a `netlify.toml`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictiva. **No se agregó `Content-Security-Policy`**: requiere probarse contra la URL real de Supabase (llamadas `fetch`/XHR) y este entorno no tiene acceso a red para verificarla sin riesgo de romper la app en producción sin poder comprobarlo — queda como recomendación explícita, no aplicada. |

### Verificado y ya en buen estado (sin cambios necesarios)

- **Arquitectura**: capas respetadas — `src/lib/` (motor de cálculo) no importa nada, ni servicios ni Supabase; ningún componente/página llama a Supabase directamente, todo pasa por `src/services/*.js` (verificado por búsqueda exhaustiva de imports).
- **Código**: sin `console.log`/`debugger` olvidados, sin comentarios `TODO`/`FIXME` pendientes, sin `dangerouslySetInnerHTML` ni `eval`/`new Function` (sin vectores de XSS de ese tipo).
- **Errores de TypeScript**: no aplica — proyecto JavaScript puro, sin `tsconfig.json` ni `typescript` como dependencia (la única pieza `.ts` es la Edge Function de Deno, fuera del build de Vite).
- **Errores de ESLint**: `npm run lint` — 0 errores, 0 warnings.
- **Build**: `npm run build` — exitoso, sin warnings de tamaño de chunk (ya resuelto en la Fase 7 con `import()` dinámico de `jspdf`).
- **Testing**: 27/31 tests ejecutables en verde (los 4 restantes son la suite de integración RLS, correctamente `skipped` sin credenciales de Supabase local — ver limitación de entorno más abajo).
- **Dependencias**: todas las declaradas en `package.json` están efectivamente en uso (se verificó específicamente `jspdf`/`jspdf-autotable`, que se importan de forma dinámica y por eso no aparecían en una búsqueda ingenua de imports estáticos). `npm outdated` solo muestra bumps de parche/menor ya cubiertos por los rangos semver existentes — sin actualizaciones mayores pendientes ni breaking changes.
- **Variables de entorno**: `supabaseClient.js` falla explícito y temprano si faltan `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`; `.env.local` gitignorado; ninguna `service_role key` presente en el código ni en el bundle de producción (re-verificado en esta auditoría).
- **Documentación**: `README.md` cubre instalación, variables de entorno, Supabase local, tests, Edge Functions y despliegue; `PLAN_MAESTRO.md` documenta arquitectura, esquema, decisiones y el estado de cada fase.
- **UI/UX/Accesibilidad**: cubierto en profundidad en la auditoría UX anterior (sistema de diseño consistente, labels reales, tablas responsive, navegación centralizada).

### Limitaciones de entorno que impiden declarar "listo para producción" (no son código pendiente, son verificación pendiente)

Estas ya se documentaron individualmente en las Fases 3, 9 y 10, y en la auditoría de base de datos — se consolidan aquí como el punto de bloqueo real para el veredicto final:

1. **Sin acceso a red ni Docker/Supabase CLI en este entorno**: no se pudo aplicar ninguna migración (`0001`-`0007`) a un proyecto Supabase real, ni ejecutar la suite de integración de RLS, ni desplegar/invocar la Edge Function `fetch-tasa-bcv` para confirmar que el parseo de la API de pydolarve.org es correcto.
2. **Sin repositorio git**: el proyecto nunca se inicializó como repo (confirmado por el entorno). Netlify se conecta a un repositorio git — sin uno, no existe ningún sitio desplegado, y `.github/workflows/ci.yml` nunca se ha ejecutado ni una sola vez.
3. **Sin cuenta de Netlify conectada**: nadie ha creado el sitio, configurado las variables de entorno de producción, ni verificado que `netlify.toml` funciona como se espera en la plataforma real.
4. **Sin usuario admin en ninguna base de datos real**: el flujo completo (login → empleados → periodo → cálculo → cierre → reporte) nunca se ha ejecutado de punta a punta contra datos reales.
5. **Rendimiento y accesibilidad no medidos en vivo**: los hallazgos de esta y la auditoría anterior son por inspección de código; no se corrió Lighthouse, axe-core, ni un lector de pantalla real contra la app desplegada (no hay navegador disponible en este entorno).

### Veredicto

**No se declara el sistema "preparado para ser desplegado".** No porque falte código por corregir — todos los hallazgos que pude verificar y corregir en este entorno (dependencias, SEO, limpieza, manejo de errores, cabeceras de seguridad, y todo lo acumulado en las Fases 1-10 y la auditoría de base de datos) están resueltos — sino porque **"listo para producción" incluye verificación contra infraestructura real que este agente no tiene forma de acceder** (base de datos, hosting, red). Afirmar que está listo sin haber podido comprobarlo sería una garantía falsa.

**Checklist final para que el usuario confirme la salida a producción:**

- [x] Aplicar migraciones `0001` a `0009` en el proyecto Supabase de producción, en orden. **(2026-07-17, incluye los fixes 0008/0009 encontrados en vivo, ver sección 31)**
- [ ] Verificar RLS con `supabase start` local + `SUPABASE_TEST_URL`/`SUPABASE_TEST_ANON_KEY` (ver README) y confirmar que las 3 suites de integración pasan.
- [ ] Probar en vivo el fix crítico de seguridad de la auditoría de BD (un usuario no-admin no debe poder auto-promoverse a `rol='admin'`).
- [x] Inicializar git, subir a GitHub, conectar el repositorio a Netlify. **(2026-07-17)**
- [x] Configurar `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` en las variables de entorno de Netlify. **(2026-07-17)**
- [ ] Desplegar y programar (cron diario) la Edge Function `fetch-tasa-bcv`; invocarla una vez y confirmar que la tasa se extrae correctamente de pydolarve.org. Mientras tanto, la tasa se está cargando manualmente vía el formulario de admin — funcional, pero requiere acción humana diaria.
- [x] Promover al primer usuario a `admin` en la base de datos de producción. **(2026-07-17)**
- [ ] Revisar/ajustar `config_parametros_legales` (especialmente `CESTA_TICKET_BS`, sembrado en 0) con un asesor legal/contable real.
- [x] Recorrer el flujo completo (login → empleado → periodo → cálculo → cierre → reporte) contra el sitio ya desplegado. **(2026-07-17, confirmado por el usuario: "funcionó sin problemas")**
- [ ] Opcional pero recomendado: correr Lighthouse y un lector de pantalla real contra el sitio desplegado; evaluar agregar una `Content-Security-Policy` una vez se pueda probar contra la URL real de Supabase.

6 de 10 puntos completados y verificados en producción real. Quedan 4 pendientes (3 recomendados, 1 opcional) — ver sección 31 para el detalle de lo ya verificado en vivo.

---

## 31. Despliegue real y hallazgos en producción (2026-07-17)

A diferencia de las fases anteriores, esto sí se ejecutó contra infraestructura real (el usuario tiene git, GitHub, Netlify y Supabase con credenciales, algo que este agente nunca tuvo). Progreso:

- ✅ Repositorio git inicializado localmente y subido a `https://github.com/HondaTodayFan1/Proyecto-IA` (rama `main`). Se verificó antes del commit que `.env.local` y `.claude/settings.local.json` quedaran excluidos (el segundo no estaba cubierto por `*.local` — se corrigió `.gitignore`).
- ✅ Sitio conectado en Netlify (`proyectoiacalculadora.netlify.app`), build exitoso confirmado por el título de la página desplegada.
- ✅ Las 7 migraciones (`0001`-`0007`) aplicadas por el usuario en el proyecto Supabase real, sin errores.
- ✅ Diagnosticado y resuelto: pantalla en blanco por variables de entorno de Netlify no configuradas en el primer deploy (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` se hornean en build time con Vite — agregarlas requiere un redeploy, no basta con guardarlas).
- ✅ Diagnosticado: `email rate limit exceeded` del servicio de correo compartido de Supabase durante las pruebas de registro — se desactivó "Confirm email" temporalmente para desbloquear el registro en esta etapa de pruebas (con nota de reactivarlo junto con SMTP propio antes de uso real).

### 🐛 Bug real encontrado al promover el primer admin: `0008_fix_profile_trigger_dashboard.sql`

Al intentar promover al primer usuario a `admin` editando `profiles.rol` directamente desde el **Table Editor de Supabase**, el cambio no se guardaba (sin error visible) y la app mostraba `rol: cargando...` de forma indefinida.

**Causa raíz**: el trigger `protect_profile_privileged_columns` (agregado en `0007` para prevenir auto-escalación de privilegios, ver sección 29) revertía `rol`/`activo` a su valor anterior cuando `is_admin(auth.uid())` era falso. Pero `auth.uid()` es `NULL` no solo para un usuario no-admin autenticado, sino **también** para cualquier operación hecha desde el Table Editor/SQL Editor del dashboard o vía `service_role` — contextos que ya están fuera del alcance de RLS y son inherentemente de confianza. El trigger no distinguía "usuario autenticado no-admin" (el caso que sí debe bloquearse) de "sin sesión de usuario en absoluto" (dashboard/service_role), y terminaba bloqueando la única forma de arrancar el sistema: promover manualmente al primer admin.

**Por qué el fix sigue siendo seguro** (verificado antes de aplicarlo, no solo asumido): un cliente verdaderamente anónimo (sin JWT) tampoco tiene `auth.uid()`, pero las políticas RLS de `UPDATE` en `profiles` (`id = auth.uid()` / `is_admin(auth.uid())`) ya bloquean ese caso *antes* de que la fila llegue al trigger — RLS nunca deja pasar un `UPDATE` anónimo. La única forma real de ejecutar el trigger con `auth.uid() is null` es un contexto que ya bypasea RLS (dashboard, `service_role`, migraciones), que ya es de máxima confianza en el modelo de seguridad de Supabase. El fix no abre ninguna vía nueva de escalación de privilegios para un usuario final autenticado con la `anon key`.

**Fix**: `supabase/migrations/0008_fix_profile_trigger_dashboard.sql` — el trigger ahora solo revierte `rol`/`activo` cuando `auth.uid() is not null and not is_admin(auth.uid())` (usuario autenticado real que no es admin). Sin sesión de usuario, pasa sin restricción.

**⚠️ Pendiente de acción manual del usuario**: aplicar `0008_fix_profile_trigger_dashboard.sql` en el SQL Editor de Supabase (después de `0007`), y volver a intentar la promoción a admin desde el Table Editor.

### Mejora de UX relacionada: estado "cargando" ambiguo

Independientemente del bug del trigger, se encontró que `AuthContext.jsx` usaba `profile === null` tanto para "todavía cargando" como para "falló la carga" — ambos casos mostraban `rol: cargando...` en el Dashboard **para siempre** si la carga fallaba, sin ninguna señal de error. Se agregó un estado `profileError` explícito (aditivo, no cambia el flujo de sesión/rol existente) y `Dashboard.jsx` ahora distingue tres estados: cargando, error (con mensaje visible), o el rol real. Esto no habría arreglado el bug del trigger, pero habría hecho mucho más rápido diagnosticar que algo fallaba en vez de asumir que "todavía estaba cargando".

**Verificación técnica ejecutada por el agente:**
- ✔ `npm run test` → 27/27 tests ejecutables en verde.
- ✔ Compila (`npm run build` exitoso).
- ✔ `npm run lint` sin errores ni warnings.
- ✔ No se modificó el flujo de autenticación existente — `profileError` es un campo nuevo del contexto, no reemplaza a `profile`/`rol`/`profileLoading`.

### 🐛 Segundo bug real: `infinite recursion detected in policy for relation "profiles"` — `0009_fix_profiles_select_recursion.sql`

El campo `profileError` recién agregado sirvió exactamente para lo que se pensó: en cuanto apareció, expuso este segundo bug, mucho más serio que el del trigger, en vez de quedar oculto detrás de un "cargando..." infinito.

**Causa raíz**: `profiles_select_own_or_admin` (política de `SELECT` sobre `profiles`, `0001_init.sql`) se escribió **antes** de que existiera `public.is_admin()` (introducida recién en `0002_empleados.sql`) y usaba un `exists(select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'admin')` inline. Esa subconsulta contra `profiles` obliga a Postgres a re-evaluar la misma política de `profiles` sobre sí misma → recursión infinita, que Postgres detecta y aborta con ese error en vez de colgarse. Todas las políticas escritas *después* de la Fase 1 ya usan `is_admin()` (segura porque es `SECURITY DEFINER`, bypassa RLS en su consulta interna), pero esta primera política — la más crítica de todas, porque es la que permite a cualquier usuario leer su propio perfil — se quedó con el patrón inseguro original. Probablemente estuvo latente todo este tiempo porque con pocas filas el planificador de consultas evitaba esa rama del `OR`, hasta que algo (más filas, un plan distinto) lo activó.

Se revisaron todas las demás políticas del esquema (`grep` de `from public.profiles` en las 8 migraciones anteriores) para confirmar que esta era la **única** con el patrón recursivo — todas las demás ya usaban `is_admin()` correctamente.

**Fix**: `supabase/migrations/0009_fix_profiles_select_recursion.sql` — reemplaza el `exists(...)` inline por `public.is_admin(auth.uid())`, manteniendo exactamente la misma semántica (propio perfil o admin) sin recursión.

**✅ Aplicado y verificado por el usuario (2026-07-17)**: `0009` corrió sin errores en el proyecto real, y tras el redeploy el Dashboard muestra `rol: admin` correctamente. Los dos bugs de esta sección (trigger de `profiles` y recursión de RLS) quedan confirmados como resueltos en producción, no solo en teoría.

---

## Próximo paso sugerido

Todas las 10 fases del plan, la auditoría de base de datos, la auditoría UX y la auditoría CTO pre-lanzamiento están completas o documentadas. El código está en el mejor estado posible sin acceso a infraestructura real. El siguiente paso es que el usuario recorra el checklist de la sección 30 para pasar de "código listo" a "producción verificada".
