async function init(){

    let map = createMapa();
    L.Control.geocoder().addTo(map); //agrega botón de búsqueda
    let gasolineras = await cargaDatos();
    let precios = parsePreciosGasolineras(gasolineras);

    const precioMin = getPrecioMinimo(precios);
    const precioMax = getPrecioMaximo(precios);

    let markers = L.markerClusterGroup();

    for(let gasolinera of gasolineras.ListaEESSPrecio){
        let marker = addMarker(gasolinera, precioMin, precioMax); //posiciona el marcador
        addPopup(marker, gasolinera); //añade la información del marcador en click
        markers.addLayer(marker);
    }
    map.addLayer(markers);

}

function createMapa(){ //establece la vista inicial del mapa y establece el proveedor de 'tile layers'
    let map = L.map('map').setView([40.416607, -3.703836], 12);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
         maxZoom: 19,
         attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
     }).addTo(map);

    return map;

}
function addMarker(gasolinera, precioMin, precioMax){
    let latitud = gasolinera['Latitud'].replace(',', '.');
    let longitud = gasolinera['Longitud (WGS84)'].replace(',', '.');
    let precioActual = gasolinera['Precio Gasoleo A'].replace(',', '.');

    const maximoEscala = 5;

    precioActual = (precioActual == '') ? precioMax : parseFloat(precioActual);
    let posicionEnEscala = Math.round((precioActual-precioMin)*maximoEscala/(precioMax-precioMin))

    const icono = L.icon({
        iconUrl: `src/icons/marker-${posicionEnEscala}.png`,
        iconSize: [24, 36],
        popupAnchor: [0, -17]
    })

    return L.marker([latitud, longitud], {icon: icono});
}

function addPopup(marker, gasolinera){

    let gasolineraNombre = gasolinera['Rótulo'];
    let precioGasoleoA = gasolinera['Precio Gasoleo A'];
    let precioGasoleoB = gasolinera['Precio Gasoleo B'];
    let precioGasolina95 = gasolinera['Precio Gasolina 95 E5'];
    let precioGasolina98 = gasolinera['Precio Gasolina 98 E5'];

    if(!precioGasoleoB)
        precioGasoleoB = '-'
    if(!precioGasolina98)
        precioGasolina98 = '-'

    marker.bindPopup(
        `<div class="popup">
                            <p class="empresa">${gasolineraNombre}</p>
                            <p class="precios">PRECIOS</p>
                            <ul>
                                <li>Gasoleo A: ${precioGasoleoA} €/litro</li>
                                <li>Gasoleo B: ${precioGasoleoB} €/litro</li>
                                <li>Gasolina 95 E5: ${precioGasolina95} €/litro</li>
                                <li>Gasolina 98 E5: ${precioGasolina98} €/litro</li>
                            </ul>
                         </div>`
    );
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
//escala los datos de las gasolineras del 1 al 7, correspondiéndose con los iconos de precios
// function asignaValorEscala(precio)
//cambiar por fichero que haga peticiones acorde a la frecuencia de actualización de la API.
async function cargaDatos(){

    let respuesta =
        await axios.get('https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/');

    return respuesta.data;
}

