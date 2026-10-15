# Turnos_ya - Frontend Mobile Application

Módulo cliente móvil de la plataforma **Turnos_ya** desarrollado en **React Native + Expo (TypeScript)**. Diseñado bajo las pautas del [Sistema de Diseño](../Turnos_ya_documents-main/design-system.md) con estética limpia de alto contraste ("Estilo Mercado Libre": color primario `#009ee3`, tarjetas con elevación suave, badges semánticos pastel y selección de turnos en 3 pasos).

---

## 🛠️ Stack Tecnológico Implementado

- **Framework**: [Expo](https://expo.dev/) / [React Native](https://reactnative.dev/)
- **Lenguaje**: TypeScript
- **Navegación**: React Navigation (`@react-navigation/native`, `@react-navigation/bottom-tabs`, `@react-navigation/native-stack`)
- **Cliente HTTP**: Axios con interceptor dinámico de JWT y soporte para cambio de IP de servidor
- **Almacenamiento Local**: `@react-native-async-storage/async-storage`
- **Iconografía**: `@expo/vector-icons` (Ionicons)
- **Fechas**: `date-fns` con localización en español (`es`)

---

## 📁 Arquitectura del Proyecto

```text
Turnos_ya_frontend_mobile-main/
├── src/
│   ├── components/
│   │   ├── business/
│   │   │   └── BusinessCard.tsx       # Tarjeta de comercio con calificación, rubro y dirección
│   │   └── common/
│   │       ├── Button.tsx             # Botón primario, secundario, outline y danger
│   │       ├── Card.tsx               # Tarjeta con elevación sutil (.ml-card)
│   │       ├── SlotPill.tsx           # Píldora de selección de horarios (.btn-slot-pill)
│   │       └── StatusBadge.tsx        # Badges pastel de turnos (Confirmado, Pendiente, Cancelado)
│   ├── constants/
│   │   └── theme.ts                   # Tokens de color, tipografía, sombras y bordes del Design System
│   ├── context/
│   │   └── AuthContext.tsx            # Estado global de usuario, token JWT y sincronización con backend
│   ├── navigation/
│   │   └── RootNavigator.tsx          # Barra de navegación inferior (Tabs) + Stack de pantallas
│   ├── screens/
│   │   ├── appointments/
│   │   │   └── MyAppointmentsScreen.tsx # Pestañas Próximos e Historial con opción de cancelar turno
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx        # Inicio de sesión con validación y guardado de sesión
│   │   │   └── RegisterScreen.tsx     # Registro de nuevos usuarios con rol cliente
│   │   ├── booking/
│   │   │   └── BookingWizardScreen.tsx  # Asistente táctil de reserva en 3 pasos (Servicio -> Fecha/Hora -> Hold & Confirmación)
│   │   ├── business/
│   │   │   └── BusinessDetailScreen.tsx # Detalle del negocio, listado de servicios y calificaciones
│   │   ├── home/
│   │   │   └── HomeScreen.tsx         # Búsqueda dinámica, chips de categorías y lista de comercios
│   │   └── profile/
│   │       └── ProfileScreen.tsx      # Datos del perfil, switches de alertas y configuración de IP del backend
│   ├── services/
│   │   └── api.ts                     # Cliente Axios con timeout e interceptores
│   ├── types/
│   │   └── index.ts                   # Contratos TypeScript (User, Business, Service, Appointment)
│   └── utils/
│       └── timeHelper.ts              # Utilidades de hora de reloj (wall-clock) y generador de slots
├── App.tsx                            # Punto de entrada con SafeAreaProvider y AuthProvider
├── package.json
└── tsconfig.json
```

---

## 🚀 Cómo Ejecutar la Aplicación

### 1. Iniciar el Servidor de Desarrollo
```bash
npm start
# o
npx expo start
```

### 2. Abrir en tu Dispositivo
- **En celular físico (Android / iOS)**: Descargá la app **Expo Go** de Google Play Store o Apple App Store y escaneá el código QR mostrado en la consola o navegador.
- **En emulador Android**: Presioná `a` en la terminal.
- **En simulador iOS**: Presioná `i` en la terminal (requiere macOS).
- **En navegador Web**: Presioná `w` en la terminal.

---

## 🌐 Conexión con el Backend Local

La aplicación viene configurada por defecto para conectarse a:
- En emulador Android: `http://10.0.2.2:3000/api/v1`
- En iOS o Web: `http://localhost:3000/api/v1`

**Para probar desde un celular físico con Expo Go:**
1. Andá a la pestaña **Perfil**.
2. Desplegá la sección **Conexión con el Servidor API**.
3. Ingresá la dirección IP local de tu computadora en la red Wi-Fi (ejemplo: `http://192.168.1.50:3000/api/v1`) y presioná **Guardar**.