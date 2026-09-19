/* =========================================================
   CONFIGURACIÓN: Google Sheets publicado como CSV
   ========================================================= */

const URL_ASIGNATURAS =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTCJm1TOqrzCon5lYg2pRU8mYxRP9wdSiHXQWTiU8OT0SZuuIAEdKLhahDjwiqwZqbfuFr5YKQW5jpJ/pub?gid=2062559691&single=true&output=csv";

const URL_UNIDADES =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTCJm1TOqrzCon5lYg2pRU8mYxRP9wdSiHXQWTiU8OT0SZuuIAEdKLhahDjwiqwZqbfuFr5YKQW5jpJ/pub?gid=0&single=true&output=csv";

const URL_RECURSOS =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTCJm1TOqrzCon5lYg2pRU8mYxRP9wdSiHXQWTiU8OT0SZuuIAEdKLhahDjwiqwZqbfuFr5YKQW5jpJ/pub?gid=929750242&single=true&output=csv";


/* =========================================================
   GOOGLE APPS SCRIPT
   Se utiliza para obtener las fotografías de Google Drive
   ========================================================= */

const URL_APPS_SCRIPT =
  "https://script.google.com/macros/s/AKfycbwf7FzEdHZ-g5nOYQ4WJn4jL4KbU5IQfEC_xDCVd0Ts0e-TrpZJGLXmtQf5ZYpUtefB/exec";


/* =========================================================
   VARIABLES DE GALERÍA
   ========================================================= */

let galeriasPendientes = [];
let contadorGalerias = 0;


/* =========================================================
   INICIO DE LA APLICACIÓN
   ========================================================= */

document.addEventListener("DOMContentLoaded", iniciarAplicacion);


async function iniciarAplicacion(){

  const pagina = document.body.dataset.pagina;

  try{

    if(pagina === "inicio"){
      await cargarPaginaInicio();
    }

    if(pagina === "asignatura"){
      await cargarPaginaAsignatura();
    }

  }catch(error){

    console.error(error);

    mostrarError(
      "No fue posible cargar la información desde Google Sheets. " +
      "Verifica que las pestañas sigan publicadas en la web."
    );

  }

}


/* =========================================================
   PÁGINA PRINCIPAL
   ========================================================= */

async function cargarPaginaInicio(){

  const asignaturas = await cargarCSV(URL_ASIGNATURAS);

  const contenedor =
    document.getElementById("lista-asignaturas");

  const estado =
    document.getElementById("estado");


  const activas = asignaturas.filter(asignatura =>
    estaActivo(valor(asignatura, "activa"))
  );


  if(estado){
    estado.remove();
  }


  if(!activas.length){

    contenedor.innerHTML = `
      <div class="mensaje">
        <h2>No hay asignaturas disponibles</h2>
        <p>
          Activa al menos una asignatura desde Google Sheets.
        </p>
      </div>
    `;

    return;
  }


  activas.forEach(asignatura => {

    const id =
      valor(asignatura, "id_asignatura");

    const nombre =
      valor(asignatura, "nombre") ||
      "Asignatura";

    const icono =
      valor(asignatura, "icono") ||
      "📚";

    const descripcion =
      valor(asignatura, "descripcion") ||
      "Consulta los materiales y recursos de esta asignatura.";


    const tarjeta =
      document.createElement("a");


    tarjeta.className =
      "tarjeta-asignatura";


    tarjeta.href =
      `asignatura.html?id=${encodeURIComponent(id)}`;


    tarjeta.innerHTML = `

      <span class="icono-asignatura">
        ${escaparHTML(icono)}
      </span>

      <h3>
        ${escaparHTML(nombre)}
      </h3>

      <p>
        ${escaparHTML(descripcion)}
      </p>

      <span class="accion-tarjeta">
        Entrar a la asignatura →
      </span>

    `;


    contenedor.appendChild(tarjeta);

  });

}


/* =========================================================
   PÁGINA DE ASIGNATURA
   ========================================================= */

async function cargarPaginaAsignatura(){

  const parametros =
    new URLSearchParams(window.location.search);

  const idAsignatura =
    parametros.get("id");


  if(!idAsignatura){

    throw new Error(
      "No se indicó la asignatura."
    );

  }


  const [
    asignaturas,
    unidades,
    recursos
  ] = await Promise.all([

    cargarCSV(URL_ASIGNATURAS),
    cargarCSV(URL_UNIDADES),
    cargarCSV(URL_RECURSOS)

  ]);


  const asignatura =
    asignaturas.find(item =>
      normalizar(
        valor(item, "id_asignatura")
      ) === normalizar(idAsignatura)
    );


  if(!asignatura){

    mostrarError(
      "La asignatura solicitada no existe o fue eliminada."
    );

    return;

  }


  configurarEncabezado(asignatura);


  const unidadesAsignatura =
    unidades
      .filter(unidad =>
        normalizar(
          valor(unidad, "asignatura")
        ) === normalizar(idAsignatura)
      )
      .sort(
        (a,b) =>
          numero(valor(a, "orden")) -
          numero(valor(b, "orden"))
      );


  crearMenuUnidades(
    unidadesAsignatura,
    recursos
  );


  const estado =
    document.getElementById("estado");


  if(estado){
    estado.remove();
  }


  mostrarPortadaAsignatura(
    asignatura,
    unidadesAsignatura
  );

}


/* =========================================================
   ENCABEZADO
   ========================================================= */

function configurarEncabezado(asignatura){

  const nombre =
    valor(asignatura, "nombre") ||
    "Asignatura";

  const docente =
    valor(asignatura, "docente") ||
    "Repositorio académico";

  const icono =
    valor(asignatura, "icono") ||
    "📚";


  document.title =
    `${nombre} | Repositorio`;


  const elementoNombre =
    document.getElementById(
      "nombre-asignatura"
    );

  if(elementoNombre){
    elementoNombre.textContent =
      nombre;
  }


  const elementoDocente =
    document.getElementById(
      "docente-asignatura"
    );

  if(elementoDocente){
    elementoDocente.textContent =
      docente;
  }


  const elementoIcono =
    document.getElementById(
      "icono-asignatura"
    );

  if(elementoIcono){
    elementoIcono.textContent =
      icono;
  }

}


/* =========================================================
   MENÚ DE UNIDADES
   ========================================================= */

function crearMenuUnidades(
  unidades,
  recursos
){

  const menu =
    document.getElementById(
      "menu-unidades"
    );


  menu.innerHTML = "";


  if(!unidades.length){

    menu.innerHTML =
      "<p>No hay unidades registradas.</p>";

    return;
  }


  unidades.forEach(unidad => {

    const boton =
      document.createElement("button");


    const activa =
      estaActivo(
        valor(unidad, "activa")
      );


    const nombre =
      valor(unidad, "nombre") ||
      "Unidad";


    boton.type =
      "button";


    boton.className =
      activa
        ? "boton-unidad activa"
        : "boton-unidad bloqueada";


    boton.textContent =
      activa
        ? nombre
        : `${nombre} 🔒`;


    boton.addEventListener(
      "click",
      () => {

        if(activa){

          mostrarUnidad(
            unidad,
            recursos
          );

        }else{

          mostrarUnidadBloqueada(
            nombre
          );

        }

      }
    );


    menu.appendChild(boton);

  });

}


/* =========================================================
   PORTADA DE ASIGNATURA
   ========================================================= */

function mostrarPortadaAsignatura(
  asignatura,
  unidades
){

  const visualizador =
    document.getElementById(
      "visualizador"
    );


  const nombre =
    valor(asignatura, "nombre") ||
    "Asignatura";


  const descripcion =
    valor(asignatura, "descripcion") ||
    "Selecciona una unidad para consultar sus materiales.";


  const disponibles =
    unidades.filter(unidad =>
      estaActivo(
        valor(unidad, "activa")
      )
    ).length;


  visualizador.innerHTML = `

    <section class="portada-asignatura">

      <h2>
        ${escaparHTML(nombre)}
      </h2>

      <p>
        ${escaparHTML(descripcion)}
      </p>

      <p>

        <strong>
          ${disponibles}
        </strong>

        ${
          disponibles === 1
            ? "unidad disponible"
            : "unidades disponibles"
        }.

      </p>

    </section>

  `;

}


/* =========================================================
   MOSTRAR UNIDAD
   ========================================================= */

function mostrarUnidad(
  unidad,
  todosLosRecursos
){

  const visualizador =
    document.getElementById(
      "visualizador"
    );


  /*

     IMPORTANTE:

     Limpiamos las galerías pendientes
     de la unidad anterior.

  */

  galeriasPendientes = [];


  const idUnidad =
    valor(
      unidad,
      "id_unidad"
    );


  const nombre =
    valor(
      unidad,
      "nombre"
    ) || "Unidad";


  const recursos =
    todosLosRecursos

      .filter(recurso =>
        normalizar(
          valor(
            recurso,
            "id_unidad"
          )
        ) ===
        normalizar(idUnidad)
      )

      .sort(
        (a,b) =>
          numero(
            valor(a, "orden")
          ) -
          numero(
            valor(b, "orden")
          )
      );


  let contenido = `

    <h1 class="titulo-unidad">
      ${escaparHTML(nombre)}
    </h1>

  `;


  if(!recursos.length){

    contenido += `

      <div class="mensaje">

        <h2>
          Sin materiales
        </h2>

        <p>
          Esta unidad todavía no tiene
          recursos registrados.
        </p>

      </div>

    `;

  }else{

    recursos.forEach(recurso => {

      contenido +=
        crearBloqueRecurso(
          recurso
        );

    });

  }


  visualizador.innerHTML =
    contenido;


  /*
     Una vez que el HTML de las galerías
     ya está en pantalla, las cargamos.
  */

  cargarGaleriasPendientes();


  window.scrollTo({
    top:0,
    behavior:"smooth"
  });

}


/* =========================================================
   UNIDAD BLOQUEADA
   ========================================================= */

function mostrarUnidadBloqueada(nombre){

  const visualizador =
    document.getElementById(
      "visualizador"
    );


  visualizador.innerHTML = `

    <div class="mensaje">

      <h2>
        ${escaparHTML(nombre)} 🔒
      </h2>

      <p>
        Esta unidad estará disponible
        cuando el docente la active.
      </p>

    </div>

  `;

}


/* =========================================================
   RECURSOS
   ========================================================= */

function crearBloqueRecurso(
  recurso
){

  const titulo =
    valor(
      recurso,
      "titulo"
    ) || "Recurso";


  const tipo =
    normalizar(
      valor(
        recurso,
        "tipo"
      )
    );


  const url =
    obtenerURLRecurso(
      recurso,
      tipo
    );


  const icono =
    iconoRecurso(tipo);


  /* =====================================================
     GALERÍA
     ===================================================== */

  if(tipo === "galeria"){

    const carpetaId =

      valor(
        recurso,
        "codigo"
      ) ||

      valor(
        recurso,
        "código"
      ) ||

      valor(
        recurso,
        "id_drive"
      );


    if(!carpetaId){

      return `

        <section class="bloque-material">

          <h2>
            ${icono}
            ${escaparHTML(titulo)}
          </h2>


          <div class="galeria">

            <div class="galeria-cargando">

              Esta galería no tiene
              un ID de carpeta válido.

            </div>

          </div>

        </section>

      `;

    }


    const idGaleria =
      generarIdGaleria();


    /*
       Guardamos esta galería para
       cargarla después de insertar
       el HTML.
    */

    galeriasPendientes.push({

      id: idGaleria,

      carpetaId: carpetaId

    });


    return `

      <section class="bloque-material">

        <h2>
          ${icono}
          ${escaparHTML(titulo)}
        </h2>


        <div

          class="galeria"

          id="${escaparAtributo(idGaleria)}"

          data-carpeta="${escaparAtributo(carpetaId)}"

        >

          <div class="galeria-cargando">

            Cargando fotografías...

          </div>

        </div>

      </section>

    `;

  }


  /* =====================================================
     RECURSO SIN URL
     ===================================================== */

  if(!url){

    return `

      <section class="bloque-material">

        <h2>
          ${icono}
          ${escaparHTML(titulo)}
        </h2>


        <div class="recurso-enlace">

          <p>
            Este recurso no tiene
            una URL válida en Google Sheets.
          </p>

        </div>

      </section>

    `;

  }


  /* =====================================================
     PRESENTACIÓN / PDF / VIDEO
     ===================================================== */

  if(

    [
      "presentacion",
      "pdf",
      "video"

    ].includes(tipo)

  ){

    return `

      <section class="bloque-material">

        <h2>
          ${icono}
          ${escaparHTML(titulo)}
        </h2>


        <iframe

          class="recurso-iframe"

          src="${escaparAtributo(url)}"

          loading="lazy"

          allowfullscreen>

        </iframe>

      </section>

    `;

  }


  /* =====================================================
     OTROS RECURSOS
     ===================================================== */

  return `

    <section class="bloque-material">

      <h2>
        ${icono}
        ${escaparHTML(titulo)}
      </h2>


      <div class="recurso-enlace">

        <p>
          Este contenido se abre
          en una nueva pestaña.
        </p>


        <a

          class="boton-recurso"

          href="${escaparAtributo(url)}"

          target="_blank"

          rel="noopener noreferrer">

          Abrir recurso

        </a>

      </div>

    </section>

  `;

}


/* =========================================================
   GALERÍA: GENERAR ID
   ========================================================= */

function generarIdGaleria(){

  contadorGalerias++;

  return `

    galeria-

    ${Date.now()}

    -

    ${contadorGalerias}

  `

    .replace(/\s+/g,"");

}


/* =========================================================
   GALERÍA: CARGAR TODAS
   ========================================================= */

function cargarGaleriasPendientes(){

  const pendientes =
    galeriasPendientes;


  galeriasPendientes = [];


  pendientes.forEach(
    galeria => {

      cargarGaleria(

        galeria.id,

        galeria.carpetaId

      );

    }
  );

}


/* =========================================================
   GALERÍA: CONSULTAR APPS SCRIPT
   ========================================================= */

async function cargarGaleria(
  contenedorId,
  carpetaId
){

  const contenedor =
    document.getElementById(
      contenedorId
    );


  if(!contenedor){
    return;
  }


  try{

    const respuesta =
      await fetch(

        `${URL_APPS_SCRIPT}` +

        `?folder=${encodeURIComponent(carpetaId)}` +

        `&t=${Date.now()}`,

        {
          cache:"no-store"
        }

      );


    if(!respuesta.ok){

      throw new Error(
        "No fue posible consultar la carpeta."
      );

    }


    const imagenes =
      await respuesta.json();


    if(imagenes.error){

      throw new Error(
        imagenes.error
      );

    }


    if(

      !Array.isArray(imagenes) ||

      !imagenes.length

    ){

      contenedor.innerHTML = `

        <div class="galeria-cargando">

          Esta carpeta todavía
          no contiene fotografías.

        </div>

      `;

      return;

    }


    crearCarrusel(
      contenedor,
      imagenes
    );


  }catch(error){

    console.error(
      "Error al cargar galería:",
      error
    );


    contenedor.innerHTML = `

      <div class="galeria-cargando">

        <p>
          No se pudieron cargar
          las fotografías.
        </p>


        <small>
          ${escaparHTML(error.message)}
        </small>

      </div>

    `;

  }

}


/* =========================================================
   GALERÍA: CREAR CARRUSEL
   ========================================================= */

function crearCarrusel(
  contenedor,
  imagenes
){

  let posicion = 0;


  contenedor.innerHTML = `

    <div class="galeria-nombre"></div>


    <button

      type="button"

      class="galeria-boton
             galeria-anterior"

      aria-label="Fotografía anterior">

      &#10094;

    </button>


    <img

      class="galeria-imagen"

      alt="Fotografía o apunte de clase"

    >


    <button

      type="button"

      class="galeria-boton
             galeria-siguiente"

      aria-label="Fotografía siguiente">

      &#10095;

    </button>


    <div class="galeria-contador"></div>

  `;


  const imagen =
    contenedor.querySelector(
      ".galeria-imagen"
    );


  const nombre =
    contenedor.querySelector(
      ".galeria-nombre"
    );


  const contador =
    contenedor.querySelector(
      ".galeria-contador"
    );


  const anterior =
    contenedor.querySelector(
      ".galeria-anterior"
    );


  const siguiente =
    contenedor.querySelector(
      ".galeria-siguiente"
    );


  function mostrarImagen(){

    const elemento =
      imagenes[posicion];


    if(!elemento){
      return;
    }


    imagen.src =
      elemento.url || "";


    imagen.alt =
      elemento.nombre ||
      "Fotografía o apunte de clase";


    nombre.textContent =
      elemento.nombre ||
      "Fotografía o apunte de clase";


    contador.textContent =
      `${posicion + 1} de ${imagenes.length}`;

  }


  anterior.addEventListener(
    "click",
    () => {

      posicion--;


      if(posicion < 0){

        posicion =
          imagenes.length - 1;

      }


      mostrarImagen();

    }
  );


  siguiente.addEventListener(
    "click",
    () => {

      posicion++;


      if(
        posicion >=
        imagenes.length
      ){

        posicion = 0;

      }


      mostrarImagen();

    }
  );


  mostrarImagen();

}


/* =========================================================
   OBTENER URL DEL RECURSO
   ========================================================= */

function obtenerURLRecurso(
  recurso,
  tipo
){

  const urlRegistrada =
    valor(
      recurso,
      "url"
    );


  const codigo =

    valor(
      recurso,
      "codigo"
    ) ||

    valor(
      recurso,
      "código"
    ) ||

    valor(
      recurso,
      "id_drive"
    );


  if(

    urlRegistrada &&

    /^https?:\/\//i.test(
      urlRegistrada
    )

  ){

    return convertirURLParaVista(
      urlRegistrada,
      tipo
    );

  }


  if(!codigo){
    return "";
  }


  if(
    /^https?:\/\//i.test(codigo)
  ){

    return convertirURLParaVista(
      codigo,
      tipo
    );

  }


  if(tipo === "presentacion"){

    return `https://docs.google.com/presentation/d/e/${codigo}/pubembed?start=false&loop=false&delayms=5000`;

  }


  if(
    tipo === "pdf" ||
    tipo === "video"
  ){

    return `https://drive.google.com/file/d/${codigo}/preview`;

  }


  /*
     Para galería no necesitamos
     una URL de Drive.

     La carpeta será consultada
     directamente por Apps Script.
  */

  if(tipo === "galeria"){

    return codigo;

  }


  return codigo;

}


/* =========================================================
   CONVERTIR URL PARA VISTA
   ========================================================= */

function convertirURLParaVista(
  url,
  tipo
){

  if(tipo === "presentacion"){

    return url

      .replace(
        "/pub?",
        "/pubembed?"
      )

      .replace(
        "/edit",
        "/preview"
      );

  }


  if(

    (
      tipo === "pdf" ||
      tipo === "video"
    ) &&

    url.includes(
      "drive.google.com/file/d/"
    )

  ){

    const coincidencia =
      url.match(
        /\/file\/d\/([^/]+)/
      );


    if(coincidencia){

      return `https://drive.google.com/file/d/${coincidencia[1]}/preview`;

    }

  }


  return url;

}


/* =========================================================
   ICONOS
   ========================================================= */

function iconoRecurso(tipo){

  const iconos = {

    presentacion:"📊",

    pdf:"📕",

    video:"▶️",

    galeria:"📷",

    enlace:"🔗",

    actividad:"📝",

    imagen:"🖼️"

  };


  return (
    iconos[tipo] ||
    "📁"
  );

}


/* =========================================================
   ESTILOS DE LA GALERÍA
   =========================================================

   Se insertan desde app.js para que no tengas
   que modificar el CSS del HTML.

   ========================================================= */

function insertarEstilosGaleria(){

  if(
    document.getElementById(
      "estilos-galeria"
    )
  ){

    return;

  }


  const estilo =
    document.createElement(
      "style"
    );


  estilo.id =
    "estilos-galeria";


  estilo.textContent = `

    .galeria{

      position:relative;

      width:100%;

      min-height:500px;

      background:#111;

      border-radius:12px;

      overflow:hidden;

      display:flex;

      align-items:center;

      justify-content:center;

    }


    .galeria-imagen{

      display:block;

      width:100%;

      max-height:75vh;

      object-fit:contain;

      background:#111;

    }


    .galeria-boton{

      position:absolute;

      top:50%;

      transform:translateY(-50%);

      width:50px;

      height:60px;

      border:none;

      border-radius:8px;

      background:rgba(0,0,0,0.65);

      color:white;

      font-size:32px;

      cursor:pointer;

      z-index:2;

    }


    .galeria-boton:hover{

      background:
        rgba(0,51,102,0.9);

    }


    .galeria-anterior{

      left:15px;

    }


    .galeria-siguiente{

      right:15px;

    }


    .galeria-contador{

      position:absolute;

      bottom:15px;

      left:50%;

      transform:
        translateX(-50%);

      background:
        rgba(0,0,0,0.7);

      color:white;

      padding:8px 16px;

      border-radius:20px;

      font-size:14px;

      z-index:2;

    }


    .galeria-nombre{

      position:absolute;

      top:15px;

      left:50%;

      transform:
        translateX(-50%);

      max-width:80%;

      background:
        rgba(0,0,0,0.7);

      color:white;

      padding:8px 16px;

      border-radius:20px;

      text-align:center;

      z-index:2;

    }


    .galeria-cargando{

      color:white;

      font-size:18px;

      text-align:center;

      padding:40px;

    }


    @media(max-width:600px){

      .galeria{

        min-height:350px;

      }


      .galeria-boton{

        width:42px;

        height:52px;

        font-size:26px;

      }


      .galeria-anterior{

        left:5px;

      }


      .galeria-siguiente{

        right:5px;

      }


      .galeria-imagen{

        max-height:60vh;

      }


      .galeria-nombre{

        font-size:13px;

      }

    }

  `;


  document.head.appendChild(
    estilo
  );

}


/*
   Insertamos los estilos
   inmediatamente.
*/

insertarEstilosGaleria();


/* =========================================================
   CSV
   ========================================================= */

async function cargarCSV(url){

  const respuesta =
    await fetch(
      `${url}&t=${Date.now()}`,
      {
        cache:"no-store"
      }
    );


  if(!respuesta.ok){

    throw new Error(
      `Error HTTP ${respuesta.status}`
    );

  }


  const texto =
    await respuesta.text();


  return convertirCSVaObjetos(
    texto
  );

}


/* =========================================================
   CONVERTIR CSV A OBJETOS
   ========================================================= */

function convertirCSVaObjetos(
  texto
){

  const filas =
    parsearCSV(texto);


  if(!filas.length){
    return [];
  }


  const encabezados =
    filas[0].map(
      encabezado =>
        normalizarClave(
          encabezado
        )
    );


  return filas

    .slice(1)

    .filter(
      fila =>
        fila.some(
          celda =>
            String(celda)
              .trim() !== ""
        )
    )

    .map(fila => {

      const objeto = {};


      encabezados.forEach(
        (encabezado, indice) => {

          objeto[encabezado] =
            (
              fila[indice] || ""
            ).trim();

        }
      );


      return objeto;

    });

}


/* =========================================================
   PARSER CSV
   ========================================================= */

function parsearCSV(
  texto
){

  const filas = [];

  let fila = [];

  let campo = "";

  let entreComillas = false;


  for(
    let i = 0;
    i < texto.length;
    i++
  ){

    const caracter =
      texto[i];


    const siguiente =
      texto[i + 1];


    if(caracter === '"'){

      if(
        entreComillas &&
        siguiente === '"'
      ){

        campo += '"';

        i++;

      }else{

        entreComillas =
          !entreComillas;

      }


    }else if(

      caracter === "," &&
      !entreComillas

    ){

      fila.push(
        campo
      );

      campo = "";


    }else if(

      (
        caracter === "\n" ||
        caracter === "\r"
      ) &&

      !entreComillas

    ){

      if(

        caracter === "\r" &&
        siguiente === "\n"

      ){

        i++;

      }


      fila.push(
        campo
      );


      filas.push(
        fila
      );


      fila = [];

      campo = "";


    }else{

      campo += caracter;

    }

  }


  if(
    campo.length ||
    fila.length
  ){

    fila.push(
      campo
    );


    filas.push(
      fila
    );

  }


  return filas;

}


/* =========================================================
   UTILIDADES
   ========================================================= */

function valor(
  objeto,
  clave
){

  return (
    objeto[
      normalizarClave(clave)
    ] || ""
  );

}


/* =========================================================
   NORMALIZAR CLAVE
   ========================================================= */

function normalizarClave(
  texto
){

  return normalizar(
    texto
  ).replace(
    /\s+/g,
    "_"
  );

}


/* =========================================================
   NORMALIZAR TEXTO
   ========================================================= */

function normalizar(
  texto
){

  return String(
    texto || ""
  )

    .trim()

    .toLowerCase()

    .normalize("NFD")

    .replace(
      /[\u0300-\u036f]/g,
      ""
    );

}


/* =========================================================
   COMPROBAR ACTIVO
   ========================================================= */

function estaActivo(
  valorCelda
){

  return [

    "si",
    "sí",
    "true",
    "1",
    "activo",
    "activa"

  ].includes(
    normalizar(valorCelda)
  );

}


/* =========================================================
   CONVERTIR A NÚMERO
   ========================================================= */

function numero(
  valorCelda
){

  const resultado =
    Number(valorCelda);


  return Number.isFinite(
    resultado
  )

    ? resultado

    : 9999;

}


/* =========================================================
   ESCAPAR HTML
   ========================================================= */

function escaparHTML(
  texto
){

  return String(
    texto ?? ""
  )

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}


/* =========================================================
   ESCAPAR ATRIBUTO
   ========================================================= */

function escaparAtributo(
  texto
){

  return escaparHTML(
    texto
  );

}


/* =========================================================
   MOSTRAR ERROR
   ========================================================= */

function mostrarError(
  mensaje
){

  const estado =
    document.getElementById(
      "estado"
    );


  const visualizador =
    document.getElementById(
      "visualizador"
    );


  const contenido = `

    <div class="estado estado-error">

      <strong>
        Error de carga
      </strong>

      <p>
        ${escaparHTML(mensaje)}
      </p>

    </div>

  `;


  if(estado){

    estado.outerHTML =
      contenido;

  }else if(visualizador){

    visualizador.innerHTML =
      contenido;

  }

}
