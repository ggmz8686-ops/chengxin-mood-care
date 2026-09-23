(function(root){
  const start = date => {const d=new Date(date);d.setHours(0,0,0,0);return d;};
  const key = date => {const d=new Date(date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const add = (date,n) => {const d=start(date);d.setDate(d.getDate()+n);return d;};
  function bounds(date,mode){const a=start(date);if(mode==='week')a.setDate(a.getDate()-(a.getDay()+6)%7);if(mode==='month')a.setDate(1);const b=mode==='month'?new Date(a.getFullYear(),a.getMonth()+1,1):add(a,mode==='week'?7:1);return [a,b];}
  function shift(date,mode,n){if(mode==='month')return new Date(date.getFullYear(),date.getMonth()+n,1);return add(date,mode==='week'?7*n:n);}
  const within=(records,a,b)=>records.filter(r=>new Date(r.date)>=a&&new Date(r.date)<b).sort((x,y)=>Date.parse(x.date)-Date.parse(y.date));
  const dayRecords=(records,date)=>within(records,start(date),add(date,1));
  function calendar(date){const [a,b]=bounds(date,'month');const cells=Array((a.getDay()+6)%7).fill(null);for(let d=new Date(a);d<b;d=add(d,1))cells.push(d);while(cells.length%7)cells.push(null);return cells;}
  const core={start,key,add,bounds,shift,within,dayRecords,calendar};
  if(typeof module!=='undefined')module.exports=core;else root.MoodDates=core;
})(typeof window==='undefined'?globalThis:window);
