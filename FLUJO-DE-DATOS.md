# Flujo de datos — Velvet & Blade

Fecha: 2026-08-30 · Rama: `desarrollo-oscar`
Actualizado: 2026-08-30 (sesión 3) — Puntos D y E portados desde
`desarrollo-cristian` y adaptados a standalone; nueva clave `vb_appointments`.

Documento local para entender **de dónde salen y a dónde van los datos** entre
las pantallas. No hay backend todavía: **todo el estado compartido vive en
`localStorage`** del navegador/WebView.

---

## 1. Panorama general

```
        ┌──────────────┐        ┌──────────────┐        ┌───────────────────────┐
        │    LOGIN      │        │   REGISTRO   │        │  SELECCIÓN DE SERVICIO │
        │ login.page   │        │ register.page│        │  service-selection      │  ← PUNTO C
        └──────┬───────┘        └──────┬───────┘        └───────────┬───────────┘
               │ escribe                │ escribe                    │ escribe
               │ vb_current_user        │ vb_users (append)          │ vb_selected_service
               │                        │ vb_current_user            │
               ▼                        ▼                            ▼
   ╔════════════════════════════════════════════════════════════════════════════╗
   ║                          localStorage  (clave → valor JSON)                ║
   ║                                                                            ║
   ║   vb_users            → lista de cuentas registradas en este dispositivo    ║
   ║   vb_current_user     → sesión activa (quién está usando la app ahora)      ║
   ║   vb_selected_service → lo que el cliente está a punto de agendar (Punto C) ║
   ║   vb_appointments     → citas confirmadas (Punto D → Punto E)               ║
   ╚════════════════════════════════════════════════════════════════════════════╝
       ▲            ▲                     │                          │
       │ lee        │ lee vb_users        │ lee (al volver)          │ lee vb_selected_service
       │ vb_users   │ (evita duplicados)  │ vb_selected_service      ▼
       │(valida)    │                     │              ┌───────────────────────┐
   LOGIN vuelta  REGISTRO vuelta          │              │  HORARIO  (Punto D)    │  ← IMPLEMENTADO
                                          │              │  schedule.page         │
                                          │              │  escribe vb_appointments│
                                          │              └───────────┬───────────┘
                                          │                          │ navega a /appointments
                                          │                          ▼
                                          │              ┌───────────────────────┐
                                          └──"Nueva"──────│  AGENDADOS (Punto E)   │  ← IMPLEMENTADO
                                             vuelve al C  │  appointments.page     │
                                                          │  lee vb_appointments   │
                                                          └───────────────────────┘
```

El **router de Angular no transporta estado**: se navega con
`router.navigateByUrl('/ruta')` y la pantalla destino **relee `localStorage`**
en su `ngOnInit`.

---

## 2. Claves de `localStorage` en detalle

### 2.1 `vb_users` — cuentas registradas en el dispositivo

| Campo      | Tipo   | Notas                                    |
|------------|--------|------------------------------------------|
| `fullName` | string | Nombre completo                          |
| `phone`    | string | Teléfono                                 |
| `email`    | string | En minúsculas y `trim()` — es la "PK"    |
| `password` | string | **En texto plano** (demo; no producción) |
| `userType` | string | `'cliente'` \| `'especialista'`          |

- **Escribe:** `register.page.ts` → `onRegister()` hace `push` del nuevo usuario
  y guarda el arreglo completo.
- **Lee:**
  - `register.page.ts`: para rechazar correos ya registrados.
  - `login.page.ts`: para validar correo + contraseña.
- Además, `login.page.ts` tiene **2 cuentas demo hardcodeadas** que funcionan
  aunque `vb_users` esté vacío:
  - `cliente.vip@velvetblade.com` / `Velvet2026*` → `cliente`
  - `master.barber@velvetblade.com` / `BladeMaster2026*` → `especialista`

### 2.2 `vb_current_user` — sesión activa

```jsonc
{
  "email":    "cliente.vip@velvetblade.com",
  "name":     "Cliente VIP",        // nombre completo
  "userType": "cliente"             // decide a qué pantalla se redirige
}
```

- **Escribe:** `login.page.ts` (`onLogin`) y `register.page.ts` (`onRegister`),
  justo antes de navegar.
- **Lee:** `service-selection.page.ts` → `ngOnInit()` toma `name`, se queda con
  el **primer token** (`"Ana María" → "Ana"`) y lo usa para el saludo
  ("Hola, Ana.").
- **No se borra en ningún sitio todavía** (no hay logout).

### 2.3 `vb_selected_service` — la selección del Punto C

Forma exacta que escribe `service-selection.page.ts` → `continue()`:

```jsonc
{
  // claves para volver a resolver contra el catálogo si hiciera falta
  "serviceId":   "corte-precision",
  "stationId":   "sillon-1",
  // datos ya "aplanados" para que el Punto D no tenga que buscar en el catálogo
  "serviceName": "Corte de Precisión",
  "durationMin": 45,                // minutos → dimensiona el bloque de agenda
  "price":       "$45.000",         // string ya formateado (display, no número)
  "category":    "barberia",
  "stationName": "Sillón 1",
  "professional":"Mateo Rivas"
}
```

- **Escribe:** solo `continue()`, al pulsar "Continuar a Horario".
- **Lee:**
  - El propio `service-selection.page.ts` en `ngOnInit()`: si el usuario vuelve
    atrás desde el Punto D, **rehidrata** `selectedService` y `selectedStation`
    buscándolos por `serviceId` / `stationId` en los catálogos locales.
    La estación solo se restaura **si sigue `disponible`**.
  - El **Punto D** (`schedule.page.ts` → `ngOnInit`): lo lee para pintar el
    resumen ("Tu servicio") y para calcular la cita. Si **no existe**, redirige
    a `/service-selection` (no se puede agendar sin haber elegido servicio).

### 2.4 `vb_appointments` — citas confirmadas

Arreglo de citas. Lo escribe el **Punto D** y lo consume el **Punto E**.
Forma exacta que hace `unshift` `schedule.page.ts` → `confirmSelection()`
(la más reciente queda primera):

```jsonc
{
  "id":           1725000000000,          // Date.now() — id local
  "serviceId":    "corte-precision",      // para resolver contra catálogo si hiciera falta
  "stationId":    "sillon-1",
  "service":      "Corte de Precisión",   // = serviceName del Punto C
  "professional": "Mateo Rivas · Barbería de Autor",  // profesional + categoría
  "date":         "Hoy 29",               // label + número del día elegido
  "time":         "11:15",
  "duration":     "45 min",               // durationMin + " min"
  "price":        "$45.000",
  "status":       "Confirmado",           // AppointmentStatus
  "accent":       "confirmed",            // clave de color del badge
  "createdAt":    "2026-08-30T20:00:00.000Z"
}
```

- **Escribe:**
  - `schedule.page.ts` → `confirmSelection()`, al pulsar "Confirmar cita".
    Hace `push`/`unshift` sobre el arreglo existente (append).
  - `appointments.page.ts` → `cancelAppointment()`, al pulsar "Cancelar" en
    una cita activa. Busca la entrada por `id` dentro del arreglo y le pone
    `status: 'Cancelado'` / `accent: 'cancelled'` (no la borra, queda como
    registro).
- **Lee:** `appointments.page.ts` → `ngOnInit()`: rellena la lista **"Activas"**.
  Filtra entradas sin `service`/`time` por robustez. Si el arreglo está vacío o
  no existe, la vista muestra el estado "Aún no tienes citas activas".
- **Ambas escrituras disparan feedback nativo:** vibración (`Haptics`) +
  alerta flotante del SO (`Toast.show`, `@capacitor/toast`) con el mensaje de
  confirmación o cancelación. En navegador, el toast se renderiza vía
  `<pwa-toast>` (`@ionic/pwa-elements`, registrado en `main.ts`); en el APK
  usa el Toast nativo de Android.
- No hay edición de otros campos ni flujo de "completar" (pertenecería al
  lado del especialista, fuera de este alcance).
- El **"Historial"** del Punto E son datos **hardcodeados** de demo; no salen de
  esta clave (la cita recién cancelada desaparece de "Activas" pero no migra
  al Historial de demo).

---

## 3. Recorrido paso a paso (camino feliz)

1. **Registro** (`userType = cliente`)
   → `vb_users` += usuario nuevo
   → `vb_current_user` = { email, name, userType }
   → `navigateByUrl('/service-selection')`.

   *(o **Login** con cuenta existente → solo escribe `vb_current_user`.)*

2. **Selección de Servicio (Punto C)** — `ngOnInit`:
   - lee `vb_current_user.name` → saludo.
   - lee `vb_selected_service` → normalmente no existe aún → empieza en blanco.

3. Usuario elige **categoría → servicio → estación**. Todo esto es **estado en
   memoria del componente** (`selectedService`, `selectedStation`); todavía
   **no toca `localStorage`**.

4. Pulsa **"Continuar a Horario"** → `continue()`:
   - escribe `vb_selected_service` (JSON de arriba).
   - `navigateByUrl('/schedule')`.

5. **Horario (Punto D)** — `ngOnInit`:
   - lee `vb_current_user.name` → saludo.
   - lee `vb_selected_service` → pinta el resumen "Tu servicio".
     Si **no existe** → `navigateByUrl('/service-selection')` (no hay nada que agendar).
   - preselecciona el primer bloque disponible del día activo.

6. Usuario elige **día → bloque de horario**. Estado en memoria
   (`selectedDate`, `selectedSlot`); **no toca `localStorage`** todavía.

7. Pulsa **"Confirmar cita"** → `confirmSelection()`:
   - hace `unshift` de la cita nueva en `vb_appointments` (append).
   - `navigateByUrl('/appointments')`.

8. **Agendados (Punto E)** — `ngOnInit`:
   - lee `vb_current_user.name` → saludo.
   - lee `vb_appointments` → lista "Activas" (la recién creada aparece primera).
   - "Historial" son datos de demo hardcodeados.
   - Botón **"Nueva"** → `navigateByUrl('/service-selection')` para empezar otro
     agendamiento.

> Si desde el Punto D se pulsa "Volver", se navega a `/service-selection`; al
> llegar, su `ngOnInit` **relee** `vb_selected_service` y **restaura** la
> selección tal como estaba.

---

## 4. Reglas de negocio que viven en el Punto C

| Regla | Dónde | Detalle |
|-------|-------|---------|
| Servicios visibles = categoría activa | getter `filteredServices` | `services.filter(category === activeCategory)` |
| Estaciones visibles = categoría del **servicio** elegido | getter `filteredStations` | usa `selectedService.category`; si no hay servicio, cae a `activeCategory` |
| Cambiar de servicio **resetea** la estación | `selectService()` | `selectedStation = null` (la anterior podría no ser válida) |
| Estación `ocupado` no seleccionable | `selectStation()` + `[disabled]` en HTML | doble barrera (funcional + visual) |
| "Continuar" habilitado solo con servicio **y** estación | `[disabled]` en HTML + guard en `continue()` | |
| Cambiar de categoría **no** borra el servicio | `setCategory()` | el usuario puede solo "ojear" la otra categoría |

---

## 5. Manejo de errores / robustez

- **Todas** las lecturas de `localStorage` van en `try/catch`: si el JSON está
  corrupto o `localStorage` no está disponible (incógnito, WebView restringido),
  la pantalla arranca en blanco en vez de romperse.
- **Todas** las llamadas a `Haptics` van en `try/catch`: en navegador el plugin
  de Capacitor lanza excepción y no debe interrumpir el flujo.
- `continue()` (C) y `confirmSelection()` (D) navegan **aunque falle** el
  `setItem` (no se bloquea al usuario).
- El Punto D **se autoprotege**: sin `vb_selected_service` válido redirige al C.
- El Punto E tolera un `vb_appointments` vacío/corrupto → estado "sin citas".

---

## 6. Deuda técnica / lo que cambiará con backend

- `services` y `stations` (C), el calendario `days` (D) y el "Historial" (E)
  están **hardcodeados** en sus componentes. Con API → servicios Angular
  inyectables (`ServiceCatalogService`, `AvailabilityService`, `AppointmentsService`).
- `password` se guarda en **texto plano** en `vb_users` (solo válido para demo).
- **Logout** (`appointments.page.ts` → `logout()`) limpia `vb_current_user`,
  `vb_selected_service` y `vb_appointments` y vuelve a `/login`.
- `vb_selected_service` es efímero por diseño; con backend sería un
  *draft de reserva* en servidor, no en `localStorage`.
- `vb_appointments` ya soporta **cancelar** (Punto E); sigue sin **completar /
  mover cita** (pertenece al flujo de especialista, fuera de alcance), y el
  Punto D no marca como "ocupado" el slot que se acaba de reservar.
- Los Puntos D y E se portaron originalmente desde `desarrollo-cristian`. Esa
  rama luego se integró completa a `desarrollo-oscar` (merge), trayendo la
  plataforma nativa Android (`android/`) y las últimas dependencias de
  Capacitor; ambas ramas comparten hoy el mismo código standalone.

---

## 7. Bonus — Mascotas y seguimiento en vivo

Dos pantallas nuevas colgadas del perfil del tutor. Mismo patrón que el resto
de la app: **el router no transporta estado**, cada pantalla relee
`localStorage` en su `ngOnInit`.

```
   /service-selection ─┐                 ┌─▶ /profile ──"Ver seguimiento"──▶ /pet-tracking
   /appointments ──────┴─"Mis mascotas"──┘     (Bonus 1)   vb_tracking_pet      (Bonus 2)
```

### 7.1 `vb_pets` — fichas de mascotas (Bonus 1)

Arreglo **global** del dispositivo (mascotas de todos los tutores). La pantalla
`profile.page.ts` filtra por `ownerEmail === vb_current_user.email` y, al
guardar, reescribe el arreglo completo **conservando** las mascotas de otros
tutores.

| Campo         | Tipo             | Notas                                                        |
|---------------|------------------|-------------------------------------------------------------|
| `id`          | number           | `Date.now()` — PK local para editar / borrar / trazar       |
| `ownerEmail`  | string           | correo del tutor dueño (enlaza con `vb_current_user.email`) |
| `name`        | string           | Nombre del canino                                           |
| `breed`       | string           | Raza                                                        |
| `ageApprox`   | string           | Edad aproximada, texto libre ("3 años", "8 meses")          |
| `size`        | string           | `Pequeña` \| `Mediana` \| `Grande` \| `Gigante`             |
| `weightKg`    | number \| null   | Peso aproximado en kg (`null` mientras no se informa)       |
| `temperament` | string           | `Tranquilo` \| `Ansioso` \| `Enérgico` \| `Reactivo con otros canes` |
| `careNotes`   | string           | Observaciones de cuidado (alergias a fragancias, piel/articulaciones) |
| `createdAt`   | string (ISO)     | Fecha de alta                                               |

- **Escribe:** `profile.page.ts` → `savePet()` (alta y edición), `deletePet()`.
- **Lee:** `profile.page.ts` (`ngOnInit`) y `pet-tracking.page.ts` (`ngOnInit`,
  para resolver la ficha de la mascota seleccionada).

### 7.2 `vb_tracking_pet` — mascota seleccionada para el panel

`string` con el `id` de la mascota cuyo seguimiento se va a abrir.

- **Escribe:** `profile.page.ts` → `openTracking(pet)` justo antes de navegar a
  `/pet-tracking`.
- **Lee:** `pet-tracking.page.ts` (`ngOnInit`). Si falta o la mascota no existe
  en `vb_pets` → redirige a `/profile`.

### 7.3 `vb_pet_tracking` — trazabilidad + histórico (Bonus 2)

Objeto `{ [petId]: TrackingRecord }`:

```jsonc
{
  "1725000000000": {
    "currentPhase": 1,                 // -1 = fuera de la sede; 0..3 = índice de fase
    "updatedAt": "2026-09-08T20:00:00.000Z",
    "history": [
      { "id": 2, "date": "12 ago 2026", "service": "Hidroterapia + Ozonoterapia", "price": "$85.000" }
    ]
  }
}
```

Las **4 fases** están hardcodeadas en `pet-tracking.page.ts` (`phases`):
`En Recepción` → `En Hidroterapia` → `En Estilismo` → `Listo para Entrega`.

- **Siembra:** la primera vez que se abre una mascota sin registro, se crea con
  `currentPhase: -1` y un **histórico de demo** de 2 visitas (no hay backend).
- **Escribe:** `pet-tracking.page.ts` → `checkIn()`, `advancePhase()`,
  `resetPhase()`, `saveVisit()`; y `profile.page.ts` → `deletePet()` (limpia el
  registro huérfano).
- **Lee:** `pet-tracking.page.ts` (`ngOnInit`).
- **Simulación del lado especialista:** como la app aún no tiene perfil
  "especialista", los botones "Avanzar fase" / "Reiniciar" / "Finalizar y
  archivar" mueven la trazabilidad a mano para poder demostrar el seguimiento
  en vivo. Con backend, estas transiciones vendrían del panel del groomer.
- El feedback nativo (`Haptics` + `Toast`) sigue el mismo patrón que los
  Puntos D y E, siempre en `try/catch`.
