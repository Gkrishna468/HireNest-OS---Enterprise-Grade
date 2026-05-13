const { createRequire } = require('module');
const requireCustom = createRequire('file://' + __filename);
try {
  const pdfParse = requireCustom('pdf-parse');
  console.log('pdfParse type:', typeof pdfParse);
  console.log('pdfParse keys:', Object.keys(pdfParse || {}));
  console.log('pdfParse.default type:', typeof (pdfParse && pdfParse.default));
} catch (e) {
  console.error('Error loading pdf-parse:', e.message);
}
