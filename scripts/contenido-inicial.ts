/**
 * Carga el contenido inicial de la página web (el que antes estaba escrito en el código),
 * para que el Gestor de contenido lo edite desde el espacio de estudio.
 * Solo llena las secciones que estén vacías: se puede ejecutar varias veces sin duplicar.
 *
 *   npm run db:contenido
 */
import { prisma } from "../src/lib/prisma";

const DIA = 86_400_000;
const hoy = new Date();
const fecha = (dias: number) => new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) + dias * DIA);
/** Próximo día de la semana (0 domingo … 6 sábado) */
const proximo = (dia: number) => fecha(((dia - hoy.getDay() + 7) % 7) || 7);

async function main() {
  const creados: string[] = [];

  if ((await prisma.webSlide.count()) === 0) {
    await prisma.webSlide.createMany({
      data: [
        {
          titulo: "Bienvenidos a nuestra familia",
          subtitulo: "Una comunidad unida en Cristo",
          descripcion: "Descubre el amor de Dios y forma parte de una familia que crece junta en fe, esperanza y amor.",
          imagenUrl: "/images/DSC00630.jpg",
          ctaTexto: "Conócenos",
          ctaLink: "/nosotros",
          orden: 1,
          estado: "PUBLICADO",
        },
        {
          titulo: "Servicios dominicales",
          subtitulo: "Cada domingo a las 10:00 a. m.",
          descripcion: "Acompáñanos en un tiempo de adoración, enseñanza bíblica y comunión fraternal.",
          imagenUrl: "/images/DSC00653.jpg",
          ctaTexto: "Ver eventos",
          ctaLink: "/#eventos",
          orden: 2,
          estado: "PUBLICADO",
        },
        {
          titulo: "Noches de adoración",
          subtitulo: "Su presencia lo cambia todo",
          descripcion: "Ven a adorar con nosotros y a experimentar la presencia de Dios.",
          imagenUrl: "/images/nocheAdoracion.jpg",
          ctaTexto: "¿Cómo oramos por ti?",
          ctaLink: "/#oracion",
          orden: 3,
          estado: "PUBLICADO",
        },
      ],
    });
    creados.push("3 diapositivas de portada");
  }

  if ((await prisma.webEvento.count()) === 0) {
    await prisma.webEvento.createMany({
      data: [
        { titulo: "Servicio dominical", descripcion: "Un tiempo de adoración, enseñanza de la Palabra y comunión fraternal para toda la familia.", fecha: proximo(0), hora: "10:00", lugar: "Santuario principal", categoria: "servicio", recurrente: true, destacado: true, imagenUrl: "/images/DSC00653.jpg", estado: "PUBLICADO" },
        { titulo: "Noche de adoración", descripcion: "Una noche dedicada completamente a la adoración y la presencia de Dios.", fecha: fecha(12), hora: "19:00", lugar: "Santuario principal", categoria: "evento-especial", imagenUrl: "/images/nocheAdoracion.jpg", estado: "PUBLICADO" },
        { titulo: "Encuentro de jóvenes", descripcion: "Música, predicación y actividades dinámicas para jóvenes de 13 a 25 años.", fecha: proximo(5), hora: "19:00", lugar: "Auditorio central", categoria: "actividad-juvenil", estado: "PUBLICADO" },
        { titulo: "Retiro de parejas", descripcion: "Un fin de semana para fortalecer el matrimonio y las relaciones de pareja.", fecha: fecha(25), hora: "18:00", lugar: "Centro de retiros", categoria: "evento-especial", estado: "PUBLICADO" },
      ],
    });
    creados.push("4 eventos");
  }

  if ((await prisma.webMinisterio.count()) === 0) {
    const ministerios = [
      ["infantil", "Ministerio Infantil", "Un espacio donde los niños aprenden sobre el amor de Dios con actividades creativas, cantos y enseñanza bíblica adaptada a su edad.", "Niños de 4 a 12 años", "Domingos 9:00 a. m."],
      ["jovenes", "Ministerio de Jóvenes", "Un lugar para que los jóvenes crezcan en su fe, desarrollen liderazgo y formen amistades centradas en Cristo.", "Jóvenes de 13 a 25 años", "Viernes 7:00 p. m."],
      ["parejas", "Ministerio de Parejas", "Fortalecemos los matrimonios con principios bíblicos, talleres prácticos y actividades que promueven la unidad.", "Matrimonios y parejas", "Sábados 6:00 p. m. (2.ª semana del mes)"],
      ["damas", "Ministerio de Damas", "Mujeres que se fortalecen mutuamente, crecen espiritualmente y desarrollan sus dones para servir.", "Mujeres de todas las edades", "Miércoles 7:00 p. m."],
      ["adoracion", "Ministerio de Alabanza", "Llevamos la presencia de Dios a través de la música, preparando los corazones para recibir la Palabra.", "Músicos y adoradores", "Ensayos: jueves 7:00 p. m."],
      ["evangelismo", "Ministerio de Evangelismo", "Compartimos el amor de Cristo en nuestra comunidad con actividades de alcance y visitas.", "Todos los que quieran servir", "Sábados 9:00 a. m."],
    ] as const;
    await prisma.webMinisterio.createMany({
      data: ministerios.map(([slug, nombre, descripcion, publico, horario], i) => ({ slug, nombre, descripcion, publico, horario, orden: i + 1, estado: "PUBLICADO" as const })),
    });
    creados.push(`${ministerios.length} ministerios`);
  }

  if ((await prisma.webAnuncio.count()) === 0) {
    await prisma.webAnuncio.create({
      data: { texto: "¡Te esperamos este domingo a las 10:00 a. m.! Trae a tu familia.", enlace: "/#eventos", textoEnlace: "Ver eventos", color: "violeta", estado: "PUBLICADO" },
    });
    creados.push("1 anuncio");
  }

  console.log(creados.length ? `✓ Contenido inicial creado: ${creados.join(", ")}.` : "✓ Las secciones ya tenían contenido; no se cambió nada.");
  console.log("  Las prédicas se agregan desde Página web → Prédicas pegando el enlace de YouTube.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
