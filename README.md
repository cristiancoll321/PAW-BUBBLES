gi# Paw & Bubbles Spa

Sistema móvil híbrido de gestión y bienestar canino, desarrollado con Angular, Ionic y Capacitor para el parcial práctico de Desarrollo de Aplicaciones Móviles Híbridas.

## Descripción general

Paw & Bubbles Spa permite a los tutores:

- iniciar sesión o registrarse;
- consultar servicios de Grooming & Estilismo, Spa Terapéutico y Cuidado Integral;
- seleccionar una cabina húmeda o estación de atención disponible;
- revisar fechas y franjas horarias;
- confirmar y cancelar reservas;
- registrar y administrar una o varias mascotas desde su perfil.

La aplicación funciona actualmente con datos locales en `localStorage` y no requiere un backend para demostrar el flujo funcional.

## Stack tecnológico

- Angular 22.x
- Ionic Framework 9.x
- Capacitor 8.x
- TypeScript 6.x
- RxJS 7.x
- Node.js 22.x
- Android Studio para la ejecución nativa

## Requisitos previos

- Node.js 22.x
- npm 10.x o superior
- Git
- Android Studio y un emulador AVD o dispositivo Android físico

Verificación:

```bash
node -v
npm -v
```

## Instalación y ejecución web

```bash
git clone https://github.com/TamperiG92/Entrega_hibridas.git
cd Entrega_hibridas
npm install
npm start
```

La aplicación queda disponible normalmente en `http://localhost:4200/`.

## Scripts disponibles

```bash
npm start          # ng serve
npm run build      # ng build
npm run watch      # ng build --watch --configuration development
npm test           # ng test
npm run lint       # ng lint
```

## Flujo de pantallas

La navegación está definida en `src/app/app.routes.ts`:

```text
/login
  ├── /register
  └── /service-selection
        ├── /pets              (Bonus 1)
        └── /schedule
              └── /appointments
```

### Pantallas implementadas

1. **Inicio de sesión:** correo, contraseña, validaciones y acceso demo.
2. **Registro del tutor:** nombre completo, teléfono, correo, contraseña y aceptación de términos.
3. **Catálogo de servicios y cabinas:** Grooming, Spa Terapéutico y Cuidado Integral.
4. **Horarios y disponibilidad:** selección de fecha, bloques disponibles, ocupados y reservados.
5. **Agendados:** citas activas, cancelación e historial local.
6. **Mis mascotas, Bonus 1:** registro de varias mascotas, edición, eliminación y observaciones especiales.

## Bonus 1: Registro y gestión de mascotas

El módulo `/pets` permite guardar por tutor:

- nombre del canino;
- raza;
- edad aproximada;
- talla: Pequeña, Mediana, Grande o Gigante;
- peso aproximado en kilogramos;
- temperamento: Tranquilo, Ansioso, Enérgico o Reactivo con otros canes;
- observaciones especiales como alergias, sensibilidad en piel o articulaciones.

La información se persiste en `localStorage` con una clave asociada al correo del tutor.

## Persistencia local

| Clave | Uso |
| --- | --- |
| `vb_users` | Usuarios registrados localmente |
| `vb_current_user` | Sesión activa |
| `vb_selected_service` | Servicio y cabina elegidos antes de agendar |
| `vb_appointments` | Citas confirmadas |
| `pb_pets_<correo>` | Mascotas registradas por tutor |

## Requisitos Mandatorios del README

Las siguientes evidencias deben incorporarse en la entrega. Las imágenes deben ser capturas reales de la aplicación ejecutándose en navegador o Android; no se han generado imágenes ficticias dentro del repositorio.

### A. Muestrario de pantallas de la aplicación

Agregar las capturas en `docs/evidencias/pantallas/` y enlazarlas en esta sección:

| Evidencia | Archivo sugerido | Qué debe demostrar |
| --- | --- | --- |
| Login | `docs/evidencias/pantallas/01-login.png` | Campos de correo y contraseña, validación visual y marca Paw & Bubbles |
| Registro del tutor | `docs/evidencias/pantallas/02-registro-tutor.png` | Formulario de nombre, teléfono, correo y contraseña |
| Catálogo | `docs/evidencias/pantallas/03-catalogo-servicios.png` | Grooming, Spa Terapéutico, Cuidado Integral y selección de cabina |
| Horarios | `docs/evidencias/pantallas/04-horarios-disponibilidad.png` | Fecha, bloques disponibles, reservados y ocupados |
| Bonus 1 | `docs/evidencias/pantallas/05-mis-mascotas.png` | Registro y administración de fichas de mascotas |

Cuando las imágenes estén disponibles, deben documentarse así:

```markdown
![Inicio de sesión](docs/evidencias/pantallas/01-login.png)
![Registro del tutor](docs/evidencias/pantallas/02-registro-tutor.png)
![Catálogo de servicios](docs/evidencias/pantallas/03-catalogo-servicios.png)
![Horarios y disponibilidad](docs/evidencias/pantallas/04-horarios-disponibilidad.png)
![Mis mascotas - Bonus 1](docs/evidencias/pantallas/05-mis-mascotas.png)
```

El **Bonus 2**, correspondiente al seguimiento en vivo del canino, no forma parte de esta implementación.

### B. Evidencias de ejecución en Android Studio con Capacitor

Agregar las capturas en `docs/evidencias/android/`:

| Evidencia | Archivo sugerido | Qué debe demostrar |
| --- | --- | --- |
| Proyecto Android Studio | `docs/evidencias/android/01-android-studio-proyecto.png` | Proyecto abierto, carpeta `android/` y archivo `build.gradle` |
| Aplicación en AVD o dispositivo | `docs/evidencias/android/02-emulador-ejecucion.png` | Aplicación ejecutándose en un emulador o dispositivo físico |
| Navegación nativa | `docs/evidencias/android/03-navegacion-emulador.png` | Navegación entre pantallas y responsividad Ionic |

## Capacitor y Android Studio

La identificación nativa configurada en `capacitor.config.ts` es:

```ts
appId: 'com.pawandbubbles.spa'
appName: 'Paw & Bubbles Spa'
webDir: 'www'
```

Comandos de sincronización y apertura:

```bash
npm run build
npx cap sync android
npx cap open android
```

En Android Studio se debe seleccionar un AVD o dispositivo conectado por depuración USB y ejecutar la aplicación con **Run**.

## Arquitectura principal

```text
android/                         # proyecto Android nativo de Capacitor
src/app/
├── app.routes.ts                # rutas lazy-loaded
├── pages/login/                 # autenticación
├── pages/register/              # registro del tutor
├── pages/service-selection/     # catálogo y selección de cabina
├── pages/schedule/              # horarios y disponibilidad
├── pages/appointments/          # citas activas e historial
└── pages/pets/                  # Bonus 1: mascotas
src/theme/variables.scss         # identidad visual Paw & Bubbles
capacitor.config.ts              # configuración del paquete Android
```

## Validación realizada

- `npm run build`: compilación de producción exitosa.
- `npm test -- --watch=false`: bundle de pruebas generado correctamente.
- Persistencia local validada para usuarios, servicios, citas y mascotas.

## Documentación adicional

- `FLUJO-DE-DATOS.md`: flujo y persistencia entre pantallas.
- `PROGRESO-OSCAR.md`: avances y decisiones del proyecto.
- `parcial.html`: requisitos funcionales y técnicos del parcial.

## Estado del proyecto

El flujo principal y el Bonus 1 están implementados. Queda pendiente incorporar al repositorio las capturas reales de la ejecución web y Android indicadas en la sección de evidencias.

## Licencia

Este proyecto no incluye una licencia explícita definida en el repositorio.
