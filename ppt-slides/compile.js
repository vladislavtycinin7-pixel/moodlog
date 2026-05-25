const pptxgen = require('pptxgenjs');
const html2pptx = require('/home/z/my-project/skills/ppt/scripts/html2pptx.js');
const path = require('path');

async function compile() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'MoodLog';
  pptx.title = 'MoodLog — Дневник настроения';

  const fontConfig = { cjk: 'Microsoft YaHei', latin: 'Candara' };

  const slides = [
    'slide01-cover.html',
    'slide02-problem.html',
    'slide03-features.html',
    'slide04-calendar.html',
    'slide05-statistics.html',
    'slide06-entry.html',
    'slide07-profile.html',
    'slide08-techstack.html',
    'slide09-serverless.html',
    'slide10-advantages.html',
    'slide11-darkui.html',
    'slide12-closing.html',
  ];

  const baseDir = '/home/z/my-project/ppt-slides';

  for (let i = 0; i < slides.length; i++) {
    const htmlFile = path.join(baseDir, slides[i]);
    console.log(`Processing slide ${i + 1}: ${slides[i]}`);
    try {
      const { warnings } = await html2pptx(htmlFile, pptx, { fontConfig });
      if (warnings.length > 0) {
        console.log(`  Warnings for ${slides[i]}:`);
        warnings.forEach(w => console.log(`    - ${w}`));
      } else {
        console.log(`  OK`);
      }
    } catch (err) {
      console.error(`  ERROR on ${slides[i]}: ${err.message}`);
    }
  }

  const outputPath = '/home/z/my-project/MoodLog-Presentation.pptx';
  await pptx.writeFile({ fileName: outputPath });
  console.log(`\nPresentation saved to: ${outputPath}`);
}

compile().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
