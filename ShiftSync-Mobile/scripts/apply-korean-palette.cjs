const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const parser = require('@babel/parser');
const babel = require('@babel/core');

const source = fs.readFileSync('theme/koreanPalette.js', 'utf8');
const moduleObject = { exports: {} };
const transformed = babel.transformSync(source, { filename: 'theme/koreanPalette.js', configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
vm.runInNewContext(transformed, { module: moduleObject, exports: moduleObject.exports });
const { colors, resolveUiColor } = moduleObject.exports;
const tokens = new Map();
for (const key of ['ink','secondary','muted','canvas','surface','line','lineStrong','subtle','orange','primaryStrong','peach','lavender','mint','butter','rose','sky','success','successStrong','successText','danger','dangerStrong','dangerSoft','dangerText','warning','warningText','info','turquoise','blue','pink','mustard','salmon']) {
  if (colors[key] && !tokens.has(colors[key].toUpperCase())) tokens.set(colors[key].toUpperCase(), key);
}
const ownedElsewhere = new Set(['BottomNavbar.js','NotificationSettingsModal.js','CustomAlertModal.js','NetworkStatusBanner.js','ScheduleConflictAlert.js','ScrollTimePicker.js','WeekCalendar.js','DashboardSkeleton.js','JoyBurst.js']);
const files = fs.readdirSync('screens').filter(f => f.endsWith('.js')).map(f => path.join('screens', f));
for (const file of fs.readdirSync('components').filter(f => f.endsWith('.js'))) {
  if (ownedElsewhere.has(file) || /Scene|Previews|PortraitData|avatarConfigs|Avatar3D|AvatarCanvas|Mascot3D|HoloCard3D|PaperPlane3D|Payroll3DCharacter|AttendanceBadge3D|UserAvatar|ThreeIllustration/.test(file)) continue;
  files.push(path.join('components', file));
}
files.push('navigation/AppNavigator.js', 'navigation/LazyScreen.js', 'services/activityService.js', 'services/incidentService.js', 'utils/currency.js');
const foregrounds = new Map([[colors.orange, 'primaryStrong'], [colors.success, 'successText'], [colors.danger, 'dangerText'], [colors.warning, 'warningText']]);
let total = 0, changedFiles = 0;
for (const file of files) {
  let input = fs.readFileSync(file, 'utf8');
  const ast = parser.parse(input, { sourceType: 'module', plugins: ['jsx'] });
  const edits = []; let needsImport = false;
  const name = key => key?.name || key?.value || '';
  function visit(node, parent) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'StringLiteral' && /^(?:#[\da-f]{3,8}|rgba?\(.+\))$/i.test(node.value)) {
      let next = resolveUiColor(node.value);
      const property = parent?.type === 'ObjectProperty' ? name(parent.key) : parent?.type === 'JSXAttribute' ? name(parent.name) : '';
      if (property === 'backgroundColor' && /^#(?:fff|ffffff)$/i.test(node.value)) next = colors.surface;
      let token = tokens.get(String(next).toUpperCase());
      if (property === 'color' && foregrounds.has(next)) token = foregrounds.get(next);
      if (next !== node.value || (token && property === 'backgroundColor')) {
        const objectKey = parent?.type === 'ObjectProperty' && parent.key === node && !parent.computed;
        let output;
        if (token && colors[token] && !objectKey) {
          needsImport = true;
          output = parent?.type === 'JSXAttribute' ? `{uiColors.${token}}` : `uiColors.${token}`;
        } else output = JSON.stringify(next);
        edits.push({ start: node.start, end: node.end, output });
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc' || key === 'comments') continue;
      if (Array.isArray(value)) value.forEach(child => visit(child, node));
      else if (value && typeof value === 'object' && value.type) visit(value, node);
    }
  }
  visit(ast, null);
  if (!edits.length) continue;
  for (const edit of edits.sort((a,b) => b.start - a.start)) input = input.slice(0, edit.start) + edit.output + input.slice(edit.end);
  if (needsImport && !input.includes('colors as uiColors')) input = "import { colors as uiColors } from '../theme/koreanPalette';\n" + input;
  parser.parse(input, { sourceType: 'module', plugins: ['jsx'] });
  fs.writeFileSync(file, input);
  total += edits.length; changedFiles += 1;
  console.log(file + ': ' + edits.length + ' color values');
}
console.log(`Migrated ${total} color values in ${changedFiles} UI files. 3D materials and portrait identities were excluded.`);
