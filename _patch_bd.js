// 今日页生日提醒条 v2.49.0（修复版）
const fs=require('fs');
const f='/home/z/my-project/zhiming-opt/site/src/index.html';
let s=fs.readFileSync(f,'utf8');
let n=0;
function rep(a,r,t){
  if(s.indexOf(a)<0){ console.error('MISS:'+t); process.exit(1); }
  s=s.replace(a,r); n++;
}

// 1) renderToday 前定义 _todayBirthday + _bdGo
rep(`function renderToday(){
  const wrap = document.getElementById("today-body");
  if (!wrap) return;`,
`function _todayBirthday(){
  try{
    var l=JSON.parse(localStorage.getItem('zhiming_people_v1')||'[]');
    if(!l.length) return '';
    var now=new Date(), md=String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
    var hits=[];
    for(var i=0;i<l.length;i++){
      var p=l[i]||{}; var bd=String(p.bday||'');
      if(bd.length>=5){ var mmdd=bd.slice(-5); if(mmdd===md&&p.name) hits.push(String(p.name)); }
    }
    return hits.join('、');
  }catch(_){ return ''; }
}
try{ window._bdGo = function(){ try{ window.switchTab('grow'); }catch(_){} }; }catch(_){}
function renderToday(){
  const wrap = document.getElementById("today-body");
  if (!wrap) return;`, 'bd-fn');

// 2) 主卡后插提醒条（零占位，onclick 无嵌套引号）
rep(`      </div>
    </div>
    <div class="find-day-card" id="todayFindDayCard">`,
`      </div>
    </div>
    ${(function(){ var _bn=''; try{ _bn=window._todayBirthday?window._todayBirthday():_todayBirthday(); }catch(_){ _bn=''; } return _bn?('<div style="margin-top:10px;padding:10px 14px;border-radius:14px;background:linear-gradient(135deg,rgba(233,88,138,.12),rgba(107,92,165,.10));border:1px solid rgba(233,88,138,.25);font-size:13px;font-weight:600;color:#8a4a76;cursor:pointer;display:flex;align-items:center;justify-content:space-between;" onclick="window._bdGo()"><span>🎂 今天是 '+_bn+' 的生日</span><span style="font-size:11px;font-weight:400;">去看看 →</span></div>'):''; })()}
    <div class="find-day-card" id="todayFindDayCard">`, 'bd-bar');

fs.writeFileSync(f,s);
console.log('bd ok:',n);
