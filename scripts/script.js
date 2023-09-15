let globals = {
    router: {}
}

async function init(){

    let map = createMapa();
    L.Control.geocoder().addTo(map); //agrega botón de búsqueda
    let gasolineras = await cargaDatos();

    let markers = L.markerClusterGroup({
        maxClusterRadius: 130, //distancia a la que se forman los clusters, default 80
        disableClusteringAtZoom: 13, //distancia de zoom a la que se desactivan los clusters
    });

    globals.router = createRouteControl();
    for(let i = 0; i < gasolineras.length; i++){
        //let marker = addMarker(gasolinera, precioMin, precioMax); //posiciona el marcador
        let marker = addMarker(gasolineras[i], i, gasolineras.length)
        addPopup(map, marker, gasolineras[i]); //añade la información del marcador en click
        markers.addLayer(marker);
    }
    map.addLayer(markers);
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

function createRouteControl(){
    return L.Routing.control({ //ver que devuelve esto y gestionar su borrado al añadir otra ruta
        language: 'es',
        addWaypoints: false,
        // lineOptions: {
        //     styles: [{color: 'blue'}]
        // }
    });
}
function markerPunto(e){

}
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

    marker.on('click', markerPunto);

    return marker;
}

function addPopup(map, marker, gasolinera, routeControl){

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

function comoLlegar(e, map, marker){

    if(e.target.classList.contains('boton-como-llegar')) {
        let router = globals.router;
        router.addTo(map)
        let lat = marker._latlng.lat;
        let lng = marker._latlng.lng;
        addBotonCancelarRuta(map, router);
        router.setWaypoints([L.latLng(lat, lng), L.latLng(40.1, -3.4)]);
    }
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
        await fetch('./src/data/gas_stations.json')
            .then(response => response.json());


    return sort(respuesta['ListaEESSPrecio']);
}

function sort(datosGasolineras){ //función provisional -- el sorting debería hacerse desde fuera del archivo. el parseo también debe ir fuera de este script


    datosGasolineras = datosGasolineras.filter((gasolinera) => gasolinera['Precio Gasoleo A'] !== '')
        .map((gasolinera) => (
            {
                ...gasolinera,
                'Precio Gasoleo A': parseFloat(gasolinera['Precio Gasoleo A'].replace(',','.'))
            }
    ));

    datosGasolineras.sort((gasolineraA, gasolineraB) => {
        let precioA = gasolineraA['Precio Gasoleo A'];
        let precioB = gasolineraB['Precio Gasoleo A'];

        return precioA - precioB;
    })

    return datosGasolineras;
}
