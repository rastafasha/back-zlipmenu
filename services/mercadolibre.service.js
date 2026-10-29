import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

export const uploadImageToMeli = async (localFilePath, accessToken) => {
  const url = 'https://mercadolibre.com';
  const form = new FormData();
  
  // Creamos el stream de lectura desde la ruta temporal del archivo
  form.append('file', fs.createReadStream(localFilePath));

  try {
    const response = await axios.post(url, form, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        ...form.getHeaders()
      }
    });

    // Meli devuelve un objeto con el ID de la imagen (ej: 123456-MLA12345_012026)
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Error al conectar con la API de Mercado Libre');
  }
};