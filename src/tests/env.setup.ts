// Variables de entorno de prueba: corren ANTES de importar la app,
// asi los tests no dependen de un archivo .env local.
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret'
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'
process.env.BUSINESS_NAME = process.env.BUSINESS_NAME || 'Test Business'

export {}
