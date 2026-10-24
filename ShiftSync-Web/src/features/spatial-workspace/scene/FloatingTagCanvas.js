// Shared canvas face for world-space labels. Geometry, selection and anchoring stay with callers.
export function createFloatingTagCanvas({title, subtitle, metric, caption, accent, statusColor, selected=false, matched=false}) {
  const canvas=document.createElement('canvas');
  canvas.width=720; canvas.height=192;
  const ctx=canvas.getContext('2d');
  const palette={surface:'#FFFCF7',text:'#29251F',muted:'#766D62',line:'#DED6CA',inset:'#F1ECE3'};
  const font=typeof window!=='undefined'?window.getComputedStyle(document.body).fontFamily:'sans-serif';
  const fit=(text,maxWidth)=>{
    let value=String(text??'Chưa có thông tin');
    if(!ctx.measureText)return value.slice(0,35);
    if(ctx.measureText(value).width<=maxWidth)return value;
    while(value.length&&ctx.measureText(`${value}…`).width>maxWidth)value=value.slice(0,-1);
    return `${value}…`;
  };
  ctx.fillStyle=palette.surface;
  ctx.beginPath();ctx.roundRect(8,8,704,176,24);ctx.fill();
  ctx.strokeStyle=selected?accent:matched?'#0891B2':palette.line;
  ctx.lineWidth=selected||matched?4:2;ctx.stroke();
  ctx.fillStyle=accent;
  ctx.beginPath();ctx.roundRect(22,34,6,124,3);ctx.fill();
  ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.font=`700 36px ${font}`;ctx.fillStyle=palette.text;
  ctx.fillText(fit(title,440),48,65);
  ctx.fillStyle=statusColor;ctx.beginPath();ctx.arc(55,125,6,0,Math.PI*2);ctx.fill();
  ctx.font=`500 28px ${font}`;ctx.fillStyle=palette.muted;
  ctx.fillText(fit(subtitle,415),74,125);
  ctx.fillStyle=palette.inset;ctx.beginPath();ctx.roundRect(516,28,176,136,18);ctx.fill();
  ctx.textAlign='center';ctx.font=`750 36px ${font}`;ctx.fillStyle=palette.text;
  ctx.fillText(fit(metric,152),604,80);
  ctx.font=`500 24px ${font}`;ctx.fillStyle=palette.muted;
  ctx.fillText(fit(caption,154),604,125);
  return canvas;
}
