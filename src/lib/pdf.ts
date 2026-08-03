export type PdfSection = {
  titulo?: string;
  head: string[];
  body: (string | number)[][];
};

export interface PdfOptions {
  titulo: string;
  subtitulo?: string;
  secciones: PdfSection[];
  archivo: string;
}

/** Genera y descarga un PDF de marca HumanLink con una o varias tablas. */
export async function descargarPdf({ titulo, subtitulo, secciones, archivo }: PdfOptions) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = (autoTableMod as unknown as { default: (doc: unknown, opts: unknown) => void }).default;
  const azul: [number, number, number] = [59, 130, 246];

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.setTextColor(azul[0], azul[1], azul[2]);
  doc.text(`HumanLink · ${titulo}`, 14, 18);

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  let headerY = 25;
  if (subtitulo) {
    doc.text(subtitulo, 14, headerY);
    headerY += 5;
  }
  doc.text(`Generado: ${new Date().toLocaleString("es-MX")}`, 14, headerY);

  let y = headerY + 6;
  for (const s of secciones) {
    if (s.titulo) {
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text(s.titulo, 14, y);
      y += 2;
    }
    autoTable(doc, {
      startY: y + 2,
      head: [s.head],
      body: s.body.length ? s.body : [s.head.map(() => "—")],
      headStyles: { fillColor: azul },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
    y = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY) + 8;
  }

  doc.save(archivo);
}
