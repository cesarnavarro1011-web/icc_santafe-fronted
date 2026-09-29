"use client";

import Image from "next/image";
import { Eye, Target, Heart } from "lucide-react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { useInView } from "framer-motion";

interface AboutItem {
  title: string;
  text: string;
  image: string;
  icon: React.ReactNode;
  accent: string;
}

// Imágenes de las tarjetas (los textos vienen de "Datos de la iglesia")
const IMAGENES = { mision: "/images/mision.jpg", vision: "/images/vision.jpg", valores: "/images/valores.jpg" };

/** Pastor de la sucesión pastoral (se administra en "Datos de la iglesia"). */
export interface PastorSucesion {
  id: string;
  nombre: string;
  cargo: string | null;
  imagen: string | null;
}

interface Props {
  mision: string | null;
  vision: string | null;
  valores: string[];
  fundadores: PastorSucesion[];
  actuales: PastorSucesion[];
}

function FotoPastor({ p, clase }: { p: PastorSucesion; clase: string }) {
  return (
    <div className={`relative w-60 h-60 overflow-hidden rounded-2xl shadow-lg bg-gray-100 ${clase}`}>
      {p.imagen ? (
        <Image src={p.imagen} alt={p.nombre} fill sizes="240px" className="object-cover" unoptimized={p.imagen.startsWith("/api/")} />
      ) : (
        <div className="flex h-full items-center justify-center text-5xl font-bold text-gray-300">{p.nombre.replace(/^Pr\.?\s*/i, "")[0]}</div>
      )}
    </div>
  );
}

export default function AboutSectionAlt({ mision, vision, valores, fundadores, actuales }: Props) {
  const successionRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();

  // Ajusta esta constante según la altura real de tu navbar
  const NAV_OFFSET = 120; 

  // Revertimos offset al anterior (empieza justo cuando entra el wrapper)
  const { scrollYProgress } = useScroll({
    target: successionRef,
    offset: ["start start", "end 0.1"]
  });

  // Rango ligeramente adelantado
const oldOpacityMV = useTransform(scrollYProgress, [0, 0.18, 0.38, 0.55, 1], [1, 1, 0.90, 0.20, 0]); 
const newOpacityMV = useTransform(scrollYProgress, [0, 0.25, 0.42, 0.62, 1], [0, 0, 0.10, 1, 1]); 
const oldYMV = useTransform(scrollYProgress, [0, 0.4, 1], [0, -10, -20]); 
const newYMV = useTransform(scrollYProgress, [0, 0.40, 1], [60, -10, -20]);

  const oldOpacity = reduceMotion ? 1 : oldOpacityMV;
  const newOpacity = reduceMotion ? 1 : newOpacityMV;
  const oldY = reduceMotion ? 0 : oldYMV;
  const newY = reduceMotion ? 0 : newYMV;

  // Solo se muestran las tarjetas que tienen texto
  const candidatos: (AboutItem | null)[] = [
    mision ? {
      title: "Nuestra Misión",
      text: mision,
      image: IMAGENES.mision,
      icon: <Target className="h-6 w-6" />,
      accent: "from-green-500 to-emerald-500"
    } : null,
    vision ? {
      title: "Nuestra Visión",
      text: vision,
      image: IMAGENES.vision,
      icon: <Eye className="h-6 w-6" />,
      accent: "from-blue-500 to-indigo-500"
    } : null,
    valores.length > 0 ? {
      title: "Nuestros Valores",
      text: "Estos principios guían cada decisión y cada paso que damos como comunidad de fe.",
      image: IMAGENES.valores,
      icon: <Heart className="h-6 w-6" />,
      accent: "from-rose-500 to-pink-500"
    } : null
  ];
  const items = candidatos.filter((x): x is AboutItem => x !== null);
  const haySucesion = fundadores.length > 0 || actuales.length > 0;

  function AboutItemCard({ item, idx }: { item: AboutItem; idx: number }) {
    const ref = useRef<HTMLDivElement | null>(null);
    const inView = useInView(ref, { once: true, margin: "-100px" });
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 60 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`relative flex flex-col ${idx % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"}`}
      >
        <div className="md:w-1/2 relative group">
          <div
            className={
              "absolute -inset-2 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition duration-500 blur-md " +
              (idx === 0
                ? "from-blue-500/30 to-indigo-500/30"
                : idx === 1
                  ? "from-green-500/30 to-emerald-500/30"
                  : "from-rose-500/30 to-pink-500/30")
            }
          />
          <div className="relative overflow-hidden">
            <Image
              src={item.image}
              alt={item.title}
              width={900}
              height={650}
              className="object-cover h-80 w-full md:h-96 lg:h-[500px] scale-[1.02] group-hover:scale-[1.06] transition-transform duration-700 ease-out"
              priority={idx === 0}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute top-6 left-6 px-4 py-2 rounded-full text-sm font-medium text-white bg-black/40 backdrop-blur-md flex items-center gap-2">
              {item.icon}
              <span>{item.title}</span>
            </div>
          </div>
        </div>
        <div className="md:w-1/2 flex flex-col justify-center px-6 md:px-12 lg:px-16 py-12">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className={`h-12 w-12 inline-flex items-center justify-center rounded-xl bg-gradient-to-br ${item.accent} text-white shadow-lg`}>
              {item.icon}
            </span>
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">{item.title}</h3>
          </div>
          <p className="text-gray-600 text-lg leading-relaxed mb-8">
            {item.text}
          </p>
          {item.title === "Nuestros Valores" && (
            <ul className="grid grid-cols-1 gap-y-4 text-base md:text-lg">
              {valores.map((value, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-2 block w-3 h-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 flex-shrink-0" />
                  <span className="text-gray-700 leading-relaxed">{value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <section className="relative space-y-30 bg-white">
      {/* Items */}
      <div className="space-y-16">
        {items.map((item, idx) => (
          <AboutItemCard key={item.title + idx} item={item} idx={idx} />
        ))}
      </div>

      {/* Transición Pastoral Scroll */}
      <div ref={successionRef} className="relative">
        {/* Sin pastores registrados no se muestra la sección (el ref sigue montado para la animación) */}
        {haySucesion && (
        <div className="h-[300vh] sm:pb-30">
          <div
            className="sticky flex flex-col items-center justify-start"
            style={{
              top: NAV_OFFSET,
              height: `calc(100vh - ${NAV_OFFSET}px)`
            }}
          >
               {/* Título */}
              <h2 className="relative z-20 text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-18 text-center overflow-hidden ">
                Sucesión Pastoral
              </h2>

            {/* Contenedor de tarjetas sin margen extra para que queden más arriba */}
            <div className="relative w-full max-w-5xl mx-auto">
              {/* Mensaje para pastores antiguos */}
              <motion.p
                style={{ opacity: oldOpacity, y: oldY }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="absolute -top-12 left-0 right-0 mx-auto text-center text-base md:text-lg text-yellow-700 font-semibold z-20 pointer-events-none"
              >
                Honramos a los pastores que sembraron la base
              </motion.p>

              {/* Mensaje para pastores actuales */}
              {/* Mensaje para pastores actuales */}
              <motion.p
                style={{ opacity: newOpacity, y: newY }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="absolute -top-12 left-0 right-0 mx-auto text-center text-base md:text-lg text-red-700 font-semibold z-20 pointer-events-none"
              >
                Y a los que continúan su legado.
              </motion.p>
              {/* Antiguos */}
              <motion.div
                style={{ opacity: oldOpacity, y: oldY }}
                className="absolute inset-x-0 top-0 flex flex-col md:flex-row gap-10 items-center justify-center z-10"
              >
                {fundadores.map(p => (
                  <div key={p.id} className="text-center">
                    <FotoPastor p={p} clase="ring-4 ring-blue-100" />
                    <p className="mt-4 font-semibold text-gray-800">{p.nombre}</p>
                    <p className="text-sm text-gray-500">{p.cargo || "Pastorado Fundacional"}</p>
                  </div>
                ))}
              </motion.div>

              {/* Nuevos */}
              <motion.div
                style={{ opacity: newOpacity, y: newY }}
                className="absolute inset-x-0 top-0 flex flex-col md:flex-row gap-10 items-center justify-center z-10"
              >
                {actuales.map(p => (
                  <div key={p.id} className="text-center">
                    <FotoPastor p={p} clase="ring-4 ring-emerald-100" />
                    <p className="mt-4 font-semibold text-gray-800">{p.nombre}</p>
                    <p className="text-sm text-emerald-600">{p.cargo || "Pastorado Actual"}</p>
                  </div>
                ))}
              </motion.div>
                      </div> {/* /card container */}
                    </div> {/* /sticky */}
                  </div>
        )} {/* /h-[300vh] */}
                </div> {/* /relative succession wrapper */}
              </section>
            );
          }