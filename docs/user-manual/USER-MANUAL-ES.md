# ClickIn 360 CRM — Manual de usuario (Español)

**Audiencia:** Propietarios, administradores y equipo de ventas
**Versión:** 2026-06-15

Este manual describe el uso diario del CRM ClickIn 360. Las etiquetas de la interfaz coinciden con el locale español (`lib/crm/locales/es.json`).

---

## Tabla de contenidos

1. [Primeros pasos](#1-primeros-pasos)
2. [Roles y permisos](#2-roles-y-permisos)
3. [Navegación](#3-navegación)
4. [Ciclo de vida completo del cliente](#4-ciclo-de-vida-completo-del-cliente)
5. [Panel y analítica](#5-panel-y-analítica)
6. [Contactos](#6-contactos)
7. [Pipelines y ciclo de ventas](#7-pipelines-y-ciclo-de-ventas)
8. [Cotizaciones](#8-cotizaciones)
9. [Finanzas](#9-finanzas)
10. [Ciclo de proyecto](#10-ciclo-de-proyecto)
11. [Calendarios](#11-calendarios)
12. [Conversaciones](#12-conversaciones)
13. [Tickets de servicio](#13-tickets-de-servicio)
14. [Adjuntos y Media](#14-adjuntos-y-media)
15. [Notificaciones](#15-notificaciones)
16. [Mi cuenta](#16-mi-cuenta)
17. [Configuración (workspace)](#17-configuración-workspace)
18. [Páginas para clientes](#18-páginas-para-clientes)
19. [Solución de problemas](#19-solución-de-problemas)

---

## 1. Primeros pasos

### Iniciar sesión

Abre la URL del CRM (ej. `https://www.clickin360.com/login`). Inicia sesión con correo y contraseña, o Google Workspace (`@clickin360.com`).

| Rol | Correo/contraseña | Google SSO |
|---|---|---|
| Propietario, Admin, Ventas | Sí | Sí |
| Visor | Sí | No — solo contraseña |

### Olvidé mi contraseña

1. Ve a **Forgot password** (recuperar contraseña)
2. Ingresa tu correo — si existe una cuenta, recibirás un enlace
3. Define una nueva contraseña en la página de restablecimiento

### Nuevos miembros del equipo

1. El propietario o administrador envía una invitación desde **Configuración → Equipo**
2. Abre el enlace de invitación y regístrate en `/register?invite=…`
3. Inicia sesión con el rol asignado

### Cambiar idioma del CRM

**Configuración → Idioma de la plataforma** — alterna la navegación y etiquetas entre inglés y español.

> **Nota:** Los correos a clientes y las páginas públicas (cotizaciones, onboarding, reservas) usan el **idioma preferido de cada contacto**, no el idioma del workspace.

---

## 2. Roles y permisos

| Capacidad | Propietario | Admin | Ventas | Visor |
|---|---|---|---|---|
| Ver datos del CRM | ✓ | ✓ | ✓ | ✓ |
| Crear / editar registros | ✓ | ✓ | ✓ | ✗ |
| Enviar Gmail desde el CRM | ✓ | ✓ | ✓ | ✗ |
| Tomar control de conversación | ✓ | ✓ | ✓ | ✗ |
| Mover etapas de pipeline | ✓ | ✓ | ✓ | ✗ |
| Crear facturas y cobrar pagos | ✓ | ✓ | ✓ | ✗ |
| Avanzar etapas de proyecto | ✓ | ✓ | ✓ | ✗ |
| Conectar Google Drive del workspace | ✓ | ✓ | ✓ | ✗ |
| Conectar Gmail y Calendar (personal) | ✓ | ✓ | ✓ | ✗ |
| Eliminar registros y conversaciones | ✓ | ✓ | ✗ | ✗ |
| Anular facturas, duplicar, desactivar enlaces | ✓ | ✓ | ✗ | ✗ |
| Ver gastos | ✓ | ✓ | ✗ | ✗ |
| Configuración administrativa y equipo | ✓ | ✓ | ✗ | ✗ |
| Registro de auditoría | ✓ | ✓ | ✗ | ✗ |

**Visor:** Modo demo de solo lectura. Las acciones de escritura están ocultas en la UI y bloqueadas en la API.

**Ventas:** Puede gestionar contactos, cotizaciones, tickets, conversaciones, facturas, cobros, etapas de proyecto y conectar Drive del workspace. **No puede** eliminar registros, ver gastos, acceder a configuración administrativa ni al registro de auditoría.

**Propietario / Admin:** Acceso completo, incluyendo eliminaciones, gastos, acciones de alto riesgo (anular facturas, desconectar Drive del workspace) y toda la configuración del workspace.

---

## 3. Navegación

La barra lateral incluye:

| Menú | Ruta | Propósito |
|---|---|---|
| Panel | `/dashboard` | Estadísticas y pestañas de analítica |
| Conversaciones | `/conversations` | Bandeja WhatsApp + webchat |
| Calendarios | `/calendar` | Reuniones y reservas del sitio |
| Pipelines | `/opportunities` | Tablero Kanban de ventas y ciclo de proyecto |
| Contactos | `/contacts` | Personas y empresas |
| Cotizaciones | `/quotes` | Cotizaciones, plantillas, marca, catálogo |
| Finanzas | `/finances` | Facturas, transacciones, enlaces de pago |
| Tickets | `/tickets` | Tickets de soporte |
| Adjuntos | `/attachments` | Archivos en Supabase |
| Media | `/media` | Google Drive del workspace |

Configuración y Mi cuenta están en el encabezado.

Usa **⌘K** (Mac) o **Ctrl+K** (Windows) para búsqueda global en contactos, cotizaciones, facturas, tickets y conversaciones.

---

## 4. Ciclo de vida completo del cliente

Esta sección es la más importante del manual. Antes de usar el CRM, comprende cómo un cliente avanza desde el primer contacto hasta convertirse en cliente activo y defensor de la marca.

El ciclo tiene dos fases principales que ocurren en secuencia:

```
FASE 1 — CICLO DE VENTAS
Lead → Prospect → [Cotización enviada → Cotización aceptada + Factura pagada]
                                                    ↓
FASE 2 — CICLO DE PROYECTO
Onboarding → Diseño → Configuración → Lanzamiento → Optimización → Completo
                                                    ↓
                                    Formulario de feedback interno
                                         ↓              ↓
                               Feedback positivo    Feedback negativo
                               → Enlace de reseña  → Alerta al equipo
                                 en Google           (sin reseña)
```

### Fase 1 — Ciclo de ventas

El ciclo de ventas comienza cuando un lead entra al CRM y termina cuando se acepta la cotización **y** se paga la factura. Hasta ese momento, el contacto está en fase comercial.

**Cómo entran los leads:**

| Origen | Cómo llega | Estado inicial |
|---|---|---|
| Formulario del sitio web | Llena el formulario de contacto | Lead |
| Chat con IA (webchat) | Andrea califica en el chat del sitio | Lead |
| WhatsApp con IA | Andrea califica por WhatsApp | Lead |
| Ingreso manual | Un miembro del equipo crea el contacto | Lead |
| Importación CSV | Carga masiva de contactos | Lead |

**Estados del contacto durante el ciclo de ventas:**

| Estado | Significado | Cómo se asigna |
|---|---|---|
| **Lead** | Contacto nuevo — puede estar en conversación, haber agendado cita, o en seguimiento | Manual o automático según la fuente |
| **Prospect** | Calificado — es nuestro cliente ideal, alta intención de compra | Manual por el equipo de ventas |
| **Active** | Cliente ganado — cotización aceptada y factura pagada | **Automático** al completarse ambas condiciones |
| **Inactive** | Inactivo — cliente perdido o sin actividad | Manual por propietario/admin |

> **Regla clave:** Un contacto pasa a **Active** automáticamente cuando se cumplen **ambas** condiciones: cotización aceptada **Y** factura pagada. No antes.

**Progresión típica en ventas:**

```
Lead entra al CRM
    ↓
Conversación con IA (webchat o WhatsApp)
    ↓
Cita de descubrimiento agendada
    ↓
Calificado por el equipo → estado: Prospect
    ↓
Cotización enviada
    ↓
Cliente acepta la cotización → /quote/[token]
    ↓
Factura creada y enviada
    ↓
Factura pagada (manual o Stripe)
    ↓
Estado: Active — inicia el ciclo de proyecto
```

**Leads que necesitan más atención:**

Si un lead no está listo para comprar, el equipo puede:
- Cambiar el estado a **Lead** y agregar notas de seguimiento
- Crear tareas con fecha de seguimiento
- Registrar llamadas en la línea de tiempo
- Mantener la conversación activa desde el inbox de Conversaciones

No existe un estado "Nurturing" como valor separado — el seguimiento se gestiona mediante tareas, notas y actividades en el contacto.

### Fase 2 — Ciclo de proyecto

El ciclo de proyecto comienza automáticamente cuando un contacto pasa a **Active**. En este momento, la oportunidad vinculada se marca como **Ganada** y se activa el stepper de etapas del proyecto.

**Etapas del proyecto:**

| # | Etapa | Descripción |
|---|---|---|
| 1 | **Onboarding** | Kickoff, cuestionario, recopilación de activos y accesos |
| 2 | **Diseño** | Dirección creativa, wireframes, activos de marca |
| 3 | **Configuración** | Configuración técnica, integraciones, automatizaciones |
| 4 | **Lanzamiento** | Go-live, pruebas, entrega al cliente |
| 5 | **Optimización** | Ajuste post-lanzamiento, revisión de rendimiento |
| 6 | **Completo** | Proyecto entregado y aprobado por el cliente |
| 7 | **Mantenimiento** | *(Opcional)* Clientes con retainer activo |

**Automatizaciones que ocurren en este ciclo:**

| Momento | Qué pasa automáticamente |
|---|---|
| Cotización aceptada + factura pagada | N8N inicia el flujo de onboarding — correo de bienvenida, cuestionario, creación de tareas |
| Cliente completa cuestionario | CID asignado, tarea marcada completa, propietario notificado |
| Kickoff agendado | Evento en calendario, recordatorios 24h y 1h antes |
| Proyecto → Completo | N8N envía formulario de feedback interno al cliente |
| Feedback positivo (≥ 4/5) | Después de 24 horas, N8N envía enlace de reseña en Google |
| Feedback negativo (< 4/5) | Alerta al propietario — no se envía enlace de reseña |

> **Importante:** El enlace de reseña en Google **nunca se envía al completar el onboarding**. Solo se envía después de que el proyecto está **Completo** y el cliente dejó **feedback positivo**. Esto garantiza que las reseñas reflejen la experiencia completa del proyecto.

---

## 5. Panel y analítica

Abre **Panel** (`/dashboard`). Debajo del saludo, usa las pestañas:

| Pestaña | Contenido |
|---|---|
| Overview | Tarjetas: leads nuevos, prospectos, contactos activos, tickets abiertos, tareas pendientes, citas próximas |
| Operations | Métricas operativas del rango de fechas |
| Pipeline | Analítica del pipeline; filtro opcional por etapa |
| Website | Tráfico GA4 (sesiones, usuarios, páginas vistas, conversiones) |
| Finanzas | Ingresos, gastos (propietario/admin), facturas pendientes |

### Filtros de fecha

Barra compartida en Operations, Pipeline, Website y Finanzas:
- Selectores **From / To** (Desde / Hasta)
- Atajos: Last 7 days, Last 30 days, Last 90 days, Year to date

El rango se mantiene al cambiar de pestaña.

> **Propietario / Admin:** Configura GA4 en **Configuración → Integraciones** (cuenta de servicio + ID de propiedad).
>
> **Ventas / Visor:** Pueden ver analítica; los gastos en la pestaña Finanzas están ocultos para Ventas y Visor.

---

## 6. Contactos

### Vista de lista

1. Abre **Contactos**
2. Usa el panel de filtros: búsqueda, Estado (Lead, Prospect, Active, Inactive), rango de fechas, filtros guardados
3. Haz clic en una fila para abrir el detalle

### Importar / exportar

- **Importar CSV** — mapeo de campos, manejo de duplicados (omitir / fusionar / crear)
- **Exportar CSV** — todos los campos del contacto

> **Propietario / Admin:** Ejecuta **Configuración → Contactos duplicados** para escanear y fusionar pares.

### Detalle del contacto

Diseño en dos columnas:

**Izquierda — Detalles:** Nombre, correo, teléfono, empresa, sitio web, estado, asignación, dirección, idioma preferido, campos personalizados.

**Derecha — Panel de trabajo:** pestañas Registrar actividad, Relacionados, Tareas.

### Registrar actividad

| Pestaña | Acción |
|---|---|
| Post | Agregar nota |
| Email | Compositor Gmail (texto enriquecido, Cc/Cco, adjuntos, campos merge, plantillas, preview, firma) |
| Log a Call | Registrar llamada |
| New Task | Crear tarea con responsable y fecha |

### Línea de tiempo

Muestra automáticamente todos los eventos vinculados al contacto:
- Notas y llamadas
- Correos entrantes (rosa) y salientes (azul cielo)
- Tareas creadas y completadas
- Oportunidades y cambios de etapa del pipeline
- **Cambios de etapa del proyecto** (ej. *"Etapa del proyecto: Diseño → Configuración"*)
- Eventos de calendario y reservas
- Tickets de soporte
- Eventos de onboarding y automatizaciones
- Pagos e invoices vinculados
- Eventos del sistema

### Acciones rápidas

Barra: Note · Call · Email · Review · Task.

**Pedir reseña** envía una invitación de reseña en Google vía Gmail conectado.

> **Nota:** La reseña automática post-proyecto se envía solo después de feedback positivo. Esta acción manual es independiente y puede usarse en cualquier momento.

### Botón "Iniciar Onboarding"

Visible en el perfil del contacto para **Propietario / Admin** cuando el contacto está en estado **Active** y no tiene un proceso de onboarding activo.

Al hacer clic: confirmación → N8N inicia el flujo de onboarding manualmente (útil para clientes migrados o casos especiales).

Si el onboarding ya está en curso: muestra una insignia *"Onboarding en progreso — iniciado [fecha]"* en lugar del botón.

### Eliminar contacto

> **Solo propietario / administrador.** Elimina eventos de calendario, documentos, pagos y notas vinculados. Usar con precaución. Las eliminaciones pueden aparecer en **Configuración → Registro de auditoría**.

> **Ventas:** Puede crear y editar contactos, pero no eliminarlos.

> **Visor:** No puede editar contactos, enviar correos ni crear notas/tareas.

---

## 7. Pipelines y ciclo de ventas

### Vista del tablero

1. Abre **Pipelines** (`/opportunities`)
2. Visualiza oportunidades en el tablero Kanban por etapa
3. Arrastra tarjetas entre etapas para actualizar el estado
4. Crea oportunidades — requiere un contacto vinculado

### Etapas del pipeline (pre-venta)

Las etapas del pipeline representan el progreso de la oportunidad **antes** de cerrar la venta. El propietario/admin puede personalizar y reordenar las etapas en **Configuración**.

Flujo típico de etapas:

```
Nueva → Contactada → Propuesta enviada → Negociación → Ganada / Perdida
```

**Ganada:** La oportunidad se marca como ganada cuando la cotización es aceptada y la factura es pagada. En este momento:
- La oportunidad aparece como **Ganada** en el tablero
- El ciclo de proyecto se activa automáticamente
- La etapa de proyecto se establece en **Onboarding**

**Perdida:** Si la cotización es rechazada o el cliente no continúa, se registra la razón de pérdida (requerida) y notas opcionales. Las razones de pérdida se analizan en la pestaña **Pipeline** del panel.

### Razón de pérdida

Al mover una oportunidad a **Perdida** o cuando el cliente rechaza una cotización, aparece un formulario:
- **Razón** (requerida): selecciona de la lista configurada en **Configuración → Project Stages**
- **Notas** (opcional): detalles adicionales

Razones predeterminadas: Precio muy alto, Eligió a la competencia, Recorte de presupuesto, Sin decisión, Problema de tiempos, Fuera de alcance, Otro.

> **Propietario / Admin:** Personaliza la lista de razones de pérdida en **Configuración → Project Stages**. Solo propietario/admin puede eliminar oportunidades.
>
> **Ventas:** Puede mover oportunidades entre etapas y crear nuevas; no puede eliminar oportunidades ni cambiar la configuración de etapas.
>
> **Visor:** Solo lectura — no puede arrastrar ni editar.

---

## 8. Cotizaciones

Abre **Cotizaciones**. Pestañas:

| Pestaña | Propósito |
|---|---|
| Todas las cotizaciones | Listar, crear, editar, enviar |
| Plantillas | Plantillas reutilizables |
| Branding | Logo, colores, nombre en PDF |
| Catálogo de productos | Productos para líneas |

> **Solo propietario / admin:** Pestaña de marca y edición/eliminación de precios en catálogo.

### Crear y enviar

1. Clic en **Nueva cotización**
2. Selecciona **Cliente** (contacto)
3. Agrega servicios del catálogo o crea líneas nuevas
4. Define impuesto, descuento, términos y fecha de vencimiento
5. **Guardar** — referencia automática (`Q-YYYY-#####`)
6. **Enviar por Gmail** — PDF adjunto; se añade tu firma si está configurada

### Vencimiento de cotización

Las cotizaciones tienen una fecha de vencimiento configurable (predeterminado: 30 días desde el envío). Indicadores en la lista:
- Verde: vigente
- Ámbar: vence en 3 días o menos
- Rojo: vencida

Una cotización vencida bloquea la aceptación en la página del cliente. El propietario/admin puede extender la fecha directamente en el detalle de la cotización.

### Versionado de cotizaciones

Si editas una cotización ya enviada o aceptada, el sistema crea automáticamente una nueva versión (v2, v3…) y preserva la anterior como solo lectura. El historial de versiones está disponible en el detalle de la cotización.

> El cliente que intenta usar el enlace de una versión anterior verá: *"Existe una versión más reciente de esta cotización."*

### Aceptación del cliente

1. El cliente recibe el enlace por correo y abre `/quote/[token]`
2. Revisa los términos y la cotización en su idioma preferido (EN/ES)
3. Acepta o rechaza con la casilla de responsabilidad requerida
4. El estado se actualiza en el CRM; actividad registrada en el contacto

**Pay Now** aparece cuando Stripe está configurado y los pagos están habilitados en la cotización. El cliente puede pagar directamente desde la página de aceptación.

### Flujo cotización → factura → cobro

```
Cotización aceptada
    ↓
Crear factura desde la pestaña Finanzas de la cotización
    ↓
Enviar factura al cliente (Gmail o Mailgun)
    ↓
Cobro: manual (registrar pago) o enlace de pago (Stripe)
    ↓
Factura pagada → estado de la cotización: Pagada
    ↓
Contacto → Active — inicia el ciclo de proyecto
```

> **Nota:** La factura siempre debe estar ligada a la cotización aceptada para que el flujo de onboarding se active correctamente.

---

## 9. Finanzas

Abre **Finanzas**. Secciones:

| Sección | Ruta | Propósito |
|---|---|---|
| Resumen | Panel → pestaña Finanzas | KPIs del rango seleccionado |
| Facturas | `/finances/invoices` | Crear, enviar, cobrar |
| Transacciones | `/finances/transactions` | Libro de ingresos y gastos |
| Gastos | `/finances/expenses` | Registro de gastos (propietario/admin) |
| Enlaces de pago | `/finances/payment-links` | Enlaces Stripe |

> **Propietario / Admin:** Acceso completo incluyendo gastos, anular/duplicar facturas, desactivar enlaces y configuración financiera.
>
> **Ventas:** Puede crear facturas, enviarlas, registrar pagos y generar enlaces de pago. No puede ver gastos, anular facturas ni duplicarlas.
>
> **Visor:** No puede crear facturas ni ver datos de gastos.

### Crear factura

1. **Finanzas → Facturas → Crear**
2. **Tipo:** desde cotización aceptada (recomendado), independiente, retainer, depósito, hito, etc.
3. **Cobro:** manual (registrar pagos) o enlace de pago (Stripe)
4. **Enviar** por Gmail o Mailgun — PDF en el idioma del contacto, enlace de pago como CTA

> **Mejor práctica:** Siempre crea la factura desde una cotización aceptada. Esto vincula el pago al ciclo de proyecto y activa el onboarding automáticamente al recibir el pago.

### Pagos parciales

La factura muestra estado `partially_paid` hasta cubrir el total. El estado de pago de la cotización vinculada se sincroniza automáticamente.

### Facturas recurrentes

Para retainers o servicios recurrentes, activa la opción **Recurrente** en la factura — define frecuencia, intervalo y fecha de fin opcional. Las facturas se generan automáticamente en cada ciclo.

### Configuración financiera

**Configuración → Finances** (propietario/admin): moneda (USD/MXN), impuesto predeterminado, prefijo de factura, días de vencimiento, pie de página.

---

## 10. Ciclo de proyecto

Esta sección aplica **únicamente a contactos en estado Active** (con cotización aceptada y factura pagada). El ciclo de proyecto es donde se entrega el trabajo al cliente.

### Acceder a las etapas del proyecto

El stepper de etapas aparece en el **detalle del contacto** (contactos Active) y en la oportunidad ganada vinculada.

El stepper también aparece como insignia en:
- La fila de la oportunidad en el tablero
- El encabezado del detalle del contacto
- La sección **Relacionados** del contacto

### Etapas y sus responsabilidades

| Etapa | Responsable típico | Qué ocurre |
|---|---|---|
| **Onboarding** | Account Owner | Kickoff agendado, cuestionario completado, activos recopilados, tareas del equipo creadas |
| **Diseño** | Equipo creativo | Dirección de marca, wireframes, entregables visuales |
| **Configuración** | Equipo técnico | Integraciones, automatizaciones N8N, configuración de plataforma |
| **Lanzamiento** | Equipo técnico + Account Owner | Go-live, pruebas finales, entrega al cliente |
| **Optimización** | Account Owner | Seguimiento post-lanzamiento, ajustes de rendimiento |
| **Completo** | Account Owner | Proyecto aprobado por el cliente, cierre formal |
| **Mantenimiento** | Account Owner | Activo solo para retainers — activar en Configuración → Project Stages |

### Avanzar etapas

**Propietario, administrador y ventas** pueden avanzar etapas desde el detalle del contacto u oportunidad:

- **Botón "Avanzar etapa"** — avanza una etapa hacia adelante con confirmación
- **Selector de etapa** — mueve a cualquier etapa (hacia atrás requiere confirmación + razón)

Cada cambio de etapa:
1. Registra la transición en la línea de tiempo del contacto (*"Etapa del proyecto: Configuración → Lanzamiento"*)
2. Notifica al propietario del workspace en la app
3. Dispara el webhook `project.stage_changed` hacia N8N

### Cuando el proyecto llega a Completo

Al marcar el proyecto como **Completo**:

1. `project_completed_at` se registra automáticamente
2. N8N envía al cliente el **formulario de feedback interno** (`/project-feedback/[token]`)
3. El cliente califica su experiencia (1–5 estrellas) y responde preguntas opcionales

**Flujo del feedback:**

```
Cliente recibe formulario de feedback
    ↓
    ├── Calificación ≥ 4 (positivo)
    │       ↓
    │   Correo de agradecimiento inmediato
    │       ↓
    │   Espera 24 horas (configurable)
    │       ↓
    │   Enlace de reseña en Google enviado
    │
    └── Calificación < 4 (negativo/neutral)
            ↓
        Correo de agradecimiento inmediato
            ↓
        Alerta al propietario/admin en el CRM
        (sin enlace de reseña — resolver primero)
```

> **Propietario / Admin:** Configura el umbral de puntuación y el tiempo de espera antes del enlace de reseña en **Configuración → Project Stages**.

### Etapa de Mantenimiento (opcional)

Para clientes con retainer activo después de la entrega del proyecto:

1. Habilita la etapa de **Mantenimiento** en **Configuración → Project Stages**
2. Mueve la oportunidad de Completo → Mantenimiento manualmente
3. La etapa aparece en el stepper y en las insignias del tablero

---

## 11. Calendarios

Abre **Calendarios**.

### Vistas disponibles

- **Vista mensual** — todos los eventos del mes
- **Lista próxima** — eventos futuros en orden cronológico
- **Mi calendario** — solo tus eventos
- **Todos los calendarios** — eventos del equipo con color por usuario; leyenda de colores visible en la parte superior

### Crear evento

1. Clic en una fecha o en el botón **Nuevo evento**
2. **Obligatorio:** título, fecha/hora, contacto vinculado
3. **Tipo de ubicación:**
   - **En persona** — muestra campo de dirección
   - **Google Meet** — genera enlace automáticamente si Calendar está conectado
   - **Otro** — campo de texto libre
4. **Responsable** — determina el color del evento en el calendario

### Tipos de eventos y colores

| Tipo | Color | Origen |
|---|---|---|
| Reservas del sitio web | Rosa | Leads que agendan desde el sitio o chat |
| Reuniones internas | Color del responsable | Creadas en el CRM por el equipo |
| Reuniones de cliente | Color del responsable + etiqueta "Cliente" | Kickoff y reuniones de proyecto vía `/book/[token]` |

### Recordatorios automáticos

Las reuniones agendadas a través del CRM (cualquier tipo) disparan recordatorios automáticos al cliente:
- **24 horas antes:** correo con fecha, hora y enlace de Meet (si aplica)
- **1 hora antes:** mensaje por WhatsApp (si el cliente tiene teléfono y está habilitado)

Ambos recordatorios se envían en el **idioma preferido del contacto**.

> **Configura recordatorios en:** Configuración → Automations → Appointment Reminders.

### Disponibilidad de reservas

**Configuración → Disponibilidad de reservas** — días, horas y duración para el flujo de reservas de leads del sitio web.

**Configuración → Automations → Customer Meeting** — disponibilidad separada para reuniones de clientes (kickoff, reuniones de proyecto). Esta disponibilidad es la que se usa en `/book/[token]`.

> **Importante:** La disponibilidad para leads del sitio y la disponibilidad para clientes son configuraciones **independientes**. Esto te permite tener horarios diferentes para cada tipo de reunión.

> Cada miembro conecta su Google Calendar en **Configuración → Integraciones**.

---

## 12. Conversaciones

Abre **Conversaciones** — bandeja unificada de WhatsApp y webchat.

### Pestañas de filtro

Todas · Necesita revisión · WhatsApp · Webchat · Cerradas

### Cómo funciona la IA

La IA (Andrea) atiende las conversaciones entrantes automáticamente en ambos canales:
- Califica al lead con preguntas específicas
- Captura nombre, correo, teléfono y necesidad principal
- Ofrece horarios de cita disponibles
- Confirma reservas directamente en el calendario del CRM

Cuando la IA determina que el lead necesita atención humana (o cuando el equipo lo decide), la conversación pasa al inbox del CRM para intervención manual.

### Gestionar una conversación

1. Abre un hilo — los mensajes se muestran por remitente:
   - **Visitante** — burbuja izquierda, gris
   - **IA (Andrea)** — burbuja derecha, azul
   - **Agente humano** — burbuja derecha, verde
   - **Sistema** — centro, texto muted en cursiva
2. **Take Over** — asumes el control; se activa el compositor de respuestas
3. **Responder** — WhatsApp vía API del CRM; webchat escribe en el hilo (el visitante ve la respuesta en el chat)
4. **Hand Back to Andrea** — devuelves el control a la IA; la automatización se reanuda

La barra lateral de calificación muestra: temperatura del lead (Hot/Warm/Cold), campos capturados (nombre, correo, plataforma, señales) y enlace al contacto cuando existe.

> **Ventas:** Puede tomar control y responder.
>
> **Visor:** No puede tomar control ni responder.
>
> **Propietario / Admin:** Puede **eliminar** conversaciones (los mensajes se eliminan en cascada). Ventas no puede eliminar conversaciones.

---

## 13. Tickets de servicio

Abre **Tickets**.

1. **Crear ticket** — requiere contacto vinculado; asigna asunto, descripción, etiquetas y prioridad
2. **Editar estado** — abierto → en progreso → resuelto → cerrado
3. **Hilo Gmail** — sincroniza y responde correos del cliente directamente desde el ticket

Al cerrar un ticket, puedes enviar una **invitación de reseña en Google** manualmente.

> **Propietario / Admin:** Puede eliminar tickets. Ventas puede crear y editar, pero no eliminar.

### Widget público de soporte

Los clientes usan `/support` con su **CID** (número de identificación asignado al completar el onboarding) para enviar tickets sin iniciar sesión en el CRM.

El CID se asigna automáticamente cuando el cliente completa el cuestionario de onboarding. El cliente lo recibe por correo junto con sus credenciales de acceso.

> **Configura en:** Configuración → Support widget — activar, código embed, correo del grupo de soporte.

---

## 14. Adjuntos y Media

### Adjuntos

**Adjuntos** (`/attachments`) — archivos subidos a Supabase vinculados a contactos. Sube desde la lista o la pestaña **Relacionados** del contacto.

### Media

**Media** (`/media`) — explora Google Drive del workspace (unidades compartidas y Mi unidad).

> **Conectar Drive:** Cualquier miembro con acceso de escritura (propietario, admin, ventas) puede conectar Google Drive del workspace en **Media** o **Configuración → Integraciones**.
>
> **Desconectar Drive:** Solo propietario/admin.

Funciones disponibles:
- Navega carpetas, sube archivos, crea carpetas
- Vincula un archivo Drive a un contacto — crea un documento con origen Google Drive
- Todos los miembros con acceso de escritura pueden explorar, subir y vincular

---

## 15. Notificaciones

Clic en la **campana** en el encabezado.

### Tipos de notificación

| Tipo | Cuándo aparece |
|---|---|
| Lead del sitio web | Nuevo lead desde formulario o chat |
| Cotización aceptada | Cliente aceptó la cotización |
| Cotización rechazada | Cliente rechazó la cotización |
| Factura pagada | Pago recibido (manual o Stripe) |
| Conversación necesita revisión | IA marcó para intervención humana |
| Tarea vencida | Tarea sin completar pasada la fecha |
| Ticket de soporte | Nuevo ticket del cliente o del widget |
| Etapa de proyecto cambiada | Oportunidad avanzó de etapa |
| Proyecto completado | Proyecto marcado como Completo |
| Feedback recibido | Cliente envió formulario de feedback |
| Feedback negativo | Alerta — calificación por debajo del umbral |
| Onboarding iniciado | N8N inició el flujo de onboarding |

### Preferencias

**Mi cuenta → Preferencias de notificación** — activa o desactiva cada tipo. Define tu zona horaria para marcas de tiempo correctas.

Grupos configurables (propietario/admin en Configuración):
- **Grupo de ventas** — leads, cotizaciones, facturas pagadas
- **Grupo de soporte** — tickets nuevos y actualizaciones

---

## 16. Mi cuenta

Abre **Mi cuenta** (`/account`).

| Sección | Propósito |
|---|---|
| Perfil | Nombre, correo, foto de perfil |
| Contraseña | Cambiar contraseña (se requiere la actual) |
| Firma de correo | Firma HTML que se adjunta en el compositor Gmail |
| Notificaciones | Interruptores por tipo y zona horaria |
| Moneda | Preferencia de visualización en finanzas |

Todos los roles pueden editar su cuenta. Los visores solo actualizan perfil y contraseña.

---

## 17. Configuración (workspace)

Abre **Configuración** (`/settings`).

### Todos los miembros con acceso de escritura

| Sección | Propósito |
|---|---|
| Plantillas de correo | Crear, editar, eliminar |
| Invitaciones de reseña en Google | URL de reseñas + plantilla de correo |
| Disponibilidad de reservas | Franjas horarias para leads del sitio web |
| Integraciones | Conectar tu Gmail y Google Calendar personal |

### Solo propietario / administrador

| Sección | Propósito |
|---|---|
| Idioma de la plataforma | UI del CRM en inglés / español |
| Campos personalizados | Campos extra en contactos, oportunidades, tickets |
| Registro de auditoría | Historial completo de cambios del workspace |
| Equipo | Invitaciones y roles (Propietario, Admin, Ventas, Visor) |
| Contactos duplicados | Escanear, fusionar, descartar |
| Leads del sitio web | Asignación por defecto, aviso por correo |
| Support widget | Widget público, código embed, correo del grupo de soporte |
| Admin integrations | N8N, Stripe, Mailgun, GA4, Google OAuth — estado y configuración |
| Automations → Webhooks | Registrar URL de N8N, seleccionar eventos, log de entregas |
| Automations → Onboarding | Activar/desactivar, trigger, plantilla de tareas, recordatorios |
| Automations → Appointment Reminders | Recordatorios 24h y 1h por correo y WhatsApp |
| Automations → Customer Meeting | Disponibilidad y configuración para reuniones de proyecto |
| Project Stages | Etiquetas de etapas, etapa de mantenimiento, umbral de feedback, delay de reseña |
| Finances | Moneda, impuesto, prefijo de factura, días de vencimiento, pie de página |
| Session timeout | Tiempo de inactividad antes de cerrar sesión (visores siempre 1 hora) |
| Marca en cotizaciones | Logo, colores, fuentes para PDF de cotizaciones e invoices |

### Roles del equipo

| Rol | Capacidades |
|---|---|
| **Admin** | Configuración completa excepto eliminar al propietario; eliminaciones y acciones de alto riesgo |
| **Ventas** | Escritura completa en CRM (contactos, cotizaciones, facturas, cobros, etapas de proyecto, Drive); configuración limitada a plantillas y reservas; **sin** eliminar registros, gastos ni configuración administrativa |
| **Visor** | Demo de solo lectura — todas las acciones de escritura bloqueadas |

---

## 18. Páginas para clientes

Estas páginas se envían al cliente por correo vía automatizaciones de N8N. **El idioma de cada página sigue el idioma preferido del contacto**, no el idioma del workspace.

| Página | URL | Cuándo se envía | Quién la envía |
|---|---|---|---|
| Aceptación de cotización | `/quote/[token]` | Al enviar la cotización | Equipo de ventas (manual) |
| Cuestionario de onboarding | `/onboarding/[token]` | Al iniciarse el onboarding | N8N automático |
| Reserva de kickoff | `/book/[token]` | En el correo de bienvenida de onboarding | N8N automático |
| Feedback día 14 | `/feedback/[token]` | 14 días después del kickoff | N8N automático |
| Feedback del proyecto | `/project-feedback/[token]` | Al marcar el proyecto como Completo | N8N automático |
| Soporte | `/support` | Enlace en correos de CID y comunicaciones | Siempre disponible |

### Flujo de páginas en el ciclo de vida

```
Cotización enviada
    → Cliente abre /quote/[token] → acepta

Onboarding inicia
    → Cliente recibe /onboarding/[token] → completa cuestionario
    → Cliente recibe /book/[token] → agenda kickoff
    → Día 14: cliente recibe /feedback/[token] → feedback de onboarding

Proyecto Completo
    → Cliente recibe /project-feedback/[token] → feedback del proyecto
    → Si positivo → enlace de reseña en Google (24h después)

En cualquier momento
    → Cliente usa /support con su CID → abre ticket de soporte
```

> **Propietario / Admin:** Las automatizaciones se configuran en **Configuración → Automations**. Para detalles técnicos de los flujos N8N, consulta `docs/n8n/automations-setup-guide.md`.

---

## 19. Solución de problemas

| Problema | Qué revisar |
|---|---|
| No puedo enviar correo | Configuración → Integraciones — conectar Gmail |
| Falla sincronización de calendario | Conectar Google Calendar; el evento igual se guarda en el CRM |
| Analítica web vacía | Propiedad GA4 + cuenta de servicio en Admin integrations |
| Falta Pay Now en cotización | Claves Stripe en Integraciones; cotización con pagos habilitados |
| Correo entrante no sincroniza | El buzón que envió el hilo debe estar conectado con permiso de lectura |
| Visor no puede editar | Esperado — el visor es solo lectura |
| Google SSO bloqueado | Visores usan contraseña; SSO solo para `@clickin360.com` |
| Drive no conecta | Verifica que tu rol tenga acceso de escritura (ventas+); reconecta tras cambios de OAuth |
| Onboarding no inició | Verifica que la cotización esté **aceptada** Y la factura esté **pagada** — ambas condiciones son necesarias |
| Reseña de Google no llegó | El formulario de feedback debe tener calificación ≥ umbral configurado en Project Stages; revisa el log de webhooks en Configuración → Automations |
| Recordatorios de cita no llegaron | Verifica que Appointment Reminders esté activado en Configuración → Automations |
| La etapa de proyecto no avanza | Verifica que el contacto esté **Active** y que tu rol tenga acceso de escritura (ventas+); visores no pueden avanzar etapas |
| No puedo eliminar un registro | Solo propietario/admin puede eliminar contactos, oportunidades, tickets y conversaciones |
| CID del cliente no fue asignado | El cliente debe completar el cuestionario de onboarding en `/onboarding/[token]` |
| Feedback del proyecto no llegó | El proyecto debe estar en etapa **Completo**; verifica el log de webhooks de `project.completed` |
| Cliente ve página de cotización vencida | Extiende la fecha de vencimiento desde el detalle de la cotización (propietario/admin) |

Para API y despliegue, consulta [CRM-FEATURES.md](../CRM-FEATURES.md) y [AUTH-ROADMAP.md](../AUTH-ROADMAP.md).

---

*ClickIn 360 CRM — Manual interno para propietarios, administradores y equipo de ventas.*
*Versión 2026-06-15*
