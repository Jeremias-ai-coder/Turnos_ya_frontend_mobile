# Turnos_ya - Frontend Mobile Application

Módulo cliente móvil de la plataforma **Turnos_ya**. Diseñado para dispositivos Android e iOS, permite a los usuarios reservar turnos de forma rápida con geolocalización, recibir notificaciones push en tiempo real y gestionar reservas desde smartphones y tablets.

---

## 🛠️ Stack Tecnológico Planificado

- **Framework**: [Flutter](https://flutter.dev/) / [React Native](https://reactnative.dev/) (Multiplataforma iOS & Android)
- **Lenguaje**: Dart / TypeScript
- **Cliente HTTP**: Dio / Axios (Integración directa con `Turnos_ya_backend-api`)
- **Gestión de Estado**: Provider / Redux / Zustand
- **Notificaciones Push**: Firebase Cloud Messaging (FCM)
- **Servicios de Mapas**: Google Maps SDK API para geolocalización de comercios cercanos

---

## 📁 Estructura del Proyecto (Arquitectura Objetivo)

```text
Turnos_ya_frontend_mobile-main/
├── android/                # Configuración nativa para plataforma Android
├── ios/                    # Configuración nativa para plataforma iOS
├── lib/ / src/             # Código fuente de la aplicación móvil
│   ├── assets/             # Recursos gráficos, íconos y fuentes de la app
│   ├── components/         # Componentes nativos y widgets reutilizables
│   ├── models/             # Modelos de datos (User, Business, Appointment, Service)
│   ├── navigation/         # Enrutamiento y navegación por pestañas/pantallas
│   ├── providers/          # Gestión de estado (Autenticación, Ubicación, Reservas)
│   ├── screens/            # Pantallas principales de la app móvil
│   │   ├── auth/           # Pantallas de Login y Registro
│   │   ├── home/           # Búsqueda de comercios y mapa interactivo
│   │   ├── booking/        # Asistente táctil de selección de turno y hold
│   │   ├── appointments/   # Mis turnos e histórico de reservas
│   │   └── profile/        # Ajustes de cuenta y notificaciones push
│   └── services/           # Conexión con la API RESTful de Turnos_ya
├── README.md               # Documentación del módulo cliente móvil
└── pubspec.yaml / package.json # Definición de dependencias y scripts
```

---

## ⚙️ Funcionalidades Principales Planificadas

1. **Búsqueda Geolocalizada**: Detección del punto donde se encuentra el usuario para sugerir comercios cercanos en el mapa.
2. **Reserva en 3 Toques**: Proceso optimizado para pantallas táctiles con selección directa de fecha y hora.
3. **Notificaciones Push y Recordatorios**: Avisos automáticos previos al horario del turno para reducir el ausentismo (*no-show*).
4. **Modo Prestador Móvil**: Acceso rápido para dueños de comercios para validar o finalizar turnos en el momento.

---

## 🚀 Integración con el Backend

El cliente móvil consume exactamente el mismo contrato OpenAPI definido en `Turnos_ya_documents-main` y servido por `Turnos_ya_backend-api-main`, garantizando paridad total de datos entre la versión Web y la versión Móvil.