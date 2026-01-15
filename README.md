# 🎯 Sistema de Gestión de Comisiones para Agencias Aliadas

Sistema completo de gestión de comisiones con estructura multinivel de agencias, desarrollado con Node.js, React, PostgreSQL y Docker.

## 📋 Características Principales

- ✅ **Sistema Multinivel de Agencias**: Jerarquía ilimitada de agencias con visualización en árbol
- ✅ **Gestión de Referidos**: Registro y seguimiento de clientes referidos
- ✅ **Sistema de Comisiones**: Cálculo automático del 50% por cliente inscrito
- ✅ **Autenticación Segura**: JWT + 2FA obligatorio para administradores
- ✅ **Panel de Control**: Dashboard con estadísticas y gráficos en tiempo real
- ✅ **Reportes y Exportación**: Descarga de reportes en CSV
- ✅ **Responsive Design**: Funciona perfectamente en desktop y mobile
- ✅ **Listo para Producción**: Dockerizado y optimizado para VPS

## 🏗️ Arquitectura

### Backend
- **Framework**: Node.js + Express
- **Base de datos**: PostgreSQL 15
- **Autenticación**: JWT + Speakeasy (2FA)
- **Seguridad**: Helmet, Rate Limiting, CORS
- **Validación**: Express Validator

### Frontend
- **Framework**: React 18 + Vite
- **UI**: Tailwind CSS + Heroicons
- **Gráficos**: Recharts
- **Notificaciones**: React Hot Toast
- **Routing**: React Router DOM v6

## 🚀 Instalación y Deploy

### Opción 1: Deploy Rápido con Docker (Recomendado)

#### Prerrequisitos
- Docker Engine 20.10+
- Docker Compose 2.0+
- Git

#### Pasos

1. **Clonar el repositorio**
```bash
git clone https://github.com/AndySuarezRicardo/commission-system.git
cd commission-system
```

2. **Configurar variables de entorno**
```bash
# Backend
cp backend/.env.example backend/.env
# Editar backend/.env con tus valores

# Frontend  
cp frontend/.env.example frontend/.env
# Editar frontend/.env con tu URL de API
```

3. **Iniciar con Docker Compose**
```bash
docker-compose up -d
```

4. **Verificar que todo funciona**
```bash
# Ver logs
docker-compose logs -f

# El sistema estará disponible en:
# Frontend: http://localhost
# Backend API: http://localhost:5000
# Base de datos: localhost:5432
```

5. **Acceder al sistema**
- URL: http://localhost
- Admin: `admin@commissionsystem.com` / `Admin@123456`
- Agencia: `agencia_a@example.com` / `Agency@123`

### Opción 2: Instalación Manual (Desarrollo)

#### Prerrequisitos
- Node.js 18+
- PostgreSQL 15+
- npm o yarn

#### Backend

1. **Instalar dependencias**
```bash
cd backend
npm install
```

2. **Configurar base de datos**
```bash
# Crear base de datos en PostgreSQL
createdb commission_system

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales
```

3. **Ejecutar migraciones y seeds**
```bash
npm run migrate
npm run seed
```

4. **Iniciar servidor**
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

#### Frontend

1. **Instalar dependencias**
```bash
cd frontend
npm install
```

2. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar VITE_API_URL si es necesario
```

3. **Iniciar aplicación**
```bash
# Desarrollo
npm run dev

# Build para producción
npm run build
```

## 🖥️ Deploy en VPS (Ubuntu)

### Prerrequisitos en el VPS
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo apt install docker-compose -y

# Instalar Git
sudo apt install git -y
```

### Deploy Paso a Paso

1. **Conectar al VPS por SSH**
```bash
ssh usuario@tu-vps-ip
```

2. **Clonar repositorio**
```bash
cd /opt
sudo git clone https://github.com/AndySuarezRicardo/commission-system.git
cd commission-system
```

3. **Configurar producción**
```bash
# Backend
sudo nano backend/.env
# Cambiar:
# - DB_PASSWORD (contraseña segura)
# - JWT_SECRET (clave única aleatoria)
# - NODE_ENV=production
# - DEFAULT_ADMIN_PASSWORD (tu contraseña de admin)

# Frontend
sudo nano frontend/.env
# Cambiar:
# - VITE_API_URL=http://tu-dominio.com/api
```

4. **Configurar Docker Compose para producción**
```bash
sudo nano docker-compose.yml
# Cambiar contraseña de PostgreSQL
# Cambiar JWT_SECRET
```

5. **Iniciar servicios**
```bash
sudo docker-compose up -d
```

6. **Configurar dominio (opcional pero recomendado)**

Si tienes un dominio, configura Nginx como proxy reverso:

```bash
sudo apt install nginx certbot python3-certbot-nginx -y

sudo nano /etc/nginx/sites-available/commission-system
```

Contenido del archivo:
```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Activar sitio
sudo ln -s /etc/nginx/sites-available/commission-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Instalar SSL con Let's Encrypt
sudo certbot --nginx -d tu-dominio.com
```

7. **Verificar funcionamiento**
```bash
# Ver logs
sudo docker-compose logs -f

# Ver estado de contenedores
sudo docker-compose ps
```

8. **Configurar firewall (importante para seguridad)**
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Comandos Útiles para Administración

```bash
# Ver logs en tiempo real
sudo docker-compose logs -f

# Reiniciar servicios
sudo docker-compose restart

# Detener todo
sudo docker-compose down

# Detener y eliminar datos (⚠️ cuidado)
sudo docker-compose down -v

# Actualizar aplicación
cd /opt/commission-system
sudo git pull
sudo docker-compose down
sudo docker-compose up -d --build

# Backup de base de datos
sudo docker exec commission_db pg_dump -U postgres commission_system > backup_$(date +%Y%m%d).sql

# Restaurar base de datos
sudo docker exec -i commission_db psql -U postgres commission_system < backup_20260115.sql
```

## 📊 Modelo de Base de Datos

### Tablas Principales

**agencies** - Agencias con estructura multinivel
- `id`: Primary key
- `name`: Nombre de la agencia
- `email`: Email único
- `phone`: Teléfono
- `parent_agency_id`: FK a agencia padre (nullable para raíz)
- `start_date`: Fecha de inicio
- `created_at`, `updated_at`: Timestamps

**users** - Usuarios del sistema
- `id`: Primary key
- `agency_id`: FK a agencies
- `role`: 'admin' o 'agency'
- `email`: Email único
- `password_hash`: Contraseña encriptada (bcrypt)
- `two_factor_enabled`: Boolean
- `two_factor_secret`: Secreto para 2FA
- `is_active`: Boolean
- `last_login`: Timestamp

**referred_clients** - Clientes referidos
- `id`: Primary key
- `name`: Nombre completo
- `email`: Email único
- `phone`: Teléfono único
- `status`: 'pending', 'enrolled', 'not_enrolled'
- `agency_id`: FK a agencies
- `enrollment_date`: Fecha de inscripción
- `notes`: Notas adicionales

**commissions** - Comisiones generadas
- `id`: Primary key
- `amount`: Monto decimal
- `month`: Mes en formato YYYY-MM
- `payment_status`: 'pending', 'paid'
- `client_id`: FK a referred_clients
- `agency_id`: FK a agencies
- `paid_at`: Timestamp de pago
- `payment_notes`: Notas de pago

## 🔒 Seguridad

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Autenticación JWT con expiración
- ✅ 2FA obligatorio para administradores
- ✅ Rate limiting en todas las rutas
- ✅ Validación de inputs con express-validator
- ✅ Headers de seguridad con Helmet
- ✅ CORS configurado
- ✅ Protección contra SQL injection (Parametrized queries)
- ✅ Acceso de datos por jerarquía (las agencias solo ven sus datos)

## 📱 Roles y Permisos

### Administrador
- Acceso total al sistema
- CRUD de agencias
- Aprobar/rechazar clientes
- Marcar comisiones como pagadas
- Ver todos los reportes
- 2FA obligatorio

### Agencia
- Ver dashboard con sus estadísticas
- Registrar clientes referidos
- Ver sus comisiones
- Ver su árbol de subagencias
- Crear subagencias (hijas)
- Acceso solo a sus datos y subagencias

## 🎨 Personalización

### Cambiar tasa de comisión
Editar `backend/.env`:
```bash
COMMISSION_RATE=0.50  # 50% por defecto
```

### Cambiar colores del frontend
Editar `frontend/tailwind.config.js`:
```javascript
colors: {
  primary: {
    // Personalizar colores aquí
  }
}
```

### Configurar email SMTP (notificaciones)
Editar `backend/.env`:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASSWORD=tu_password_de_aplicacion
EMAIL_FROM=noreply@tudominio.com
```

## 🐛 Solución de Problemas

### Error de conexión a base de datos
```bash
# Verificar que PostgreSQL está corriendo
sudo docker-compose ps

# Ver logs
sudo docker-compose logs postgres
```

### Frontend no conecta con backend
- Verificar `VITE_API_URL` en `frontend/.env`
- Verificar `CORS_ORIGIN` en `backend/.env`
- Revisar logs: `sudo docker-compose logs backend`

### Error al hacer migraciones
```bash
# Conectar a base de datos y verificar
sudo docker exec -it commission_db psql -U postgres -d commission_system

# Eliminar y recrear (⚠️ pérdida de datos)
sudo docker-compose down -v
sudo docker-compose up -d
```

## 📈 Mejoras Futuras

- [ ] Comisiones multinivel (comisión por referidos de referidos)
- [ ] Notificaciones por email automáticas
- [ ] Dashboard con más gráficos analíticos
- [ ] Exportación de reportes en PDF
- [ ] API REST documentada con Swagger
- [ ] Tests unitarios y de integración
- [ ] Panel de configuración avanzado
- [ ] Webhooks para integraciones externas

## 📄 Licencia

MIT License - Ver archivo LICENSE

## 👨‍💻 Autor

Sistema desarrollado para gestión de comisiones de agencias aliadas.

## 🆘 Soporte

Para reportar bugs o solicitar features:
1. Abrir un issue en GitHub
2. Enviar pull request con mejoras

---

**¡Sistema listo para producción! 🚀**
