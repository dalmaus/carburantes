async function init(){

    let map = createMapa();
    L.Control.geocoder().addTo(map); //agrega botón de búsqueda
    let gasolineras = await cargaDatos();
    let precios = parsePreciosGasolineras(gasolineras);

    const precioMin = getPrecioMinimo(precios);
    const precioMax = getPrecioMaximo(precios);

    let markers = L.markerClusterGroup({
        maxClusterRadius: 130, //distancia a la que se forman los clusters, default 80
        disableClusteringAtZoom: 13, //distancia de zoom a la que se desactivan los clusters
    });

    for(let gasolinera of gasolineras.ListaEESSPrecio){
        let marker = addMarker(gasolinera, precioMin, precioMax); //posiciona el marcador
        addPopup(marker, gasolinera); //añade la información del marcador en click
        markers.addLayer(marker);
    }
    map.addLayer(markers);
    // L.Routing.control({
    //     waypoints: [
    //         L.latLng(57.74, 11.94),
    //         L.latLng(57.6792, 11.949)
    //     ],
    //     language: 'es',
    //     addWaypoints: false,
    //     lineOptions: {
    //         styles: [{color: 'blue'}]
    //     }
    // }).addTo(map);

    // map.on('popupopen', (e) => {
    //     console.log(e.popup._latlng)
    // })

    // navigator.geolocation.getCurrentPosition((pos)=>console.log(pos), console.log('fial'), {enableHighAccuracy: true});

}

function createMapa(){ //establece la vista inicial del mapa y establece el proveedor de 'tile layers'
    let map = L.map('map').setView([40.416607, -3.703836], 12);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
         maxZoom: 19,
         attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
     }).addTo(map);

    return map;

}
function markerPunto(e){

}
function addMarker(gasolinera, precioMin, precioMax){

    let precioActual = gasolinera['Precio Gasoleo A'].replace(',', '.');
    const maximoEscala = 5;

    precioActual = (precioActual == '') ? precioMax : parseFloat(precioActual);

    let posicionEnEscala = Math.round((precioActual-precioMin)*maximoEscala/(precioMax-precioMin)*100)/100
    let markerIconNumero = getNumeroIcono(posicionEnEscala);

    const icono = L.icon({
        iconUrl: `src/icons/marker-${markerIconNumero}.png`,
        iconSize: [24, 36],
        popupAnchor: [0, -17]
    });

    let latitud = gasolinera['Latitud'].replace(',', '.');
    let longitud = gasolinera['Longitud (WGS84)'].replace(',', '.');

    let marker = L.marker([latitud, longitud], {icon: icono});

    marker.on('click', markerPunto);

    return marker;
}

//devuelve el número con el que se escogerá el icono que de precio que le corresponde
function getNumeroIcono(posicion){

    let markerIconNumero = 0;

    if(posicion < 1.1){
        markerIconNumero = 0;
    }
    else if(posicion >= 1.1 && posicion < 1.3){
        markerIconNumero = 1;
    }
    else if(posicion >= 1.3 && posicion < 1.5){
        markerIconNumero = 2;
    }
    else if(posicion >= 1.5 && posicion < 1.8){
        markerIconNumero = 3;
    }
    else if(posicion >= 1.8 && posicion < 2){
        markerIconNumero = 4;
    }
    else{
        markerIconNumero = 5;
    }

    return markerIconNumero;
}

function addPopup(marker, gasolinera){

    let gasolineraNombre = gasolinera['Rótulo'] || '-';
    let precioGasoleoA = gasolinera['Precio Gasoleo A'] || '-';
    let precioGasoleoB = gasolinera['Precio Gasoleo B'] || '-';
    let precioGasolina95 = gasolinera['Precio Gasolina 95 E5'] || '-';
    let precioGasolina98 = gasolinera['Precio Gasolina 98 E5'] || '-';

    if(!precioGasoleoB)
        precioGasoleoB = '-'
    if(!precioGasolina98)
        precioGasolina98 = '-'

    let contenido = L.DomUtil.create("div", "popup");
    contenido.innerHTML = `
            <p class="empresa">${gasolineraNombre}</p>
            <p class="precios">PRECIOS</p>
            <table>
              <tr>
                <th>Tipo</th>
                <th>Precio €/l</th>
              </tr>
              <tr>
                <td><strong>Gasoleo A</strong></td>
                <td>${precioGasoleoA}</td>
              </tr>
              <tr>
                <td><strong>Gasoleo B</strong></td>
                <td>${precioGasoleoB}</td>
              </tr>
              <tr>
                <td><strong>Gasolina 95 E5</strong></td>
                <td>${precioGasolina95}</td>
              </tr>
              <tr>
                <td><strong>Gasolina 98 E5</strong></td>
                <td>${precioGasolina98}</td>
              </tr>
            </table>
            <span><a class="boton-como-llegar">Cómo llegar...</a></span>
`;
    contenido.addEventListener('click', (e) => comoLlegar(e, marker._latlng.lat, marker._latlng.lng))
    marker.bindPopup(contenido);

}

function comoLlegar(e, lat, lng){
    if(e.target.classList.contains('boton-como-llegar')){
        // código para pintar la ruta desde el usuario a la gasolinera
    }
}

function parsePreciosGasolineras(gasolineras){
    return gasolineras.ListaEESSPrecio.filter((gasolinera) => gasolinera['Precio Gasoleo A'] !== '')
        .map((gasolinera) => parseFloat(gasolinera['Precio Gasoleo A'].replace(',','.')));
}
//filtra y parsea devolviendo el valor de precio más pequeño
function getPrecioMinimo(precios){

    return precios.reduce((a, b) => Math.min(a, b));
}
function getPrecioMaximo(precios){

    return precios.reduce((a, b) => Math.max(a, b));
}
//cambiar por fichero que haga peticiones acorde a la frecuencia de actualización de la API.
async function cargaDatos(){

    let respuesta =
        await axios.get('https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/');

    return respuesta.data;
}

