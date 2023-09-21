const axios = require('axios');
const fs = require('fs');

const url = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/';
const path = `${__dirname}/../src/data/`;
const fileName = 'gas_stations.json';

axios.get(url)
    .then(respuesta => {
        if (respuesta.status === 200) {

            let datosGasolineras = respuesta.data.ListaEESSPrecio;

            const datosGasolineraSorted = datosGasolineras
                .filter((gasolinera) => gasolinera['Precio Gasoleo A'].trim() !== '')
                .sort((gasolineraA, gasolineraB) =>
                         {
                             let precioA = parseFloat(gasolineraA['Precio Gasoleo A'].replace(',','.'));
                             let precioB = parseFloat(gasolineraB['Precio Gasoleo A'].replace(',','.'));
                            return precioA - precioB;
                        }
            ); //datos filtrados, ordenados y parseados

            fs.writeFileSync(path + fileName, JSON.stringify(datosGasolineraSorted));

        } else {
            console.error('Petición HTTP fallida con código:', respuesta.status);
        }
    })
    .catch(error => {
        console.error('Ha ocurrido un error:', error.message);
    });

// function parseaPrecios(gasolinera){
//     for(let [key, value] of Object.entries(gasolinera)){
//         if(key.includes('Precio')){
//             gasolinera[key] = parseFloat(value.replace(',', '.'));
//         }
//     }
//     return gasolinera
// }
