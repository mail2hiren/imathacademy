/* ============================================================
   iMathAcademy — drawing a certificate from its award record
   ------------------------------------------------------------
   A certificate is not stored as a file anywhere. Every award is
   already a row in student_level_completions — the child, the level,
   the certificate number and the date it was issued — and the
   certificate is redrawn from that row whenever it is asked for.
   Nothing to keep, nothing to lose, and the same record the teacher
   awarded is the one a parent downloads.

   Drawn on a canvas rather than as HTML over the template, because a
   canvas can be saved as a real picture with nothing else loaded.
   The positions and sizes are the teacher's page, unchanged, so the
   two look identical.
   ============================================================ */

var CertificateDraw = (function () {
  'use strict';

  var W = 2000, H = 1414;                 // the template's own size
  var TEMPLATE  = '/assets/cert-template.png';
  var SIGNATURE = '/assets/signature.png';

  /* Each line as the teacher's page places it. */
  var LAYOUT = {
    name:   { y: 588 + 116 * 0.82, size: 116, font: "'Fredoka','Nunito',sans-serif", weight: 600, colour: '#E67D21' },
    line1:  { y: 792 + 54 * 0.82,  size: 54,  font: "'Comfortaa','Nunito',cursive",  weight: 700, colour: '#40A9A2' },
    line2:  { y: 858 + 54 * 0.82,  size: 54,  font: "'Comfortaa','Nunito',cursive",  weight: 700, colour: '#40A9A2' },
    sign:   { x: 565 + 185, y: 1010 + 72 * 0.8, size: 72, font: "'Great Vibes',cursive", weight: 400, colour: '#1A2240' },
    date:   { x: 1130 + 185, y: 1035 + 36 * 0.82, size: 36, font: "'Comfortaa','Nunito',cursive", weight: 600, colour: '#1A1A2E' },
    certno: { y: 1352 + 20 * 0.82, size: 20, font: "'Nunito',sans-serif", weight: 700, colour: '#A9B2BF', spacing: 1.5 }
  };

  function loadImage(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      /* A missing template must not stop the certificate: the words
         still draw, on white. */
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  /* Long names have to fit rather than run off the edge. */
  function fitted(ctx, text, size, font, weight, maxWidth) {
    var s = size;
    for (var i = 0; i < 40; i++) {
      ctx.font = weight + ' ' + s + "px " + font;
      if (ctx.measureText(text).width <= maxWidth || s <= size * 0.45) break;
      s -= size * 0.03;
    }
    return s;
  }

  function centred(ctx, text, spec, spacing) {
    if (!text) return;
    var size = fitted(ctx, text, spec.size, spec.font, spec.weight, W * 0.86);
    ctx.font = spec.weight + ' ' + size + 'px ' + spec.font;
    ctx.fillStyle = spec.colour;
    ctx.textAlign = 'center';
    if (spacing && ctx.letterSpacing !== undefined) ctx.letterSpacing = spacing + 'px';
    ctx.fillText(text, W / 2, spec.y);
    if (spacing && ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
  }

  function prettyDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return String(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  /**
   * Draw one certificate.
   * cert: { name, line1, line2, date, certificate_number, signedBy }
   * Returns the canvas, ready to show, save or print.
   */
  async function draw(cert, canvas) {
    var c = canvas || document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);

    var tpl = await loadImage(TEMPLATE);
    if (tpl) ctx.drawImage(tpl, 0, 0, W, H);

    /* The fonts may not have arrived yet; without this the first draw
       falls back to a plain face and looks wrong. */
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }

    centred(ctx, cert.name  || '', LAYOUT.name);
    centred(ctx, cert.line1 || '', LAYOUT.line1);
    centred(ctx, cert.line2 || '', LAYOUT.line2);

    var sig = await loadImage(SIGNATURE);
    if (sig) {
      var sw = 210, sh = sig.height * (sw / sig.width);
      ctx.drawImage(sig, 645, 942, sw, sh);
    } else {
      ctx.font = LAYOUT.sign.weight + ' ' + LAYOUT.sign.size + 'px ' + LAYOUT.sign.font;
      ctx.fillStyle = LAYOUT.sign.colour;
      ctx.textAlign = 'center';
      ctx.fillText(cert.signedBy || 'Megha Bhatt', LAYOUT.sign.x, LAYOUT.sign.y);
    }

    ctx.font = LAYOUT.date.weight + ' ' + LAYOUT.date.size + 'px ' + LAYOUT.date.font;
    ctx.fillStyle = LAYOUT.date.colour;
    ctx.textAlign = 'center';
    ctx.fillText(prettyDate(cert.date), LAYOUT.date.x, LAYOUT.date.y);

    if (cert.certificate_number) {
      centred(ctx, 'Certificate no. ' + cert.certificate_number, LAYOUT.certno, LAYOUT.certno.spacing);
    }
    return c;
  }

  /** A sensible file name: the child and the level, not a random string. */
  function fileName(cert) {
    var who = String(cert.name || 'certificate').replace(/[^\w ]+/g, '').replace(/\s+/g, '-');
    var lvl = (cert.level != null) ? '-Level-' + cert.level : '';
    return 'iMath-' + who + lvl + '.png';
  }

  /* ── A real PDF, with nothing loaded ────────────────────────
     A PDF is what a school or a relative expects, and it prints at a
     predictable size. Written by hand rather than with a library,
     because a certificate is one full-page image and that makes a very
     small PDF: the JPEG is embedded as-is, the format PDF understands
     natively, on an A4 landscape page. Works offline. */
  function pdfFromJpeg(jpegBytes, wPx, hPx) {
    var W = 841.89, H = 595.28;                 // A4 landscape, in points
    var scale = Math.min(W / wPx, H / hPx);
    var dw = wPx * scale, dh = hPx * scale;
    var ox = (W - dw) / 2, oy = (H - dh) / 2;

    var objs = [];
    objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objs[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
    objs[3] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W.toFixed(2) + ' ' + H.toFixed(2) +
              '] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>';
    var draw = 'q ' + dw.toFixed(2) + ' 0 0 ' + dh.toFixed(2) + ' ' +
               ox.toFixed(2) + ' ' + oy.toFixed(2) + ' cm /Im0 Do Q';
    objs[4] = '<< /Length ' + draw.length + ' >>\nstream\n' + draw + '\nendstream';
    objs[5] = '<< /Type /XObject /Subtype /Image /Width ' + wPx + ' /Height ' + hPx +
              ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' +
              jpegBytes.length + ' >>';

    /* Built as bytes: the JPEG is binary and must not be mangled. */
    var parts = [], offsets = [], len = 0;
    function push(str) {
      var b = new Uint8Array(str.length);
      for (var i = 0; i < str.length; i++) b[i] = str.charCodeAt(i) & 0xff;
      parts.push(b); len += b.length;
    }
    push('%PDF-1.4\n');
    for (var n = 1; n <= 5; n++) {
      offsets[n] = len;
      push(n + ' 0 obj\n' + objs[n] + (n === 5 ? '\nstream\n' : '\n'));
      if (n === 5) { parts.push(jpegBytes); len += jpegBytes.length; push('\nendstream'); }
      push('\nendobj\n');
    }
    var xref = len;
    var x = 'xref\n0 6\n0000000000 65535 f \n';
    for (var k = 1; k <= 5; k++) {
      var o = String(offsets[k]);
      while (o.length < 10) o = '0' + o;
      x += o + ' 00000 n \n';
    }
    push(x);
    push('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');

    var all = new Uint8Array(len), at = 0;
    parts.forEach(function (p) { all.set(p, at); at += p.length; });
    return new Blob([all], { type: 'application/pdf' });
  }

  function dataUrlToBytes(url) {
    var bin = atob(url.split(',')[1]);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function downloadPdf(cert) {
    var c = await draw(cert);
    var jpeg = dataUrlToBytes(c.toDataURL('image/jpeg', 0.92));
    var blob = pdfFromJpeg(jpeg, c.width, c.height);
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fileName(cert).replace(/\.png$/, '.pdf');
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  async function download(cert) {
    var c = await draw(cert);
    var url = c.toDataURL('image/png');
    var a = document.createElement('a');
    a.href = url; a.download = fileName(cert);
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* Printing opens the certificate alone on the page, landscape, with
     no margins, so what comes out of the printer is the certificate
     and nothing else. */
  async function print(cert) {
    var c = await draw(cert);
    var url = c.toDataURL('image/png');
    var w = window.open('', '_blank');
    if (!w) { alert('Please allow pop-ups to print the certificate.'); return; }
    w.document.write(
      '<!DOCTYPE html><html><head><title>' + (cert.name || 'Certificate') + '</title>' +
      '<style>@page{size:A4 landscape;margin:0}' +
      'html,body{margin:0;padding:0;background:#fff}' +
      'img{width:100%;height:auto;display:block}</style></head><body>' +
      '<img src="' + url + '" onload="window.focus();window.print();"></body></html>');
    w.document.close();
  }

  /** The words on a certificate, from the award row and the level. */
  function linesFor(row, levelName, programme) {
    var lvl = String(row.level_code || '').replace(/^V?L/, '');
    var vedic = /^VL/.test(row.level_code || '');
    return {
      line1: 'Certificate of Completion for Level ' + lvl + (levelName ? ' \u2014 ' + levelName : ''),
      line2: programme || (vedic ? 'Vedic Maths programme' : 'International ABACUS program'),
      level: lvl
    };
  }

  return { draw: draw, download: download, downloadPdf: downloadPdf, print: print,
           fileName: fileName, prettyDate: prettyDate, linesFor: linesFor, W: W, H: H };
})();

if (typeof module !== 'undefined') module.exports = CertificateDraw;
