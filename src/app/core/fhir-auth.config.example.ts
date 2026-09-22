/**
 * Plantilla de config del servidor FHIR. Copiá este archivo a
 * fhir-auth.config.ts (gitignoreado) y completá con tus credenciales reales.
 */
export const FHIR_CONFIG = {
  baseUrl: 'https://TU-API-GATEWAY.execute-api.REGION.amazonaws.com/ENV/fhir',
  tokenUrl: 'https://TU-DOMINIO-COGNITO.auth.REGION.amazoncognito.com/oauth2/token',
  clientId: 'TU_CLIENT_ID',
  clientSecret: 'TU_CLIENT_SECRET',
};
