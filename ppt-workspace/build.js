const pptxgen = require('pptxgenjs');
const html2pptx = require('/home/z/my-project/skills/ppt/scripts/html2pptx.js');
const path = require('path');
const fs = require('fs');

const WS = '/home/z/my-project/ppt-workspace';
const OUTPUT = '/home/z/my-project/MoodLog_Presentation.pptx';

async function main() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'MoodLog';
  pptx.title = 'MoodLog — твой личный дневник настроения';

  const fontConfig = { cjk: 'Microsoft YaHei', latin: 'Candara' };

  const slideFiles = [];
  for (let i = 1; i <= 14; i++) {
    slideFiles.push(path.join(WS, `slide${String(i).padStart(2, '0')}.html`));
  }

  const allWarnings = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const htmlFile = slideFiles[i];
    console.log(`Processing slide ${i + 1}: ${path.basename(htmlFile)}`);
    try {
      const { slide, placeholders, warnings } = await html2pptx(htmlFile, pptx, { fontConfig });
      if (warnings.length > 0) {
        console.log(`  Warnings for slide ${i + 1}:`);
        warnings.forEach(w => console.log(`    ${w}`));
        allWarnings.push({ slide: i + 1, warnings });
      }
    } catch (err) {
      console.error(`  ERROR on slide ${i + 1}: ${err.message}`);
      allWarnings.push({ slide: i + 1, warnings: [err.message] });
    }
  }

  await pptx.writeFile({ fileName: OUTPUT });
  console.log(`\nPresentation saved to: ${OUTPUT}`);

  if (allWarnings.length > 0) {
    console.log('\nAll warnings summary:');
    allWarnings.forEach(s => {
      console.log(`  Slide ${s.slide}:`);
      s.warnings.forEach(w => console.log(`    ${w}`));
    });
  }
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
