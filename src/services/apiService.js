// src/services/apiService.js

/**
 * Punto central para las llamadas a la API.
 * Se define la URL base para poder reutilizarla y
 * facilitar cambios futuros.
 */
const API_ENDPOINT = '/api/items';

/**
 * Obtiene los datos desde la API de forma asíncrona.
 * @returns {Promise<Object|Array>} Datos obtenidos en formato JSON
 * @throws {Error} Si la respuesta de la API no es satisfactoria
 */
export async function fetchData() {
  const response = await fetch(API_ENDPOINT);

  if (!response.ok) {
    throw new Error(`Error al obtener datos: ${response.statusText}`);
  }

  return response.json();
}
