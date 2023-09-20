let globals = {
    router: {},
    defaultLocation: { latitude : 40.416607, lng: -3.703836}, //Madrid
    userLocation: null, //revisar si esta propiedad debería eliminarse, y simplemente llamar a la funcion loadUbicacion
}

async function init(){

    const map = createMapa();

    loadUbicacion(map);

    L.Control.geocoder().addTo(map); //agrega botón de búsqueda

    let gasolineras = await cargaDatos();

    let markers = L.markerClusterGroup({
        maxClusterRadius: 130, //distancia a la que se forman los clusters, default 80
        disableClusteringAtZoom: 13, //distancia de zoom a la que se desactivan los clusters
    });

    globals.router = createRouteControl();

    for(let i = 0; i < gasolineras.length; i++){
        let marker = addMarker(gasolineras[i], i, gasolineras.length)
        addPopup(map, marker, gasolineras[i]); //añade la información del marcador en click
        markers.addLayer(marker);
    }
    map.addLayer(markers);


}

function loadUbicacion(map){

        navigator
            .geolocation
            .getCurrentPosition(position => {
                globals.userLocation = position.coords;
                map.flyTo([globals.userLocation.latitude, globals.userLocation.longitude], 12);
            },
            error => {
                alert('No se ha podido acceder a la ubicación.');
                globals.userLocation = globals.defaultLocation;
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
}

function createMapa(){ //establece la vista inicial del mapa y establece el proveedor de 'tile layers'
    let map = L.map('map').setView([globals.defaultLocation.latitude, globals.defaultLocation.lng], 12);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
         maxZoom: 19,
         attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
     }).addTo(map);

    return map;

}

function createRouteControl(){
    return L.Routing.control({ //ver que devuelve esto y gestionar su borrado al añadir otra ruta
        language: 'es',
        addWaypoints: false,
        // lineOptions: {
        //     styles: [{color: 'blue'}]
        // }
    });
}

// function markerPunto(){
//
// }

function addMarker(gasolinera, index, arrayLength){

    const maximoEscala = 5; //6 colores - 1 al empezar de 0
    let posicionEnEscala = Math.round((index/arrayLength)*maximoEscala); //cálculo percentiles llevado a 6 colores

    const icono = L.icon({
        iconUrl: `src/icons/marker-${posicionEnEscala}.png`,
        iconSize: [24, 36],
        popupAnchor: [0, -17]
    });

    let latitud = gasolinera['Latitud'].replace(',', '.');
    let longitud = gasolinera['Longitud (WGS84)'].replace(',', '.');

    let marker = L.marker([latitud, longitud], {icon: icono});

    //marker.on('click', markerPunto); //revisar

    return marker;
}

function addPopup(map, marker, gasolinera){

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

    contenido.addEventListener('click', e => comoLlegar(e, map, marker));
    marker.bindPopup(contenido);

}

function comoLlegar(e, map, marker){ //funcionalidad del botón "como llegar"

    if(e.target.classList.contains('boton-como-llegar')){
        createRuta(globals.userLocation, map, marker);
    }
}

function createRuta(pos, map, marker){
    let router = globals.router;
    router.addTo(map);
    addBotonCancelarRuta(map, router);

    let estacionLat = marker._latlng.lat;
    let estacionLng = marker._latlng.lng;
    // let userLat = pos.latitude;
    // let userLng = pos.longitude;
    router.setWaypoints([L.latLng(estacionLat, estacionLng), L.latLng(globals.userLocation.latitude, globals.userLocation.longitude)]); //segundo waypoint ha de ser localización de usuario.
}

function addBotonCancelarRuta(map, router){
    let botonCancelarRuta = document.getElementsByClassName('boton-cancelar-ruta')[0];
    botonCancelarRuta.removeAttribute('hidden');
    botonCancelarRuta.addEventListener('click', () => {
        map.removeControl(router);
        botonCancelarRuta.setAttribute('hidden', true);
    })
}

function parsePreciosGasolineras(gasolineras){
    return gasolineras.ListaEESSPrecio.filter((gasolinera) => gasolinera['Precio Gasoleo A'] !== '')
        .map((gasolinera) => parseFloat(gasolinera['Precio Gasoleo A'].replace(',','.')));
}

//cambiar por fichero que haga peticiones acorde a la frecuencia de actualización de la API.
async function cargaDatos(){

    let respuesta =
        await fetch('./src/data/gas_stations.json')
            .then(response => response.json());

    return respuesta;
}

//pasar todo a inglés