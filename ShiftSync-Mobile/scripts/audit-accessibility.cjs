const fs=require('fs'), path=require('path'), parser=require('@babel/parser'), traverse=require('@babel/traverse').default;
const report={buttons:0, iconOnly:[], missingIconLabels:[], missingButtonRoles:[], missingMinimumTargets:[]};
const name=n=>n?.type==='JSXIdentifier'?n.name:n?.type==='JSXMemberExpression'?`${name(n.object)}.${name(n.property)}`:'';
function descendants(node, predicate){if(!node||typeof node!=='object')return false;if(predicate(node))return true;return Object.values(node).some(v=>Array.isArray(v)?v.some(x=>descendants(x,predicate)):typeof v==='object'&&descendants(v,predicate));}
for(const folder of ['screens','components'])for(const file of fs.readdirSync(folder).filter(f=>f.endsWith('.js'))){
 const filename=path.join(folder,file), source=fs.readFileSync(filename,'utf8'), ast=parser.parse(source,{sourceType:'module',plugins:['jsx']});
 traverse(ast,{JSXElement(p){const n=p.node, tag=name(n.openingElement.name);if(!/^(Pressable|TouchableOpacity|TouchableHighlight|TouchableWithoutFeedback|Animated\.TouchableOpacity)$/.test(tag))return;
 report.buttons++;
 const attrs=n.openingElement.attributes;
 if(!attrs.some(x=>name(x.name)==='accessibilityRole'||name(x.name)==='role'))report.missingButtonRoles.push(`${filename}:${n.loc.start.line}`);
 const style=attrs.find(x=>name(x.name)==='style');
 if(!style||!source.slice(style.start,style.end).includes('ensureTouchTarget('))report.missingMinimumTargets.push(`${filename}:${n.loc.start.line}`);
 const text=descendants(n.children,x=>x.type==='JSXElement'&&name(x.openingElement.name)==='Text'&&x.children.some(child=>child.type==='JSXExpressionContainer'&&child.expression.type!=='JSXEmptyExpression'||child.type==='JSXText'&&/[\p{L}\p{N}]/u.test(child.value)));
 if(text)return;
 const label=attrs.find(x=>name(x.name)==='accessibilityLabel');
 const icons=[];descendants(n.children,x=>{if(x.type==='JSXOpeningElement'&&/Icon|Image|Back|Avatar/.test(name(x.name)))icons.push(source.slice(x.start,x.end).slice(0,130));return false;});
 const row={file:filename,line:n.loc.start.line,tag,label:label?source.slice(label.start,label.end):null,style:attrs.filter(x=>name(x.name)==='style').map(x=>source.slice(x.start,x.end)).join(),icons};
 report.iconOnly.push(row);if(!label)report.missingIconLabels.push(row);
 }});
}
const target=process.argv[2];if(target)fs.writeFileSync(target,JSON.stringify(report,null,2));
console.log(JSON.stringify({buttons:report.buttons,iconOnly:report.iconOnly.length,missingIconLabels:report.missingIconLabels.length,missingButtonRoles:report.missingButtonRoles.length,missingMinimumTargets:report.missingMinimumTargets.length}));
for(const row of report.missingIconLabels)console.log(`${row.file}:${row.line} ${row.style} ${row.icons.join(' ')}`);
if(report.missingIconLabels.length||report.missingButtonRoles.length||report.missingMinimumTargets.length)process.exitCode=1;
