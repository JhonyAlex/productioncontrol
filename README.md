
# Control de Producción

## Requisitos previos

- **Node.js** versión 18 o superior.
- **npm** para gestionar las dependencias.
- Un navegador moderno para acceder a la aplicación.

## Instalación de dependencias

Este proyecto solo necesita dependencias para ejecutar las pruebas automatizadas. Tras clonar el repositorio, instala todo mediante:

```bash
npm install
```

## Configuración de Firebase

Las claves utilizadas por Firebase se definen en `firebaseConfig.js`. Por seguridad se recomienda exponerlas como variables de entorno y generar el archivo a partir de ellas.

1. Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido (ajusta los valores a tu cuenta de Firebase):

```
FIREBASE_API_KEY=tu_api_key
FIREBASE_AUTH_DOMAIN=tu_auth_domain
FIREBASE_PROJECT_ID=tu_project_id
FIREBASE_STORAGE_BUCKET=tu_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
FIREBASE_APP_ID=tu_app_id
```

2. Usa estos valores para completar `firebaseConfig.js` o desarrolla un script que tome las variables de entorno y genere ese archivo antes de iniciar la aplicación.

## Comandos útiles

### Iniciar la aplicación

La aplicación es un sitio estático. Puedes ejecutarla localmente con:

```bash
npx http-server .
```

Luego abre `http://localhost:8080` en tu navegador.

### Ejecutar pruebas

Las pruebas de unidad se lanzan con Jest mediante:

```bash
npm test
```

### Desplegar

Puedes alojar el contenido del proyecto en cualquier servicio de hosting estático (Netlify, GitHub Pages, Firebase Hosting, etc.). Para desplegar en Firebase Hosting:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

Asegúrate de configurar previamente las credenciales de Firebase mediante variables de entorno antes de desplegar.
