# 📱 Turnos_ya - Frontend Mobile Application

Módulo cliente móvil de la plataforma **Turnos_ya** desarrollado en **React Native + Expo SDK 57 (TypeScript)**. Diseñado bajo las pautas del [Sistema de Diseño](../Turnos_ya_documents-main/design-system.md) con estética limpia de alto contraste ("Estilo Mercado Libre": color primario `#009ee3`, tarjetas con elevación suave, badges semánticos pastel y reserva táctil en 3 pasos).

La aplicación incluye tanto la **experiencia completa del cliente final** (búsqueda con geolocalización, reserva con bloqueo temporal y gestión de turnos) como el **panel de administración para dueños de comercios** (agenda interactiva, catálogo de servicios, matriz de horarios y configuración del local).

---

## 🛠️ Stack Tecnológico

- **Framework Móvil**: [Expo SDK 57](https://expo.dev/) / [React Native 0.86](https://reactnative.dev/)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/) (v6.0)
- **Navegación**: [React Navigation 7](https://reactnavigation.org/) (`@react-navigation/native`, `@react-navigation/bottom-tabs`, `@react-navigation/native-stack`)
- **Cliente HTTP**: [Axios](https://axios-http.com/) con interceptor dinámico de JWT y soporte para cambio de IP en caliente
- **Persistencia Local**: `@react-native-async-storage/async-storage`
- **Geolocalización**: `expo-location` (detección de posición GPS y ordenamiento por proximidad)
- **Iconografía**: `@expo/vector-icons` (Ionicons)
- **Manejo de Fechas**: `date-fns` con localización en español (`es`)
- **Pruebas Automatizadas**: [Vitest](https://vitest.dev/) para validación de lógica de dominio y helpers

---

## 📁 Arquitectura del Proyecto

```text
Turnos_ya_frontend_mobile-main/
├── src/
│   ├── components/                    # Componentes UI reutilizables
│   │   ├── business/
│   │   │   └── BusinessCard.tsx       # Tarjeta de comercio con calificación, rubro y distancia GPS
│   │   └── common/
│   │       ├── Button.tsx             # Botón primario, secundario, outline y danger
│   │       ├── Card.tsx               # Tarjeta con elevación sutil (.ml-card)
│   │       ├── SlotPill.tsx           # Píldora de selección de horarios táctil (.btn-slot-pill)
│   │       └── StatusBadge.tsx        # Badges pastel de turnos (Confirmado, Pendiente, Cancelado)
│   ├── constants/
│   │   └── theme.ts                   # Tokens de color, tipografía, sombras y bordes del Design System
│   ├── context/
│   │   └── AuthContext.tsx            # Estado global de usuario, token JWT y sincronización con backend
│   ├── navigation/
│   │   └── RootNavigator.tsx          # Tabs inferiores (Home, Mis Turnos, Dueño, Perfil) + Stack de pantallas
│   ├── screens/                       # Pantallas y vistas de la aplicación
│   │   ├── appointments/
│   │   │   └── MyAppointmentsScreen.tsx # Pestañas Próximos e Historial con cancelación asistida
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx        # Inicio de sesión con validación y guardado de sesión
│   │   │   └── RegisterScreen.tsx     # Registro de nuevos usuarios con rol cliente o prestador
│   │   ├── booking/
│   │   │   └── BookingWizardScreen.tsx # Asistente táctil de reserva en 3 pasos con Hold Token
│   │   ├── business/
│   │   │   └── BusinessDetailScreen.tsx # Detalle del negocio, listado de servicios y calificaciones
│   │   ├── home/
│   │   │   └── HomeScreen.tsx         # Búsqueda dinámica, chips de categorías y cálculo de distancia
│   │   ├── owner/                     # Módulo de administración para dueños de comercios
│   │   │   ├── OwnerAgendaScreen.tsx    # Agenda de turnos diaria/semanal y cambio de estado
│   │   │   ├── OwnerBusinessScreen.tsx  # Edición de perfil del comercio, coordenadas y webhook
│   │   │   ├── OwnerSchedulesScreen.tsx # Matriz de horarios semanales de atención
│   │   │   └── OwnerServicesScreen.tsx  # CRUD de servicios (precio, duración y buffer time)
│   │   └── profile/
│   │       └── ProfileScreen.tsx      # Datos del perfil, switches de alertas y selector de IP del backend
│   ├── services/
│   │   └── api.ts                     # Cliente Axios con timeout, JWT e IP configurable
│   ├── types/
│   │   └── index.ts                   # Contratos TypeScript (User, Business, Service, Appointment)
│   └── utils/                         # Utilidades con cobertura de tests
│       ├── locationHelper.ts & .test.ts # Cálculo de distancias en km (Haversine)
│       └── timeHelper.ts & .test.ts     # Horas de reloj (wall-clock) y generador de slots
├── App.tsx                            # Entrada con SafeAreaProvider, Theme y AuthProvider
├── app.json                           # Configuración de Expo (nombre, bundle id, permisos)
├── package.json
└── tsconfig.json
```

---

## 📱 Módulos y Funcionalidades

### 1. Zona Cliente
- **Búsqueda Inteligente y Cercanía (`HomeScreen.tsx`)**:
  - Filtro interactivo por chips de categorías (Barbería, Estética, Salud, Deportes, etc.).
  - Búsqueda en tiempo real por nombre de comercio o rubro.
  - Geolocalización con permiso GPS (`expo-location`): calcula la distancia en kilómetros hasta el comercio y muestra una insignia con la distancia aproximada.
- **Detalle y Catálogo (`BusinessDetailScreen.tsx`)**:
  - Presentación del local, dirección física, horarios de apertura y lista de servicios ofrecidos con precios y tiempos de duración.
- **Asistente de Reserva en 3 Pasos (`BookingWizardScreen.tsx`)**:
  - Paso 1: Selección táctil del servicio deseado.
  - Paso 2: Selección de la fecha en calendario interactivo y slot horario disponible (píldoras horarias).
  - Paso 3: Generación del **Hold Token** (bloqueo transaccional de 10 min) y confirmación de la cita.
- **Historial de Turnos (`MyAppointmentsScreen.tsx`)**:
  - Pestañas separadas para turnos **Próximos** e **Historial**.
  - Badges de color pastel por estado (`CONFIRMED`, `PENDING`, `COMPLETED`, `CANCELLED`).
  - Cancelación de turnos directamente desde la app con confirmación modal.

### 2. Zona Prestador / Dueño (`screens/owner/`)
- **Agenda Interactiva (`OwnerAgendaScreen.tsx`)**:
  - Navegación diaria entre fechas para visualizar los turnos agendados por clientes.
  - Actualización rápida de estados de turnos: marcar como atendido (`COMPLETED`), confirmado (`CONFIRMED`) o cancelado (`CANCELLED`).
- **Configuración del Comercio (`OwnerBusinessScreen.tsx`)**:
  - Modificación del nombre, categoría comercial, dirección física, coordenadas de latitud/longitud y URL de webhook para notificaciones externas.
- **Matriz de Horarios de Atención (`OwnerSchedulesScreen.tsx`)**:
  - Alta y eliminación de turnos de apertura y cierre por cada día de la semana.
- **Gestión de Servicios (`OwnerServicesScreen.tsx`)**:
  - Creación y edición de servicios con tarifa, duración en minutos y tiempo de colchón entre citas.

---

## 🚀 Cómo Ejecutar la Aplicación

### 1. Iniciar el Servidor de Desarrollo Metro
```bash
npm install
npm start
# o: npx expo start
```

### 2. Abrir en tu Dispositivo
- **En celular físico (Android / iOS)**: Descargá la app **Expo Go** desde Google Play Store o Apple App Store y escaneá el código QR mostrado en la consola interactiva.
- **En emulador Android**: Presioná `a` en la terminal (requiere Android Studio y un AVD en ejecución).
- **En simulador iOS**: Presioná `i` en la terminal (requiere macOS y Xcode).
- **En navegador Web**: Presioná `w` en la terminal.

---

## 🌐 Conexión Dinámica con el Backend Local

La aplicación viene preparada para comunicarse con el backend según el entorno de ejecución:
- **En emulador Android**: `http://10.0.2.2:3000/api/v1`
- **En iOS Simulator o Web**: `http://localhost:3000/api/v1`

**Para probar desde un celular físico con Expo Go en la misma red Wi-Fi:**
1. Andá a la pestaña **Perfil** de la aplicación móvil.
2. Desplegá la tarjeta **Conexión con el Servidor API**.
3. Ingresá la dirección IP local de tu computadora (por ejemplo: `http://192.168.1.45:3000/api/v1`) y presioná **Guardar**.
4. La URL quedará guardada en `AsyncStorage` y todas las llamadas HTTP subsecuentes usarán dicha dirección automáticamente.

---

## 🧪 Pruebas Unitarias

La aplicación cuenta con una suite de pruebas automatizadas con **Vitest**:

```bash
npm run test
```

- `locationHelper.test.ts`: Validación de cálculo de distancia mediante la fórmula de Haversine y manejo de coordenadas inválidas.
- `timeHelper.test.ts`: Validación de cálculo de franjas horarias y formateo seguro de horas de reloj (wall-clock).