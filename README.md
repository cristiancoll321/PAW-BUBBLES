# PAW & BUBBLES

Aplicación híbrida de reserva para un spa & estética canina (hidroterapia, ozonoterapia y estilismo), desarrollada con Angular + Ionic + Capacitor.

## Descripción general

PAW & BUBBLES es una app de reserva de servicios que permite a un tutor:

- iniciar sesión o registrarse,
- seleccionar una categoría de servicio,
- elegir un servicio y una estación/profesional disponible,
- revisar el horario disponible,
- confirmar una cita,
- consultar sus servicios agendados.

La aplicación está pensada como flujo de negocio de un spa canino premium, con una UX visual orientada al cuidado y una estructura modular por pantallas.

---

## Stack tecnológico

- Angular: 22.x
- Ionic Framework: 9.x
- Capacitor: 8.x
- TypeScript: 6.x
- RxJS: 7.x
- Angular CLI: 22.x
- Node.js: recomendado 22.22.3 o superior

### Dependencias principales

- `@angular/core`
- `@angular/router`
- `@ionic/angular`
- `@capacitor/core`
- `@capacitor/android`
- `@capacitor/haptics`
- `ionicons`

---

## Requisitos previos

Antes de ejecutar el proyecto asegúrate de tener instalado:

- Node.js 22.x
- npm 10.x o superior
- Git
- Android Studio (si quieres compilar para Android con Capacitor)

Verifica la versión:

```bash
node -v
npm -v
```

---

## Instalación

1. Clona el repositorio:

```bash
git clone https://github.com/TamperiG92/Entrega_hibridas.git
git checkout desarrollo-cristian  # rama de trabajo
```

2. Instala dependencias:

```bash
npm install
```

3. Inicia la app en modo desarrollo:

```bash
npm start
```

La aplicación quedará disponible normalmente en:

```text
http://localhost:4200/
```

---

## Scripts disponibles

En el archivo `package.json` se incluyen los siguientes comandos:

```bash
npm start          # ng serve
npm run build      # ng build
npm run watch      # ng build --watch --configuration development
npm test           # ng test
npm run lint       # ng lint
```

---

## Arquitectura del proyecto

```text
paw-bubbles/
├── android/                     # proyecto Android nativo generado por Capacitor
├── src/
│   ├── app/
│   │   ├── app.component.ts
│   │   ├── app.routes.ts
│   │   ├── app.module.ts
│   │   ├── home/
│   │   └── pages/
│   │       ├── appointments/
│   │       ├── login/
│   │       ├── register/
│   │       ├── schedule/
│   │       ├── service-selection/
│   │       └── test-standalone/
│   ├── assets/
│   ├── environments/
│   ├── global.scss
│   ├── main.ts
│   ├── test-setup.ts
│   └── theme/
│       └── variables.scss
├── angular.json
├── capacitor.config.ts
├── FLUJO-DE-DATOS.md
├── PROGRESO-OSCAR.md
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.spec.json
├── eslint.config.js
├── ionic.config.json
├── ionic.starter.json
├── README.md
└── www/                         # build generado por Angular
```

---

## Flujo de pantallas

La navegación principal está definida en `src/app/app.routes.ts`.

### Flujo previsto

```text
''  ->  /login  ->  /register
                 \-> /service-selection -> /schedule -> /appointments
```

### Pantallas principales

1. Login
   - autenticación local con usuarios en storage
   - cuenta demo disponible para cliente y especialista

2. Registro
   - creación de usuario local
   - validación de duplicados

3. Selección de servicio y estación
   - filtro por categoría: Hidroterapia & Baños / Estética & Estilismo
   - elección de servicio y profesional/estación disponible
   - resumen y avance al horario

4. Schedule / Horario
   - revisión de disponibilidad
   - selección de fecha y horario
   - confirmación de la cita

5. Appointments / Agendados
   - vista de citas activas
   - historial de citas hardcodeado

---

## Modelo de datos y persistencia

Este proyecto no usa backend aún; el estado compartido vive en `localStorage` del navegador/WebView.

Se documenta en detalle en `FLUJO-DE-DATOS.md`, pero aquí se resume:

### Claves principales

- `vb_users`: lista de usuarios registrados
- `vb_current_user`: sesión activa
- `vb_selected_service`: servicio + estación seleccionados antes de confirmar
- `vb_appointments`: citas confirmadas

### Regla clave

El router no transporta estado entre pantallas; la app persiste datos en `localStorage` y cada vista los reactiva en `ngOnInit()`.

---

## Pantalla de selección de servicio

La pantalla `service-selection` es el punto central del flujo del cliente.

### Funcionalidades

- selector de categoría
- lista de servicios por categoría
- duración y precio por servicio
- selección de estación disponible
- validación para evitar puestos ocupados
- resumen final con "Continuar a Horario"
- haptics con Capacitor en las interacciones

### Archivos relevantes

- `src/app/pages/service-selection/service-selection.page.ts`
- `src/app/pages/service-selection/service-selection.page.html`
- `src/app/pages/service-selection/service-selection.page.scss`

---

## Estilo visual

La aplicación usa un sistema de diseño propio basado en variables globales declaradas en:

- `src/theme/variables.scss`
- `src/global.scss`

Se utilizan variables como:

- `--ion-color-primary`
- `--vb-gradient-hero`
- `--vb-gradient-crimson`
- `--vb-card-border`
- `--vb-shadow-luxury`
- `--vb-radius-md`

El estilo visual intenta seguir una estética premium con tonos cálidos, tonos vino y morado, plus a un enfoque tipo landing-page para reservación de servicios.

---

## Configuración de Ionic y Angular

La app se inicializa de forma standalone con `bootstrapApplication` en `src/main.ts`:

```ts
bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
  ],
});
```

Esto permite una arquitectura moderna con componentes standalone y rutas lazy-load.

---

## Ejecución para Android

Este proyecto está listo para trabajar con Capacitor.

### Generar proyecto Android

```bash
npx cap add android
```

### Abrir en Android Studio

```bash
npx cap open android
```

### Sincronizar cambios nativos

```bash
npx cap sync android
```

---

## Variables de entorno y configuración

Actualmente la aplicación no usa un backend real ni un sistema de configuración externo. La lógica de negocio se mantiene en localStorage y en datos hardcodeados por pantalla.

Archivos relevantes:

- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`

---

## Documentación adicional del proyecto

Además del README, el repositorio incluye documentación interna:

- `FLUJO-DE-DATOS.md`: explicación detallada de persistencia y flujo del negocio
- `PROGRESO-OSCAR.md`: estado de ejecución, avances y decisiones de implementación

Es recomendable leer ambos documentos antes de continuar con cambios en el flujo o en la lógica de negocio.

---

## Buenas prácticas y recomendaciones

- Mantener versiones Angular al mismo nivel para evitar incompatibilidades.
- Evitar mezclar rutas legacy y standalone sin criterio.
- Preferir cambios sobre `localStorage` con validaciones defensivas.
- Mantener cada pantalla con su estado propio y sincronización mínima con storage.
- Revalidar la app con `npm run build` antes de subir cambios importantes.

---

## Estado actual

El proyecto se encuentra en una etapa funcional de flujo de negocio para agendamiento de servicios, con las pantallas principales implementadas y el flujo de localStorage documentado.

Se puede considerar en una fase de:

- validación funcional,
- refinamiento visual,
- preparación para backend real,
- integración nativa Android y despliegue.

---

## Roadmap sugerido

1. Integrar backend real para usuarios, servicios y citas.
2. Sustituir localStorage por API REST o Firebase.
3. Añadir autenticación segura.
4. Mejorar validaciones de horario y disponibilidad.
5. Añadir notificaciones, pago y gestión de especialistas.
6. Preparar despliegue para Android/iOS.

---

## Créditos

Proyecto conceptual y desarrollado para la marca PAW & BUBBLES.

---

## Licencia

Este proyecto no incluye una licencia explícita definida en el repositorio en este momento. Se recomienda definir una antes de un despliegue o entrega a terceros.
