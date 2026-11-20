import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AlertCircle,
  BookOpen,
  Building2,
  CheckCircle2,
  Circle,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Phone,
  RefreshCw,
  Save,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";

import { sessionGet } from "../../services/session";
import "./PerfilEstudiante.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

const MAX_PDF = 5 * 1024 * 1024;
const MAX_DESCRIPCION = 1000;
const MIN_DESCRIPCION = 50;

const perfilInicial = {
  carrera: "",
  semestre: "",
  descripcion: "",
  telefono: "",
  institucion: "",
};

// ========================================
// UTILIDADES
// ========================================

const obtenerToken = () => {
  const token = sessionGet("estudiante")?.token;

  if (!token) {
    throw new Error("Debes iniciar sesión como estudiante");
  }

  return token;
};

const iniciales = (nombre = "") =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() || "")
    .join("") || "?";

const formatearTamano = (bytes) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

// Revisar que el archivo sea realmente un PDF (no solo la extensión)
const validarPDF = async (archivo) => {
  if (!archivo.name.toLowerCase().endsWith(".pdf")) {
    return "Solo se permiten archivos PDF (.pdf).";
  }

  if (archivo.size === 0) {
    return "El archivo está vacío.";
  }

  if (archivo.size > MAX_PDF) {
    return `El PDF pesa ${formatearTamano(archivo.size)}; el máximo es 5 MB.`;
  }

  const inicio = await archivo.slice(0, 5).text();
  if (inicio !== "%PDF-") {
    return "El archivo no es un PDF válido. Exporta tu currículum como PDF e inténtalo de nuevo.";
  }

  return "";
};

// Validaciones del formulario (iguales a las del servidor)
const validarPerfil = (perfil) => {
  const errores = {};

  if (perfil.semestre !== "") {
    const semestre = Number(perfil.semestre);
    if (!Number.isInteger(semestre) || semestre < 1 || semestre > 15) {
      errores.semestre = "Escribe un semestre entre 1 y 15.";
    }
  }

  const telefono = perfil.telefono.replace(/\D/g, "");
  if (perfil.telefono.trim() && telefono.length !== 10) {
    errores.telefono = "El teléfono debe tener 10 dígitos.";
  }

  if (perfil.descripcion.length > MAX_DESCRIPCION) {
    errores.descripcion = `Máximo ${MAX_DESCRIPCION} caracteres.`;
  }

  return errores;
};

// Subir con XMLHttpRequest para mostrar el progreso
const subirConProgreso = (archivo, alAvanzar) =>
  new Promise((resolver, rechazar) => {
    const formulario = new FormData();
    formulario.append("curriculum", archivo);

    const peticion = new XMLHttpRequest();
    peticion.open("POST", `${API_URL}/api/estudiante/curriculum`);
    peticion.setRequestHeader("Authorization", `Bearer ${obtenerToken()}`);

    peticion.upload.onprogress = (evento) => {
      if (evento.lengthComputable) {
        alAvanzar(Math.round((evento.loaded / evento.total) * 100));
      }
    };

    peticion.onload = () => {
      let datos = {};
      try {
        datos = JSON.parse(peticion.responseText);
      } catch {
        // Respuesta sin JSON
      }

      if (peticion.status >= 200 && peticion.status < 300) {
        resolver(datos);
      } else {
        rechazar(new Error(datos.mensaje || "No se pudo subir el currículum"));
      }
    };

    peticion.onerror = () =>
      rechazar(new Error("Sin conexión con el servidor. Inténtalo de nuevo."));

    peticion.send(formulario);
  });

// ========================================
// COMPONENTE
// ========================================

function PerfilEstudiante({ onActualizar }) {
  const [perfil, setPerfil] = useState(perfilInicial);
  const [guardado, setGuardado] = useState(perfilInicial);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [cvUrl, setCvUrl] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo, texto }
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  // Currículum
  const [archivoPDF, setArchivoPDF] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState("");
  const [errorPDF, setErrorPDF] = useState("");
  const [arrastrando, setArrastrando] = useState(false);
  const [progreso, setProgreso] = useState(null);
  const [abriendoPDF, setAbriendoPDF] = useState("");

  const inputPDF = useRef(null);

  // ---------- Consultar perfil ----------

  const obtenerPerfil = useCallback(async () => {
    try {
      setCargando(true);

      const respuesta = await fetch(`${API_URL}/api/estudiante/perfil`, {
        headers: { Authorization: `Bearer ${obtenerToken()}` },
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "Error al obtener el perfil");
      }

      const estudiante = datos.estudiante;
      const valores = {
        carrera: estudiante.carrera || "",
        semestre: estudiante.semestre ?? "",
        descripcion: estudiante.descripcion || "",
        telefono: estudiante.telefono || "",
        institucion: estudiante.institucion || "",
      };

      setPerfil(valores);
      setGuardado(valores);
      setNombre(estudiante.nombre || "");
      setCorreo(estudiante.correo || "");
      setCvUrl(estudiante.cv_url || "");
    } catch (err) {
      setAviso({ tipo: "error", texto: err.message });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // La consulta inicial actualiza el estado al terminar
    // eslint-disable-next-line react-hooks/set-state-in-effect
    obtenerPerfil();
  }, [obtenerPerfil]);

  // Liberar la vista previa del PDF
  useEffect(
    () => () => {
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
    },
    [vistaPrevia]
  );

  // Ocultar el aviso de éxito después de unos segundos
  useEffect(() => {
    if (aviso?.tipo !== "exito") return;
    const temporizador = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  // ---------- Estado derivado ----------

  const hayCambios = useMemo(
    () =>
      Object.keys(perfilInicial).some(
        (campo) => String(perfil[campo]) !== String(guardado[campo])
      ),
    [perfil, guardado]
  );

  // Avisar antes de salir con cambios sin guardar
  useEffect(() => {
    if (!hayCambios) return;
    const alSalir = (evento) => {
      evento.preventDefault();
      evento.returnValue = "";
    };
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, [hayCambios]);

  const errores = validarPerfil(perfil);
  const hayErrores = Object.keys(errores).length > 0;

  // Qué tan completo está el perfil (con lo ya guardado)
  const pasos = [
    { id: "carrera", texto: "Carrera", listo: Boolean(guardado.carrera.trim()) },
    { id: "semestre", texto: "Semestre", listo: guardado.semestre !== "" },
    { id: "institucion", texto: "Institución", listo: Boolean(guardado.institucion.trim()) },
    { id: "telefono", texto: "Teléfono", listo: Boolean(guardado.telefono.trim()) },
    {
      id: "descripcion",
      texto: `Descripción (mín. ${MIN_DESCRIPCION} caracteres)`,
      listo: guardado.descripcion.trim().length >= MIN_DESCRIPCION,
    },
    { id: "cv", texto: "Currículum en PDF", listo: Boolean(cvUrl) },
  ];
  const completados = pasos.filter((p) => p.listo).length;
  const porcentaje = Math.round((completados / pasos.length) * 100);

  // ---------- Formulario ----------

  const actualizarCampo = (evento) => {
    const { name, value } = evento.target;
    setPerfil((anterior) => ({ ...anterior, [name]: value }));
  };

  const guardarPerfil = async (evento) => {
    evento.preventDefault();
    setIntentoGuardar(true);

    if (hayErrores) {
      setAviso({ tipo: "error", texto: "Revisa los campos marcados en rojo." });
      return;
    }

    try {
      setGuardando(true);
      setAviso(null);

      const respuesta = await fetch(`${API_URL}/api/estudiante/perfil`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${obtenerToken()}`,
        },
        body: JSON.stringify({
          ...perfil,
          telefono: perfil.telefono.replace(/\D/g, ""),
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "Error al guardar el perfil");
      }

      setAviso({
        tipo: "exito",
        texto: datos.mensaje || "Perfil actualizado correctamente",
      });
      setIntentoGuardar(false);

      await obtenerPerfil();
      onActualizar?.();
    } catch (err) {
      setAviso({ tipo: "error", texto: err.message });
    } finally {
      setGuardando(false);
    }
  };

  const descartarCambios = () => {
    setPerfil(guardado);
    setIntentoGuardar(false);
  };

  // ---------- Currículum ----------

  const limpiarSeleccion = () => {
    setArchivoPDF(null);
    setVistaPrevia("");
    setErrorPDF("");
    if (inputPDF.current) inputPDF.current.value = "";
  };

  const elegirArchivo = async (archivo) => {
    setErrorPDF("");
    if (!archivo) return;

    const problema = await validarPDF(archivo);

    if (problema) {
      setArchivoPDF(null);
      setVistaPrevia("");
      setErrorPDF(problema);
      if (inputPDF.current) inputPDF.current.value = "";
      return;
    }

    setArchivoPDF(archivo);
    setVistaPrevia(URL.createObjectURL(archivo));
  };

  const alSoltar = (evento) => {
    evento.preventDefault();
    setArrastrando(false);
    elegirArchivo(evento.dataTransfer.files?.[0]);
  };

  const subirCurriculum = async () => {
    if (!archivoPDF) return;

    try {
      setProgreso(0);
      setErrorPDF("");

      const datos = await subirConProgreso(archivoPDF, setProgreso);

      setCvUrl(datos.cv_url || "");
      limpiarSeleccion();
      setAviso({
        tipo: "exito",
        texto: datos.mensaje || "Currículum guardado correctamente",
      });
      onActualizar?.();
    } catch (err) {
      setErrorPDF(err.message);
    } finally {
      setProgreso(null);
    }
  };

  // Descargar el currículum privado (requiere sesión)
  const abrirCurriculum = async (modo) => {
    // Abrir la pestaña antes de esperar, para que el
    // navegador no la bloquee
    const ventana = modo === "ver" ? window.open("", "_blank") : null;

    try {
      setAbriendoPDF(modo);
      setErrorPDF("");

      if (modo === "ver" && !ventana) {
        throw new Error("El navegador bloqueó la nueva pestaña. Permite las ventanas emergentes para BolsaTec.");
      }

      const respuesta = await fetch(`${API_URL}/api/estudiante/curriculum`, {
        headers: { Authorization: `Bearer ${obtenerToken()}` },
      });

      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}));
        throw new Error(datos.mensaje || "No se pudo consultar el PDF");
      }

      const archivo = await respuesta.blob();
      if (archivo.type !== "application/pdf") {
        throw new Error("El servidor no devolvió un archivo PDF");
      }

      const url = URL.createObjectURL(archivo);

      if (modo === "ver") {
        ventana.location.href = url;
      } else {
        const enlace = document.createElement("a");
        enlace.href = url;
        // Nombre del archivo sin acentos ni símbolos
        const nombreArchivo = nombre
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        enlace.download = `CV-${nombreArchivo || "estudiante"}.pdf`;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
      }

      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      ventana?.close();
      setErrorPDF(err.message);
    } finally {
      setAbriendoPDF("");
    }
  };

  // ========================================
  // PANTALLA DE CARGA
  // ========================================

  if (cargando && !nombre) {
    return (
      <div className="bt-perfil-est">
        <div className="bt-perfil-est-cargando" aria-busy="true">
          <span className="bt-perfil-est-esqueleto ancho" />
          <span className="bt-perfil-est-esqueleto" />
          <span className="bt-perfil-est-esqueleto" />
          <p>Cargando perfil profesional...</p>
        </div>
      </div>
    );
  }

  const subiendo = progreso !== null;
  const mostrarError = (campo) => (intentoGuardar || perfil[campo] !== guardado[campo]) && errores[campo];

  // ========================================
  // INTERFAZ
  // ========================================

  return (
    <div className="bt-perfil-est">
      {/* ENCABEZADO */}
      <div className="bt-perfil-est-header">
        <div>
          <h2>Mi perfil profesional</h2>
          <p>Así te ven las empresas cuando te postulas a una vacante.</p>
        </div>

        <button
          type="button"
          className="bt-perfil-est-btn"
          onClick={obtenerPerfil}
          disabled={cargando}
        >
          <RefreshCw size={17} className={cargando ? "girando" : ""} />
          Actualizar
        </button>
      </div>

      {aviso && (
        <div
          className={`bt-perfil-est-aviso ${aviso.tipo}`}
          role={aviso.tipo === "error" ? "alert" : "status"}
        >
          {aviso.tipo === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{aviso.texto}</span>
          <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso">
            <X size={16} />
          </button>
        </div>
      )}

      {/* TARJETA DE IDENTIDAD Y AVANCE */}
      <section className="bt-perfil-est-hero">
        <div className="bt-perfil-est-identidad">
          <div className="bt-perfil-est-avatar" aria-hidden="true">
            {iniciales(nombre)}
          </div>

          <div className="bt-perfil-est-datos">
            <h3>{nombre}</h3>
            <p>{correo}</p>

            <div className="bt-perfil-est-chips">
              {guardado.carrera && (
                <span><GraduationCap size={14} /> {guardado.carrera}</span>
              )}
              {guardado.semestre !== "" && (
                <span><BookOpen size={14} /> {guardado.semestre}.º semestre</span>
              )}
              {guardado.institucion && (
                <span><Building2 size={14} /> {guardado.institucion}</span>
              )}
            </div>
          </div>
        </div>

        <div className="bt-perfil-est-avance">
          <div className="bt-perfil-est-avance-titulo">
            <strong>Perfil completo al {porcentaje} %</strong>
            <span>{completados} de {pasos.length}</span>
          </div>

          <div
            className="bt-perfil-est-barra"
            role="progressbar"
            aria-valuenow={porcentaje}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Avance del perfil"
          >
            <span style={{ width: `${porcentaje}%` }} />
          </div>

          {porcentaje < 100 ? (
            <ul className="bt-perfil-est-pasos">
              {pasos.map((paso) => (
                <li key={paso.id} className={paso.listo ? "listo" : ""}>
                  {paso.listo ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                  {paso.texto}
                </li>
              ))}
            </ul>
          ) : (
            <p className="bt-perfil-est-completo">
              <CheckCircle2 size={16} /> ¡Tu perfil está completo! Las empresas
              verán toda tu información.
            </p>
          )}
        </div>
      </section>

      <div className="bt-perfil-est-columnas">
        {/* FORMULARIO */}
        <form className="bt-perfil-est-form" onSubmit={guardarPerfil} noValidate>
          <section className="bt-perfil-est-card">
            <h4><GraduationCap size={19} /> Información académica</h4>

            <div className="bt-perfil-est-grid">
              <label className="completo">
                Carrera
                <input
                  type="text"
                  name="carrera"
                  value={perfil.carrera}
                  onChange={actualizarCampo}
                  maxLength={150}
                  placeholder="Ej. Ingeniería en Tecnologías de la Información"
                />
              </label>

              <label>
                Semestre
                <input
                  type="number"
                  name="semestre"
                  min="1"
                  max="15"
                  inputMode="numeric"
                  value={perfil.semestre}
                  onChange={actualizarCampo}
                  placeholder="Ej. 7"
                  aria-invalid={Boolean(mostrarError("semestre"))}
                />
                {mostrarError("semestre") && (
                  <small className="error">{errores.semestre}</small>
                )}
              </label>

              <label>
                Institución educativa
                <input
                  type="text"
                  name="institucion"
                  value={perfil.institucion}
                  onChange={actualizarCampo}
                  maxLength={150}
                  placeholder="Nombre de tu universidad"
                />
              </label>
            </div>
          </section>

          <section className="bt-perfil-est-card">
            <h4><Phone size={19} /> Contacto</h4>

            <div className="bt-perfil-est-grid">
              <label>
                Correo electrónico
                <input type="email" value={correo} disabled readOnly />
                <small>El correo es el de tu cuenta y no se puede cambiar aquí.</small>
              </label>

              <label>
                Teléfono
                <input
                  type="tel"
                  name="telefono"
                  inputMode="tel"
                  autoComplete="tel"
                  value={perfil.telefono}
                  onChange={actualizarCampo}
                  maxLength={15}
                  placeholder="Ej. 5512345678"
                  aria-invalid={Boolean(mostrarError("telefono"))}
                />
                {mostrarError("telefono") ? (
                  <small className="error">{errores.telefono}</small>
                ) : (
                  <small>10 dígitos, sin espacios.</small>
                )}
              </label>
            </div>
          </section>

          <section className="bt-perfil-est-card">
            <h4><UserRound size={19} /> Sobre mí</h4>

            <label>
              Descripción profesional
              <textarea
                name="descripcion"
                rows={6}
                value={perfil.descripcion}
                onChange={actualizarCampo}
                maxLength={MAX_DESCRIPCION}
                placeholder="Cuéntales a las empresas qué sabes hacer, qué te interesa y qué tipo de prácticas o empleo buscas..."
                aria-invalid={Boolean(mostrarError("descripcion"))}
              />
              <span className="bt-perfil-est-contador">
                <small>
                  {perfil.descripcion.trim().length < MIN_DESCRIPCION
                    ? `Escribe al menos ${MIN_DESCRIPCION} caracteres para un perfil completo.`
                    : "¡Buena descripción!"}
                </small>
                <small>{perfil.descripcion.length}/{MAX_DESCRIPCION}</small>
              </span>
            </label>
          </section>

          {/* BARRA DE GUARDADO */}
          <div className={`bt-perfil-est-guardar ${hayCambios ? "pendiente" : ""}`}>
            <span>
              {hayCambios ? "Tienes cambios sin guardar." : "Todo está guardado."}
            </span>

            <div>
              {hayCambios && (
                <button type="button" className="bt-perfil-est-btn" onClick={descartarCambios}>
                  Descartar
                </button>
              )}

              <button
                type="submit"
                className="bt-perfil-est-btn primario"
                disabled={guardando || !hayCambios}
              >
                <Save size={17} />
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </form>

        {/* CURRÍCULUM */}
        <aside className="bt-perfil-est-card bt-perfil-est-cv">
          <h4><FileText size={19} /> Mi currículum</h4>
          <p className="bt-perfil-est-ayuda">
            Las empresas lo verán cuando te postules. Solo PDF, máximo 5 MB.
          </p>

          {/* CV ACTUAL */}
          {cvUrl ? (
            <div className="bt-cv-actual">
              <div className="bt-cv-actual-icono"><FileText size={22} /></div>
              <div className="bt-cv-actual-info">
                <strong>curriculum.pdf</strong>
                <span><CheckCircle2 size={14} /> Registrado</span>
              </div>
              <div className="bt-cv-actual-acciones">
                <button
                  type="button"
                  onClick={() => abrirCurriculum("ver")}
                  disabled={Boolean(abriendoPDF)}
                  title="Ver currículum"
                  aria-label="Ver currículum"
                >
                  <Eye size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => abrirCurriculum("descargar")}
                  disabled={Boolean(abriendoPDF)}
                  title="Descargar currículum"
                  aria-label="Descargar currículum"
                >
                  <Download size={17} />
                </button>
              </div>
            </div>
          ) : (
            <div className="bt-cv-vacio">
              <AlertCircle size={17} />
              Aún no has subido tu currículum. Sin él, las empresas no
              podrán conocer tu experiencia.
            </div>
          )}

          {/* ZONA PARA SOLTAR / ELEGIR */}
          {!archivoPDF && (
            <label
              htmlFor="archivo-curriculum"
              className={`bt-cv-zona ${arrastrando ? "arrastrando" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={alSoltar}
            >
              <UploadCloud size={34} />
              <strong>
                {cvUrl ? "Reemplazar currículum" : "Sube tu currículum"}
              </strong>
              <span>Arrastra tu PDF aquí o <u>elige un archivo</u></span>
              <small>PDF · máx. 5 MB</small>
            </label>
          )}

          <input
            ref={inputPDF}
            id="archivo-curriculum"
            className="bt-cv-input"
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => elegirArchivo(e.target.files?.[0])}
          />

          {errorPDF && (
            <p className="bt-cv-error" role="alert">
              <AlertCircle size={16} /> {errorPDF}
            </p>
          )}

          {/* ARCHIVO ELEGIDO: VISTA PREVIA Y SUBIDA */}
          {archivoPDF && (
            <div className="bt-cv-elegido">
              <div className="bt-cv-actual">
                <div className="bt-cv-actual-icono nuevo"><FileText size={22} /></div>
                <div className="bt-cv-actual-info">
                  <strong title={archivoPDF.name}>{archivoPDF.name}</strong>
                  <span className="neutro">{formatearTamano(archivoPDF.size)} · listo para subir</span>
                </div>
                {!subiendo && (
                  <div className="bt-cv-actual-acciones">
                    <button
                      type="button"
                      onClick={limpiarSeleccion}
                      title="Quitar archivo"
                      aria-label="Quitar archivo"
                    >
                      <X size={17} />
                    </button>
                  </div>
                )}
              </div>

              {vistaPrevia && (
                <>
                  <iframe
                    className="bt-cv-vista"
                    src={`${vistaPrevia}#toolbar=0&view=FitH`}
                    title="Vista previa del currículum"
                  />
                  <a
                    className="bt-cv-vista-enlace"
                    href={vistaPrevia}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Eye size={15} /> Abrir vista previa
                  </a>
                </>
              )}

              {subiendo ? (
                <div className="bt-cv-progreso" role="status">
                  <div
                    className="bt-perfil-est-barra"
                    role="progressbar"
                    aria-valuenow={progreso}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Progreso de la subida"
                  >
                    <span style={{ width: `${progreso}%` }} />
                  </div>
                  <small>
                    {progreso < 100 ? `Subiendo... ${progreso} %` : "Guardando en el servidor..."}
                  </small>
                </div>
              ) : (
                <button
                  type="button"
                  className="bt-perfil-est-btn primario ancho"
                  onClick={subirCurriculum}
                >
                  <UploadCloud size={17} />
                  {cvUrl ? "Reemplazar currículum" : "Subir currículum"}
                </button>
              )}
            </div>
          )}

          <ul className="bt-cv-consejos">
            <li>Usa un nombre claro y datos de contacto actualizados.</li>
            <li>Incluye proyectos escolares, prácticas y habilidades.</li>
            <li>Si lo editas en Word o Google Docs, expórtalo como PDF.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

export default PerfilEstudiante;
