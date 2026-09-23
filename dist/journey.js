(() => {
  'use strict';
  const $=s=>document.querySelector(s), D=window.MoodDates;
  const faces={'低落':'◡̯','焦虑':'◉','疲惫':'⌣','平静':'—','愉快':'◠'};
  function el(tag,cls,text){const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;}
  function button(text,fn,cls='soft-button'){const x=el('button',cls,text);x.type='button';x.addEventListener('click',fn);return x;}
  function face(mood,variant='review-face'){const x=el('span',`pearl-face ${variant}`,faces[mood]);x.dataset.mood=mood;x.setAttribute('aria-hidden','true');return x;}
  const short=date=>new Date(date).toLocaleDateString('zh-CN',{month:'long',day:'numeric'});
  const time=date=>new Date(date).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});
  document.querySelectorAll('.mood').forEach(b=>{b.querySelector('.face').textContent=faces[b.dataset.mood];});
  window.showCareTab=tab=>{
    document.body.dataset.careTab=tab;
    document.querySelectorAll('[data-care-tab]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.careTab===tab));});
    if(tab!=='breath')stopBreath();
  };
  document.querySelectorAll('[data-care-tab]').forEach(b=>b.addEventListener('click',()=>window.showCareTab(b.dataset.careTab)));
  window.showCareTab('breath');
  window.onCareFinished=()=>{window.showCareTab('plans');$('#plan-feedback').hidden=false;};
  let mode='day',cursor=D.start(new Date()),picked=D.key(cursor);
  function timeline(host,date){
    const items=D.dayRecords(records,date);
    host.append(el('h3','day-heading',`${short(date)} · ${items.length} 次记录`));
    if(!items.length){host.append(el('p','empty-copy','这一天还没有记录。没有记录的日子，也不需要补作业。'));return;}
    const list=el('div','mood-timeline');
    items.slice().reverse().forEach(r=>{
      const card=el('article','entry-card'),body=el('div','entry-body');
      card.append(face(r.mood));body.append(el('h4','',`${r.mood} · ${time(r.date)}`),el('span','muted',`感受强度 ${r.intensity}/10`));
      if(r.triggers.length)body.append(el('p','entry-tags',r.triggers.join(' · ')));
      if(r.note)body.append(el('p','entry-note',r.note));
      card.append(body);list.append(card);
    });host.append(list);
  }
  function summary(host,items){
    if(!items.length)return;
    const counts=new Map();items.forEach(r=>new Set(r.triggers).forEach(t=>counts.set(t,(counts.get(t)||0)+1)));
    const wrap=el('div','period-summary');
    const chips=el('div','emotion-summary');Object.keys(faces).forEach(m=>{const n=items.filter(r=>r.mood===m).length;if(n){const chip=el('span','emotion-pill');chip.append(face(m,'mini-face'),el('span','',`${m} ${n}次`));chips.append(chip);}});wrap.append(chips);
    const top=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,3);
    if(top.length){wrap.append(el('h3','small-title','这段时间常提到'));const triggers=el('div','trigger-summary');top.forEach(([name,n])=>triggers.append(el('span','trigger-pill',`${name} · ${n}次`)));wrap.append(triggers,el('p','muted','这些是记录中的关联，不代表情绪产生的原因。'));}
    host.append(wrap);
  }
  function renderReview(){
    const host=$('#trends');host.replaceChildren();
    const controls=el('div','review-controls'),tabs=el('div','period-tabs');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','回顾范围');
    [['day','日'],['week','周'],['month','月']].forEach(([value,label])=>{const b=button(label,()=>{mode=value;picked=D.key(cursor);renderReview();});b.classList.toggle('active',mode===value);b.setAttribute('aria-pressed',String(mode===value));tabs.append(b);});
    controls.append(tabs,button('回到今天',()=>{cursor=D.start(new Date());picked=D.key(cursor);renderReview();}));host.append(controls);
    const [a,b]=D.bounds(cursor,mode),items=D.within(records,a,b),nav=el('div','period-nav');
    const title=mode==='day'?`${cursor.getFullYear()}年 ${short(cursor)}`:mode==='month'?`${cursor.getFullYear()}年 ${cursor.getMonth()+1}月`:`${a.getFullYear()}年 ${short(a)} — ${short(D.add(b,-1))}`;
    nav.append(button('‹',()=>{cursor=D.shift(cursor,mode,-1);picked=D.key(cursor);renderReview();}),el('h2','period-title',title));
    nav.firstChild.setAttribute('aria-label','上一'+({day:'天',week:'周',month:'月'})[mode]);
    const forward=button('›',()=>{cursor=D.shift(cursor,mode,1);picked=D.key(cursor);renderReview();});forward.setAttribute('aria-label','下一'+({day:'天',week:'周',month:'月'})[mode]);forward.disabled=b>D.start(new Date());nav.append(forward);host.append(nav);
    if(storageIssue){host.append(el('p','inline-error',storageIssue));return;}
    host.append(el('p','review-count',`${mode==='day'?'当天':mode==='week'?'本周':'本月'} ${items.length} 次记录 · ${new Set(items.map(r=>D.key(r.date))).size} 天留下了感受`));
    if(mode==='day')timeline(host,cursor);
    if(mode==='week'){
      const chart=el('div','week-chart');chart.setAttribute('aria-label','每天平均感受强度，不表示心情好坏');
      for(let n=0;n<7;n++){
        const date=D.add(a,n),rs=D.dayRecords(records,date),last=rs.at(-1),avg=rs.length?rs.reduce((sum,r)=>sum+r.intensity,0)/rs.length:0;
        const col=button('',()=>{cursor=D.start(date);picked=D.key(date);renderReview();},'week-day');col.disabled=date>D.start(new Date());col.setAttribute('aria-label',`${short(date)}，${rs.length}次记录${last?'，最近'+last.mood+'，平均强度'+avg.toFixed(1):''}`);col.classList.toggle('chosen',picked===D.key(date));
        col.append(last?face(last.mood,'week-emoji'):el('span','week-emoji empty-face','·'));
        const track=el('span','intensity-track'),bar=el('span','intensity-bar');bar.style.height=`${avg*10}%`;track.append(bar);col.append(track,el('span','strength-value',rs.length?avg.toFixed(1):'—'),el('span','weekday',['一','二','三','四','五','六','日'][n]),el('span','muted',`${date.getMonth()+1}/${date.getDate()}`));chart.append(col);
      }
      host.append(chart,el('p','chart-note','柱形表示当天平均感受强度（1–10），表情代表当天最近一次感受；空白表示未记录。'));
      timeline(host,new Date(picked+'T00:00:00'));
    }
    if(mode==='month'){
      const calendar=el('div','mood-calendar');['一','二','三','四','五','六','日'].forEach(s=>calendar.append(el('span','calendar-weekday',s)));
      D.calendar(cursor).forEach(date=>{
        if(!date){const blank=el('span','calendar-blank');blank.setAttribute('aria-hidden','true');calendar.append(blank);return;}
        const rs=D.dayRecords(records,date),last=rs.at(-1),cell=button('',()=>{cursor=D.start(date);picked=D.key(date);renderReview();},'calendar-day');cell.disabled=date>D.start(new Date());cell.setAttribute('aria-label',`${short(date)}，${rs.length}次记录${last?'，最近一次'+last.mood:''}`);cell.setAttribute('aria-pressed',String(picked===D.key(date)));cell.classList.toggle('chosen',picked===D.key(date));cell.classList.toggle('is-today',D.key(date)===D.key(new Date()));
        cell.append(el('span','calendar-number',String(date.getDate())),last?face(last.mood,'calendar-face'):el('span','calendar-face empty-face','·'),el('span','calendar-count',rs.length?`${rs.length}次`:''));calendar.append(cell);
      });host.append(calendar,el('p','chart-note','表情代表当天最近一次感受，点击日期查看全部记录。'));timeline(host,new Date(picked+'T00:00:00'));
    }
    summary(host,items);
    if(!items.length){const link=el('a','inline-link','记下此刻的感受 →');link.href='#/now';host.append(link);}
  }
  renderHistory=renderReview;renderReview();
  window.afterMoodSaved=entry=>{
    mode='day';cursor=D.start(new Date(entry.date));picked=D.key(cursor);renderReview();
    const careTab=entry.mood==='疲惫'?'plans':entry.mood==='愉快'||entry.mood==='平静'?'music':'breath';
    window.showCareTab(careTab);
    $('#saved-next .next-actions a:last-child').textContent=({plans:'选一件轻松的小事',music:'选一段轻音乐',breath:'试试一分钟呼吸'})[careTab];
    $('#saved-copy').replaceChildren();$('#saved-copy').append(face(entry.mood,'mini-face'),el('span','',`${entry.mood} · ${time(entry.date)}。今天已有 ${D.dayRecords(records,cursor).length} 次记录。`));
    $('#saved-next').hidden=false;$('#saved-next').focus({preventScroll:true});$('#saved-next').scrollIntoView({behavior:'smooth',block:'nearest'});
  };
  $('#review-saved').addEventListener('click',()=>{mode='day';cursor=D.start(new Date());picked=D.key(cursor);renderReview();});

  // Plans use a separate store: an unreadable diary cannot erase or block plans.
  const planKey='chengxin-plans-v1';let plans=[],planIssue='',removed=null,editing=null;
  try {const raw=JSON.parse(localStorage.getItem(planKey)||'[]');if(!Array.isArray(raw)||raw.some(p=>!p||typeof p.id!=='string'||typeof p.title!=='string'||!Number.isInteger(p.minutes)||p.minutes<1||p.minutes>120||typeof p.done!=='boolean'||typeof p.day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(p.day)))throw Error();plans=raw;}catch{planIssue='暂时无法读取计划，原数据未改动。请检查浏览器存储后重试。';}
  const reportPlan=message=>{$('#plan-error').hidden=!message;$('#plan-error').textContent=message;};
  function resetPlanForm(){editing=null;$('#plan-name').value='';$('#plan-minutes').value='5';$('#plan-date').value='today';$('#plan-submit').textContent='添加计划';$('#plan-cancel').hidden=true;const old=$('#plan-date option[value="original"]');if(old)old.remove();}
  $('#plan-cancel').addEventListener('click',()=>{resetPlanForm();reportPlan('');});
  function persistPlans(next){try{if(planIssue)throw Error();localStorage.setItem(planKey,JSON.stringify(next));plans=next;reportPlan('');renderPlans();return true;}catch{reportPlan(planIssue||'计划未保存，内容还在。请检查浏览器存储权限或空间后重试。');return false;}}
  window.addCarePlan=(title,minutes=5,day=D.key(new Date()))=>{
    title=String(title).trim();if(!title||title.length>60||!Number.isInteger(minutes)||minutes<1||minutes>120){reportPlan('请输入 1–60 个字的小事，以及 1–120 分钟的时长。');return false;}
    if(plans.some(p=>p.day===day&&p.title===title&&!p.done)){showToast('这件小事已经在计划里了。');return false;}
    const next=[...plans,{id:crypto.randomUUID(),title,minutes,day,done:false}];if(persistPlans(next)){showToast('已加入小计划，按自己的节奏来。');return true;}return false;
  };
  function renderPlans(){
    const today=D.key(new Date()),tomorrow=D.key(D.add(new Date(),1)),todays=plans.filter(p=>p.day===today);
    $('#plan-progress').textContent=`今天 ${todays.filter(p=>p.done).length} / ${todays.length} 已完成`;
    const host=$('#plan-list');host.replaceChildren();
    if(planIssue){reportPlan(planIssue);return;}
    if(!plans.length){host.append(el('p','empty-copy','还没有小计划。选一件容易做到的事就好。'));return;}
    const groups=[['今天',p=>p.day===today],['明天',p=>p.day===tomorrow],['之前留下的小事',p=>p.day<today&&!p.done],['已经完成',p=>p.day<today&&p.done],['之后',p=>p.day>tomorrow]];
    groups.forEach(([label,filter])=>{
      const group=plans.filter(filter);if(!group.length)return;host.append(el('h3','plan-group-title',label));
      group.forEach(p=>{
        const row=el('div','plan-row'),check=el('input');check.type='checkbox';check.checked=p.done;check.setAttribute('aria-label',`${p.done?'取消完成':'完成'}：${p.title}`);
        check.addEventListener('change',()=>{const done=check.checked;if(persistPlans(plans.map(x=>x.id===p.id?{...x,done}:x))){$('#plan-feedback').hidden=!done;}else check.checked=p.done;});
        const content=el('div','plan-content');content.append(el('span',p.done?'done-title':'',p.title),el('span','muted',`${p.minutes} 分钟${p.day!==today&&p.day!==tomorrow?' · '+p.day:''}`));row.append(check,content);
        if(!p.done&&p.day===today&&['一分钟呼吸','听一段音乐'].includes(p.title))row.append(button('开始',()=>{window.showCareTab(p.title==='一分钟呼吸'?'breath':'music');if(p.title==='一分钟呼吸'&&!breathTimer)breathButton.click();},'text-button'));
        if(!p.done&&p.day<today)row.append(button('移到今天',()=>persistPlans(plans.map(x=>x.id===p.id?{...x,day:today}:x)),'text-button'));
        row.append(button('编辑',()=>{
          resetPlanForm();editing=p.id;$('#plan-name').value=p.title;$('#plan-minutes').value=String(p.minutes);
          if(p.day===today)$('#plan-date').value='today';else if(p.day===tomorrow)$('#plan-date').value='tomorrow';else {const original=el('option','',p.day);original.value='original';$('#plan-date').append(original);$('#plan-date').value='original';}
          $('#plan-submit').textContent='保存修改';$('#plan-cancel').hidden=false;$('#plan-form').scrollIntoView({behavior:'smooth',block:'center'});$('#plan-name').focus({preventScroll:true});
        },'text-button'));
        const del=button('移除',()=>{if(persistPlans(plans.filter(x=>x.id!==p.id))){removed=p;$('#plan-undo').hidden=false;if(editing===p.id)resetPlanForm();}},'text-button');del.setAttribute('aria-label','移除：'+p.title);row.append(del);host.append(row);
      });
    });
  }
  $('#plan-form').addEventListener('submit',event=>{
    event.preventDefault();const previous=plans.find(p=>p.id===editing);
    const day=$('#plan-date').value==='original'&&previous?previous.day:$('#plan-date').value==='tomorrow'?D.key(D.add(new Date(),1)):D.key(new Date());
    const title=$('#plan-name').value.trim(),minutes=Number($('#plan-minutes').value);
    if(editing){
      if(!previous){reportPlan('这条计划已发生变化，请取消修改后重新打开。');return;}
      if(!title||title.length>60||!Number.isInteger(minutes)||minutes<1||minutes>120){reportPlan('请输入 1–60 个字的小事，以及 1–120 分钟的时长。');return;}
      if(plans.some(p=>p.id!==editing&&p.day===day&&p.title===title&&!p.done)){reportPlan('同一天已经有这条待办，可以修改名称或日期。');return;}
      if(persistPlans(plans.map(p=>p.id===editing?{...p,title,minutes,day}:p))){resetPlanForm();showToast('小计划已更新。');}
    }else if(window.addCarePlan(title,minutes,day))resetPlanForm();
  });
  $('#undo-plan').addEventListener('click',()=>{if(removed&&persistPlans([...plans,removed])){removed=null;$('#plan-undo').hidden=true;}});
  [['一分钟呼吸',1],['听一段音乐',5],['伸个懒腰',2],['去楼下走一圈',5]].forEach(([title,mins])=>$('#plan-suggestions').append(button('+ '+title,()=>window.addCarePlan(title,mins),'suggestion-chip')));
  $('#after-care').addEventListener('click',()=>{$('#selection-note').textContent='照顾自己之后，此刻是什么感受？';});
  renderPlans();

  // Three original ambient compositions, synthesized locally; no external requests.
  const tracks=[
    {name:'紫色微光',detail:'温柔琴音 · 慢慢放松',icon:'☾',base:261.63,pace:1.4,notes:[0,7,12,4,9,7,4,2],wave:'sine'},
    {name:'云间漫步',detail:'空灵和声 · 轻轻呼吸',icon:'☁',base:220,pace:1.8,notes:[0,7,3,10,12,7,5,3],wave:'sine'},
    {name:'午后小憩',detail:'暖调拨弦 · 片刻休息',icon:'✧',base:293.66,pace:1.1,notes:[0,4,7,12,9,7,4,7],wave:'triangle'}
  ];
  let ctx=null,master=null,timer=null,active=-1,paused=false,startAt=0,nextNote=0,step=0,length=300,request=0;
  const trackButtons=[];
  function renderPlayer(){trackButtons.forEach((b,i)=>{b.classList.toggle('playing',active===i);b.querySelector('.track-action').textContent=active===i?(paused?'继续播放':'正在播放'):'播放';b.setAttribute('aria-pressed',String(active===i&&!paused));});$('#music-pause').disabled=active<0;$('#music-stop').disabled=active<0;$('#music-pause').textContent=paused?'继续':'暂停';$('#music-duration').disabled=active>=0;}
  async function stopMusic(message='已停止播放。'){
    request++;clearInterval(timer);timer=null;const old=ctx;ctx=null;master=null;active=-1;paused=false;renderPlayer();$('#music-clock').textContent='';$('#music-status').textContent=message;
    if(old&&old.state!=='closed'){try{await old.close();}catch{}}
  }
  function playNote(frequency,at,duration,level,wave){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=wave;osc.frequency.value=frequency;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+.08);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);osc.connect(gain);gain.connect(master);osc.start(at);osc.stop(at+duration+.05);osc.onended=()=>{osc.disconnect();gain.disconnect();};}
  function schedule(){
    if(!ctx||paused||ctx.state!=='running')return;
    const elapsed=ctx.currentTime-startAt;
    if(elapsed>=length){stopMusic('音乐结束了。留意一下此刻的感受。');$('#music-reflect').hidden=false;return;}
    const track=tracks[active];
    if(nextNote<ctx.currentTime-.1)nextNote=ctx.currentTime+.05;
    while(nextNote<ctx.currentTime+.4&&nextNote<startAt+length){
      const semitone=track.notes[step%track.notes.length];playNote(track.base*2**(semitone/12),nextNote,Math.min(3,startAt+length-nextNote),.22,track.wave);
      if(step%4===0)[0,7,12].forEach(n=>playNote(track.base/2*2**(n/12),nextNote,Math.min(track.pace*4,startAt+length-nextNote),.08,'sine'));
      nextNote+=track.pace;step++;
    }
    const left=Math.max(0,Math.ceil(length-elapsed));$('#music-clock').textContent=`还剩 ${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`;
  }
  async function toggleMusic(){
    const current=ctx;if(!current)return;
    try{if(paused)await current.resume();else await current.suspend();if(ctx!==current)return;paused=current.state!=='running';renderPlayer();$('#music-status').textContent=paused?'已暂停，准备好再继续。':`正在播放 · ${tracks[active].name}`;}catch{if(ctx===current){await stopMusic('播放已停止。');$('#music-error').hidden=false;$('#music-error').textContent='暂时无法继续播放，请重新选择音乐。';}}
  }
  async function startMusic(index){
    if(active===index){if(paused)await toggleMusic();return;}
    await stopMusic('正在准备音乐…');const token=++request;
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio){$('#music-error').hidden=false;$('#music-error').textContent='这个浏览器暂不支持播放。你仍可以使用呼吸练习，或换一个浏览器再试。';$('#music-status').textContent='未开始播放。';return;}
    let local;
    try{
      local=new Audio();await local.resume();if(token!==request){await local.close();return;}
      if(local.state!=='running')throw Error('blocked');
      ctx=local;master=ctx.createGain();master.gain.value=Number($('#music-volume').value)/100;master.connect(ctx.destination);
      active=index;paused=false;length=Number($('#music-duration').value);step=0;startAt=ctx.currentTime;nextNote=startAt+.06;
      $('#music-error').hidden=true;$('#music-reflect').hidden=true;$('#music-status').textContent=`正在播放 · ${tracks[index].name}`;renderPlayer();schedule();timer=setInterval(schedule,200);
    }catch{if(token!==request){if(local&&local.state!=='closed')await local.close().catch(()=>{});return;}if(local&&local.state!=='closed')await local.close().catch(()=>{});await stopMusic('未开始播放。');$('#music-error').hidden=false;$('#music-error').textContent='音乐暂时无法播放，请点击曲目重试。其他功能仍可使用。';}
  }
  tracks.forEach((track,index)=>{
    const b=button('',()=>startMusic(index),'music-track');b.setAttribute('aria-label','播放 '+track.name);b.append(el('span','track-icon',track.icon),el('strong','',track.name),el('span','muted',track.detail),el('span','track-action','播放'));trackButtons.push(b);$('#music-tracks').append(b);
  });
  $('#music-pause').addEventListener('click',toggleMusic);$('#music-stop').addEventListener('click',()=>stopMusic());
  $('#music-volume').addEventListener('input',()=>{if(master&&ctx)master.gain.setTargetAtTime(Number($('#music-volume').value)/100,ctx.currentTime,.1);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&ctx&&!paused)toggleMusic();renderPlans();});
  window.addEventListener('pagehide',()=>stopMusic());
  window.addEventListener('hashchange',()=>{if(document.body.dataset.view!=='care'&&ctx&&!paused)toggleMusic();renderPlans();});
})();
