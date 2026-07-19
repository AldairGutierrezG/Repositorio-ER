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
  const contenedor = document.getElementById("lista-asignaturas");
  const estado = document.getElementById("estado");

  const activas = asignaturas.filter(asignatura =>
    estaActivo(valor(asignatura, "activa"))
  );

  estado.remove();

  if(!activas.length){
    contenedor.innerHTML = `
      <div class="mensaje">
        <h2>No hay asignaturas disponibles</h2>
        <p>Activa al menos una asignatura desde Google Sheets.</p>
      </div>
    `;
    return;
  }

  activas.forEach(asignatura => {
    const id = valor(asignatura, "id_asignatura");
    const nombre = valor(asignatura, "nombre") || "Asignatura";
    const icono = valor(asignatura, "icono") || "📚";
    const descripcion =
      valor(asignatura, "descripcion") ||
      "Consulta los materiales y recursos de esta asignatura.";

    const tarjeta = document.createElement("a");
    tarjeta.className = "tarjeta-asignatura";
    tarjeta.href = `asignatura.html?id=${encodeURIComponent(id)}`;

    tarjeta.innerHTML = `
      <span class="icono-asignatura">${escaparHTML(icono)}</span>
      <h3>${escaparHTML(nombre)}</h3>
      <p>${escaparHTML(descripcion)}</p>
      <span class="accion-tarjeta">Entrar a la asignatura →</span>
    `;

    contenedor.appendChild(tarjeta);
  });
}

/* =========================================================
   PÁGINA DE ASIGNATURA
   ========================================================= */

async function cargarPaginaAsignatura(){
  const parametros = new URLSearchParams(window.location.search);
  const idAsignatura = parametros.get("id");

  if(!idAsignatura){
    throw new Error("No se indicó la asignatura.");
  }

  const [asignaturas, unidades, recursos] = await Promise.all([
    cargarCSV(URL_ASIGNATURAS),
    cargarCSV(URL_UNIDADES),
    cargarCSV(URL_RECURSOS)
  ]);

  const asignatura = asignaturas.find(item =>
    normalizar(valor(item, "id_asignatura")) === normalizar(idAsignatura)
  );

  if(!asignatura){
    mostrarError("La asignatura solicitada no existe o fue eliminada.");
    return;
  }

  configurarEncabezado(asignatura);

  const unidadesAsignatura = unidades
    .filter(unidad =>
      normalizar(valor(unidad, "asignatura")) === normalizar(idAsignatura)
    )
    .sort((a, b) => numero(valor(a, "orden")) - numero(valor(b, "orden")));

  crearMenuUnidades(unidadesAsignatura, recursos);

  const estado = document.getElementById("estado");
  if(estado) estado.remove();

  mostrarPortadaAsignatura(asignatura, unidadesAsignatura);
}

function configurarEncabezado(asignatura){
  const nombre = valor(asignatura, "nombre") || "Asignatura";
  const docente = valor(asignatura, "docente") || "Repositorio académico";
  const icono = valor(asignatura, "icono") || "📚";

  document.title = `${nombre} | Repositorio`;
  document.getElementById("nombre-asignatura").textContent = nombre;
  document.getElementById("docente-asignatura").textContent = docente;
  document.getElementById("icono-asignatura").textContent = icono;
}

function crearMenuUnidades(unidades, recursos){
  const menu = document.getElementById("menu-unidades");
  menu.innerHTML = "";

  if(!unidades.length){
    menu.innerHTML = "<p>No hay unidades registradas.</p>";
    return;
  }

  unidades.forEach(unidad => {
    const boton = document.createElement("button");
    const activa = estaActivo(valor(unidad, "activa"));
    const nombre = valor(unidad, "nombre") || "Unidad";

    boton.type = "button";
    boton.className = activa
      ? "boton-unidad activa"
      : "boton-unidad bloqueada";

    boton.textContent = activa ? nombre : `${nombre} 🔒`;

    boton.addEventListener("click", () => {
      if(activa){
        mostrarUnidad(unidad, recursos);
      }else{
        mostrarUnidadBloqueada(nombre);
      }
    });

    menu.appendChild(boton);
  });
}

function mostrarPortadaAsignatura(asignatura, unidades){
  const visualizador = document.getElementById("visualizador");
  const nombre = valor(asignatura, "nombre") || "Asignatura";
  const descripcion =
    valor(asignatura, "descripcion") ||
    "Selecciona una unidad para consultar sus materiales.";
  const disponibles = unidades.filter(unidad =>
    estaActivo(valor(unidad, "activa"))
  ).length;

  visualizador.innerHTML = `
    <section class="portada-asignatura">
      <h2>${escaparHTML(nombre)}</h2>
      <p>${escaparHTML(descripcion)}</p>
      <p>
        <strong>${disponibles}</strong>
        ${disponibles === 1 ? "unidad disponible" : "unidades disponibles"}.
      </p>
    </section>
  `;
}

function mostrarUnidad(unidad, todosLosRecursos){
  const visualizador = document.getElementById("visualizador");
  const idUnidad = valor(unidad, "id_unidad");
  const nombre = valor(unidad, "nombre") || "Unidad";

  const recursos = todosLosRecursos
    .filter(recurso =>
      normalizar(valor(recurso, "id_unidad")) === normalizar(idUnidad)
    )
    .sort((a, b) => numero(valor(a, "orden")) - numero(valor(b, "orden")));

  let contenido = `<h1 class="titulo-unidad">${escaparHTML(nombre)}</h1>`;

  if(!recursos.length){
    contenido += `
      <div class="mensaje">
        <h2>Sin materiales</h2>
        <p>Esta unidad todavía no tiene recursos registrados.</p>
      </div>
    `;
  }else{
    recursos.forEach(recurso => {
      contenido += crearBloqueRecurso(recurso);
    });
  }

  visualizador.innerHTML = contenido;
  window.scrollTo({top:0, behavior:"smooth"});
}

function mostrarUnidadBloqueada(nombre){
  const visualizador = document.getElementById("visualizador");

  visualizador.innerHTML = `
    <div class="mensaje">
      <h2>${escaparHTML(nombre)} 🔒</h2>
      <p>Esta unidad estará disponible cuando el docente la active.</p>
    </div>
  `;
}

/* =========================================================
   RECURSOS
   ========================================================= */

function crearBloqueRecurso(recurso){
  const titulo = valor(recurso, "titulo") || "Recurso";
  const tipo = normalizar(valor(recurso, "tipo"));
  const url = obtenerURLRecurso(recurso, tipo);
  const icono = iconoRecurso(tipo);

  if(!url){
    return `
      <section class="bloque-material">
        <h2>${icono} ${escaparHTML(titulo)}</h2>
        <div class="recurso-enlace">
          <p>Este recurso no tiene una URL válida en Google Sheets.</p>
        </div>
      </section>
    `;
  }

  if(["presentacion", "pdf", "video"].includes(tipo)){
    return `
      <section class="bloque-material">
        <h2>${icono} ${escaparHTML(titulo)}</h2>
        <iframe
          class="recurso-iframe"
          src="${escaparAtributo(url)}"
          loading="lazy"
          allowfullscreen>
        </iframe>
      </section>
    `;
  }

  const texto =
    tipo === "galeria"
      ? "Abrir carpeta o galería de fotografías"
      : "Abrir recurso";

  return `
    <section class="bloque-material">
      <h2>${icono} ${escaparHTML(titulo)}</h2>
      <div class="recurso-enlace">
        <p>Este contenido se abre en una nueva pestaña.</p>
        <a
          class="boton-recurso"
          href="${escaparAtributo(url)}"
          target="_blank"
          rel="noopener noreferrer">
          ${texto}
        </a>
      </div>
    </section>
  `;
}

function obtenerURLRecurso(recurso, tipo){
  const urlRegistrada = valor(recurso, "url");
  const codigo =
    valor(recurso, "codigo") ||
    valor(recurso, "código") ||
    valor(recurso, "id_drive");

  if(urlRegistrada && /^https?:\/\//i.test(urlRegistrada)){
    return convertirURLParaVista(urlRegistrada, tipo);
  }

  if(!codigo){
    return "";
  }

  if(/^https?:\/\//i.test(codigo)){
    return convertirURLParaVista(codigo, tipo);
  }

  if(tipo === "presentacion"){
    return `https://docs.google.com/presentation/d/e/${codigo}/pubembed?start=false&loop=false&delayms=5000`;
  }

  if(tipo === "pdf" || tipo === "video"){
    return `https://drive.google.com/file/d/${codigo}/preview`;
  }

  if(tipo === "galeria"){
    return `https://drive.google.com/drive/folders/${codigo}`;
  }

  return codigo;
}

function convertirURLParaVista(url, tipo){
  if(tipo === "presentacion"){
    return url
      .replace("/pub?", "/pubembed?")
      .replace("/edit", "/preview");
  }

  if((tipo === "pdf" || tipo === "video") &&
     url.includes("drive.google.com/file/d/")){
    const coincidencia = url.match(/\/file\/d\/([^/]+)/);
    if(coincidencia){
      return `https://drive.google.com/file/d/${coincidencia[1]}/preview`;
    }
  }

  return url;
}

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

  return iconos[tipo] || "📁";
}

/* =========================================================
   CSV
   ========================================================= */

async function cargarCSV(url){
  const respuesta = await fetch(`${url}&t=${Date.now()}`, {
    cache:"no-store"
  });

  if(!respuesta.ok){
    throw new Error(`Error HTTP ${respuesta.status}`);
  }

  const texto = await respuesta.text();
  return convertirCSVaObjetos(texto);
}

function convertirCSVaObjetos(texto){
  const filas = parsearCSV(texto);

  if(!filas.length){
    return [];
  }

  const encabezados = filas[0].map(encabezado =>
    normalizarClave(encabezado)
  );

  return filas
    .slice(1)
    .filter(fila => fila.some(celda => String(celda).trim() !== ""))
    .map(fila => {
      const objeto = {};

      encabezados.forEach((encabezado, indice) => {
        objeto[encabezado] = (fila[indice] || "").trim();
      });

      return objeto;
    });
}

function parsearCSV(texto){
  const filas = [];
  let fila = [];
  let campo = "";
  let entreComillas = false;

  for(let i = 0; i < texto.length; i++){
    const caracter = texto[i];
    const siguiente = texto[i + 1];

    if(caracter === '"'){
      if(entreComillas && siguiente === '"'){
        campo += '"';
        i++;
      }else{
        entreComillas = !entreComillas;
      }
    }else if(caracter === "," && !entreComillas){
      fila.push(campo);
      campo = "";
    }else if((caracter === "\n" || caracter === "\r") && !entreComillas){
      if(caracter === "\r" && siguiente === "\n"){
        i++;
      }

      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    }else{
      campo += caracter;
    }
  }

  if(campo.length || fila.length){
    fila.push(campo);
    filas.push(fila);
  }

  return filas;
}

/* =========================================================
   UTILIDADES
   ========================================================= */

function valor(objeto, clave){
  return objeto[normalizarClave(clave)] || "";
}

function normalizarClave(texto){
  return normalizar(texto).replace(/\s+/g, "_");
}

function normalizar(texto){
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function estaActivo(valorCelda){
  return ["si", "sí", "true", "1", "activo", "activa"]
    .includes(normalizar(valorCelda));
}

function numero(valorCelda){
  const resultado = Number(valorCelda);
  return Number.isFinite(resultado) ? resultado : 9999;
}

function escaparHTML(texto){
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escaparAtributo(texto){
  return escaparHTML(texto);
}

function mostrarError(mensaje){
  const estado = document.getElementById("estado");
  const visualizador = document.getElementById("visualizador");

  const contenido = `
    <div class="estado estado-error">
      <strong>Error de carga</strong>
      <p>${escaparHTML(mensaje)}</p>
    </div>
  `;

  if(estado){
    estado.outerHTML = contenido;
  }else if(visualizador){
    visualizador.innerHTML = contenido;
  }
}
