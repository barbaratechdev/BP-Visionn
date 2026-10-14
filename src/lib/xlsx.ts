// Gerador mínimo de planilha Excel (.xlsx) — sem dependência externa.
// Um .xlsx é um ZIP de arquivos XML; aqui o ZIP é montado sem compressão
// (método "store"), o que o Excel/LibreOffice/Google Planilhas abrem
// normalmente. Suporta só o que os relatórios do sistema precisam: uma
// aba, cabeçalho em negrito congelado com filtro, larguras de coluna,
// texto e datas reais (formatadas dd/mm/aaaa, ordenáveis no Excel).

export type ColunaXlsx = { titulo: string; largura: number; tipo?: "texto" | "data" };

const enc = new TextEncoder();

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(b: Uint8Array) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = TABELA_CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

function zipStore(arquivos: { nome: string; dados: Uint8Array }[]) {
  const partes: Uint8Array[] = []; const central: Uint8Array[] = []; let offset = 0;
  for (const a of arquivos) {
    const nome = enc.encode(a.nome), crc = crc32(a.dados), n = a.dados.length;
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, 0, true); h.setUint16(12, 0x21, true); h.setUint32(14, crc, true); h.setUint32(18, n, true); h.setUint32(22, n, true);
    h.setUint16(26, nome.length, true); h.setUint16(28, 0, true);
    partes.push(new Uint8Array(h.buffer), nome, a.dados);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, 0, true); c.setUint16(14, 0x21, true); c.setUint32(16, crc, true); c.setUint32(20, n, true); c.setUint32(24, n, true);
    c.setUint16(28, nome.length, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), nome);
    offset += 30 + nome.length + n;
  }
  const tamCentral = central.reduce((s, b) => s + b.length, 0);
  const fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0, 0x06054b50, true); fim.setUint16(8, arquivos.length, true); fim.setUint16(10, arquivos.length, true);
  fim.setUint32(12, tamCentral, true); fim.setUint32(16, offset, true);
  return new Blob([...partes, ...central, new Uint8Array(fim.buffer)] as BlobPart[], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
const letra = (i: number) => { let s = ""; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
// "AAAA-MM-DD" → número de série do Excel (dias desde 30/12/1899). null se não for data.
function serialData(v: string) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || ""); if (!m) return null; return (Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000; }

// linhas: valores na ordem das colunas — texto (string) ou, nas colunas "data", "AAAA-MM-DD" (vazio = célula vazia).
export function gerarXlsx(nomeAba: string, colunas: ColunaXlsx[], linhas: (string | null | undefined)[][]) {
  const ult = letra(colunas.length - 1), totalLinhas = linhas.length + 1;
  const celula = (ref: string, v: string | null | undefined, col: ColunaXlsx, estilo: number) => {
    if (col.tipo === "data") { const n = serialData(v || ""); if (n != null) return `<c r="${ref}" s="2"><v>${n}</v></c>`; }
    const t = v == null ? "" : String(v);
    return t === "" ? `<c r="${ref}" s="${estilo}"/>` : `<c r="${ref}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${esc(t)}</t></is></c>`;
  };
  const cab = `<row r="1">${colunas.map((c, i) => `<c r="${letra(i)}1" s="1" t="inlineStr"><is><t>${esc(c.titulo)}</t></is></c>`).join("")}</row>`;
  const corpo = linhas.map((l, r) => `<row r="${r + 2}">${colunas.map((c, i) => celula(letra(i) + (r + 2), l[i], c, 0)).join("")}</row>`).join("");
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${colunas.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.largura}" customWidth="1"/>`).join("")}</cols><sheetData>${cab}${corpo}</sheetData><autoFilter ref="A1:${ult}${totalLinhas}"/></worksheet>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2563EB"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="left"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const aba = esc(nomeAba.slice(0, 31));
  const arq = (nome: string, xml: string) => ({ nome, dados: enc.encode(xml) });
  return zipStore([
    arq("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`),
    arq("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    arq("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${aba}" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${aba.replace(/'/g, "''")}'!$A$1:$${ult}$${totalLinhas}</definedName></definedNames></workbook>`),
    arq("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    arq("xl/styles.xml", styles),
    arq("xl/worksheets/sheet1.xml", sheet),
  ]);
}

export function baixarArquivo(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nomeArquivo; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
